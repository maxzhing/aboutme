import unittest

from jarvis.core.metrics import MetricsRegistry


class MetricsTest(unittest.TestCase):
    def setUp(self):
        self.m = MetricsRegistry(log_capacity=5)

    def test_counters_with_labels(self):
        self.m.incr("llm.tokens", 100, agent="planner")
        self.m.incr("llm.tokens", 50, agent="planner")
        self.m.incr("llm.tokens", 10, agent="executor")
        snap = self.m.snapshot()
        self.assertEqual(snap["counters"]["llm.tokens{agent=planner}"], 150)
        self.assertEqual(snap["counters"]["llm.tokens{agent=executor}"], 10)

    def test_timer_summary(self):
        for ms in (10, 20, 30, 40):
            self.m.observe("tool.latency_ms", ms, tool="shell")
        summ = self.m.snapshot()["timers"]["tool.latency_ms{tool=shell}"]
        self.assertEqual(summ["count"], 4)
        self.assertEqual(summ["max_ms"], 40)
        self.assertGreater(summ["avg_ms"], 0)

    def test_timer_context_manager(self):
        with self.m.timer("op_ms", op="x"):
            pass
        self.assertIn("op_ms{op=x}", self.m.snapshot()["timers"])

    def test_log_ring_buffer_bounded(self):
        for i in range(10):
            self.m.log("INFO", "test", f"event {i}")
        events = self.m.recent_events()
        self.assertEqual(len(events), 5)  # capacity
        self.assertEqual(events[-1]["message"], "event 9")

    def test_log_level_filter(self):
        self.m.log("INFO", "s", "info one")
        self.m.log("ERROR", "s", "boom")
        errors = self.m.recent_events(level="error")
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["message"], "boom")

    def test_gauge_overwrites(self):
        self.m.gauge("queue", 3)
        self.m.gauge("queue", 7)
        self.assertEqual(self.m.snapshot()["gauges"]["queue"], 7)


if __name__ == "__main__":
    unittest.main()
