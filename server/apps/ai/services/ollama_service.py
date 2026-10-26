import json
import logging
import time
import urllib.request
import urllib.error
from django.conf import settings

logger = logging.getLogger(__name__)

_availability_cache = {
    'timestamp': 0,
    'is_available': False,
    'installed_models': []
}

class OllamaService:
    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'llama3:latest')
        self.timeout = int(getattr(settings, 'OLLAMA_TIMEOUT', 60))

    def is_available(self, force_refresh: bool = False) -> bool:
        """
        Check if Ollama service is reachable AND has the required model or any usable model.
        Caches result for 30 seconds to minimize latency.
        """
        global _availability_cache
        now = time.time()
        if not force_refresh and (now - _availability_cache['timestamp'] < 30):
            return _availability_cache['is_available']

        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags", headers={"User-Agent": "DonateBridge-Backend"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                if resp.status == 200:
                    body = json.loads(resp.read().decode('utf-8'))
                    models = [m.get('name', '') for m in body.get('models', [])]
                    _availability_cache['installed_models'] = models
                    _availability_cache['timestamp'] = now

                    # Check if requested model or its base name is installed
                    base_name = self.model.split(':')[0].lower()
                    has_model = any(self.model.lower() == m.lower() or m.lower().startswith(base_name) for m in models)
                    
                    if has_model:
                        _availability_cache['is_available'] = True
                        return True
                    elif models:
                        # Fallback to the first installed model if available
                        self.model = models[0]
                        _availability_cache['is_available'] = True
                        return True
                    else:
                        logger.info("Ollama is reachable but has 0 models downloaded. Using Embedded RAG Engine.")
                        _availability_cache['is_available'] = False
                        return False
        except Exception as e:
            logger.debug(f"Ollama availability check failed: {e}")
            _availability_cache['is_available'] = False
            _availability_cache['timestamp'] = now
            return False

        _availability_cache['is_available'] = False
        _availability_cache['timestamp'] = now
        return False

    def get_status(self) -> dict:
        """Return detailed status of the AI engine."""
        is_avail = self.is_available()
        return {
            "available": is_avail,
            "model": self.model if is_avail else "DonateBridge-RAG-Engine",
            "installed_models": _availability_cache.get('installed_models', []),
            "engine": "ollama" if is_avail else "embedded_rag"
        }

    def generate(self, prompt: str, system_prompt: str = None, format_json: bool = True) -> dict:
        """
        Send a generation request to the Ollama HTTP API.
        Returns parsed JSON dict or raises RuntimeError if service call fails.
        """
        if not self.is_available():
            raise RuntimeError("Ollama service is not reachable on localhost:11434")

        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 256 if format_json else 512,
                "temperature": 0.1 if format_json else 0.3,
            }
        }
        if system_prompt:
            payload["system"] = system_prompt
        if format_json:
            payload["format"] = "json"

        data = json.dumps(payload).encode('utf-8')
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "DonateBridge-AI-Engine"
        }

        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Ollama API returned HTTP status {resp.status}")
                body = resp.read().decode('utf-8')
                result = json.loads(body)
                response_text = result.get('response', '')
                if format_json:
                    try:
                        return json.loads(response_text)
                    except json.JSONDecodeError:
                        # Fallback parsing for markdown-wrapped JSON
                        import re
                        match = re.search(r'\{.*\}', response_text, re.DOTALL)
                        if match:
                            try:
                                return json.loads(match.group(0))
                            except json.JSONDecodeError:
                                pass
                        logger.error(f"Ollama returned invalid JSON: {response_text}")
                        raise RuntimeError(f"Ollama returned malformed JSON: {response_text[:100]}")
                return {"text": response_text}
        except urllib.error.URLError as e:
            logger.error(f"Ollama connection error: {e}")
            raise RuntimeError(f"Ollama service unreachable at {self.base_url}: {e}")
        except Exception as e:
            logger.error(f"Ollama generation failure: {e}")
            raise RuntimeError(f"Ollama error: {e}")
