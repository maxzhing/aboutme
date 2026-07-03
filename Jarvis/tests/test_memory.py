import tempfile
import unittest
from pathlib import Path

from jarvis.core.types import Message, Role
from jarvis.memory.embeddings import HashingEmbedder, cosine_similarity
from jarvis.memory.long_term import LongTermMemory
from jarvis.memory.short_term import WorkingMemory
from jarvis.memory.vector_store import VectorStore


class EmbeddingTest(unittest.TestCase):
    def test_deterministic_and_normalized(self):
        emb = HashingEmbedder(dim=64)
        a = emb.embed("hello world")
        b = emb.embed("hello world")
        self.assertEqual(a, b)
        self.assertAlmostEqual(sum(x * x for x in a) ** 0.5, 1.0, places=6)

    def test_cosine_similar_texts_rank_higher(self):
        emb = HashingEmbedder(dim=256)
        q = emb.embed("machine learning models")
        near = emb.embed("machine learning algorithms")
        far = emb.embed("a recipe for chocolate cake")
        self.assertGreater(cosine_similarity(q, near), cosine_similarity(q, far))


class VectorStoreTest(unittest.TestCase):
    def test_search_returns_relevant(self):
        store = VectorStore()
        store.add_text("Python is a programming language")
        store.add_text("Cats are small domesticated animals")
        hits = store.search("coding in python", k=1)
        self.assertEqual(len(hits), 1)
        self.assertIn("Python", hits[0].text)

    def test_persistence_roundtrip(self):
        with tempfile.TemporaryDirectory() as d:
            path = str(Path(d) / "store.json")
            store = VectorStore(persist_path=path)
            store.add_text("persisted knowledge")
            reloaded = VectorStore(persist_path=path)
            self.assertEqual(len(reloaded), 1)
            self.assertEqual(reloaded.search("knowledge", k=1)[0].text, "persisted knowledge")


class LongTermTest(unittest.TestCase):
    def test_retrieve_all_across_stores(self):
        mem = LongTermMemory()
        mem.semantic.remember("The sky is blue")
        mem.procedural.learn_skill("greet", ["say hello"])
        hits = mem.retrieve_all("hello greeting", k=1)
        self.assertEqual(len(hits), 1)

    def test_recency_weighting(self):
        mem = LongTermMemory(half_life_s=1.0)
        # Two similar episodes; the one with a newer last_access should win.
        old = mem.episodic.remember("trip planning notes", last_access=0.0)
        new = mem.episodic.remember("trip planning notes", last_access=10**12)
        hits = mem.episodic.retrieve("trip planning", k=2, reinforce=False)
        self.assertEqual(hits[0].document.id, new)


class WorkingMemoryTest(unittest.TestCase):
    def test_sliding_window(self):
        wm = WorkingMemory(max_messages=2)
        wm.add_user("one")
        wm.add_user("two")
        wm.add_user("three")
        self.assertEqual([m.content for m in wm.history()], ["two", "three"])

    def test_scratchpad(self):
        wm = WorkingMemory()
        wm.note("goal", "win")
        self.assertEqual(wm.recall("goal"), "win")
        self.assertEqual(wm.recall("missing", "default"), "default")


if __name__ == "__main__":
    unittest.main()
