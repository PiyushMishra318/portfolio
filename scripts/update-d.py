#!/usr/bin/env python3
"""Apply portfolio content fixes to d JSON."""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D_PATH = ROOT / "d"

CPBLT = [
    "Distributed Systems",
    "LLM / RAG",
    "PyTorch",
    "Kubernetes",
    "Python",
    "Go",
    "TypeScript",
    "React",
    "Node.js",
    "Microservices",
    "Micro-frontends",
    "AWS",
    "PostgreSQL",
    "Redis",
    "RabbitMQ",
    "WebSockets",
    "Apache Druid",
    "Docker",
    "CI/CD",
    "OpenID Connect",
    "Event-Driven",
    "System Design",
    "Datadog",
    "MCP",
]

# Local assets that must be present in medias (merged into HEAD list, never replace it).
LOCAL_MEDIAS = [
    "./my-image.jpeg",
    "./sinch-converse-resized.png",
    "./sinch-converse-landscape.png",
    "./coot-ai-resized.png",
    "./coot-ai-landscape.png",
    "./coot-cms-resized.png",
    "./coot-cms-landscape.png",
    "./bolt-landscape.png",
    "./coot-ai.png",
    "./wekaala-dark-resized.png",
    "./wekaala-landscape.png",
]

# Smoke / WebGL background — must stay in medias (preloader → window.TEXTURES).
SMOKE_MEDIA = (
    "https://images.prismic.io/chris-folio/3765395e-181f-4f6a-8b4e-3c771d08defe_noise.jpeg"
    "?auto=compress,format"
)

SINCH_LIST_ONLY = {"/billions-analytics"}
COOT_LIST_ONLY = {"/enterprise-rag", "/codeacious-ai", "/codeacious-cms"}
LIST_ONLY = SINCH_LIST_ONLY | COOT_LIST_ONLY

SINCH_IMAGES = ("./sinch-converse-landscape.png", "./sinch-converse-resized.png")
COOT_IMAGES = ("./coot-ai-landscape.png", "./coot-ai-resized.png")
COOT_AI_LOGO = ("./coot-ai.png", "./coot-ai-resized.png")
COOT_CMS_IMAGES = ("./coot-cms-landscape.png", "./coot-cms-resized.png")

GIT_BASE_REF = "e58bcf0:d"
MIN_MEDIAS = 50  # full preload list from HEAD; never shrink below this


def baseline_medias_from_git() -> list[str] | None:
    try:
        raw = subprocess.check_output(
            ["git", "show", GIT_BASE_REF],
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            stderr=subprocess.DEVNULL,
        )
        return json.loads(raw)["medias"]
    except (subprocess.CalledProcessError, OSError, json.JSONDecodeError, KeyError):
        return None


def merge_medias(d: dict) -> list[str]:
    """Keep full preload list + smoke URL + local assets (never replace with LOCAL_MEDIAS only)."""
    existing = list(d.get("medias") or [])
    if len(existing) < MIN_MEDIAS:
        baseline = baseline_medias_from_git()
        if baseline:
            existing = baseline
    medias = list(existing)
    media_set = set(medias)
    for path in (SMOKE_MEDIA, *LOCAL_MEDIAS):
        if path not in media_set:
            medias.append(path)
            media_set.add(path)
    pattern = re.compile(r'data-(?:src|touch)="(\./[^"]+)"')

    def collect_local_refs(obj: object, out: set[str]) -> None:
        if isinstance(obj, dict):
            for v in obj.values():
                collect_local_refs(v, out)
        elif isinstance(obj, list):
            for v in obj:
                collect_local_refs(v, out)
        elif isinstance(obj, str):
            out.update(pattern.findall(obj))

    refs: set[str] = set()
    collect_local_refs(d.get("pages", {}), refs)
    for path in sorted(refs):
        if path not in media_set:
            medias.append(path)
            media_set.add(path)
    return medias


def replace_capabilities_heading(html: str) -> str:
    """Recruiter-facing skills section title (was 'project types I specialize in')."""
    html = html.replace(
        '<p class="home_capabilities_header_title">capabilities</p>',
        '<p class="home_capabilities_header_title">skills</p>',
    )
    html = html.replace(
        '<p> <span>PROJECT TYPES I</span></p><p> <span>SPECIALIZE IN</span></p>',
        '<p> <span>TECHNICAL</span></p><p> <span>SKILLS</span></p>',
    )
    return html


