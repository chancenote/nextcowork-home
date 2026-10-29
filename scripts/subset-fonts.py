#!/usr/bin/env python3
"""Create the common core-page font; keep upstream subsets as fallback.

Requires fontTools with WOFF2 support: python3 -m pip install 'fonttools[woff]'
See fonts/pretendard-v1.3.9/README.md for the pinned source and exact command.
"""

import argparse
import hashlib
import re
from html.parser import HTMLParser
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE_SHA256 = "9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4"
ROUTES = (
    "index.html", "flexoffice/index.html", "ai-campus/index.html",
    "public/index.html", "coaching/index.html", "about/index.html",
    "insights/index.html", "contact/index.html", "privacy/index.html",
)
FONT_DIR = "fonts/pretendard-v1.3.9"
START = "/* CORE-FONT:START */"
END = "/* CORE-FONT:END */"


class BodyText(HTMLParser):
    """Collect body text without scripts, styles, templates or HTML attributes."""

    def __init__(self):
        super().__init__()
        self.in_body = False
        self.skipped = []
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag == "body":
            self.in_body = True
        if tag in ("script", "style", "template", "noscript"):
            self.skipped.append(tag)

    def handle_endtag(self, tag):
        if tag == "body":
            self.in_body = False
        if self.skipped and self.skipped[-1] == tag:
            self.skipped.pop()

    def handle_data(self, data):
        if self.in_body and not self.skipped:
            self.parts.append(data)


def unicode_ranges(codepoints):
    ranges = []
    start = end = None
    for point in sorted(codepoints):
        if end is not None and point == end + 1:
            end = point
            continue
        if start is not None:
            ranges.append(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}")
        start = end = point
    if start is not None:
        ranges.append(f"U+{start:X}" if start == end else f"U+{start:X}-{end:X}")
    return ",".join(ranges)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    args = parser.parse_args()
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != SOURCE_SHA256:
        parser.error("source does not match the pinned Pretendard 1.3.9 WOFF2")

    requested = {0x20}
    for route in ROUTES:
        body = BodyText()
        body.feed((ROOT / route).read_text(encoding="utf-8"))
        requested.update(ord(c) for c in "".join(body.parts) if not c.isspace())

    font = TTFont(args.source, recalcTimestamp=False)
    supported = requested.intersection(font.getBestCmap())
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.glyph_names = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=supported)
    subsetter.subset(font)

    # The OFL reserves the upstream font name. Rename this derivative's
    # embedded family/instance names, retaining original copyright credits.
    naming_ids = {1, 3, 4, 6, 16, 25}
    naming_ids.update(instance.postscriptNameID for instance in font["fvar"].instances)
    for name in font["name"].names:
        if name.nameID in naming_ids:
            value = name.toUnicode().replace("Pretendard Variable", "NCW Core Sans")
            value = value.replace("PretendardVariable", "NCWCoreSans")
            name.string = value.encode(name.getEncoding())

    from io import BytesIO
    output = BytesIO()
    font.save(output)
    font.close()
    data = output.getvalue()
    # Font responses are immutable. Changed bytes must always get a new URL.
    font_path = f"{FONT_DIR}/common-core-{hashlib.sha256(data).hexdigest()[:12]}.woff2"
    if len(data) > 300_000:
        parser.error(f"common font is too large ({len(data):,} bytes); no files written")
    if set(TTFont(BytesIO(data)).getBestCmap()) != supported:
        parser.error("generated font character coverage differs from its CSS range")

    rule = f"""{START}
/* Core-page characters take precedence; original subsets cover all other text.
   The derivative uses the existing CSS alias to preserve site typography. */
@font-face {{
  font-family: 'Pretendard Variable';
  font-style: normal;
  font-weight: 45 920;
  font-display: swap;
  src: url(/{font_path}) format('woff2-variations');
  unicode-range: {unicode_ranges(supported)};
}}
{END}"""
    css_path = ROOT / "css/fonts.css"
    css = css_path.read_text(encoding="utf-8")
    if START in css:
        if css.count(START) != 1 or css.count(END) != 1:
            parser.error("common-font CSS markers are ambiguous; no files written")
        css = re.sub(re.escape(START) + r"[\s\S]*?" + re.escape(END), lambda _: rule, css)
    else:
        css = css.rstrip() + "\n\n" + rule + "\n"
    (ROOT / font_path).write_bytes(data)
    css_path.write_text(css, encoding="utf-8")
    print(f"{font_path}: {len(supported)} characters, {len(data):,} bytes")
    print("Unsupported characters kept on existing fallback:",
          ", ".join(f"U+{cp:04X}" for cp in sorted(requested - supported)))


if __name__ == "__main__":
    main()
