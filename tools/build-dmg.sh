#!/bin/bash
# 把 dist 里的 .app 做成拖拽式安装包（dmg）
#
# 用法：tools/build-dmg.sh
# 产物：dist/FURIX选片台_v3.8.2_macOS.dmg
#
# 依赖：dist/FURIX选片台.app（先跑 tools/build-mac-app.sh）、
#       tools/dmg/background@2x.png（安装界面背景，2 倍图）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="3.10"
APP="$ROOT/dist/FURIX选片台.app"
VOLNAME="FURIX 选片台"
DMG="$ROOT/dist/FURIX选片台_v${VERSION}_macOS.dmg"
STAGE="$ROOT/dist/.dmg-stage"
RW_DMG="$(mktemp -t furix-rw).dmg"
BG_SRC="$ROOT/tools/dmg/background@2x.png"

if [ ! -d "$APP" ]; then
  echo "先打包 App：tools/build-mac-app.sh" >&2
  exit 1
fi
if [ ! -f "$BG_SRC" ]; then
  echo "缺安装界面背景：$BG_SRC" >&2
  exit 1
fi

# 背景图：2x PNG → 1x PNG → 合并成带 Retina 的 tiff
BG_DIR="$(mktemp -d)"
trap 'rm -rf "$BG_DIR"; rm -f "$RW_DMG"' EXIT
sips -z 450 660 "$BG_SRC" --out "$BG_DIR/bg1x.png" >/dev/null
tiffutil -cathidpicheck "$BG_DIR/bg1x.png" "$BG_SRC" -out "$BG_DIR/background.tiff" >/dev/null

echo "· 组装目录"
rm -rf "$STAGE" "$DMG"
mkdir -p "$STAGE/.background"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
cp "$BG_DIR/background.tiff" "$STAGE/.background/background.tiff"

echo "· 生成可写镜像"
hdiutil create -volname "$VOLNAME" -srcfolder "$STAGE" -ov -format UDRW -fs HFS+ "$RW_DMG" >/dev/null

echo "· 排版"
hdiutil attach "$RW_DMG" -nobrowse -noautoopen >/dev/null
sleep 1
osascript <<'APPLESCRIPT' || echo "（自动排版没成功，图标位置会退回默认）" >&2
tell application "Finder"
  tell disk "FURIX 选片台"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {220, 140, 880, 583}
    set viewOptions to the icon view options of container window
    set arrangement of viewOptions to not arranged
    set icon size of viewOptions to 128
    set text size of viewOptions to 13
    set background picture of viewOptions to file ".background:background.tiff"
    set position of item "FURIX选片台.app" of container window to {170, 205}
    set position of item "Applications" of container window to {495, 205}
    update without registering applications
    delay 1
    close
  end tell
end tell
APPLESCRIPT
sleep 1
hdiutil detach "/Volumes/$VOLNAME" -force >/dev/null 2>&1 || true

echo "· 压缩"
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG" >/dev/null
rm -rf "$STAGE"

echo "· 完成：$DMG（$(du -sh "$DMG" | awk '{print $1}')）"