def replace_featured_home(html: str) -> str:
    # Remove third featured title block
    html = re.sub(
        r'<div class="home_featured_title_all_c"><p class="home_featured_nbr">Featured Project</p><p class="home_featured_title"><span>Enterprise RAG</span></p></div>',
        "",
        html,
        count=1,
    )
    # Remove third featured project card
    html = re.sub(
        r'<div class="home_featured_project project_last"><a href="project/enterprise-rag">.*?</a></div>',
        "",
        html,
        count=1,
        flags=re.DOTALL,
    )
    # Mark second project as last
    html = html.replace(
        '<div class="home_featured_project"><a href="project/coot-ai">',
        '<div class="home_featured_project project_last"><a href="project/coot-ai">',
        1,
    )
    # Sinch featured image
    html = html.replace(
        'href="project/sinch-converse"><figure class="home_featured_img"><div class="img_overlay"></div><img class="home_featured_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="./coot-ai-resized.png" data-touch="./coot-ai-resized.png"',
        'href="project/sinch-converse"><figure class="home_featured_img"><div class="img_overlay"></div><img class="home_featured_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="./sinch-converse-resized.png" data-touch="./sinch-converse-resized.png"',
        1,
    )
    # coot already uses coot-ai-landscape.png
    return html


def replace_projects_list(html: str) -> str:
    replacements = [
        (
            'href="project/sinch-converse" data-tindex="0"></a><img class="projects_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="./coot-ai-landscape.png" data-touch="./coot-ai-landscape.png"',
            'href="project/sinch-converse" data-tindex="0"></a><img class="projects_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="./sinch-converse-landscape.png" data-touch="./sinch-converse-landscape.png"',
        ),
        (
            'href="project/sinch-converse" data-tindex="0"></a><img class="projects_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="./coot-ai-landscape.png"',
            'href="project/sinch-converse" data-tindex="0"></a><img class="projects_img_media lazy" data-lazy="data-lazy" src="/blank.png" data-src="./sinch-converse-landscape.png"',
        ),
    ]
    for old, new in replacements:
        html = html.replace(old, new)
    # sinch next page img
    html = re.sub(
        r'(href="project/sinch-converse"[^>]*></a><img class="projects_img_media lazy"[^>]*data-src="\./sinch-converse-landscape\.png"[^>]*/><img class="projects_next_page_img" data-src=")[^"]+(")',
        r'\1./sinch-converse-landscape.png\2',
        html,
        count=1,
    )
    list_img = {
        "enterprise-rag": COOT_IMAGES[0],
        "billions-analytics": SINCH_IMAGES[0],
        "codeacious-ai": COOT_IMAGES[0],
        "codeacious-cms": COOT_CMS_IMAGES[0],
    }
    for slug_name, img in list_img.items():
        html = re.sub(
            rf'(href="project/{re.escape(slug_name)}"[^>]*></a><img class="projects_img_media lazy"[^>]*data-src=")[^"]+(" data-touch=")[^"]+(")',
            rf"\1{img}\2{img}\3",
            html,
            count=1,
        )
        html = re.sub(
            rf'(href="project/{re.escape(slug_name)}"[^>]*></a><img class="projects_img_media lazy"[^>]*/><img class="projects_next_page_img" data-src=")[^"]+(")',
            rf"\1{img}\2",
            html,
            count=1,
        )
    return html


