"""Text embeddings.

The default :class:`HashingEmbedder` needs no model, no network and no
dependencies: it maps tokens into a fixed-dimensional vector using feature
hashing (the "hashing trick") with L2 normalization. It is not semantically
deep, but it is deterministic, fast, and good enough to demonstrate and test
retrieval end-to-end. Swap in a real embedding model by implementing
:class:`Embedder` and passing it to the vector store.
"""

from __future__ import annotations

import abc
import hashlib
import math
import re
from typing import List, Sequence

_TOKEN_RE = re.compile(r"[a-z0-9]+")


class Embedder(abc.ABC):
    """Turns text into a fixed-length dense vector."""

    dim: int

    @abc.abstractmethod
    def embed(self, text: str) -> List[float]:
        ...

    def embed_many(self, texts: Sequence[str]) -> List[List[float]]:
        return [self.embed(t) for t in texts]


class HashingEmbedder(Embedder):
    """Feature-hashing embedder. Deterministic and dependency-free."""

    def __init__(self, dim: int = 256) -> None:
        if dim <= 0:
            raise ValueError("dim must be positive")
        self.dim = dim

    def _tokens(self, text: str) -> List[str]:
        return _TOKEN_RE.findall(text.lower())

    def embed(self, text: str) -> List[float]:
        vector = [0.0] * self.dim
        for token in self._tokens(text):
            digest = hashlib.md5(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % self.dim
            # A second hash byte decides the sign, reducing collisions' bias.
            sign = 1.0 if digest[4] & 1 else -1.0
            vector[index] += sign
        return _l2_normalize(vector)


def _l2_normalize(vector: List[float]) -> List[float]:
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0.0:
        return vector
    return [v / norm for v in vector]


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    """Cosine similarity of two equal-length vectors, in ``[-1, 1]``."""
    if len(a) != len(b):
        raise ValueError("vectors must have equal length")
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)
