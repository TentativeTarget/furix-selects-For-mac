# 图标素材（给迁移 / 打包用）

全部由 `assets/icon.svg` 渲染，**纯向量源文件**，没有内嵌位图。

## 文件

| 文件 | 用途 |
| --- | --- |
| `../icon.svg` | 方形徽章（源，1228×1223，白孔洞 + 黑章） |
| `../icon-circle.svg` | 圆形版（黑圆 + 徽章 96%） |
| `../word.svg` | FURIX 字标（白色 + 红 U） |
| `../icon.ico` | **Windows** 图标，6 档（16/32/48/64/128/256） |
| `AppIcon.icns` | **macOS** 成品图标，10 个尺寸槽位，可直接给 `.app` 用 |
| `AppIcon.appiconset/` | **Xcode** 资源目录，含 `Contents.json`，拖进工程即用 |

## macOS 怎么用

**放 Xcode 工程**：把 `AppIcon.appiconset` 整个拖进 `Assets.xcassets`，在 target 的
`App Icons and Launch Screen → App Icon` 里选 `AppIcon` 即可。

**直接给已有的 .app 换图标**：

```bash
# 方法一：用现成的 .icns
cp AppIcon.icns YourApp.app/Contents/Resources/
# 然后把 Info.plist 里的 CFBundleIconFile 改成 AppIcon

# 方法二：从 appiconset 自己生成 .icns
iconutil -c icns AppIcon.appiconset -o AppIcon.icns
```

**临时看效果**：Finder 里选中 `.icns` 按空格，或在「显示简介」里把 icns 拖到左上角小图标上。

## 尺寸约定

- 图形占画布 **82%**，四周留透明边（macOS Big Sur 之后的图标网格习惯）
- 徽章自带圆角，所以外面不再套一层圆角遮罩，否则会出现双层圆角
- 需要「满版」（不带宽边）的版本时，跟我说，我按 100% 重新导一份

## Windows 怎么用

`icon.ico` 直接指给快捷方式或 exe；`启动选片台.cmd` 目前用的是 Chrome 应用窗口，
窗口图标跟随 `index.html` 里的 `favicon`（同款设计）。