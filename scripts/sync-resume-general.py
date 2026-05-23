#!/usr/bin/env python3
"""Sync portfolio/d copy with overleaf/sample.tex (source of truth)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D_PATH = ROOT / "d"

REPLACEMENTS = [
    (
        "Software Engineer III · AI Systems & Distributed Infrastructure",
        "Senior Software Engineer · AI Systems & Distributed Infrastructure",
    ),
    (
        "Strong CS fundamentals—algorithms (B-tree indexing, LRU cache design), data structures, and system design.",
        "Strong CS fundamentals—hands-on production use of B-tree hierarchical indexing, LRU cache design, and distributed systems patterns.",
    ),
    (
        "99.99% uptime SLA",
        "99.99% uptime with defined SLOs",
    ),
    (
        "Python · Go · Rust · Java · C++",
        "Python · Go · Rust",
    ),
    (
        "Built and deployed an internal RAG pipeline enabling natural-language querying over enterprise data with all computation on-device and zero external data egress.",
        "Built and deployed an internal RAG pipeline for natural-language querying over enterprise data; embeddings via Hugging Face Transformers, vector storage in ChromaDB and Milvus, inference via vLLM and llama.cpp (PyTorch); all computation on-device with zero external data egress.",
    ),
    (
        "Embeddings and retrieval via Hugging Face Transformers, vector storage in ChromaDB and Milvus, inference served through vLLM and llama.cpp on PyTorch.",
        "Hugging Face embeddings, ChromaDB/Milvus vector storage, and vLLM/llama.cpp inference on PyTorch—privacy-first, on-device serving with zero external data egress.",
    ),
    (
        "Multi-tenant self-serve SaaS for WhatsApp, RCS, and SMS campaigns serving 3,000+ SMEs at 99.99% uptime with defined SLOs—with real-time agent handoff and reliable billing at scale.",
        "Multi-tenant self-serve SaaS for WhatsApp, RCS, and SMS campaign management serving 3,000+ SMEs at 99.99% uptime; real-time live agent handoff and reliable billing at scale.",
    ),
    (
        "Built multi-tenant SaaS with WebSocket live-agent routing (defined SLOs, fault-tolerant design), RabbitMQ pipelines, and a billing gateway on PostgreSQL/MySQL—deployed on Kubernetes at 99.99% uptime with defined SLOs.",
        "Owned the real-time live agent system (WebSockets, RabbitMQ, Redis) and billing gateway—multi-tenant SaaS serving 3,000+ SMEs at 99.99% uptime with defined SLOs; PostgreSQL and MySQL on Kubernetes.",
    ),
    (
        "Built a high-scale reporting module surfacing traffic analytics across billions of messages with sub-second aggregation queries for campaign and operations teams.",
        "High-scale analytics reporting across billions of messages; Apache Druid and Trino for sub-second aggregation queries with Datadog and Prometheus observability.",
    ),
    (
        "Apache Druid and Trino for sub-second OLAP; LRU-cache-backed message retrieval for real-time chat thread virtualisation; custom Apache Superset plugin; Datadog/Prometheus observability.",
        "Apache Druid and Trino for sub-second OLAP; LRU-cache-backed message retrieval for real-time chat thread virtualisation; custom Apache Superset plugin backed by Presto queries.",
    ),
    (
        "Sole architect and engineer for an AI model aggregation platform unifying GPT-3/4 and Stable Diffusion behind a single interface with an extensible plugin system.",
        "Sole architect and engineer for an AI model aggregation platform unifying GPT-3/4 and Stable Diffusion behind a single API with an extensible plugin system (MongoDB); production-ready MVP in five months.",
    ),
    (
        "Designed the model-routing layer, B-tree-indexed plugin registry, and API contract from scratch—delivering a production-ready MVP in five months across infra, backend, and frontend.",
        "Designed the model-routing layer and B-tree-indexed plugin registry; authored the full API contract from scratch.",
    ),
    (
        "opencoot evolved from a unified model aggregation layer into a privacy-first desktop automation platform with on-device LLM inference and zero cloud dependency.",
        "Local-first desktop automation built with Rust (Tauri) and TypeScript; evolved from unified AI model aggregation (GPT-3/4, Stable Diffusion) into 20+ MCP connectors with B-tree-indexed plugin registry and on-device llama.cpp inference.",
    ),
    (
        "Visual workflow builder, 20+ MCP-based service connectors, B-tree-indexed plugin registry, and on-device LLM inference via llama.cpp—zero cloud dependency for strict data-egress environments.",
        "20+ MCP-based service connectors, B-tree-indexed plugin registry, and on-device llama.cpp inference—zero cloud dependency for strict data-egress environments.",
    ),
    (
        "Kubernetes · AWS",
        "Kubernetes · AWS · GCP Vertex AI",
    ),
]

CPBLT_REMOVE = ["Java"]
CPBLT_ADD = ["GCP Vertex AI"]


def apply_replacements(obj: object, missing: list[str]) -> None:
    if isinstance(obj, dict):
        for key, val in obj.items():
            if isinstance(val, str):
                for old, new in REPLACEMENTS:
                    if old in val:
                        obj[key] = val.replace(old, new)
                        val = obj[key]
            else:
                apply_replacements(val, missing)
    elif isinstance(obj, list):
        for i, val in enumerate(obj):
            if isinstance(val, str):
                for old, new in REPLACEMENTS:
                    if old in val:
                        obj[i] = val.replace(old, new)
            else:
                apply_replacements(val, missing)


def main() -> None:
    d = json.loads(D_PATH.read_text(encoding="utf-8"))
    raw_before = json.dumps(d, ensure_ascii=False)
    missing = [old[:100] for old, _ in REPLACEMENTS if old not in raw_before]

    apply_replacements(d, missing)

    if missing:
        print("Warning: strings not found (may already be synced):")
        for m in missing:
            print(" -", m)
    cpblt = d["pages"]["/"].get("cpblt", [])
    for skill in CPBLT_REMOVE:
        if skill in cpblt:
            cpblt.remove(skill)
    for skill in CPBLT_ADD:
        if skill not in cpblt:
            idx = cpblt.index("AWS") if "AWS" in cpblt else len(cpblt)
            cpblt.insert(idx, skill)
    d["pages"]["/"]["cpblt"] = cpblt

    D_PATH.write_text(
        json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print("Synced", D_PATH)


if __name__ == "__main__":
    main()
