#!/usr/bin/env python3
"""Apply May 2026 overleaf/sample.tex copy deltas to portfolio/d (UTF-8 safe)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D_PATH = ROOT / "d"

REPLACEMENTS = [
    (
        "Multi-tenant SaaS, billions-scale analytics, micro-frontends, and<br>local-first AI—with measurable impact.",
        "Multi-tenant SaaS, billions-message analytics, micro-frontends, and<br>local-first AI—70% fewer bugs, 50% faster loads, 3× PageSpeed uplift.",
    ),
    (
        "Software engineer with 5+ years building multi-tenant SaaS, billions-scale analytics, micro-frontends, and local-first AI—with end-to-end ownership from API to K8s.",
        "Software engineer with 5+ years building distributed systems at scale—multi-tenant SaaS, billions-message analytics pipelines, micro-frontend platforms, and local-first AI tooling—with end-to-end ownership from API to Kubernetes.",
    ),
    (
        "I build multi-tenant messaging SaaS (Converse), local-first automation (opencoot), and on-device RAG—with measurable impact: 70% fewer production bugs, 50% faster loads, and 99.99% uptime with defined SLOs at scale.",
        "I build multi-tenant messaging SaaS (Converse), a visual-workflow local-first automation platform (opencoot), and on-device RAG—plus ML-driven test generation and platform-wide MFA. Measurable impact: 70% fewer production bugs, 50% faster loads, 3× PageSpeed uplift, sub-second analytics at billions scale, and 99.99% uptime with defined SLOs.",
    ),
    (
        "into 20+ MCP connectors with B-tree-indexed plugin registry and on-device llama.cpp inference.",
        "into a visual workflow builder with 20+ MCP connectors and a B-tree-indexed plugin registry, with on-device llama.cpp inference.",
    ),
    (
        "Approach 20+ MCP-based service connectors, B-tree-indexed plugin registry, and on-device llama.cpp inference—zero cloud dependency for strict data-egress environments.",
        "Approach Visual workflow builder with 20+ MCP-based service connectors, B-tree-indexed plugin registry, and on-device llama.cpp inference—zero cloud dependency for strict data-egress environments.",
    ),
    (
        "PostgreSQL and MySQL on Kubernetes.",
        "PostgreSQL and MySQL on Kubernetes. Led 10–12 micro-frontend migration, ML-driven automated test generation, and application-wide MFA via OpenID Connect.",
    ),
    (
        "5+ years building multi-tenant SaaS,<br/> billions-scale analytics, micro-frontends, and local-first AI—<br/> with end-to-end ownership from API to K8s.",
        "5+ years building distributed systems at scale—multi-tenant SaaS,<br/> billions-message analytics pipelines, micro-frontend platforms, and local-first AI tooling—<br/> with end-to-end ownership from API to Kubernetes.",
    ),
    (
        "I build<br/> multi-tenant messaging SaaS (Converse), local-first<br/> automation (opencoot), and on-device RAG—with<br/> measurable impact: 70% fewer production bugs,<br/> 50% faster loads, and 99.99% uptime with defined SLOs at scale.",
        "I build<br/> multi-tenant messaging SaaS (Converse), a visual-workflow<br/> local-first automation platform (opencoot), and on-device RAG—plus<br/> ML-driven test generation and platform-wide MFA. Measurable impact:<br/> 70% fewer production bugs, 50% faster loads, 3× PageSpeed uplift,<br/> sub-second analytics at billions scale, and 99.99% uptime with defined SLOs.",
    ),
    (
        "20+ MCP-based service connectors, B-tree-indexed plugin registry, and on-device llama.cpp inference—zero cloud dependency for strict data-egress environments.",
        "Visual workflow builder with 20+ MCP-based service connectors, B-tree-indexed plugin registry, and on-device llama.cpp inference—zero cloud dependency for strict data-egress environments.",
    ),
]


def apply_to_obj(obj: object, missing: list[str]) -> None:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str):
                for old, new in REPLACEMENTS:
                    if old in v:
                        obj[k] = v.replace(old, new)
                        v = obj[k]
                    elif old[:60] in (m[:60] for m in missing):
                        pass
            else:
                apply_to_obj(v, missing)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            if isinstance(v, str):
                for old, new in REPLACEMENTS:
                    if old in v:
                        obj[i] = v.replace(old, new)
            else:
                apply_to_obj(v, missing)


def main() -> None:
    d = json.loads(D_PATH.read_text(encoding="utf-8"))
    raw_before = json.dumps(d, ensure_ascii=False)
    missing = [old for old, _ in REPLACEMENTS if old not in raw_before]
    apply_to_obj(d, missing)
    if missing:
        print("Warning: patterns not found:")
        for m in missing:
            print(" -", m[:90])

    D_PATH.write_text(
        json.dumps(d, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print("Updated", D_PATH)


if __name__ == "__main__":
    main()
