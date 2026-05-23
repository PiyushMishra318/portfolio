#!/usr/bin/env python3
"""Apply Senior removal + project logo assignments to portfolio/d."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D_PATH = ROOT / "d"

SINCH_SLUGS = {"/billions-analytics"}
COOT_SLUGS = {"/enterprise-rag", "/codeacious-ai", "/codeacious-cms"}

SINCH_LIST_IMG = "./sinch-converse-landscape.png"
SINCH_DETAIL = ("./sinch-converse-landscape.png", "./sinch-converse-resized.png")
COOT_LIST_IMG = "./coot-ai-landscape.png"
COOT_DETAIL = ("./coot-ai-landscape.png", "./coot-ai-resized.png")
COOT_CMS_DETAIL = ("./coot-cms-landscape.png", "./coot-cms-resized.png")
COOT_AI_LOGO_DETAIL = ("./coot-ai.png", "./coot-ai-resized.png")


def strip_senior(text: str) -> str:
    text = text.replace(
        "Senior Software Engineer · AI Systems & Distributed Infrastructure",
        "Software Engineer · AI Systems & Distributed Infrastructure",
    )
    text = text.replace("Senior engineer building", "Software engineer building")
    text = re.sub(r"Senior Designer\s*→\s*", "Software Engineer → ", text)
    text = re.sub(r"Senior Designer.{0,40}?Piyush Mishra", "Software Engineer → Piyush Mishra", text)
    return text


def set_project_list_image(html: str, slug_name: str, img: str) -> str:
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


def replace_detail_images(html: str, primary: str, secondary: str) -> str:
    html = html.replace("./placeholder.svg", primary)
    html = re.sub(
        r'data-src="\./[^"]+"',
        lambda m, n=[0]: (
            f'data-src="{primary}"'
            if (n.__setitem__(0, n[0] + 1) or n[0]) == 1
            else f'data-src="{secondary}"'
        ),
        html,
        count=2,
    )
    html = re.sub(
        r'data-touch="\./[^"]+"',
        lambda m, n=[0]: (
            f'data-touch="{primary}"'
            if (n.__setitem__(0, n[0] + 1) or n[0]) == 1
            else f'data-touch="{secondary}"'
        ),
        html,
        count=2,
    )
    for old in [
        "./coot-ai-landscape.png",
        "./coot-ai-resized.png",
        "./coot-ai.png",
        "./coot-cms-landscape.png",
        "./coot-cms-resized.png",
        "./bolt-landscape.png",
        "./sinch-converse-landscape.png",
        "./sinch-converse-resized.png",
    ]:
        if old not in (primary, secondary):
            html = html.replace(old, secondary if "resized" in old or "cms" in old else primary)
    return html


def main() -> None:
    raw = D_PATH.read_text(encoding="utf-8")
    raw = strip_senior(raw)
    d = json.loads(raw)

    projects_html = d["pages"]["/projects"]["html"]
    projects_html = set_project_list_image(projects_html, "enterprise-rag", COOT_LIST_IMG)
    projects_html = set_project_list_image(projects_html, "billions-analytics", SINCH_LIST_IMG)
    projects_html = set_project_list_image(projects_html, "codeacious-ai", COOT_LIST_IMG)
    projects_html = set_project_list_image(
        projects_html, "codeacious-cms", "./coot-cms-landscape.png"
    )
    d["pages"]["/projects"]["html"] = projects_html

    detail_map = {
        "/enterprise-rag": COOT_DETAIL,
        "/billions-analytics": SINCH_DETAIL,
        "/codeacious-ai": COOT_AI_LOGO_DETAIL,
        "/codeacious-cms": COOT_CMS_DETAIL,
    }
    for slug, (primary, secondary) in detail_map.items():
        html = d["pages"]["projects"][slug]["html"]
        d["pages"]["projects"][slug]["html"] = replace_detail_images(html, primary, secondary)

    D_PATH.write_text(
        json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print("Updated", D_PATH)


if __name__ == "__main__":
    main()
