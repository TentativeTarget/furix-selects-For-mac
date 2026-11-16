# FURIX SELECTS · 选片台

一个跑在本机浏览器里的照片选片工作台：从 SD 卡分拣到按客户交付，全流程本地完成，不上传照片。

- **项目模式**：项目 + 客户文件夹、场次与客户、JPG+RAW 配对、框选、按客户导出
- **客户回传**：客户发来的编号（完整名 / 纯数字 / 后几位）匹配成 RAW，写进 `选图集/`
- **交付与台账**：成品集对账、扁平 zip、年度单号、台账统计
- **省空间**：交付包批量清理、按客户归档（校验后删原图、可恢复）
- **散片 / 直出**：不建项目直接选片导出，可叠文字或 logo 水印
- **大图库**：虚拟滚动 + 缩略图按视口生成 + 磁盘缓存
- **其它**：重复照片隐藏、旧项目接入、旋转翻转、EXIF 筛选

## 启动

**macOS**：下载 `FURIX选片台_v3.8.2_macOS.dmg`，打开后把图标拖进「应用程序」，然后从启动台或应用程序文件夹打开。也可以用仓库里打好的 `.app`，双击直接跑。窗口里就一个选片台，不用另装浏览器、也不用起服务；关掉窗口进程就结束。第一次点「打开照片文件夹」会弹 macOS 的授权窗，点允许就行。

要重新打包（改了网页之后）：

```bash
tools/build-mac-app.sh   # 出 .app + 分发 zip
tools/build-dmg.sh       # 出拖拽式安装包
```

**Windows**：双击 `启动选片台.cmd`，停止用 `停止选片台.cmd`。需要 Chrome / Edge 和 Python 3。

**macOS 备用方案**：万一桌面版闹别扭，双击 `启动选片台.command`（起本地服务 + Edge/Chrome 应用窗口），停止用 `停止选片台.command`。如果双击提示没有权限，在终端里执行一次：

```bash
chmod +x 启动选片台.command 停止选片台.command
```

浏览器版都是：起一个只监听 `127.0.0.1` 的静态服务（端口 8731–8799 里挑一个空闲的），再用浏览器的应用窗口打开。服务信息记在 `.server.json`，再次启动会复用。

## 目录

```
index.html            界面
styles.css            样式
js/core.js            标记、筛选、XMP、ZIP、EXIF/RAW、图像与水印合成
js/app.js             图库、项目、回传、交付、台账、归档等交互
js/platform.js        macOS 适配：Ctrl 显示成 ⌘，桌面版文案微调
demo/                 示例图库
desktop/main.js       桌面版主进程（Electron）：窗口、菜单、内置页面通道
desktop/package.json
tools/build-mac-app.sh  重新打包 macOS 桌面版 + 分发 zip
tools/build-dmg.sh      重新生成拖拽式安装包（dmg）
tools/dmg/              安装界面背景图
 tools/AppIcon.icns    应用图标
launcher.ps1 / stop.ps1           Windows 启动器
启动选片台.cmd / 停止选片台.cmd     Windows 双击入口
启动选片台.command / 停止选片台.command  macOS 备用入口（浏览器版）
push.ps1 / 推送更新.cmd           一键提交并推送到 GitHub（Windows 双击）
使用说明.md            完整文档（含版本历史）
```

`dist/` 里是打好的 `.app` 和 zip，不进仓库，发版走 Releases。

## 更新到 GitHub

改完文件后双击 `推送更新.cmd`：它会列出改动、问一句说明、提交并推送，认证已经存在系统凭据里，不用再登录。

命令行等价写法：

```bash
git add -A && git commit -m "改了什么" && git push
```

## 版本

当前 **v3.11**。完整历史见 `使用说明.md` 末尾。

## 说明

照片不会离开本机；工具只读取素材，标记与项目状态写在项目目录的 `.furix-project.json` 里。
仓库默认不含许可证，如需公开分发请自行补充 LICENSE。