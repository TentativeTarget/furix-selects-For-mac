/* macOS 适配：把界面里的 Ctrl 写成 ⌘，桌面版顺手改掉“请用 Chrome / Edge”这类提示。
   app.js 里所有快捷键都同时认 ctrlKey 和 metaKey，所以 Windows / macOS 共用一份代码。 */
(function () {
  const ua = navigator.userAgent || "";
  const isMac = /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad|iPod/.test(ua);
  if (!isMac) return;

  document.documentElement.classList.add("is-mac");
  const MOD = "⌘";

  // 桌面版（Electron）本来就有浏览器内核，不用再叫用户去开 Chrome / Edge
  const isDesktop = /Electron\//.test(ua);
  if (isDesktop) document.documentElement.classList.add("is-desktop");

  const DESKTOP_REPLACEMENTS = [
    [/文件夹读写需要\s*Chrome\s*\/\s*Edge/g, "照片只在这台电脑上"],
    [/需要\s*Chrome\s*\/\s*Edge\s*[，,]\s*会弹一次授权/g, "会弹一次系统授权"],
    [/需要\s*Chrome\s*\/\s*Edge\s*的文件夹授权/g, "需要文件夹授权"],
    [/需要\s*Chrome\s*\/\s*Edge/g, "需要系统授权"],
    [/Chrome\s*\/\s*Edge/g, "系统授权"],
  ];

  function rewriteDesktopText(root) {
    if (!isDesktop || !root) return;
    if (root.nodeType === 3) {
      rewriteTextNode(root);
      return;
    }
    if (!root.querySelectorAll) return;
    root.querySelectorAll("*").forEach((element) => {
      element.childNodes.forEach((child) => {
        if (child.nodeType === 3) rewriteTextNode(child);
      });
    });
  }

  function rewriteTextNode(node) {
    const value = node.nodeValue;
    if (!value || value.indexOf("Chrome") < 0) return;
    let next = value;
    for (const [pattern, replacement] of DESKTOP_REPLACEMENTS) {
      next = next.replace(pattern, replacement);
    }
    if (next !== value) node.nodeValue = next;
  }

  function relabelKbd(root) {
    root.querySelectorAll("kbd").forEach((node) => {
      const text = node.textContent;
      if (!text || text.indexOf("Ctrl") < 0) return;
      node.textContent = text
        .replace(/Ctrl\s*\+\s*/g, MOD + " ")
        .replace(/Ctrl/g, MOD)
        .trim();
    });
  }

  function relabelTitles(root) {
    root.querySelectorAll("[title]").forEach((node) => {
      const title = node.getAttribute("title");
      if (!title || title.indexOf("Ctrl") < 0) return;
      node.setAttribute(
        "title",
        title.replace(/Ctrl\s*\+\s*/g, MOD + " ").replace(/Ctrl\s*/g, MOD + " ")
      );
    });
  }

  function relabelText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue;
      if (!value || value.indexOf("Ctrl") < 0) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, kbd, code")) continue;
      node.nodeValue = value
        .replace(/Ctrl\s*\/\s*Shift/g, MOD + " / ⇧")
        .replace(/Ctrl/g, MOD);
    }
  }

  function apply(root) {
    const scope = root || document;
    relabelKbd(scope);
    relabelTitles(scope);
    relabelText(scope);
    rewriteDesktopText(scope);
  }

  // 网页里有些提示是打开弹窗时才写进 DOM 的，盯着新增的节点补一遍
  function watchNewNodes() {
    if (!isDesktop) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) apply(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 桌面版的菜单里故意没放「全选」，把 ⌘A 让给选片台；
  // 输入框里本该全选文字，这里补一下，免得搜索框按 ⌘A 没动静。
  document.addEventListener(
    "keydown",
    (event) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== "a") return;
      const target = event.target;
      if (!target || !target.closest) return;
      const field = target.closest("input, textarea, [contenteditable='true']");
      if (!field) return;
      event.preventDefault();
      if (typeof field.select === "function") {
        field.select();
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(field);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    },
    true
  );

  function boot() {
    apply(document);
    watchNewNodes();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
