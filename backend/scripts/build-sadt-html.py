"""Rebuild the blank SADT HTML from page 1 of the supplied reference PDF.

Development tool only: pip install pdfplumber pypdf fonttools.
No raster background, PDF iframe or replacement of the production pdf-lib engine.
"""
import argparse
import base64
import html
import io
import json
import re
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable

ROOT = Path(__file__).resolve().parents[2]
DRAWING_SCALE = 16


def number(value):
    return raw_number(float(value) * DRAWING_SCALE)


def raw_number(value):
    return f"{float(value):.5f}".rstrip("0").rstrip(".") or "0"


def color(value):
    if value is None:
        return "#000"
    if isinstance(value, (int, float)):
        value = [value] * 3
    if len(value) == 1:
        value = list(value) * 3
    return "rgb(" + ",".join(str(round(float(v) * 255)) for v in value[:3]) + ")"


def unicode_map(stream):
    result = {}
    text = stream.decode("ascii")
    for block in re.findall(r"beginbfchar(.*?)endbfchar", text, re.S):
        for source, target in re.findall(r"<([0-9a-f]+)>\s*<([0-9a-f]+)>", block, re.I):
            result[int(source, 16)] = bytes.fromhex(target).decode("utf-16-be")
    for block in re.findall(r"beginbfrange(.*?)endbfrange", text, re.S):
        for start, end, target in re.findall(r"<([0-9a-f]+)>\s*<([0-9a-f]+)>\s*<([0-9a-f]+)>", block, re.I):
            for source in range(int(start, 16), int(end, 16) + 1):
                result[source] = chr(int(target, 16) + source - int(start, 16))
    if not result:
        raise ValueError("Reference font has no supported Unicode mapping")
    return result


def embedded_fonts(page):
    rules, families = [], {}
    for index, reference in enumerate(page["/Resources"]["/Font"].values()):
        font = reference.get_object()
        descendant = font["/DescendantFonts"][0].get_object()
        if descendant.get("/CIDToGIDMap") != "/Identity":
            raise ValueError("Expected identity glyph mapping in the reference font")
        data = descendant["/FontDescriptor"]["/FontFile2"].get_object().get_data()
        ttf = TTFont(io.BytesIO(data))
        order = ttf.getGlyphOrder()
        mapping = {}
        for glyph_id, text in unicode_map(font["/ToUnicode"].get_object().get_data()).items():
            if len(text) == 1 and glyph_id < len(order):
                mapping.setdefault(ord(text), order[glyph_id])
        # PDF CID fonts have no browser-usable Unicode cmap. Restore it while
        # preserving the embedded glyph outlines and original font metrics.
        cmap = newTable("cmap")
        cmap.tableVersion = 0
        subtable = CmapSubtable.newSubtable(4)
        subtable.platformID, subtable.platEncID, subtable.language = 3, 1, 0
        subtable.cmap = mapping
        cmap.tables = [subtable]
        ttf["cmap"] = cmap
        ttf.flavor = "woff"
        output = io.BytesIO()
        ttf.save(output)
        family = f"SadtReference{index + 1}"
        families[str(font["/BaseFont"]).lstrip("/")] = family
        encoded = base64.b64encode(output.getvalue()).decode("ascii")
        rules.append(f"@font-face{{font-family:{family};src:url(data:font/woff;base64,{encoded}) format('woff');font-weight:normal;font-style:normal;font-display:block}}")
    return rules, families


def text_runs(page):
    runs = []
    for character in page.chars:
        baseline = page.height - character["matrix"][5]
        if (not runs or runs[-1]["font"] != character["fontname"]
                or abs(runs[-1]["size"] - character["size"]) > .001
                or abs(runs[-1]["baseline"] - baseline) > .05
                or character["x0"] < runs[-1]["end"] - .3
                or character["x0"] - runs[-1]["end"] > 10):
            runs.append({"font": character["fontname"], "size": character["size"],
                         "x": character["x0"], "baseline": baseline, "end": character["x1"], "chars": []})
        runs[-1]["chars"].append(character)
        runs[-1]["end"] = character["x1"]
    return runs


