import unittest

from jarvis.config.settings import LLMConfig
from jarvis.core.errors import LLMProviderNotAvailable
from jarvis.core.types import Message, Role
from jarvis.llm.base import CompletionRequest, estimate_tokens
from jarvis.llm.providers.echo import EchoProvider
from jarvis.llm.registry import available_providers, build_provider


class LLMTest(unittest.TestCase):
    def test_echo_is_deterministic(self):
        provider = EchoProvider(model="echo-1")
        req = CompletionRequest(messages=[Message(Role.USER, "echo: hello")], model="echo-1")
        a = provider.complete(req)
        b = provider.complete(req)
        self.assertEqual(a.text, "hello")
        self.assertEqual(a.text, b.text)

    def test_echo_plan_shape(self):
        provider = EchoProvider(model="echo-1")
        out = provider.chat([Message(Role.USER, "please plan this")]).text
        self.assertIn("1.", out)

    def test_usage_accounting(self):
        provider = EchoProvider(model="echo-1")
        resp = provider.chat([Message(Role.USER, "echo: some text here")])
        self.assertGreater(resp.usage.total_tokens, 0)
        self.assertEqual(resp.usage.cost_usd, 0.0)

    def test_registry_lists_known_providers(self):
        names = available_providers()
        for expected in ("echo", "anthropic", "openai", "ollama"):
            self.assertIn(expected, names)

    def test_unknown_provider_raises(self):
        cfg = LLMConfig(provider="does-not-exist")
        with self.assertRaises(LLMProviderNotAvailable):
            build_provider(cfg)

    def test_build_echo(self):
        provider = build_provider(LLMConfig(provider="echo", model="echo-1"))
        self.assertEqual(provider.name, "echo")

    def test_estimate_tokens(self):
        self.assertGreaterEqual(estimate_tokens("a" * 40), 10)


if __name__ == "__main__":
    unittest.main()
