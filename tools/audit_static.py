"""Static integrity audit for the landing page (no browser required)."""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}

problems: list[str] = []
notes: list[str] = []


class Audit(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.ids: list[str] = []
        self.classes: set[str] = set()
        self.refs: list[str] = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d:
            self.ids.append(d["id"])
        if "class" in d:
            self.classes.update(c for c in d["class"].split() if c)
        for key in ("src", "href"):
            if key in d and d[key]:
                self.refs.append(d[key])
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1][0] == tag:
            self.stack.pop()

    def handle_endtag(self, tag):
        if not self.stack:
            problems.append(f"HTML: лишний закрывающий </{tag}>")
            return
        if self.stack[-1][0] != tag:
            # try to recover: nearest matching open tag
            names = [t for t, _ in self.stack]
            if tag in names:
                idx = len(names) - 1 - names[::-1].index(tag)
                unclosed = [t for t, _ in self.stack[idx + 1:]]
                problems.append(f"HTML: </{tag}> закрывает не тот тег, не закрыты: {unclosed}")
                del self.stack[idx:]
            else:
                problems.append(f"HTML: закрывающий </{tag}> без открывающего")
            return
        self.stack.pop()


html_text = (ROOT / "index.html").read_text(encoding="utf-8")
audit = Audit()
audit.feed(html_text)
audit.close()

if audit.stack:
    problems.append(f"HTML: не закрыты теги {audit.stack}")

dupes = {i for i in audit.ids if audit.ids.count(i) > 1}
if dupes:
    problems.append(f"HTML: дублирующиеся id {sorted(dupes)}")

# --- local references exist ---
for ref in audit.refs:
    if ref.startswith(("http://", "https://", "mailto:", "tel:", "#", "data:")):
        continue
    p = (ROOT / ref.split("#")[0]).resolve()
    if not p.exists():
        problems.append(f"HTML: файл не найден -> {ref}")

# --- JS ids and classes ---
js_text = (ROOT / "script.js").read_text(encoding="utf-8")
for js_id in set(re.findall(r'getElementById\("([^"]+)"\)', js_text)):
    if js_id not in audit.ids:
        problems.append(f"JS: getElementById('{js_id}') отсутствует в HTML")

for sel in set(re.findall(r'querySelector(?:All)?\("\.([A-Za-z0-9_-]+)"\)', js_text)):
    audit.classes.add(sel)

for cls in set(re.findall(r'class="([^"]+)"', js_text)):
    audit.classes.update(c for c in cls.split() if c and "${" not in c)
for cls in set(re.findall(r'classList\.(?:add|toggle|remove)\("([^"]+)"', js_text)):
    audit.classes.add(cls)

# --- CSS ---
css_text = (ROOT / "styles.css").read_text(encoding="utf-8")
css_no_comments = re.sub(r"/\*.*?\*/", "", css_text, flags=re.S)

if css_no_comments.count("{") != css_no_comments.count("}"):
    problems.append(
        f"CSS: несбалансированные скобки {{={css_no_comments.count('{')} }}={css_no_comments.count('}')}"
    )

defined_vars = set(re.findall(r"(--[a-z0-9-]+)\s*:", css_no_comments))
used_vars = set(re.findall(r"var\((--[a-z0-9-]+)", css_no_comments))
missing_vars = used_vars - defined_vars
if missing_vars:
    problems.append(f"CSS: неопределённые переменные {sorted(missing_vars)}")

css_classes = set(re.findall(r"\.([A-Za-z][A-Za-z0-9_-]*)", css_no_comments))
# ignore decimals/fragments such as .5em captured inside values
css_classes = {c for c in css_classes if not c[0].isdigit()}

missing_classes = sorted(c for c in audit.classes if c not in css_classes)
if missing_classes:
    notes.append(f"Классы без собственных правил в CSS (возможно, норма): {missing_classes}")

unused_css = sorted(
    c for c in css_classes
    if c not in audit.classes and not c.startswith(("is-", "modal-open", "grid"))
)
if unused_css:
    notes.append(f"CSS-классы, не встречающиеся в HTML/JS: {unused_css}")

# --- images from data ---
slugs = re.findall(r'slug: "([a-z-]+)"', js_text)
if len(slugs) != 8:
    problems.append(f"JS: ожидалось 8 болезней, найдено {len(slugs)}")
if len(set(slugs)) != len(slugs):
    problems.append("JS: повторяющиеся slug")

for slug in slugs:
    for kind in ("thumbs", "large"):
        p = ROOT / "images" / kind / f"{slug}.webp"
        if not p.exists():
            problems.append(f"Изображение не найдено: images/{kind}/{slug}.webp")

# --- sources present ---
for name in ("emblem.webp", "mark.svg"):
    if not (ROOT / "assets" / name).exists():
        problems.append(f"Ассет не найден: assets/{name}")

# --- asset weight ---
total = sum(p.stat().st_size for p in (ROOT / "images").rglob("*.webp"))
notes.append(f"Вес web-производных изображений: {total / 1024 / 1024:.2f} МБ")

print("ПРОВЕРЕНО:", len(audit.ids), "id,", len(audit.classes), "классов,", len(slugs), "болезней")
for n in notes:
    print("  ·", n)
if problems:
    print("\nПРОБЛЕМЫ:")
    for p in problems:
        print("  ✗", p)
    sys.exit(1)
print("\nOK: проблем не найдено")
