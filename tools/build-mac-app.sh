#!/bin/bash
# 把选片台打成 macOS 桌面版 .app，再顺手压一个可分发的 zip
#
# 用法：tools/build-mac-app.sh
# 产物：dist/FURIX选片台.app 和 dist/FURIX选片台_v3.8.2-mac.zip
#
# 依赖：本机已装好的 Electron（默认从 ~/my-electron-app 借，
#       可用 FURIX_ELECTRON_APP=/path/to/Electron.app 指定）

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="3.8.2"
OUT_DIR="$ROOT/dist"
APP_NAME="FURIX选片台.app"
OUT_APP="$OUT_DIR/$APP_NAME"
ZIP_PATH="$OUT_DIR/FURIX选片台_v${VERSION}-mac.zip"

ELECTRON_APP="${FURIX_ELECTRON_APP:-$HOME/my-electron-app/node_modules/electron/dist/Electron.app}"
if [ ! -d "$ELECTRON_APP" ]; then
  echo "没找到 Electron：$ELECTRON_APP" >&2
  echo "用 FURIX_ELECTRON_APP=/path/to/Electron.app 指一个，或先在任意项目里 npm i -D electron" >&2
  exit 1
fi

echo "· Electron：$ELECTRON_APP"
echo "· 输出：$OUT_APP"

rm -rf "$OUT_APP"
mkdir -p "$OUT_DIR"
cp -R "$ELECTRON_APP" "$OUT_APP"

# 换掉 Electron 自带的默认应用
rm -f "$OUT_APP/Contents/Resources/default_app.asar" "$OUT_APP/Contents/Resources/electron.icns"

APP_RES="$OUT_APP/Contents/Resources/app"
mkdir -p "$APP_RES/web"
cp "$ROOT/desktop/main.js" "$APP_RES/main.js"
cp "$ROOT/desktop/package.json" "$APP_RES/package.json"
cp "$ROOT/index.html" "$ROOT/styles.css" "$ROOT/使用说明.md" "$ROOT/README.md" "$APP_RES/web/"
cp -R "$ROOT/js" "$APP_RES/web/js"
if [ -d "$ROOT/demo" ]; then
  cp -R "$ROOT/demo" "$APP_RES/web/demo"
fi

cp "$ROOT/tools/AppIcon.icns" "$OUT_APP/Contents/Resources/AppIcon.icns"

# 可执行文件改个名字，Finder 里才像一个正经软件
mv "$OUT_APP/Contents/MacOS/Electron" "$OUT_APP/Contents/MacOS/FURIX"

PLIST="$OUT_APP/Contents/Info.plist"
PB=/usr/libexec/PlistBuddy
set_plist() {
  "$PB" -c "Set :$1 $2" "$PLIST" 2>/dev/null || "$PB" -c "Add :$1 string $2" "$PLIST"
}
set_plist CFBundleExecutable FURIX
set_plist CFBundleName "FURIX 选片台"
set_plist CFBundleDisplayName "FURIX 选片台"
set_plist CFBundleIdentifier local.furix.selects
set_plist CFBundleShortVersionString "$VERSION"
set_plist CFBundleVersion "$VERSION"
set_plist CFBundleIconFile AppIcon
set_plist LSApplicationCategoryType public.app-category.photography
set_plist LSMinimumSystemVersion 10.15
set_plist NSHumanReadableCopyright "本地优先 · 照片不出这台电脑"

# Electron 带了几十种语言包，留英文和简体中文就够
for dir in "$OUT_APP"/Contents/Resources/*.lproj; do
  case "$(basename "$dir")" in
    en.lproj|zh_CN.lproj|Base.lproj) ;;
    *) rm -rf "$dir" ;;
  esac
done

# 清隔离属性，然后 ad-hoc 签名（不签的话通知、权限这类系统能力会被静默拒绝）
xattr -cr "$OUT_APP" 2>/dev/null || true
codesign --force --deep --sign - "$OUT_APP" >/dev/null 2>&1 || {
  echo "签名没成功，App 仍能用，但 Gatekeeper 可能多问一句" >&2
}

# 分发用 zip：ditto 能保住签名和权限位
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$OUT_APP" "$ZIP_PATH"

echo "· App：$OUT_APP（$(du -sh "$OUT_APP" | awk '{print $1}')）"
echo "· Zip：$ZIP_PATH（$(du -sh "$ZIP_PATH" | awk '{print $1}')）"
