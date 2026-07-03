# `jarvis.memory` — Working & long-term memory

- **`short_term.py`** — `WorkingMemory`: a bounded sliding window of recent
  turns plus a reasoning scratchpad. The assistant's "RAM".
- **`embeddings.py`** — `Embedder` interface + `HashingEmbedder` (dependency-
  free feature hashing) and cosine similarity.
- **`vector_store.py`** — in-process vector index with optional JSON
  persistence; `add` / `search` (top-k by cosine).
- **`long_term.py`** — `LongTermMemory` bundling **semantic** (durable facts),
  **episodic** (decaying events), and **procedural** (skills) stores. Retrieval
  is relevance × exponential recency decay; access reinforces a memory.

Swap in a real embedder / FAISS / Chroma behind the same interfaces for scale —
nothing else changes.
