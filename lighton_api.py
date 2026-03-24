import httpx
import os
from typing import Optional

LIGHTON_API_KEY = os.getenv("LIGHTON_API_KEY", "RBKbrqfp.LtmIoPslgK7Ob1eSqg3OhrEvfwhXxtwz")
LIGHTON_BASE_URL = os.getenv("LIGHTON_BASE_URL", "https://paradigm.lighton.ai")
LIGHTON_MODEL = os.getenv("LIGHTON_MODEL", "alfred-ft5")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {LIGHTON_API_KEY}",
        "Content-Type": "application/json",
    }


async def chat_completion(prompt: str, system: Optional[str] = None) -> str:
    """
    Call the LightOn Paradigm OpenAI-compatible chat completions endpoint.
    Endpoint: POST {BASE_URL}/chat/completions
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": LIGHTON_MODEL,
        "messages": messages,
        "max_tokens": 4096,
        "temperature": 0.4,
    }

    url = f"{LIGHTON_BASE_URL.rstrip('/')}/api/v2/chat/completions"

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, headers=_headers(), json=payload)
        # Surface the raw error body so it is visible in FastAPI logs
        if response.status_code != 200:
            raise ValueError(
                f"LightOn returned {response.status_code}: {response.text[:500]}"
            )
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def list_models() -> list:
    """
    Return the list of models available on your Paradigm instance.
    Useful for debugging — lets you confirm the correct model identifier.
    Endpoint: GET {BASE_URL}/models
    """
    url = f"{LIGHTON_BASE_URL.rstrip('/')}/models"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=_headers())
        if response.status_code != 200:
            raise ValueError(
                f"LightOn /models returned {response.status_code}: {response.text[:300]}"
            )
        data = response.json()
        # OpenAI-compatible format: {"data": [{"id": "model-name", ...}]}
        return [m.get("id") for m in data.get("data", [])]