def input_cells(page, anchors):
    bounds = {1:(27,98),4:(29,128),5:(135,343),6:(350,450),7:(453,663),8:(29,216),9:(220,318),11:(608,749),16:(261,301),17:(305,462),18:(466,494),19:(496,562),22:(71,172),24:(29,61),25:(61,167),27:(698,741),28:(742,787)}
    result = {}
    for field, (left, right) in bounds.items():
        label = next(item for item in anchors if item['field'] == field)
        maximum = 5 if field in (24,25,27,28) else 1
        characters = [c for c in page.chars if left <= c['x0'] < right and label['baseline']+3 < page.height-c['matrix'][5] < label['baseline']+(60 if maximum==5 else 18)]
        baselines = sorted({round(page.height-c['matrix'][5],2) for c in characters if c['text']=='_'})[:maximum]
        rows = []
        for baseline in baselines:
            row = sorted([c for c in characters if abs(page.height-c['matrix'][5]-baseline)<.05], key=lambda c:c['x0'])
            bars = [index for index,c in enumerate(row) if c['text']=='|']
            centers = []
            for start,end in zip(bars,bars[1:]):
                content = ''.join(c['text'] for c in row[start+1:end])
                if '_' in content and '/' not in content and row[end]['x0']-row[start]['x0']<16:
                    centers.append(round((row[start]['x1']+row[end]['x0'])/2,4))
            rows.append({'baseline':baseline,'centers':centers})
        result[str(field)] = rows
    return result


def build(source, destination):
    reader = PdfReader(source)
    font_rules, families = embedded_fonts(reader.pages[0])
    parts, anchors = [], []
    with pdfplumber.open(source) as document:
        page = document.pages[0]
        # Preserve painting order: white field backgrounds precede their borders.
        shapes = list(page.iter_layout_objects(page.layout._objs))
        for shape in shapes:
            if shape["object_type"] not in ("rect", "curve", "line"):
                continue
            if shape["x0"] > 800 and shape["top"] > 565 and shape["width"] < 22 and shape["height"] < 12:
                continue  # Outlined digits in the manual's page number 417.
            if shape["object_type"] == "line":
                parts.append(f'<div class="rule" style="left:{number(shape["x0"])}pt;top:{number(shape["top"])}pt;width:{number(max(shape["width"],shape["linewidth"]))}pt;height:{number(max(shape["height"],shape["linewidth"]))}pt;background:{color(shape["stroking_color"])}"></div>')
                continue
            if not shape["fill"]:
                continue
            if shape["object_type"] == "rect":
                parts.append(f'<div class="rule" style="left:{number(shape["x0"])}pt;top:{number(shape["top"])}pt;width:{number(shape["width"])}pt;height:{number(shape["height"])}pt;background:{color(shape["non_stroking_color"])}"></div>')
                continue
            if any(segment[0] not in ("m", "l", "h") for segment in shape["path"]):
                raise ValueError("Unsupported curved shape: manual conversion required")
            width, height = shape["width"], shape["height"]
            if width <= 0 or height <= 0:
                continue
            points = ",".join(f'{raw_number((x-shape["x0"])/width*100)}% {raw_number((y-shape["top"])/height*100)}%' for x, y in shape["pts"])
            parts.append(f'<div class="rule" style="left:{number(shape["x0"])}pt;top:{number(shape["top"])}pt;width:{number(width)}pt;height:{number(height)}pt;background:{color(shape["non_stroking_color"])};clip-path:polygon({points})"></div>')
        for run in text_runs(page):
            text = "".join(c["text"] for c in run["chars"])
            if text.strip() in ("417", "12345678901234567890", "Logo da Empresa"):
                continue  # Manual pagination and illustrative guide number.
            if text.strip() == "'" and run["x"] > 790:
                continue  # Isolated sample mark inside the clinical indication.
            fields = [match for match in re.finditer(r"(?<!\d)(\d{1,2})\s*[-–]\s*(?=[A-Za-zÀ-ÿ])", text) if 1 <= int(match[1]) <= 68]
            attribute = ' data-field-label="' + ' '.join(match[1] for match in fields) + '"' if fields else ''
            for index, match in enumerate(fields):
                end = fields[index+1].start() if index+1 < len(fields) else len(text)
                anchors.append({"field": int(match[1]), "label": text[match.start():end].strip(), "x": run["chars"][match.start()]["x0"], "baseline": run["baseline"]})
            glyphs = "".join(f'<span class="glyph" style="left:{number(c["x0"]-run["x"])}pt">{html.escape(c["text"])}</span>' for c in run["chars"])
            parts.append(f'<span class="text-run"{attribute} data-baseline="{number(run["baseline"])}" data-size="{number(run["size"])}" style="left:{number(run["x"])}pt;font-family:{families[run["font"]]};font-size:{number(run["size"])}pt">{glyphs}</span>')
        width, height = raw_number(page.width), raw_number(page.height)
        cells = input_cells(page, anchors)
    parts.append(f'<div id="insurance-logo-slot" class="signature-slot" data-asset="INSURANCE_LOGO" aria-label="Área reservada ao logo do convênio do paciente" style="left:{number(40)}pt;top:{number(10)}pt;width:{number(160)}pt;height:{number(32)}pt"></div>')
    markup = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guia SP/SADT - modelo em branco</title><style>
