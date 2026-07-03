import os
import tempfile
import unittest
from pathlib import Path

from jarvis.config.settings import Settings, load_settings
from jarvis.core.errors import ConfigError


class ConfigTest(unittest.TestCase):
    def test_defaults_load(self):
        settings = load_settings(use_env=False)
        self.assertEqual(settings.llm.provider, "echo")
        self.assertEqual(settings.orchestrator.max_retries, 2)
        self.assertFalse(settings.tools.allow_shell)

    def test_env_override_nested(self):
        os.environ["JARVIS_LLM__PROVIDER"] = "anthropic"
        os.environ["JARVIS_LLM__MAX_TOKENS"] = "2048"
        os.environ["JARVIS_TOOLS__ALLOW_SHELL"] = "true"
        try:
            settings = load_settings()
            self.assertEqual(settings.llm.provider, "anthropic")
            self.assertEqual(settings.llm.max_tokens, 2048)
            self.assertIsInstance(settings.llm.max_tokens, int)
            self.assertTrue(settings.tools.allow_shell)
        finally:
            for key in ("JARVIS_LLM__PROVIDER", "JARVIS_LLM__MAX_TOKENS", "JARVIS_TOOLS__ALLOW_SHELL"):
                os.environ.pop(key, None)

    def test_yaml_override(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "cfg.yaml"
            path.write_text("log_level: DEBUG\nllm:\n  model: custom-model\n")
            settings = load_settings(path, use_env=False)
            self.assertEqual(settings.log_level, "DEBUG")
            self.assertEqual(settings.llm.model, "custom-model")

    def test_unknown_key_raises(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "bad.yaml"
            path.write_text("not_a_real_key: 1\n")
            with self.assertRaises(ConfigError):
                load_settings(path, use_env=False)


if __name__ == "__main__":
    unittest.main()
