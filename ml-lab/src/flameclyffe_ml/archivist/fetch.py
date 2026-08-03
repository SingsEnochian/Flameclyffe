"""Bounded public-source retrieval with allowlists and SSRF protection."""

from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import socket
from dataclasses import dataclass
from datetime import datetime, timezone
from importlib.util import find_spec
from urllib.parse import urljoin, urlsplit

from .contracts import SourceDocument


@dataclass(frozen=True, slots=True)
class FetchPolicy:
    allowed_domains: frozenset[str]
    max_bytes: int = 1_500_000
    max_paragraphs: int = 500
    timeout_seconds: float = 12.0
    max_redirects: int = 3
    user_agent: str = "HearthgateArchivist/1.0 (+local review-only ingest)"


def ingest_dependencies_available() -> bool:
    return find_spec("httpx") is not None and find_spec("bs4") is not None


def _normalise_domain(value: str) -> str:
    return value.strip().lower().rstrip(".")


def _allowed_host(hostname: str, allowed_domains: frozenset[str]) -> bool:
    host = _normalise_domain(hostname)
    return any(host == domain or host.endswith(f".{domain}") for domain in allowed_domains)


def _address_is_public(address: str) -> bool:
    parsed = ipaddress.ip_address(address)
    return not (
        parsed.is_private
        or parsed.is_loopback
        or parsed.is_link_local
        or parsed.is_multicast
        or parsed.is_reserved
        or parsed.is_unspecified
    )


async def _resolve_public_addresses(hostname: str, port: int) -> tuple[str, ...]:
    def resolve() -> tuple[str, ...]:
        records = socket.getaddrinfo(
            hostname,
            port,
            type=socket.SOCK_STREAM,
        )
        return tuple(sorted({record[4][0] for record in records}))

    addresses = await asyncio.to_thread(resolve)
    if not addresses:
        raise ValueError(f"No address records resolved for {hostname}")
    if not all(_address_is_public(address) for address in addresses):
        raise ValueError("Target resolves to a private, local, reserved or unsafe address")
    return addresses


async def validate_public_https_url(
    url: str,
    *,
    allowed_domains: frozenset[str],
) -> str:
    parsed = urlsplit(url)
    if parsed.scheme.lower() != "https":
        raise ValueError("Archivist sources must use HTTPS")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("Credentials are not permitted in source URLs")
    if parsed.hostname is None:
        raise ValueError("Source URL requires a hostname")
    if parsed.port not in (None, 443):
        raise ValueError("Only the standard HTTPS port is permitted")

    hostname = _normalise_domain(parsed.hostname)
    if not allowed_domains:
        raise ValueError("The archivist domain allowlist is empty")
    if not _allowed_host(hostname, allowed_domains):
        raise ValueError(f"Domain is not allowlisted: {hostname}")

    try:
        literal_address = ipaddress.ip_address(hostname)
    except ValueError:
        await _resolve_public_addresses(hostname, parsed.port or 443)
    else:
        if not _address_is_public(str(literal_address)):
            raise ValueError("Literal source address is not public")

    return url


def _extract_text(markup: str, *, max_paragraphs: int) -> tuple[str | None, str, int]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(markup, "html.parser")
    for element in soup.select("script, style, noscript, template, svg"):
        element.decompose()

    title = None
    if soup.title is not None:
        title = " ".join(soup.title.get_text(" ", strip=True).split()) or None

    candidates = soup.select("main p, article p")
    if not candidates:
        candidates = soup.find_all("p")

    paragraphs = []
    for paragraph in candidates[:max_paragraphs]:
        text = " ".join(paragraph.get_text(" ", strip=True).split())
        if text:
            paragraphs.append(text)

    if not paragraphs:
        body = soup.body or soup
        fallback = " ".join(body.get_text(" ", strip=True).split())
        if fallback:
            paragraphs.append(fallback)

    return title, "\n\n".join(paragraphs), len(paragraphs)


async def fetch_source_document(
    target_url: str,
    *,
    policy: FetchPolicy,
) -> SourceDocument:
    """Fetch one allowlisted public HTML document without following unchecked redirects."""

    if not ingest_dependencies_available():
        raise RuntimeError(
            "Archivist network dependencies are unavailable. Install the ml-lab ingest extra."
        )

    import httpx

    current_url = await validate_public_https_url(
        target_url,
        allowed_domains=policy.allowed_domains,
    )
    raw_body = b""
    response_status = 0
    response_content_type = ""
    final_url = current_url

    limits = httpx.Limits(max_connections=4, max_keepalive_connections=2)
    timeout = httpx.Timeout(policy.timeout_seconds)
    headers = {
        "User-Agent": policy.user_agent,
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.8",
    }

    async with httpx.AsyncClient(
        timeout=timeout,
        limits=limits,
        follow_redirects=False,
        headers=headers,
        trust_env=False,
    ) as client:
        for redirect_index in range(policy.max_redirects + 1):
            async with client.stream("GET", current_url) as response:
                response_status = response.status_code
                response_content_type = response.headers.get("content-type", "").split(";", 1)[0]

                if response.status_code in {301, 302, 303, 307, 308}:
                    location = response.headers.get("location")
                    if location is None:
                        raise ValueError("Redirect response omitted Location")
                    if redirect_index >= policy.max_redirects:
                        raise ValueError("Source exceeded the redirect limit")
                    current_url = await validate_public_https_url(
                        urljoin(current_url, location),
                        allowed_domains=policy.allowed_domains,
                    )
                    continue

                if response.status_code != 200:
                    raise ValueError(f"Source returned HTTP {response.status_code}")
                if response_content_type not in {
                    "text/html",
                    "application/xhtml+xml",
                    "text/plain",
                }:
                    raise ValueError(f"Unsupported source content type: {response_content_type}")

                chunks = []
                byte_count = 0
                async for chunk in response.aiter_bytes():
                    byte_count += len(chunk)
                    if byte_count > policy.max_bytes:
                        raise ValueError("Source exceeded the configured byte limit")
                    chunks.append(chunk)
                raw_body = b"".join(chunks)
                final_url = str(response.url)
                break
        else:
            raise ValueError("Source retrieval did not reach a terminal response")

    markup = raw_body.decode("utf-8", errors="replace")
    if response_content_type == "text/plain":
        title = None
        text = "\n".join(line.strip() for line in markup.splitlines() if line.strip())
        paragraph_count = len([line for line in text.splitlines() if line])
    else:
        title, text, paragraph_count = _extract_text(
            markup,
            max_paragraphs=policy.max_paragraphs,
        )
    if not text:
        raise ValueError("Source contained no extractable text")

    return SourceDocument(
        requested_url=target_url,
        final_url=final_url,
        retrieved_at=datetime.now(timezone.utc),
        status_code=response_status,
        content_type=response_content_type,
        title=title,
        text=text,
        source_sha256=hashlib.sha256(raw_body).hexdigest(),
        text_sha256=hashlib.sha256(text.encode("utf-8")).hexdigest(),
        byte_count=len(raw_body),
        paragraph_count=paragraph_count,
    )