def replace_project_images(html: str, slug: str) -> str:
    if slug == "/sinch-converse":
        html = re.sub(
            r'data-src="\./[^"]+"',
            lambda m, n=[0]: (
                f'data-src="{SINCH_IMAGES[0]}"'
                if (n.__setitem__(0, n[0] + 1) or n[0]) == 1
                else f'data-src="{SINCH_IMAGES[1]}"'
            ),
            html,
            count=2,
        )
        html = re.sub(
            r'data-touch="\./[^"]+"',
            lambda m, n=[0]: (
                f'data-touch="{SINCH_IMAGES[0]}"'
                if (n.__setitem__(0, n[0] + 1) or n[0]) == 1
                else f'data-touch="{SINCH_IMAGES[1]}"'
            ),
            html,
            count=2,
        )
        # replace remaining coot refs in sinch page
        html = html.replace("./coot-ai-landscape.png", SINCH_IMAGES[0])
        html = html.replace("./coot-ai-resized.png", SINCH_IMAGES[1])
    elif slug == "/coot-ai":
        html = html.replace("./coot-ai-landscape.png", COOT_IMAGES[0])
        html = html.replace("./coot-ai-resized.png", COOT_IMAGES[1])
    elif slug in SINCH_LIST_ONLY:
        html = html.replace("./coot-ai-landscape.png", SINCH_IMAGES[0])
        html = html.replace("./coot-ai-resized.png", SINCH_IMAGES[1])
        html = html.replace("./placeholder.svg", SINCH_IMAGES[0])
    elif slug in COOT_LIST_ONLY:
        images = COOT_CMS_IMAGES if slug == "/codeacious-cms" else (
            COOT_AI_LOGO if slug == "/codeacious-ai" else COOT_IMAGES
        )
        html = html.replace("./placeholder.svg", images[0])
        html = html.replace("./bolt-landscape.png", images[0])
        html = html.replace("./coot-ai-landscape.png", images[0])
        html = html.replace("./coot-ai-resized.png", images[1])
        html = html.replace("./coot-ai.png", images[0])
        if slug == "/codeacious-cms":
            html = html.replace("./coot-cms-landscape.png", images[0])
            html = html.replace("./coot-cms-resized.png", images[1])
    return html


def simplify_list_only_hero(html: str, title: str, subtitle: str, skills: str) -> str:
    """Trim list-only case studies to hero + description only."""
    # Update hero skills block
    html = re.sub(
        r"<p class=\"project_hero_roles_p\">.*?</p>",
        f"<p class=\"project_hero_roles_p\">{skills}</p>",
        html,
        count=1,
        flags=re.DOTALL,
    )
    html = re.sub(
        r"<h2>Platform For<br>Everyone</h2>",
        f"<h2>{subtitle}</h2>",
        html,
        count=1,
    )
    # Hide heavy media sections by replacing image galleries with placeholder only
    return html


def main() -> None:
    d = json.loads(D_PATH.read_text(encoding="utf-8"))

    d["pages"]["/"]["cpblt"] = CPBLT
    home_html = replace_featured_home(d["pages"]["/"]["html"])
    d["pages"]["/"]["html"] = replace_capabilities_heading(home_html)
    d["pages"]["/projects"]["html"] = replace_projects_list(d["pages"]["/projects"]["html"])

    list_only_meta = {
        "/enterprise-rag": (
            "On-device RAG",
            "PyTorch<br>Hugging Face<br>vLLM<br>ChromaDB",
        ),
        "/billions-analytics": (
            "Billions-scale analytics",
            "Apache Druid<br>Trino<br>Datadog",
        ),
        "/codeacious-ai": (
            "AI model platform",
            "GPT-4<br>Stable Diffusion<br>MongoDB",
        ),
        "/codeacious-cms": (
            "Headless CMS",
            "AWS Lambda<br>CloudFront<br>Kubernetes",
        ),
    }

    d["pages"]["projects"]["/sinch-converse"]["html"] = replace_project_images(
        d["pages"]["projects"]["/sinch-converse"]["html"], "/sinch-converse"
    )
    d["pages"]["projects"]["/coot-ai"]["html"] = replace_project_images(
        d["pages"]["projects"]["/coot-ai"]["html"], "/coot-ai"
    )

    for slug, (subtitle, skills) in list_only_meta.items():
        html = replace_project_images(d["pages"]["projects"][slug]["html"], slug)
        html = simplify_list_only_hero(html, slug.strip("/"), subtitle, skills)
        d["pages"]["projects"][slug]["html"] = html

    d["data"]["media"] = SMOKE_MEDIA
    d["medias"] = merge_medias(d)

    D_PATH.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Updated", D_PATH)
    print("cpblt:", CPBLT)


if __name__ == "__main__":
    main()