FONT_RULES
*{box-sizing:border-box}html,body{margin:0;padding:0}body{background:#e5e7eb;color:#000}
@page{size:PAGE_WIDTHpt PAGE_HEIGHTpt;margin:0}
.sheet{position:relative;width:PAGE_WIDTHpt;height:PAGE_HEIGHTpt;background:#fff;overflow:hidden;margin:16px auto;isolation:isolate}
.drawing{position:absolute;left:0;top:0;width:DRAWING_WIDTHpt;height:DRAWING_HEIGHTpt;transform:scale(DRAWING_REDUCTION);transform-origin:0 0}
.rule{position:absolute;pointer-events:none}.text-run{position:absolute;white-space:pre;line-height:1;display:block;height:1em;font-synthesis:none}
.glyph{position:absolute;top:0;white-space:pre}.signature-slot{position:absolute;pointer-events:none}
@media print{html,body{width:PAGE_WIDTHpt;height:PAGE_HEIGHTpt;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{margin:0;break-after:avoid;break-inside:avoid}}
</style></head><body><main class="sheet" data-width-pt="PAGE_WIDTH" data-height-pt="PAGE_HEIGHT" aria-label="Guia de Serviços Profissionais / Serviço Auxiliar de Diagnóstico e Terapia - SP/SADT"><div class="drawing">
CONTENT
</div></main><script>
// Match each original PDF text baseline using the actual embedded font metrics.
window.sadtReady = document.fonts.ready.then(() => {
 const context = document.createElement('canvas').getContext('2d'); const metrics = new Map();
 for (const run of document.querySelectorAll('.text-run')) {
  const size = Number(run.dataset.size), family = run.style.fontFamily, key = family + ':' + size;
  if (!metrics.has(key)) { context.font = `1000px ${family}`; const m = context.measureText('Hg'); const ascent = (m.fontBoundingBoxAscent ?? 800) * size / 1000, descent = (m.fontBoundingBoxDescent ?? 200) * size / 1000; metrics.set(key, (size - ascent - descent) / 2 + ascent); }
  run.style.top = `${Number(run.dataset.baseline) - metrics.get(key)}pt`;
 }
 document.documentElement.dataset.ready = 'true';
});
</script></body></html>
""".replace("FONT_RULES", "\n".join(font_rules)).replace("PAGE_WIDTH", width).replace("PAGE_HEIGHT", height).replace("DRAWING_WIDTH", number(float(width))).replace("DRAWING_HEIGHT", number(float(height))).replace("DRAWING_REDUCTION", str(1 / DRAWING_SCALE)).replace("CONTENT", "\n".join(parts))
    if sorted({anchor["field"] for anchor in anchors}) != list(range(1, 69)):
        raise ValueError("The reference must contain all 68 SADT field labels")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(markup, encoding="utf-8")
    destination.with_suffix(".fields.json").write_text(json.dumps({"sourcePage": 1, "widthPt": float(width), "heightPt": float(height), "fieldLabels": sorted(anchors, key=lambda item: item["field"]), "inputCells":cells, "insuranceLogo":{"x":40,"y":10,"width":160,"height":32,"fit":"contain"}, "signatures": [20, 66, 67, 68]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Created {destination}: {len(parts)} native HTML elements, {len(anchors)} field label anchors")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "docs/Guia de SADT.pdf")
    parser.add_argument("--output", type=Path, default=ROOT / "backend/templates/sadt/guia-sadt.html")
    arguments = parser.parse_args()
    build(arguments.source, arguments.output)
