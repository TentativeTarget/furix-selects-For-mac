#!/bin/bash
# 从一张 PNG 生成 macOS 的 .icns
# 只做一件事：把源图缩到 macOS 的 824 模具里，四周留透明
#
# 用法：tools/icon-from-png.sh <源 PNG> [输出 icns]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-$ROOT/assets/icon mac.png}"
OUT="${2:-$ROOT/tools/AppIcon.mac.icns}"
EDGE="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -f "$SRC" ]; then
  echo "找不到源图：$SRC" >&2
  exit 1
fi

echo "· 处理：$SRC"
python3 - "$SRC" "$WORK/page.html" <<'PY'
import base64, sys
src, dst = sys.argv[1], sys.argv[2]
b64 = base64.b64encode(open(src, "rb").read()).decode()
html = f'''<!doctype html><html><head><meta charset="utf-8">
<style>html,body{{margin:0;background:transparent;overflow:hidden}}canvas{{display:block}}</style>
</head><body><canvas id="c" width="1024" height="1024"></canvas>
<script>
const img = new Image();
img.onload = () => {{
  const c = document.getElementById("c");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.drawImage(img, 100, 100, 824, 824);
  // 原图自带透明背景，直接缩放就行，不用抠
  document.title = "DONE";
}};
img.src = "data:image/png;base64,{b64}";
</script></body></html>'''
open(dst, "w", encoding="utf-8").write(html)
print("html ok")
PY

echo "· 渲染 1024（去白角）"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars \
  --default-background-color=00000000 --virtual-time-budget=8000 \
  --screenshot="$WORK/icon.png" --window-size=1024,1024 \
  "file://$WORK/page.html" >/dev/null 2>&1

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
