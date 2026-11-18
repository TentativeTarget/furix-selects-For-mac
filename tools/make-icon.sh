#!/bin/bash
# 用原作者的 assets/icon.svg 生成符合 macOS 规范的 App 图标
#
# macOS 的规矩（Big Sur 之后）：
#   1024×1024 画布，图标本体 824×824 居中（四周留 100），圆角半径 185.4
#
# 产物：tools/AppIcon.mac.icns
# 依赖：Microsoft Edge（无头渲染 SVG）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/icon.svg"
OUT="$ROOT/tools/AppIcon.mac.icns"
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -f "$SRC" ]; then
  echo "缺少 $SRC" >&2
  exit 1
fi
if [ ! -x "$EDGE" ]; then
  echo "找不到 Microsoft Edge，无法渲染 SVG" >&2
  exit 1
fi

python3 - "$SRC" "$WORK/icon.svg" <<'PY'
import math, re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
m = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S)
inner = m.group(1).strip()

BX0, BX1, BY0, BY1 = 138.0, 1092.0, 0.0, 1223.0
BW, BH = BX1 - BX0, BY1 - BY0

OFF, BOX = 100.0, 824.0
scale = BOX / BH
w = BW * scale
tx = OFF + (BOX - w) / 2 - BX0 * scale
ty = OFF - BY0 * scale

def squircle(cx, cy, size, n=3.6, steps=720):
    a = b = size / 2.0
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = a * (abs(ct) ** (2.0 / n)) * (1 if ct >= 0 else -1)
        y = b * (abs(st) ** (2.0 / n)) * (1 if st >= 0 else -1)
        pts.append((cx + x, cy + y))
    return "M " + " L ".join("%.2f,%.2f" % p for p in pts) + " Z"

body = squircle(OFF + BOX / 2, OFF + BOX / 2, BOX)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="body"><path d="{body}"/></clipPath>
  </defs>
  <g clip-path="url(#body)">
    <path d="{body}" fill="#ffffff" stroke="#0d0e10" stroke-width="6"/>
    <g transform="translate({tx:.3f},{ty:.3f}) scale({scale:.6f})">
      {inner}
    </g>
  </g>
</svg>
'''
open(dst, "w", encoding="utf-8").write(svg)
print("svg ok squircle w=%.0f" % w)
PY

echo "· 渲染 1024"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 \
  --screenshot="$WORK/icon.png" --window-size=1024,1024 \
  "file://$WORK/icon.svg" >/dev/null 2>&1

if [ ! -f "$WORK/icon.png" ]; then
  echo "渲染失败" >&2
  exit 1
fi

echo "· 生成 iconset"
mkdir -p "$WORK/AppIcon.iconset"
for spec in "16 icon_16x16" "32 icon_16x16@2x" "32 icon_32x32" "64 icon_32x32@2x" \
            "128 icon_128x128" "256 icon_128x128@2x" "256 icon_256x256" "512 icon_256x256@2x" \
            "512 icon_512x512" "1024 icon_512x512@2x"; do
  set -- $spec
  sips -z "$1" "$1" "$WORK/icon.png" --out "$WORK/AppIcon.iconset/$2.png" >/dev/null
done

iconutil -c icns "$WORK/AppIcon.iconset" -o "$OUT"
echo "· 完成：$OUT（$(du -sh "$OUT" | awk '{print $1}')）"
