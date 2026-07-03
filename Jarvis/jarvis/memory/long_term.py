"""Long-term memory: semantic, episodic, and procedural stores.

All three are vector-backed and share one retrieval mechanism, but they carry
different metadata and are queried for different purposes:

* **Semantic** — durable facts and knowledge ("the user prefers metric units").
* **Episodic** — time-stamped events ("on 2026-07-03 the user asked to plan a
  trip"). These decay: older, un-reinforced episodes score lower.
* **Procedural** — reusable how-to skills and workflows the system has learned.

Retrieval applies a **recency-weighted relevance score**: cosine similarity is
multiplied by an exponential decay based on age, so fresh memories surface over
stale ones of equal semantic match. Accessing a memory reinforces it (resets
its clock), implementing simple use-based retention.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional

from jarvis.core.logging import get_logger
from jarvis.core.types import Document, now_ts
from jarvis.memory.embeddings import Embedder
from jarvis.memory.vector_store import VectorStore

_log = get_logger("memory.long_term")


@dataclass
class MemoryHit:
    """A retrieved memory with both its raw and decay-adjusted scores."""

    document: Document
    relevance: float       # cosine similarity in [-1, 1]
    adjusted_score: float  # relevance after recency weighting


class _DecayingStore:
    """A vector store whose retrieval is weighted by recency."""

    kind = "generic"

    def __init__(
        self,
        embedder: Optional[Embedder] = None,
        persist_path: str | None = None,
        half_life_s: float = 7 * 24 * 3600.0,
    ) -> None:
        self.store = VectorStore(embedder=embedder, persist_path=persist_path)
        self.half_life_s = half_life_s

    def remember(self, text: str, **metadata) -> str:
        metadata.setdefault("kind", self.kind)
        metadata.setdefault("last_access", now_ts())
        return self.store.add(Document(text=text, metadata=metadata))

    def _decay(self, age_s: float) -> float:
        if self.half_life_s <= 0:
            return 1.0
        return 0.5 ** (age_s / self.half_life_s)

    def retrieve(self, query: str, k: int = 5, reinforce: bool = True) -> List[MemoryHit]:
        # Pull a wider candidate set, then re-rank with the decay factor.
        candidates = self.store.search(query, k=max(k * 3, k))
        now = now_ts()
        hits: List[MemoryHit] = []
        for doc in candidates:
            last = float(doc.metadata.get("last_access", doc.created_at or now))
            weight = self._decay(max(0.0, now - last))
            hits.append(
                MemoryHit(
                    document=doc,
                    relevance=doc.score or 0.0,
                    adjusted_score=(doc.score or 0.0) * weight,
                )
            )
        hits.sort(key=lambda h: h.adjusted_score, reverse=True)
        top = hits[:k]
        if reinforce:
            for hit in top:
                stored = self.store.get(hit.document.id)
                if stored is not None:
                    stored.metadata["last_access"] = now
        return top

    def __len__(self) -> int:
        return len(self.store)


class SemanticMemory(_DecayingStore):
    kind = "semantic"

    def __init__(self, embedder=None, persist_path=None) -> None:
        # Facts should barely decay; use a very long half-life.
        super().__init__(embedder, persist_path, half_life_s=365 * 24 * 3600.0)


class EpisodicMemory(_DecayingStore):
    kind = "episodic"

    def record_event(self, description: str, **metadata) -> str:
        metadata.setdefault("event_time", now_ts())
        return self.remember(description, **metadata)


class ProceduralMemory(_DecayingStore):
    kind = "procedural"

    def __init__(self, embedder=None, persist_path=None) -> None:
        # Skills are durable, like semantic facts.
        super().__init__(embedder, persist_path, half_life_s=365 * 24 * 3600.0)

    def learn_skill(self, name: str, steps: List[str]) -> str:
        body = f"Skill: {name}\n" + "\n".join(f"- {s}" for s in steps)
        return self.remember(body, skill=name, steps=steps)


class LongTermMemory:
    """Facade bundling the three stores, used by agents and the orchestrator."""

    def __init__(
        self,
        embedder: Optional[Embedder] = None,
        persist_dir: str | None = None,
        half_life_s: float = 7 * 24 * 3600.0,
    ) -> None:
        def path(name: str) -> str | None:
            return f"{persist_dir}/{name}.json" if persist_dir else None

        self.semantic = SemanticMemory(embedder, path("semantic"))
        self.episodic = EpisodicMemory(embedder, path("episodic"))
        self.episodic.half_life_s = half_life_s
        self.procedural = ProceduralMemory(embedder, path("procedural"))

    def retrieve_all(self, query: str, k: int = 3) -> List[MemoryHit]:
        """Retrieve across all three stores, merged and re-ranked together."""
        hits: List[MemoryHit] = []
        for store in (self.semantic, self.episodic, self.procedural):
            hits.extend(store.retrieve(query, k=k))
        hits.sort(key=lambda h: h.adjusted_score, reverse=True)
        return hits[:k]

    def stats(self) -> dict:
        return {
            "semantic": len(self.semantic),
            "episodic": len(self.episodic),
            "procedural": len(self.procedural),
        }
