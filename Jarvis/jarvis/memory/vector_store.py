"""An in-process vector store with optional JSON persistence.

Small enough to read in one sitting, real enough to power retrieval-augmented
generation for a personal assistant's memory. It stores :class:`Document`
objects with their embeddings and returns the top-k by cosine similarity.

For large-scale use you would swap this for FAISS/Chroma/pgvector behind the
same ``add`` / ``search`` interface; nothing else in JARVIS needs to change.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

from jarvis.core.logging import get_logger
from jarvis.core.types import Document
from jarvis.memory.embeddings import Embedder, HashingEmbedder, cosine_similarity

_log = get_logger("memory.vector")


class VectorStore:
    def __init__(self, embedder: Optional[Embedder] = None, persist_path: str | None = None) -> None:
        self.embedder = embedder or HashingEmbedder()
        self.persist_path = Path(persist_path) if persist_path else None
        self._docs: Dict[str, Document] = {}
        self._vectors: Dict[str, List[float]] = {}
        if self.persist_path and self.persist_path.exists():
            self._load()

    def add(self, document: Document) -> str:
        self._docs[document.id] = document
        self._vectors[document.id] = self.embedder.embed(document.text)
        _log.debug("stored document", extra={"doc": document.id})
        if self.persist_path:
            self._save()
        return document.id

    def add_text(self, text: str, **metadata) -> str:
        return self.add(Document(text=text, metadata=metadata))

    def delete(self, doc_id: str) -> bool:
        existed = doc_id in self._docs
        self._docs.pop(doc_id, None)
        self._vectors.pop(doc_id, None)
        if existed and self.persist_path:
            self._save()
        return existed

    def get(self, doc_id: str) -> Optional[Document]:
        return self._docs.get(doc_id)

    def search(self, query: str, k: int = 5, min_score: float = 0.0) -> List[Document]:
        """Return up to ``k`` documents most similar to ``query``.

        Each returned :class:`Document` is a shallow copy carrying its ``score``
        so callers can rank or threshold without mutating stored state.
        """
        if not self._vectors:
            return []
        query_vec = self.embedder.embed(query)
        scored = []
        for doc_id, vector in self._vectors.items():
            score = cosine_similarity(query_vec, vector)
            if score >= min_score:
                scored.append((score, doc_id))
        scored.sort(reverse=True)
        results: List[Document] = []
        for score, doc_id in scored[:k]:
            original = self._docs[doc_id]
            results.append(
                Document(
                    text=original.text,
                    metadata=dict(original.metadata),
                    id=original.id,
                    created_at=original.created_at,
                    score=score,
                )
            )
        return results

    def __len__(self) -> int:
        return len(self._docs)

    # Persistence --------------------------------------------------------- #

    def _save(self) -> None:
        assert self.persist_path is not None
        self.persist_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "docs": [
                {
                    "id": d.id,
                    "text": d.text,
                    "metadata": d.metadata,
                    "created_at": d.created_at,
                    "vector": self._vectors[d.id],
                }
                for d in self._docs.values()
            ]
        }
        self.persist_path.write_text(json.dumps(payload), "utf-8")

    def _load(self) -> None:
        assert self.persist_path is not None
        payload = json.loads(self.persist_path.read_text("utf-8"))
        for item in payload.get("docs", []):
            doc = Document(
                text=item["text"],
                metadata=item.get("metadata", {}),
                id=item["id"],
                created_at=item.get("created_at", 0.0),
            )
            self._docs[doc.id] = doc
            self._vectors[doc.id] = item["vector"]
        _log.info("loaded vector store", extra={"count": len(self._docs)})
