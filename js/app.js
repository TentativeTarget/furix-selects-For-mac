/* ============================================================
   FURIX SELECTS — application
   ============================================================ */

(function () {
  "use strict";

  const F = window.Furix;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const params = new URLSearchParams(location.search);

  const EMPTY_META = Object.freeze({
    flag: null,
    rating: 0,
    color: null,
    rotation: 0,
    mirror: false
  });
  const PREFS_KEY = "furix.prefs.v1";
  // 缩略图边长跟着网格尺寸走：显示 208px 时没必要按 720px 解码，
  // 这样一万张图的解码量和内存都能降一个数量级。
  const THUMB_CACHE_MAX = 1200;

  const virtual = {
    active: false,
    disabled: false,
    threshold: 240,
    columns: 1,
    rowHeight: 0,
    cardHeight: 0,
    startRow: -1,
    endRow: -1,
    scrollRaf: 0,
    scrollDirty: false,
    settleTimer: 0,
    resizeTimer: 0
  };

  const GRID_GAP = 14;
  const GRID_PAD_X = 22;
  const GRID_PAD_TOP = 20;
  const GRID_PAD_BOTTOM = 70;

  const RECENT_DB = "furix-recent";
  const RECENT_STORE = "projects";
  const RECENT_MAX = 5;
const RECENT_HUB_MAX = 5;
  let recentDbPromise = null;
  let recentTimer = 0;
  const SKIP_DIRS = new Set([
    "@eaDir",
    "__MACOSX",
    "node_modules",
    "$RECYCLE.BIN",
    "System Volume Information"
  ]);

  const state = {
    photos: [],
    byId: new Map(),
    meta: new Map(),
    selection: new Set(),
    focusId: null,
    anchorId: null,
    visible: [],
    cardMap: new Map(),
    view: "grid",
    filter: {
      flag: "all",
      minRating: 0,
      colors: new Set(),
      query: "",
      camera: "all",
      lens: "all",
      focal: "all",
      aperture: "all"
    },
    exifScan: null,
    project: null,
    sourceHandle: null,
    sourceName: "",
    clients: [],
    sessions: [],
    clientFilter: "all",
    sessionFilter: "all",
    sessionGap: 30,
    sessionMin: 15,
    returns: {},
    deliveries: {},
    archives: {},
    pendingProjectParent: null,
    projectDraft: null,
    sort: "name-asc",
    fileFilter: "all",
    thumbSize: 208,
    folderName: "",
    folderHandle: null,
    writable: false,
    demo: false,
    loading: false,
    loadCancelled: false,
    saveKind: "local",
    saveTimer: 0,
    filterTimer: 0,
    searchTimer: 0,
    fullUrls: new Map(),
    thumbUrls: new Map(),
    visibleIndex: new Map(),
    nameGroups: new Map(),
    duplicateCount: 0,
    hideDuplicates: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    dragging: false,
    inspector: true
  };

  const el = {
    app: $("#app"),
    topbar: $("#topbar"),
    brand: $("#brand"),
    btnFolders: [$("#btn-folder"), $("#btn-folder-2")],
    crumbName: $("#crumb-name"),
    crumbCount: $("#crumb-count"),
    folderName: $("#folder-name"),
    folderSub: $("#folder-sub"),
    search: $("#search"),
    sort: $("#sort"),
    thumbRange: $("#thumb-range"),
    thumbSmaller: $("#thumb-smaller"),
    thumbLarger: $("#thumb-larger"),
    sidebar: $("#sidebar"),
    ratingFilter: $("#rating-filter"),
    colorFilter: $("#color-filter"),
    clearColors: $("#clear-colors"),
    filterCamera: $("#filter-camera"),
    filterLens: $("#filter-lens"),
    filterFocal: $("#filter-focal"),
    filterAperture: $("#filter-aperture"),
    clearExif: $("#clear-exif"),
    exifScanState: $("#exif-scan-state"),
    countAll: $("#count-all"),
    countPick: $("#count-pick"),
    countNone: $("#count-none"),
    countReject: $("#count-reject"),
    markCount: $("#mark-count"),
    colorCounts: {
      red: $("#count-color-red"),
      yellow: $("#count-color-yellow"),
      green: $("#count-color-green"),
      blue: $("#count-color-blue"),
      purple: $("#count-color-purple")
    },
    stageTitle: $("#stage-title"),
    stageCount: $("#stage-count"),
    fileFilter: $("#file-filter"),
    dupToggle: $("#dup-toggle"),
    dupCount: $("#dup-count"),
    gridScroll: $("#grid-scroll"),
    grid: $("#grid"),
    empty: $("#empty"),
    noResults: $("#no-results"),
    clearFilters: $("#clear-filters"),
    gridLoading: $("#grid-loading"),
    statusCount: $("#status-count"),
    statusSelected: $("#status-selected"),
    statusFilter: $("#status-filter"),
    saveState: $("#save-state"),
    viewGrid: $("#view-grid"),
    viewLoupe: $("#view-loupe"),
    btnExport: $("#btn-export"),
    btnMenu: $("#btn-menu"),
    menu: $("#menu"),
    loupe: $("#loupe"),
    loupeBack: $("#loupe-back"),
    loupeIndex: $("#loupe-index"),
    loupeName: $("#loupe-name"),
    loupeRawChip: $("#loupe-raw-chip"),
    loupeZoom: $("#loupe-zoom"),
    loupeRotLeft: $("#loupe-rot-left"),
    loupeRotRight: $("#loupe-rot-right"),
    loupeFullscreen: $("#loupe-fullscreen"),
    loupeExport: $("#loupe-export"),
    loupeCanvas: $("#loupe-canvas"),
    loupeFrame: $("#loupe-frame"),
    loupeImg: $("#loupe-img"),
    loupeUnsupported: $("#loupe-unsupported"),
    unsupportedTitle: $("#unsupported-title"),
    unsupportedText: $("#unsupported-text"),
    loupePrev: $("#loupe-prev"),
    loupeNext: $("#loupe-next"),
    loupeZoomReadout: $("#loupe-zoom-readout"),
    filmstrip: $("#filmstrip"),
    inspector: $("#inspector"),
    inspectorEmpty: $("#inspector-empty"),
    inspectorBody: $("#inspector-body"),
    inspectorClose: $("#inspector-close"),
    inspectorPreview: $("#inspector-preview"),
    inspectorImg: $("#inspector-img"),
    inspectorMulti: $("#inspector-multi"),
    inspectorName: $("#inspector-name"),
    inspectorPath: $("#inspector-path"),
    flagButtons: $("#flag-buttons"),
    starButtons: $("#star-buttons"),
    ratingValue: $("#rating-value"),
    colorRow: $("#color-row"),
    orientRow: $("#orient-row"),
    metaDims: $("#meta-dims"),
    metaDimsLabel: $("#meta-dims-label"),
    metaSize: $("#meta-size"),
    metaType: $("#meta-type"),
    metaPreviewRow: $("#meta-preview-row"),
    metaPreview: $("#meta-preview"),
    metaDate: $("#meta-date"),
    exifCard: $("#exif-card"),
    exifState: $("#exif-state"),
    exifCamera: $("#exif-camera"),
    exifLens: $("#exif-lens"),
    exifFocal: $("#exif-focal"),
    exifAperture: $("#exif-aperture"),
    exifShutter: $("#exif-shutter"),
    exifIso: $("#exif-iso"),
    exifDate: $("#exif-date"),
    inspectorExport: $("#inspector-export"),
    inspectorExportCount: $("#inspector-export-count"),
    btnOpen: $("#btn-open"),
    btnDemo: $("#btn-demo"),
    hubRecent: $("#hub-recent"),
    hubList: $("#hub-list"),
    projectEmpty: $("#project-empty"),
    peName: $("#pe-name"),
    peType: $("#pe-type"),
    peMeta: $("#pe-meta"),
    peSource: $("#pe-source"),
    peExport: $("#pe-export"),
    peDelivery: $("#pe-delivery"),
    peCloseProject: $("#pe-close-project"),
    peSwitch: $("#pe-switch"),
    peFootSep: $("#pe-foot-sep"),
    peRecent: $("#pe-recent"),
    btnNewProject: $("#btn-new-project"),
    btnOpenProject: $("#btn-open-project"),
    btnAdoptProject: $("#btn-adopt-project"),
    adoptModal: $("#adopt-modal"),
    adoptClose: $("#adopt-close"),
    adoptCancel: $("#adopt-cancel"),
    adoptConfirm: $("#adopt-confirm"),
    adoptAll: $("#adopt-all"),
    adoptCode: $("#adopt-code"),
    adoptType: $("#adopt-type"),
    adoptDate: $("#adopt-date"),
    adoptRows: $("#adopt-rows"),
    adoptSeq: $("#adopt-seq"),
    adoptSummary: $("#adopt-summary"),
    adoptHint: $("#adopt-hint"),
    projectSection: $("#project-section"),
    btnProjectMenu: $("#btn-project-menu"),
    projectMenu: $("#project-menu"),
    projectRecent: $("#project-recent"),
    projectRecentLabel: $("#project-recent-label"),
    projectRecentSep: $("#project-recent-sep"),
    btnSource: $("#btn-source"),
    sourceName: $("#source-name"),
    sourceSub: $("#source-sub"),
    clientList: $("#client-list"),
    btnSessions: $("#btn-sessions"),
    btnProjectExport: $("#btn-project-export"),
    sessionSelectWrap: $("#session-select-wrap"),
    sessionFilter: $("#session-filter"),
    marquee: $("#marquee"),
    projectModal: $("#project-modal"),
    projectClose: $("#project-close"),
    projectCancel: $("#project-cancel"),
    projectCreate: $("#project-create"),
    projectNameInput: $("#project-name"),
    projectClientsInput: $("#project-clients"),
    projectParentBtn: $("#project-parent"),
    projectParentName: $("#project-parent-name"),
    projectPreviewPath: $("#project-preview-path"),
    projectType: $("#project-type"),
    projectDate: $("#project-date"),
    btnDelivery: $("#btn-delivery"),
    deliveryModal: $("#delivery-modal"),
    deliveryClose: $("#delivery-close"),
    deliveryCancel: $("#delivery-cancel"),
    deliveryStart: $("#delivery-start"),
    deliveryRows: $("#delivery-rows"),
    deliveryNote: $("#delivery-note"),
    deliveryForce: $("#delivery-force"),
    deliveryRefresh: $("#delivery-refresh"),
    deliverySummary: $("#delivery-summary"),
    deliveryProgress: $("#delivery-progress"),
    deliverySpinner: $("#delivery-spinner"),
    deliveryIcon: $("#delivery-icon"),
    deliveryProgressTitle: $("#delivery-progress-title"),
    deliveryProgressSub: $("#delivery-progress-sub"),
    deliveryBar: $("#delivery-bar"),
    deliveryStop: $("#delivery-stop"),
    deliveryDone: $("#delivery-done"),
    btnLedger: $("#btn-ledger"),
    ledgerModal: $("#ledger-modal"),
    ledgerClose: $("#ledger-close"),
    ledgerOk: $("#ledger-ok"),
    ledgerPick: $("#ledger-pick"),
    ledgerRefresh: $("#ledger-refresh"),
    ledgerCards: $("#ledger-cards"),
    ledgerProject: $("#ledger-project"),
    ledgerTable: $("#ledger-table"),
    ledgerHint: $("#ledger-hint"),
    ledgerSummary: $("#ledger-summary"),
    btnClients: $("#btn-clients"),
    btnArchive: $("#btn-archive"),
    archiveModal: $("#archive-modal"),
    archiveClose: $("#archive-close"),
    archiveOk: $("#archive-ok"),
    archiveRefresh: $("#archive-refresh"),
    archiveRows: $("#archive-rows"),
    archiveNote: $("#archive-note"),
    archiveSummary: $("#archive-summary"),
    arcNegatives: $("#arc-negatives"),
    arcRaws: $("#arc-raws"),
    arcProducts: $("#arc-products"),
    arcPacks: $("#arc-packs"),
    packList: $("#pack-list"),
    packAll: $("#pack-all"),
    packDelete: $("#pack-delete"),
    packNote: $("#pack-note"),
    clientsModal: $("#clients-modal"),
    clientsClose: $("#clients-close"),
    clientsCancel: $("#clients-cancel"),
    clientsSave: $("#clients-save"),
    clientEditRows: $("#client-edit-rows"),
    clientsSummary: $("#clients-summary"),
    sessionsModal: $("#sessions-modal"),
    sessionsClose: $("#sessions-close"),
    sessionsCancel: $("#sessions-cancel"),
    sessionsSave: $("#sessions-save"),
    sessionGapInput: $("#session-gap"),
    sessionMinInput: $("#session-min"),
    sessionAuto: $("#session-auto"),
    sessionAdd: $("#session-add"),
    sessionRows: $("#session-rows"),
    sessionSummary: $("#session-summary"),
    peModal: $("#project-export-modal"),
    peClose: $("#project-export-close"),
    peCancel: $("#pe-cancel"),
    peStart: $("#pe-start"),
    peScope: $("#pe-scope"),
    peClient: $("#pe-client"),
    peTarget: $("#pe-target"),
    peJpg: $("#pe-jpg"),
    peRaw: $("#pe-raw"),
    peNote: $("#pe-note"),
    peProgress: $("#pe-progress"),
    peSpinner: $("#pe-spinner"),
    peIcon: $("#pe-icon"),
    peProgressTitle: $("#pe-progress-title"),
    peProgressSub: $("#pe-progress-sub"),
    peBar: $("#pe-bar"),
    peStop: $("#pe-stop"),
    peDone: $("#pe-done"),
    btnReturns: $("#btn-returns"),
    returnsModal: $("#returns-modal"),
    returnsClose: $("#returns-close"),
    returnsCancel: $("#returns-cancel"),
    returnsStart: $("#returns-start"),
    returnsSourceNote: $("#returns-source-note"),
    returnRows: $("#return-rows"),
    returnSummary: $("#return-summary"),
    returnJpg: $("#return-jpg"),
    returnProgress: $("#return-progress"),
    returnSpinner: $("#return-spinner"),
    returnIcon: $("#return-icon"),
    returnProgressTitle: $("#return-progress-title"),
    returnProgressSub: $("#return-progress-sub"),
    returnBar: $("#return-bar"),
    returnStop: $("#return-stop"),
    returnDone: $("#return-done"),
    fileInput: $("#file-input"),
    jsonInput: $("#json-input"),
    btnHelp2: $("#btn-help-2"),
    helpModal: $("#help-modal"),
    helpClose: $("#help-close"),
    helpOk: $("#help-ok"),
    exportModal: $("#export-modal"),
    exportClose: $("#export-close"),
    exportScope: $("#export-scope"),
    exportScopeNote: $("#export-scope-note"),
    exportMode: $("#export-mode"),
    convertOptions: $("#convert-options"),
    exportSize: $("#export-size"),
    exportQuality: $("#export-quality"),
    qualityVal: $("#quality-val"),
    exportNaming: $("#export-naming"),
    prefixField: $("#prefix-field"),
    exportPrefix: $("#export-prefix"),
    exportSubfolders: $("#export-subfolders"),
    exportXmp: $("#export-xmp"),
    exportFootHint: $("#export-foot-hint"),
    exportZip: $("#export-zip"),
    exportCollision: $("#export-collision"),
    exportPreviewName: $("#export-preview-name"),
    exportPreviewDims: $("#export-preview-dims"),
    collideModal: $("#collide-modal"),
    collideText: $("#collide-text"),
    collideSample: $("#collide-sample"),
    collideHint: $("#collide-hint"),
    collideOverwrite: $("#collide-overwrite"),
    collideSuffix: $("#collide-suffix"),
    collideCancel: $("#collide-cancel"),
    exportCancel: $("#export-cancel"),
    exportGo: $("#export-go"),
    exportProgress: $("#export-progress"),
    exportSpinner: $("#export-spinner"),
    exportProgressIcon: $("#export-progress-icon"),
    exportProgressTitle: $("#export-progress-title"),
    exportProgressSub: $("#export-progress-sub"),
    exportProgressBar: $("#export-progress-bar"),
    exportStop: $("#export-stop"),
    exportDone: $("#export-done"),
    exportFailures: $("#export-failures"),
    wmTextOn: $("#wm-text-on"),
    wmTextPanel: $("#wm-text-panel"),
    wmLogoOn: $("#wm-logo-on"),
    wmLogoPanel: $("#wm-logo-panel"),
    wmGateNote: $("#wm-gate-note"),
    wmText: $("#wm-text"),
    wmAnchor: $("#wm-anchor"),
    wmSize: $("#wm-size"),
    wmSizeVal: $("#wm-size-val"),
    wmInset: $("#wm-inset"),
    wmInsetVal: $("#wm-inset-val"),
    wmOpacity: $("#wm-opacity"),
    wmOpacityVal: $("#wm-opacity-val"),
    wmColor: $("#wm-color"),
    wmFont: $("#wm-font"),
    wmWeight: $("#wm-weight"),
    wmFamily: $("#wm-family"),
    wmFontList: $("#wm-font-list"),
    wmFontLoad: $("#wm-font-load"),
    wmFontNote: $("#wm-font-note"),
    wmLogoFile: $("#wm-logo-file"),
    wmLogoName: $("#wm-logo-name"),
    wmLogoClear: $("#wm-logo-clear"),
    wmLogoSize: $("#wm-logo-size"),
    wmLogoVal: $("#wm-logo-val"),
    wmLogoAnchor: $("#wm-logo-anchor"),
    wmLogoInset: $("#wm-logo-inset"),
    wmLogoInsetVal: $("#wm-logo-inset-val"),
    wmLogoOpacity: $("#wm-logo-opacity"),
    wmLogoOpacityVal: $("#wm-logo-opacity-val"),
    wmPreview: $("#wm-preview"),
    wmNote: $("#wm-note"),
    loading: $("#loading"),
    loadingTitle: $("#loading-title"),
    loadingSub: $("#loading-sub"),
    loadingBar: $("#loading-bar"),
    loadingCancel: $("#loading-cancel"),
    dropOverlay: $("#drop-overlay"),
    toasts: $("#toasts")
  };

  const ex = {
    scope: "selected",
    mode: "copy",
    naming: "original",
    collision: "ask",
    busy: false,
    cancel: false,
    lastCount: 0
  };

  let thumbObserver = null;
  let filmObserver = null;
  let thumbQueue = [];
  let thumbActive = 0;
  let rawQueue = [];
  let rawActive = 0;
  let dragDepth = 0;
  let toastSeq = 0;

  /* ============================================================
     boot
     ============================================================ */

  loadPrefs();
  wmLoad();
  bindEvents();
  applyPrefs();
  updateCounts();
  updateStatus();
  updateFolderUI();
  updateStartPanels();
  renderSaveState();

  if (params.get("demo") === "1") {
    loadDemo();
  } else if (params.get("dialog") === "help") {
    openHelp();
  }

  /* ============================================================
     small utilities
     ============================================================ */

  function getMeta(photoOrId) {
    const id = typeof photoOrId === "string" ? photoOrId : photoOrId && photoOrId.id;
    if (!id) return EMPTY_META;
    return state.meta.get(id) || EMPTY_META;
  }

  function dirOf(photo) {
    const path = String(photo.relPath || photo.name || "");
    const i = path.lastIndexOf("/");
    return i > -1 ? path.slice(0, i) : "";
  }

  function displayPath(photo) {
    const dir = dirOf(photo);
    if (!dir) return state.folderName ? state.folderName + " / 根目录" : "图库根目录";
    return (state.folderName ? state.folderName + " / " : "") + dir;
  }

  function pad(num, len) {
    return String(num).padStart(len, "0");
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (Number(prefs.thumbSize)) state.thumbSize = F.clamp(Number(prefs.thumbSize), 140, 320);
      if (prefs.sort) state.sort = prefs.sort;
      if (typeof prefs.inspector === "boolean") state.inspector = prefs.inspector;
      if (typeof prefs.hideDuplicates === "boolean") state.hideDuplicates = prefs.hideDuplicates;
    } catch (err) {
      /* ignore */
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          thumbSize: state.thumbSize,
          sort: state.sort,
          inspector: state.inspector,
          hideDuplicates: state.hideDuplicates
        })
      );
    } catch (err) {
      /* ignore */
    }
  }

  function applyPrefs() {
    el.sort.value = state.sort;
    setThumbSize(state.thumbSize, false);
    el.app.classList.toggle("inspector-hidden", !state.inspector);
  }

  function setThumbSize(size, persist) {
    state.thumbSize = F.clamp(Number(size) || 208, 140, 320);
    el.grid.style.setProperty("--thumb-size", state.thumbSize + "px");
    el.thumbRange.value = String(state.thumbSize);
    if (persist !== false) savePrefs();
    if (virtual.active) {
      virtual.cardHeight = 0;
      clearTimeout(virtual.resizeTimer);
      virtual.resizeTimer = window.setTimeout(() => {
        if (!virtual.active) return;
        renderGrid(el.gridScroll.scrollTop);
      }, 120);
    }
  }

  function toast(message, type, duration) {
    const node = document.createElement("div");
    node.className = "toast" + (type ? " " + type : "");
    node.textContent = message;
    node.dataset.seq = String(++toastSeq);
    el.toasts.appendChild(node);
    const ttl = duration || 3400;
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => node.remove(), 240);
    }, ttl);
    while (el.toasts.children.length > 4) {
      el.toasts.firstElementChild.remove();
    }
  }

  function setSaveKind(kind) {
    state.saveKind = kind;
    renderSaveState();
  }

  function renderSaveState() {
    const labels = {
      folder: "标记自动保存",
      local: "标记存于本机",
      saving: "正在保存标记…",
      error: "标记保存失败"
    };
    el.saveState.className = "save-state " + state.saveKind;
    const text = el.saveState.querySelector("span");
    if (text) text.textContent = labels[state.saveKind] || labels.local;
  }

  /* ============================================================
     loading overlay
     ============================================================ */

  function showLoading(title, sub) {
    state.loading = true;
    state.loadCancelled = false;
    el.loading.hidden = false;
    el.loadingTitle.textContent = title || "正在读取照片…";
    el.loadingSub.textContent = sub || "0 个文件";
    el.loadingBar.style.width = "0%";
    el.loadingCancel.disabled = false;
    el.loadingCancel.textContent = "取消";
  }

  function setLoadingProgress(fraction, sub) {
    el.loadingBar.style.width = Math.round(F.clamp(fraction, 0, 1) * 100) + "%";
    if (sub != null) el.loadingSub.textContent = sub;
  }

  function hideLoading() {
    state.loading = false;
    el.loading.hidden = true;
  }

  /* ============================================================
     folder loading
     ============================================================ */

  function openFolderAction() {
    if (state.project) {
      pickSource();
      return;
    }
    pickFolder();
  }

  async function pickFolder() {
    if (state.loading) return;
    closeMenu();
    if (!("showDirectoryPicker" in window)) {
      el.fileInput.value = "";
      el.fileInput.click();
      toast("当前浏览器不支持直接读取文件夹，已切换到文件选择。");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "furix-library",
        mode: "readwrite",
        startIn: "pictures"
      });
      await loadFromHandle(handle);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast(
        "无法直接读取文件夹，已切换到文件选择（只读，导出仍可用）。",
        "error",
        4800
      );
      el.fileInput.value = "";
      el.fileInput.click();
    }
  }

  async function loadFromHandle(handle) {
    if (!handle) return;
    showLoading("正在读取文件夹…", "0 个文件");
    const items = [];
    let found = 0;

    async function walk(dir, prefix, depth) {
      if (state.loadCancelled) return;
      let entries = [];
      try {
        for await (const pair of dir.entries()) {
          const name = pair[0];
          const child = pair[1];
          if (!name || name.startsWith(".")) continue;
          entries.push([name, child]);
        }
      } catch (err) {
        return;
      }
      entries.sort((a, b) => a[0].localeCompare(b[0], "zh-Hans-CN", { numeric: true }));
      for (const [name, child] of entries) {
        if (state.loadCancelled) return;
        if (child.kind === "directory") {
          if (depth < 7 && !SKIP_DIRS.has(name)) {
            await walk(child, prefix + name + "/", depth + 1);
          }
        } else if (F.isImageName(name)) {
          items.push({ relPath: prefix + name, name: name, handle: child });
          found += 1;
          if (found % 25 === 0) {
            el.loadingSub.textContent = found + " 个文件";
          }
        }
      }
    }

    await walk(handle, "", 0);
    if (state.loadCancelled) {
      hideLoading();
      toast("已取消读取。");
      return;
    }
    if (!items.length) {
      hideLoading();
      toast("这个文件夹里没有找到可识别的照片。", "error");
      return;
    }

    const batchSize = 18;
    for (let i = 0; i < items.length; i += batchSize) {
      if (state.loadCancelled) break;
      const batch = items.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          try {
            const file = await item.handle.getFile();
            item.file = file;
            item.size = file.size;
            item.mtime = file.lastModified;
          } catch (err) {
            item.file = null;
          }
        })
      );
      setLoadingProgress(
        (i + batch.length) / items.length,
        Math.min(i + batch.length, items.length) + " / " + items.length + " 张"
      );
    }

    if (state.loadCancelled) {
      hideLoading();
      toast("已取消读取。");
      return;
    }

    const photos = buildPhotos(
      items.filter((item) => item.file),
      true
    );
    if (!photos.length) {
      hideLoading();
      toast("照片文件无法读取，请检查文件夹权限。", "error");
      return;
    }
    if (state.project) {
      await finishProjectSource(photos, handle.name, handle);
      hideLoading();
      toast("已载入 " + photos.length + " 个镜头素材。", "success", 2600);
      return;
    }
    let writable = false;
    try {
      if (handle.queryPermission) {
        writable = (await handle.queryPermission({ mode: "readwrite" })) === "granted";
      }
    } catch (err) {
      writable = false;
    }

    await finishLoad(photos, handle.name, handle, writable);
    hideLoading();
    if (photos.length) {
      toast(
        "已载入 " + photos.length + " 张照片" + (writable ? "，标记会自动保存到文件夹。" : "。"),
        "success",
        2600
      );
    }
  }

  function projectStorageKey() {
    return "furix.project.v1:" + String((state.project && state.project.name) || "project").toLowerCase();
  }

  function photoTime(photo) {
    if (!photo) return 0;
    if (photo.exif && photo.exif.takenAt) return photo.exif.takenAt;
    return photo.mtime || 0;
  }

  function sortedSessions() {
    return state.sessions
      .slice()
      .sort((a, b) => (a.start || 0) - (b.start || 0));
  }

  function sessionForPhoto(photo) {
    if (!state.project || !state.sessions.length) return null;
    const time = photoTime(photo);
    if (!time) return null;
    for (const session of state.sessions) {
      if (time >= session.start && time < session.end) return session;
    }
    return null;
  }

  function clientForPhoto(photo) {
    const session = sessionForPhoto(photo);
    return session && session.clientId ? session.clientId : null;
  }

  function clientById(id) {
    return state.clients.find((client) => client.id === id) || null;
  }

  function clientName(id) {
    const client = clientById(id);
    return client ? client.name : "未分配";
  }

  function collectProjectPayload() {
    if (!state.project) return null;
    return {
      app: "FURIX Selects",
      type: "furix-project",
      version: 1,
      name: state.project.name,
      code: state.project.code || state.project.name,
      projectType: state.project.projectType || "order",
      updatedAt: Date.now(),
      clients: state.clients.map((c) => ({ id: c.id, name: c.name, folder: c.folder })),
      sessions: state.sessions.map((s) => ({
        id: s.id,
        name: s.name,
        start: s.start,
        end: s.end,
        clientId: s.clientId || null
      })),
      marks: collectMarks(),
      returns: state.returns || {},
      deliveries: state.deliveries || {},
      archives: state.archives || {},
      settings: {
        sessionGap: state.sessionGap,
        sessionMin: state.sessionMin,
        fileFilter: state.fileFilter
      }
    };
  }

  async function saveProjectNow() {
    if (!state.project) return false;
    const payload = collectProjectPayload();
    try {
      localStorage.setItem(projectStorageKey(), JSON.stringify(payload));
    } catch (err) {
      /* ignore */
    }
    if (state.project.handle) {
      try {
        await F.writeProjectFile(state.project.handle, payload);
        setSaveKind("folder");
        recordRecent();
        return true;
      } catch (err) {
        setSaveKind("local");
        return false;
      }
    }
    setSaveKind("local");
    recordRecent();
    return false;
  }

  function parseClientNames(value) {
    const names = String(value || "")
      .split(/[,，\n]/)
      .map((name) => name.trim().replace(/[\\/:*?"<>|]/g, "_"))
      .filter(Boolean);
    const unique = [];
    for (const name of names) {
      if (!unique.some((n) => n.toLowerCase() === name.toLowerCase())) unique.push(name);
    }
    return unique;
  }

  function makeClients(names) {
    return names.map((name, index) => ({
      id: "c" + (index + 1),
      name: name,
      folder: name
    }));
  }

  function tsToLocalInput(ts, roundUp) {
    if (!ts) return "";
    // Minute-precision inputs would truncate a session's end (e.g. 09:00:46
    // becomes 09:00) and then fail validation, so ends round up instead.
    const time = roundUp ? Math.ceil(ts / 60000) * 60000 : ts;
    const d = new Date(time);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      "T" + pad(d.getHours()) + ":" + pad(d.getMinutes())
    );
  }

  function localInputToTs(value) {
    if (!value) return 0;
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  }

  function sessionDisplayTime(session) {
    const d1 = new Date(session.start);
    const d2 = new Date(session.end);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      pad(d1.getMonth() + 1) + "-" + pad(d1.getDate()) + " " +
      pad(d1.getHours()) + ":" + pad(d1.getMinutes()) + "–" +
      pad(d2.getHours()) + ":" + pad(d2.getMinutes())
    );
  }

  function sessionPhotoCount(session) {
    let count = 0;
    for (const photo of state.photos) {
      const time = photoTime(photo);
      if (time >= session.start && time < session.end) count += 1;
    }
    return count;
  }


  // macOS 的文件名是 NFD，Windows 是 NFC；统一成 NFC 才能同名匹配、判重
  function nfc(value) {
    const text = String(value == null ? "" : value);
    return text.normalize ? text.normalize("NFC") : text;
  }

  function buildPhotos(items, fromHandle) {
    const groups = new Map();
    for (const item of items) {
      if (!item || !item.file) continue;
      const rel = nfc(item.relPath || item.name);
      const slash = rel.lastIndexOf("/");
      const dir = slash >= 0 ? rel.slice(0, slash + 1) : "";
      const base = nfc(F.baseName(item.name));
      const key = (dir + base).toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { relPath: dir + base, files: [] });
      }
      const ext = F.extOf(item.name);
      groups.get(key).files.push({
        file: item.file,
        name: item.name,
        ext: ext,
        kind: F.isRawExt(ext) ? "raw" : "image",
        size: item.size || item.file.size || 0,
        mtime: item.mtime || item.file.lastModified || 0
      });
    }

    const photos = [];
    const seenIds = new Set();
    for (const group of groups.values()) {
      const files = group.files;
      const jpg = files.find((f) => ["jpg", "jpeg", "jpe", "jfif"].includes(f.ext)) || null;
      const image = files.find((f) => F.canPreviewExt(f.ext)) || null;
      const raw = files.find((f) => F.isRawExt(f.ext)) || null;
      const other = files.find((f) => F.isOpaqueExt(f.ext)) || files[0] || null;
      if (!jpg && !image && !raw && !other) continue;
      const primary = jpg || image || raw || other;
      const previewSource = jpg || image || raw || other;
      let id = group.relPath;
      if (seenIds.has(id)) {
        let n = 2;
        while (seenIds.has(id + "#" + n)) n += 1;
        id = id + "#" + n;
      }
      seenIds.add(id);
      const hasJpg = !!jpg;
      const hasRaw = !!raw;
      const hasNativeImage = !!image;
      const isRawPreview = !hasNativeImage && hasRaw;
      const types = [];
      if (hasJpg) types.push("JPG");
      else if (image) types.push(image.ext.toUpperCase());
      if (hasRaw && raw && (!jpg || raw.ext !== (jpg.ext || ""))) types.push(raw.ext.toUpperCase());
      if (!types.length && other) types.push(other.ext.toUpperCase());
      const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
      photos.push({
        id: id,
        relPath: group.relPath,
        name: primary.name,
        file: previewSource.file,
        jpgFile: jpg ? jpg.file : null,
        imageFile: image ? image.file : null,
        rawFile: raw ? raw.file : null,
        files: files,
        hasJpg: hasJpg,
        hasRaw: hasRaw,
        typeLabel: Array.from(new Set(types)).join("+") || primary.ext.toUpperCase(),
        size: totalSize || primary.size,
        mtime: primary.mtime,
        ext: primary.ext,
        isRaw: isRawPreview,
        rawState: isRawPreview ? "idle" : "ready",
        rawPromise: null,
        rawPreviewError: null,
        previewRange: null,
        previewWidth: 0,
        previewHeight: 0,
        exif: null,
        exifState: "idle",
        exifPromise: null,
        previewable: hasNativeImage || hasRaw,
        width: 0,
        height: 0,
        thumbUrl: null,
        thumbPromise: null,
        thumbError: false,
        fromHandle: !!fromHandle
      });
    }
    photos.sort((a, b) => a.relPath.localeCompare(b.relPath, "zh-Hans-CN", { numeric: true }));
    annotateDuplicates(photos);
    return photos;
  }

  /* ---------- 重复照片（同名 + 同大小） ---------- */

  // IMG_2341、IMG_2341-2、IMG_2341(1)、IMG_2341 副本 都归到同一个名字。
  // 只剥 -N / (N) / 空格+N / 副本 / copy，不碰 _N（相机自身就用 _0002 这种）。
  function normalizeDupBase(base) {
    let value = String(base || "").toUpperCase().trim();
    value = value.replace(/\s*\(\d+\)$/, "");
    value = value.replace(/\s*-\s*\d+$/, "");
    value = value.replace(/\s+\d+$/, "");
    value = value.replace(/\s*副本$/, "");
    value = value.replace(/\s*COPY$/, "");
    return value.trim();
  }

  function hasCopySuffix(name) {
    const base = F.baseName(name).toUpperCase();
    return normalizeDupBase(base) !== base;
  }

  function compareDupOrder(a, b) {
    const aSuffix = hasCopySuffix(a.name) ? 1 : 0;
    const bSuffix = hasCopySuffix(b.name) ? 1 : 0;
    if (aSuffix !== bSuffix) return aSuffix - bSuffix;
    const aDepth = (a.relPath.match(/\//g) || []).length;
    const bDepth = (b.relPath.match(/\//g) || []).length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.relPath.localeCompare(b.relPath, "zh-Hans-CN", { numeric: true });
  }

  function annotateDuplicates(photos) {
    const baseGroups = new Map();
    const nameGroups = new Map();
    for (const photo of photos) {
      const base = F.baseName(photo.name).toUpperCase();
      const size = photo.size || 0;
      const dupKey = normalizeDupBase(base) + "|" + size;
      const nameKey = base + "|" + size;
      photo.dupKey = dupKey;
      photo.nameKey = nameKey;
      photo.dupOf = null;
      photo.dupGroupSize = 1;
      if (!baseGroups.has(dupKey)) baseGroups.set(dupKey, []);
      baseGroups.get(dupKey).push(photo);
      if (!nameGroups.has(nameKey)) nameGroups.set(nameKey, []);
      nameGroups.get(nameKey).push(photo);
    }
    state.nameGroups = new Map();
    for (const [key, list] of nameGroups) {
      if (list.length > 1) state.nameGroups.set(key, list);
    }
    let duplicates = 0;
    for (const list of baseGroups.values()) {
      if (list.length < 2) continue;
      list.sort(compareDupOrder);
      const representative = list[0];
      for (const photo of list) {
        photo.dupGroupSize = list.length;
        photo.dupOf = photo === representative ? null : representative.id;
        if (photo.dupOf) duplicates += 1;
      }
    }
    state.duplicateCount = duplicates;
    return duplicates;
  }

  // 完全同名（+同大小）的副本共享标记：一张打了星，另一张自动一样。
  function propagateNameMarks(ids) {
    if (!state.nameGroups || !state.nameGroups.size) return [];
    const touched = [];
    const done = new Set();
    for (const id of ids) {
      const photo = state.byId.get(id);
      if (!photo || !photo.nameKey) continue;
      const list = state.nameGroups.get(photo.nameKey);
      if (!list || done.has(photo.nameKey)) continue;
      done.add(photo.nameKey);
      let best = null;
      for (const member of list) {
        const record = state.meta.get(member.id);
        if (record && (!best || (record.updatedAt || 0) > (best.updatedAt || 0))) best = record;
      }
      if (!best) continue;
      for (const member of list) {
        state.meta.set(member.id, {
          flag: best.flag || null,
          rating: Number(best.rating) || 0,
          color: best.color || null,
          updatedAt: best.updatedAt || 0
        });
        touched.push(member.id);
      }
    }
    return touched;
  }

  function syncNameMarks() {
    if (!state.nameGroups || !state.nameGroups.size) return;
    const keys = Array.from(state.nameGroups.keys());
    const ids = [];
    for (const key of keys) {
      const list = state.nameGroups.get(key) || [];
      if (list.length) ids.push(list[0].id);
    }
    propagateNameMarks(ids);
  }

  function duplicateSummary() {
    let total = 0;
    let groups = 0;
    for (const photo of state.photos) {
      if (photo.dupGroupSize > 1) {
        total += 1;
        if (!photo.dupOf) groups += 1;
      }
    }
    return { photos: total, duplicates: Math.max(0, total - groups), groups: groups };
  }

  /* ============================================================
     project
     ============================================================ */

  function todayInputValue() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function projectTypeLetter() {
    return el.projectType.value === "fun" ? "B" : "A";
  }

  function composeProjectCode() {
    const letter = projectTypeLetter();
    let stamp = "";
    const value = el.projectDate.value;
    if (value) {
      const d = new Date(value + "T00:00:00");
      if (!Number.isNaN(d.getTime())) {
        stamp = d.getMonth() + 1 + "." + d.getDate();
      }
    }
    const short = F.sanitizeFileName(el.projectNameInput.value.trim(), "");
    return F.sanitizeFileName(letter + stamp + short, "") || letter;
  }

  function openProjectModal() {
    state.pendingProjectParent = null;
    el.projectType.value = "order";
    el.projectDate.value = todayInputValue();
    el.projectNameInput.value = "";
    el.projectClientsInput.value = "客户1, 客户2, 客户3, 客户4";
    el.projectParentName.textContent = "未选择";
    el.projectModal.hidden = false;
    document.body.classList.add("modal-open");
    updateProjectPreview();
    requestAnimationFrame(() => el.projectNameInput.focus());
  }

  function closeProjectModal() {
    el.projectModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function updateProjectPreview() {
    const code = composeProjectCode();
    const clients = parseClientNames(el.projectClientsInput.value);
    el.projectPreviewPath.textContent =
      code + (clients.length ? " / " + clients.join(" · ") : " / 未添加客户");
  }

  async function pickProjectParent() {
    if (!("showDirectoryPicker" in window)) {
      toast("当前浏览器无法创建文件夹，请使用 Chrome / Edge。", "error");
      return false;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "furix-project-parent",
        mode: "readwrite"
      });
      state.pendingProjectParent = handle;
      el.projectParentName.textContent = handle.name;
      return true;
    } catch (err) {
      if (err && err.name === "AbortError") return false;
      toast("选择父文件夹失败：" + (err.message || err), "error");
      return false;
    }
  }

  async function createProjectFromModal() {
    const code = composeProjectCode();
    const clientNames = parseClientNames(el.projectClientsInput.value);
    if (!el.projectNameInput.value.trim()) {
      toast("给这一场起个名字，比如 露营。", "error");
      return;
    }
    if (!clientNames.length) {
      toast("至少添加一个客户文件夹。", "error");
      return;
    }
    if (!state.pendingProjectParent) {
      const picked = await pickProjectParent();
      if (!picked) return;
    }
    el.projectCreate.disabled = true;
    try {
      const projectHandle = await state.pendingProjectParent.getDirectoryHandle(code, {
        create: true
      });
      const clients = makeClients(clientNames);
      for (const client of clients) {
        await projectHandle.getDirectoryHandle(client.folder, { create: true });
      }
      const payload = {
        app: "FURIX Selects",
        type: "furix-project",
        version: 1,
        name: code,
        code: code,
        projectType: projectTypeLetter() === "B" ? "fun" : "order",
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        clients: clients,
        sessions: [],
        marks: {},
        returns: {},
        deliveries: {},
        settings: { sessionGap: 30, sessionMin: 15, fileFilter: "jpg" }
      };
      await F.writeProjectFile(projectHandle, payload);
      // 项目父文件夹就是交付根，台账 CSV 放这里。
      await saveLedgerHandle(state.pendingProjectParent);
      await applyProjectPayload(payload, projectHandle);
      closeProjectModal();
      toast("项目 " + code + " 已创建。下一步选择 SD 卡素材目录。", "success", 4200);
      updateProjectUI();
    } catch (err) {
      toast("创建项目失败：" + (err.message || err), "error", 5000);
    } finally {
      el.projectCreate.disabled = false;
    }
  }

  async function openProjectFolder() {
    if (!("showDirectoryPicker" in window)) {
      toast("当前浏览器无法打开项目文件夹，请使用 Chrome / Edge。", "error");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "furix-project-open",
        mode: "readwrite"
      });
      const payload = await F.readProjectFile(handle);
      if (!payload) {
        toast("这个文件夹里没有 .furix-project.json，不是 FURIX 项目。", "error", 5000);
        return;
      }
      await applyProjectPayload(payload, handle);
      toast("项目已打开。请选择 SD 卡素材目录。", "success", 4200);
      updateProjectUI();
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("打开项目失败：" + (err.message || err), "error", 5000);
    }
  }

  async function applyProjectPayload(payload, handle) {
    const clientList = Array.isArray(payload.clients)
      ? payload.clients
          .filter((c) => c && c.name)
          .map((c, index) => ({
            id: c.id || "c" + (index + 1),
            name: c.name,
            folder: c.folder || c.name
          }))
      : makeClients(["客户1", "客户2", "客户3", "客户4"]);
    const sessions = Array.isArray(payload.sessions)
      ? payload.sessions
          .filter((s) => s && s.start && s.end && s.end > s.start)
          .map((s, index) => ({
            id: s.id || "s" + (index + 1),
            name: s.name || "场次 " + (index + 1),
            start: Number(s.start),
            end: Number(s.end),
            clientId: s.clientId || null
          }))
      : [];
    state.project = {
      name: payload.code || payload.name || handle.name,
      code: payload.code || payload.name || handle.name,
      projectType: payload.projectType === "fun" ? "fun" : "order",
      handle: handle,
      payload: payload
    };
    state.clients = clientList;
    state.sessions = sessions;
    state.deliveries =
      payload.deliveries && typeof payload.deliveries === "object" ? payload.deliveries : {};
    state.archives =
      payload.archives && typeof payload.archives === "object" ? payload.archives : {};
    state.folderName = state.project.name;
    state.folderHandle = handle;
    state.writable = true;
    state.sourceHandle = null;
    state.sourceName = "";
    state.meta = new Map(Object.entries(F.normalizeMarks(payload.marks || {})));
    state.returns = payload.returns && typeof payload.returns === "object" ? payload.returns : {};
    invalidateReturns();
    returns.lists = new Map();
    returns.batches = new Map();
    returns.choices = {};
    returns.listErrors = new Map();
    state.sessionGap = Number(payload.settings && payload.settings.sessionGap) || 30;
    state.sessionMin = Number(payload.settings && payload.settings.sessionMin) || 15;
    state.fileFilter = (payload.settings && payload.settings.fileFilter) || "jpg";
    state.clientFilter = "all";
    state.sessionFilter = "all";
    state.photos = [];
    state.byId = new Map();
    state.selection = new Set();
    state.visible = [];
    state.focusId = null;
    state.currentLoupeId = null;
    state.view = "grid";
    el.app.dataset.view = "grid";
    el.loupe.hidden = true;
    el.app.classList.add("has-project");
    el.app.classList.add("no-library");
    el.projectSection.hidden = false;
    updateProjectUI();
    updateFolderUI();
    updateStartPanels();
    recordRecent(0);
    setSaveKind("folder");
    updateFileFilterUI();
    applyFilters({ resetScroll: true });
    resetExifFacets();
    updateStatus();
    document.title = state.project.name + " · FURIX SELECTS";
  }

  async function pickSource() {
    if (!state.project) return;
    if (!("showDirectoryPicker" in window)) {
      el.fileInput.value = "";
      el.fileInput.click();
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "furix-source",
        mode: "read",
        startIn: "pictures"
      });
      await loadFromHandle(handle);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("打开素材目录失败：" + (err.message || err), "error", 5000);
    }
  }

  async function finishProjectSource(photos, sourceName, handle) {
    virtual.disabled = false;
    flushPendingMarks();
    if (state.photos.length) revokeLibraryUrls();
    stopExifScan(true);
    state.photos = photos;
    state.byId = new Map(photos.map((p) => [p.id, p]));
    syncNameMarks();
    state.selection = new Set();
    state.focusId = null;
    state.anchorId = null;
    state.currentLoupeId = null;
    state.sourceName = sourceName;
    state.sourceHandle = handle;
    state.folderName = state.project.name;
    state.folderHandle = state.project.handle;
    state.writable = true;
    state.demo = false;
    state.view = "grid";
    el.app.dataset.view = "grid";
    el.loupe.hidden = true;
    state.fileFilter = photos.some((p) => p.hasJpg) ? "jpg" : "all";
    resetFilterUI();
    resetExifFacets();
    updateFileFilterUI();
    state.clientFilter = "all";
    state.sessionFilter = "all";
    returns.lists = new Map();
    returns.batches = new Map();
    returns.listErrors = new Map();
    el.app.classList.toggle("no-library", !photos.length);
    el.app.classList.add("has-project");
    el.projectSection.hidden = false;
    updateProjectUI();
    updateFolderUI();
    updateCounts();
    applyFilters({ resetScroll: true });
    updateStatus();
    updateInspector();
    setSaveKind("folder");
    document.title = state.project.name + " · FURIX SELECTS";
    const scanSet = photos;
    window.setTimeout(() => {
      if (state.photos === scanSet) startExifScan(scanSet);
    }, 400);
  }

  function updateProjectUI() {
    if (!state.project) {
      el.projectSection.hidden = true;
      el.app.classList.remove("has-project");
      el.sessionSelectWrap.hidden = true;
      closeProjectMenu();
      return;
    }
    el.projectSection.hidden = false;
    el.app.classList.add("has-project");
    el.sourceName.textContent = state.sourceName || "未挂载素材源";
    el.sourceSub.textContent = state.sourceName
      ? state.photos.length + " 个镜头 · SD 卡"
      : "选择 SD 卡根目录";
    el.folderName.textContent = state.project.name;
    el.folderSub.textContent = state.sourceName
      ? state.sourceName + " · " + state.photos.length + " 个镜头"
      : "项目已创建，等待素材源";
    renderClientList();
    updateSessionFilterOptions();
    updateFileFilterUI();
  }

  function closeProjectMenu() {
    if (el.projectMenu) el.projectMenu.hidden = true;
  }

  function toggleProjectMenu() {
    if (!el.projectMenu) return;
    el.projectMenu.hidden = !el.projectMenu.hidden;
    if (!el.projectMenu.hidden) renderProjectRecent();
  }

  // 最近项目列表：IndexedDB 里存着句柄的优先，取不到就退回 localStorage 摘要
  async function recentRows() {
    let rows = [];
    try {
      rows = await recentAll();
    } catch (err) {
      rows = [];
    }
    if (!rows.length) {
      try {
        rows = recentLocalLoad().map((row) => Object.assign({}, row, { handle: null }));
      } catch (err) {
        rows = [];
      }
    }
    return rows;
  }

  // 项目菜单顶部：最近 3 个项目，点一下就切过去
  async function renderProjectRecent() {
    if (!el.projectRecent) return;
    const current = state.project ? state.project.code || state.project.name : "";
    const rows = await recentRows();
    const others = rows.filter((row) => row.code !== current).slice(0, RECENT_MAX);
    if (el.projectRecentLabel) el.projectRecentLabel.hidden = others.length === 0;
    if (el.projectRecentSep) el.projectRecentSep.hidden = others.length === 0;
    el.projectRecent.hidden = others.length === 0;
    if (!others.length) {
      el.projectRecent.innerHTML = "";
      return;
    }
    el.projectRecent.innerHTML = others
      .map(
        (row) =>
          '<button type="button" class="mini-menu-recent" data-recent="' +
          F.escapeHtml(row.code) +
          '"><span>' +
          F.escapeHtml(row.code) +
          "</span><small>" +
          F.escapeHtml(timeAgo(row.openedAt)) +
          "</small></button>"
      )
      .join("");
  }

  // 项目卡上的「切换项目」：点开才列出最近项目，卡片本身保持干净
  let peRecentToken = 0;
  async function refreshPeRecent() {
    if (!el.peRecent) return;
    const token = ++peRecentToken;
    const rows = await recentRows();
    if (token !== peRecentToken) return;
    const current = state.project ? state.project.code || state.project.name : "";
    const others = rows.filter((row) => row.code !== current).slice(0, RECENT_MAX);
    const has = others.length > 0;
    if (el.peSwitch) el.peSwitch.hidden = !has;
    if (el.peFootSep) el.peFootSep.hidden = !has;
    if (!has) {
      el.peRecent.hidden = true;
      el.peRecent.innerHTML = "";
      return;
    }
    const wasOpen = !el.peRecent.hidden;
    el.peRecent.innerHTML = others
      .map(
        (row) =>
          '<button type="button" data-recent="' +
          F.escapeHtml(row.code) +
          '"><span>' +
          F.escapeHtml(row.code) +
          "</span><small>" +
          F.escapeHtml(timeAgo(row.openedAt)) +
          "</small></button>"
      )
      .join("");
    el.peRecent.hidden = !wasOpen;
  }

  // 切换项目：先存当前项目（closeLibrary 内部同步发起保存），再按句柄打开目标项目。
  // 不在中间 await 保存，免得耗掉浏览器的“用户手势”，那样重新授权目录会被拒。
  async function switchToProject(code) {
    closeProjectMenu();
    if (!code) return;
    const current = state.project ? state.project.code || state.project.name : "";
    if (code === current) return;
    if (state.project) closeLibrary({ quiet: true });
    await openRecent(code);
  }

  function handleProjectMenuAction(action) {
    closeProjectMenu();
    if (action === "sessions") openSessionsModal();
    else if (action === "returns") openReturnsModal();
    else if (action === "delivery") openDeliveryModal();
    else if (action === "archive") openArchiveModal();
    else if (action === "ledger") openLedgerModal();
    else if (action === "clients") openClientsModal();
    else if (action === "source") pickSource();
    else if (action === "export") openProjectExport();
    else if (action === "close") closeLibrary();
  }

  function renderClientList() {
    if (!state.project) return;
    const counts = new Map();
    let unassigned = 0;
    for (const photo of state.photos) {
      const cid = clientForPhoto(photo);
      if (cid) counts.set(cid, (counts.get(cid) || 0) + 1);
      else unassigned += 1;
    }
    const rows = [];
    rows.push(
      '<button class="client-row' +
        (state.clientFilter === "all" ? " is-active" : "") +
        '" type="button" data-client="all"><span class="client-dot"></span><span>全部</span><span class="client-count">' +
        state.photos.length +
        "</span></button>"
    );
    for (const client of state.clients) {
      const record = state.returns[client.id];
      const returned = record && Array.isArray(record.matched) ? record.matched.length : 0;
      const delivered = state.deliveries[client.id];
      rows.push(
        '<button class="client-row' +
          (state.clientFilter === client.id ? " is-active" : "") +
          '" type="button" data-client="' +
          F.escapeHtml(client.id) +
          '"><span class="client-dot" style="background:var(--gold)"></span><span>' +
          F.escapeHtml(client.name) +
          "</span>" +
          (returned ? '<span class="client-return">回' + returned + "</span>" : "") +
          (delivered ? '<span class="client-deliver">已交</span>' : "") +
          '<span class="client-count">' +
          (counts.get(client.id) || 0) +
          "</span></button>"
      );
    }
    rows.push(
      '<button class="client-row' +
        (state.clientFilter === "unassigned" ? " is-active" : "") +
        '" type="button" data-client="unassigned"><span class="client-dot"></span><span>未分配</span><span class="client-count">' +
        unassigned +
        "</span></button>"
    );
    el.clientList.innerHTML = rows.join("");
  }

  function setClientFilter(value) {
    state.clientFilter = value || "all";
    renderClientList();
    applyFilters({ resetScroll: true });
  }

  function updateSessionFilterOptions() {
    if (!state.project) {
      el.sessionSelectWrap.hidden = true;
      return;
    }
    el.sessionSelectWrap.hidden = false;
    const current = state.sessionFilter;
    el.sessionFilter.innerHTML = "";
    const add = (value, label) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      el.sessionFilter.appendChild(option);
    };
    add("all", "全部场次");
    add("unassigned", "未进场次");
    for (const session of sortedSessions()) {
      add(session.id, session.name + " · " + sessionDisplayTime(session));
    }
    const values = Array.from(el.sessionFilter.options).map((o) => o.value);
    state.sessionFilter = values.includes(current) ? current : "all";
    el.sessionFilter.value = state.sessionFilter;
  }

  function setSessionFilter(value) {
    state.sessionFilter = value || "all";
    applyFilters({ resetScroll: true });
  }

  function suggestSessions() {
    const timed = state.photos
      .map((photo) => ({ photo: photo, time: photoTime(photo) }))
      .filter((item) => item.time > 0)
      .sort((a, b) => a.time - b.time);
    if (!timed.length) return [];
    const gapMs = Math.max(5, Number(state.sessionGap) || 30) * 60 * 1000;
    const minPhotos = Math.max(1, Number(state.sessionMin) || 15);
    const clusters = [];
    let current = [timed[0]];
    for (let i = 1; i < timed.length; i += 1) {
      if (timed[i].time - timed[i - 1].time >= gapMs) {
        clusters.push(current);
        current = [];
      }
      current.push(timed[i]);
    }
    clusters.push(current);
    return clusters
      .filter((cluster) => cluster.length >= minPhotos)
      .map((cluster, index) => {
        const start = cluster[0].time;
        const last = cluster[cluster.length - 1].time;
        const end = last + 1000;
        const d1 = new Date(start);
        const d2 = new Date(end);
        const pad = (n) => String(n).padStart(2, "0");
        // Pre-fill clients in shooting order: it is only a suggestion and can
        // be changed per session, but saves four dropdowns on a normal day.
        const client = state.clients[index] || null;
        return {
          id: "s" + (index + 1) + "_" + start,
          name: "场次 " + (index + 1) + " · " + pad(d1.getHours()) + ":" + pad(d1.getMinutes()),
          start: start,
          end: end,
          clientId: client ? client.id : null
        };
      });
  }

  function openSessionsModal() {
    if (!state.project) return;
    renderSessionRows(state.sessions.map((s) => ({ ...s })));
    el.sessionGapInput.value = state.sessionGap;
    el.sessionMinInput.value = state.sessionMin;
    el.sessionsModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeSessionsModal() {
    el.sessionsModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function renderSessionRows(draft) {
    el.sessionRows.innerHTML = "";
    const sessions = draft || [];
    if (!sessions.length) {
      el.sessionRows.innerHTML =
        '<div class="session-empty">还没有场次。可以自动建议，或手动新增一个时间段。</div>';
      el.sessionSummary.textContent = "0 场";
      return;
    }
    sessions.sort((a, b) => a.start - b.start);
    for (const session of sessions) {
      const row = document.createElement("div");
      row.className = "session-row";
      row.dataset.id = session.id;
      row.innerHTML =
        '<input class="session-name" value="' + F.escapeHtml(session.name || "场次") + '" />' +
        '<input class="session-start" type="datetime-local" value="' + tsToLocalInput(session.start) + '" />' +
        '<input class="session-end" type="datetime-local" value="' + tsToLocalInput(session.end, true) + '" />' +
        '<select class="session-client"><option value="">未分配</option>' +
        state.clients
          .map(
            (c) =>
              '<option value="' + F.escapeHtml(c.id) + '"' +
              (session.clientId === c.id ? " selected" : "") +
              ">" + F.escapeHtml(c.name) + "</option>"
          )
          .join("") +
        "</select>" +
        '<span class="session-count">' + sessionPhotoCount(session) + " 张</span>" +
        '<button class="session-delete" type="button" title="删除">×</button>';
      el.sessionRows.appendChild(row);
    }
    el.sessionSummary.textContent = sessions.length + " 场";
  }

  function readSessionDraft() {
    const rows = Array.from(el.sessionRows.querySelectorAll(".session-row"));
    return rows
      .map((row, index) => ({
        id: row.dataset.id || "s" + (index + 1) + "_" + Date.now(),
        name: row.querySelector(".session-name").value.trim() || "场次 " + (index + 1),
        start: localInputToTs(row.querySelector(".session-start").value),
        end: localInputToTs(row.querySelector(".session-end").value),
        clientId: row.querySelector(".session-client").value || null
      }))
      .filter((s) => s.start && s.end);
  }

  function saveSessionsFromModal() {
    const sessions = readSessionDraft();
    sessions.sort((a, b) => a.start - b.start);
    for (let i = 0; i < sessions.length; i += 1) {
      if (sessions[i].end <= sessions[i].start) {
        toast("场次「" + sessions[i].name + "」的结束时间必须晚于开始时间。", "error");
        return;
      }
      if (i > 0 && sessions[i].start < sessions[i - 1].end) {
        toast("场次「" + sessions[i].name + "」与上一场时间重叠，请调整。", "error");
        return;
      }
    }
    state.sessions = sessions;
    state.clientFilter = "all";
    state.sessionFilter = "all";
    renderClientList();
    updateSessionFilterOptions();
    scheduleSave();
    closeSessionsModal();
    applyFilters({ resetScroll: false });
    updateStatus();
    toast("场次已保存。", "success");
  }

  /* ---------- project export ---------- */

  const pe = { busy: false, cancel: false, scope: "view" };

  function peScopePhotos(scope) {
    switch (scope) {
      case "selected":
        return state.photos.filter((p) => state.selection.has(p.id));
      case "all":
        return state.photos.filter((p) => !!clientForPhoto(p));
      case "view":
      default:
        return state.visible.slice();
    }
  }

  function pePlan() {
    const wantClient = el.peClient.value || "all";
    const wantJpg = el.peJpg.checked;
    const wantRaw = el.peRaw.checked;
    const photos = peScopePhotos(pe.scope);
    const byClient = new Map();
    let unassigned = 0;
    for (const photo of photos) {
      let cid = clientForPhoto(photo);
      if (wantClient !== "all") {
        // Picking one client means "put this batch here", even if the photo
        // is not covered by a session yet (typical: box-select and hand off).
        cid = wantClient;
      } else if (!cid) {
        unassigned += 1;
        continue;
      }
      if (!byClient.has(cid)) byClient.set(cid, []);
      byClient.get(cid).push(photo);
    }
    const groups = [];
    for (const client of state.clients) {
      if (wantClient !== "all" && client.id !== wantClient) continue;
      const list = byClient.get(client.id);
      if (!list || !list.length) continue;
      const files = [];
      for (const photo of list) {
        if (wantJpg && photo.jpgFile) files.push({ photo: photo, file: photo.jpgFile });
        if (wantRaw && photo.rawFile) files.push({ photo: photo, file: photo.rawFile });
      }
      if (!files.length) continue;
      groups.push({ client: client, photos: list, files: files });
    }
    const fileCount = groups.reduce((sum, group) => sum + group.files.length, 0);
    return {
      groups: groups,
      photos: photos,
      fileCount: fileCount,
      unassigned: unassigned,
      wantJpg: wantJpg,
      wantRaw: wantRaw,
      wantClient: wantClient
    };
  }

  function updatePeClients() {
    if (!state.project) return;
    const previous = el.peClient.value || "all";
    el.peClient.innerHTML = "";
    const add = (value, label) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      el.peClient.appendChild(option);
    };
    add("all", "全部客户（按客户分文件夹）");
    for (const client of state.clients) {
      const count = state.photos.reduce(
        (n, photo) => n + (clientForPhoto(photo) === client.id ? 1 : 0),
        0
      );
      add(client.id, client.name + "（" + count + "）");
    }
    const preferred =
      state.clientFilter && state.clientFilter !== "all" && state.clientFilter !== "unassigned"
        ? state.clientFilter
        : previous;
    const values = Array.from(el.peClient.options).map((option) => option.value);
    el.peClient.value = values.includes(preferred) ? preferred : "all";
  }

  function updatePeUI() {
    if (!state.project) return;
    $$("#pe-scope button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.scope === pe.scope);
    });
    const plan = pePlan();
    const types = [];
    if (plan.wantJpg) types.push("JPG");
    if (plan.wantRaw) types.push("RAW");
    let note;
    if (!plan.wantJpg && !plan.wantRaw) {
      note = "先勾选 JPG 或 RAW";
    } else if (!plan.fileCount) {
      note =
        plan.photos.length
          ? "这个范围里没有可导出的 " + types.join("+") + " 文件"
          : "这个范围没有照片";
    } else {
      note =
        plan.fileCount +
        " 个文件 · " +
        plan.groups.length +
        " 个客户" +
        (plan.unassigned ? " · " + plan.unassigned + " 张未分配客户" : "");
    }
    el.peNote.textContent = note;
    el.peStart.disabled = !plan.fileCount || pe.busy;
    el.peStart.textContent = plan.fileCount ? "导出 " + plan.fileCount + " 个文件" : "没有可导出的文件";
  }

  function resetPeOverlay() {
    el.peProgress.hidden = true;
    el.peSpinner.hidden = false;
    el.peIcon.hidden = true;
    el.peIcon.classList.remove("is-error");
    el.peStop.hidden = false;
    el.peStop.disabled = false;
    el.peStop.textContent = "停止";
    el.peDone.hidden = true;
    el.peBar.style.width = "0%";
    el.peClose.disabled = false;
    el.peCancel.disabled = false;
    el.peProgressTitle.textContent = "正在导出…";
    el.peProgressSub.textContent = "";
    pe.busy = false;
    pe.cancel = false;
  }

  function setPeProgress(fraction, sub, title) {
    el.peBar.style.width = Math.round(F.clamp(fraction, 0, 1) * 100) + "%";
    if (sub != null) el.peProgressSub.textContent = sub;
    if (title) el.peProgressTitle.textContent = title;
  }

  function openProjectExport(preferredScope) {
    if (!state.project) {
      openExport(preferredScope);
      return;
    }
    if (pe.busy) return;
    if (!state.photos.length) {
      toast("先选择 SD 卡素材目录。");
      return;
    }
    if (!state.project.handle) {
      toast("项目没有可写入的文件夹，请在“打开项目”里重新授权。", "error", 4600);
      return;
    }
    closeMenu();
    closeHelpIfOpen();
    const counts = {
      view: state.visible.length,
      selected: state.photos.reduce((n, p) => n + (state.selection.has(p.id) ? 1 : 0), 0),
      all: state.photos.reduce((n, p) => n + (clientForPhoto(p) ? 1 : 0), 0)
    };
    let scope = preferredScope && counts[preferredScope] != null ? preferredScope : null;
    if (!scope) {
      if (counts.selected) scope = "selected";
      else if (counts.view) scope = "view";
      else scope = counts.all ? "all" : "view";
    }
    if (!counts[scope]) {
      scope = counts.view ? "view" : counts.all ? "all" : "selected";
    }
    pe.scope = scope;
    const anyJpg = state.photos.some((p) => p.hasJpg);
    const anyRaw = state.photos.some((p) => p.hasRaw);
    el.peJpg.checked = anyJpg;
    el.peRaw.checked = !anyJpg && anyRaw;
    el.peTarget.value = "root";
    updatePeClients();
    resetPeOverlay();
    el.peModal.hidden = false;
    document.body.classList.add("modal-open");
    updatePeUI();
    const modalBody = el.peModal.querySelector(".modal-body");
    if (modalBody) modalBody.scrollTop = 0;
    requestAnimationFrame(() => el.peStart.focus({ preventScroll: true }));
  }

  function closeProjectExport() {
    if (pe.busy) return;
    el.peModal.hidden = true;
    resetPeOverlay();
    document.body.classList.remove("modal-open");
  }

  async function runProjectExport() {
    if (pe.busy || !state.project) return;
    const plan = pePlan();
    if (!plan.fileCount) {
      toast("没有可导出的文件。");
      return;
    }
    const root = state.project.handle;
    if (!root) {
      toast("项目没有可写入的文件夹。", "error");
      return;
    }
    const selectionDir = el.peTarget.value === "selection" ? "选图集" : "";
    const total = plan.fileCount;
    const failures = [];
    let written = 0;
    let index = 0;
    let madeFolders = 0;

    pe.busy = true;
    pe.cancel = false;
    el.peStart.disabled = true;
    el.peCancel.disabled = true;
    el.peClose.disabled = true;
    el.peProgress.hidden = false;
    el.peSpinner.hidden = false;
    el.peIcon.hidden = true;
    el.peProgressTitle.textContent = "正在按客户导出…";
    el.peProgressSub.textContent = "0 / " + total;
    el.peBar.style.width = "0%";
    el.peStop.hidden = false;
    el.peStop.disabled = false;
    el.peStop.textContent = "停止";
    el.peDone.hidden = true;

    try {
      for (const group of plan.groups) {
        if (pe.cancel) break;
        const folderName = group.client.folder || group.client.name;
        let dir = null;
        try {
          dir = await root.getDirectoryHandle(folderName, { create: true });
          if (selectionDir) dir = await dir.getDirectoryHandle(selectionDir, { create: true });
          madeFolders += 1;
        } catch (err) {
          failures.push(folderName + "：无法创建文件夹（" + (err && err.message ? err.message : err) + "）");
          continue;
        }
        const used = new Set();
        for (const entry of group.files) {
          if (pe.cancel) break;
          index += 1;
          try {
            const desired = entry.file.name || entry.photo.name;
            const finalName = await uniqueName(dir, desired, used, "");
            await writeBlob(dir, finalName, entry.file);
            written += 1;
          } catch (err) {
            failures.push(desiredName(entry) + "：" + (err && err.message ? err.message : err));
            if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
              throw err;
            }
          }
          setPeProgress(
            index / total * 0.98,
            index + " / " + total + " · " + group.client.name + " · " + desiredName(entry)
          );
          if (index % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    } catch (err) {
      failures.push("写入被中断：" + (err && err.message ? err.message : err));
    }

    function desiredName(entry) {
      return entry.file.name || entry.photo.name;
    }

    const cancelled = pe.cancel && written < total;
    pe.busy = false;
    el.peSpinner.hidden = true;
    el.peIcon.hidden = false;
    el.peIcon.textContent = written ? "✓" : "×";
    el.peIcon.classList.toggle("is-error", !written);
    el.peStop.hidden = true;
    el.peDone.hidden = false;
    el.peClose.disabled = false;
    el.peCancel.disabled = false;
    el.peBar.style.width = "100%";
    if (cancelled) {
      el.peProgressTitle.textContent = "已停止导出";
      el.peProgressSub.textContent = "已写入 " + written + " / " + total + " 个文件。";
      toast("已停止导出，已写入 " + written + " 个文件。", "error", 3800);
    } else if (!written) {
      el.peProgressTitle.textContent = "导出失败";
      el.peProgressSub.textContent = failures.slice(0, 2).join(" · ") || "没有文件写入。";
      toast("没有文件成功写入：" + (failures[0] || "未知原因"), "error", 5200);
    } else {
      el.peProgressTitle.textContent = failures.length ? "导出完成（部分失败）" : "导出完成";
      el.peProgressSub.textContent =
        written +
        " 个文件已写入 " +
        madeFolders +
        " 个客户文件夹" +
        (selectionDir ? "（" + selectionDir + "）" : "") +
        (failures.length ? " · " + failures.length + " 个失败：" + failures.slice(0, 2).join(" · ") : "");
      toast("已导出 " + written + " 个文件。", "success", 3800);
    }
    updatePeUI();
    requestAnimationFrame(() => el.peDone.focus({ preventScroll: true }));
  }

  /* ---------- client returns (客户回传) ---------- */

  const returns = {
    busy: false,
    cancel: false,
    lists: new Map(),
    batches: new Map(),
    choices: {},
    listErrors: new Map()
  };
  let returnedCache = null;

  function invalidateReturns() {
    returnedCache = null;
  }

  function returnedIdSet() {
    if (returnedCache) return returnedCache;
    const set = new Set();
    const all = state.returns || {};
    for (const key of Object.keys(all)) {
      const record = all[key];
      if (record && Array.isArray(record.matched)) {
        for (const id of record.matched) set.add(id);
      }
    }
    returnedCache = set;
    return set;
  }

  function normalizeReturnText(text) {
    return String(text || "")
      .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[，、;；:：]/g, ",")
      .replace(/[～〜]/g, "-")
      .replace(/到/g, "-")
      .replace(/(\d)\s*-\s*(\d)/g, "$1-$2")
      .replace(/[\r\n\t]+/g, " ");
  }

  function parseReturnText(text) {
    const normalized = normalizeReturnText(text);
    const tokens = normalized.split(/[,\s|/]+/).filter(Boolean);
    const items = [];
    const seen = new Set();
    let unknown = 0;
    let capped = 0;
    const pushNumber = (digits) => {
      if (!digits) return;
      const key = "n:" + digits;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ type: "num", digits: digits, label: digits });
    };
    for (const raw of tokens) {
      const range = raw.match(/^(\d+)-(\d+)$/);
      if (range) {
        let from = Number(range[1]);
        let to = Number(range[2]);
        if (from > to) {
          const swap = from;
          from = to;
          to = swap;
        }
        if (to - from > 2000) {
          capped += to - from - 2000;
          to = from + 2000;
        }
        const width = range[1].length;
        for (let n = from; n <= to; n += 1) pushNumber(String(n).padStart(width, "0"));
        continue;
      }
      const run = (raw.match(/\d+/) || [""])[0];
      if (!run) {
        unknown += 1;
        continue;
      }
      if (/[A-Za-z]/.test(raw)) {
        const key = "name:" + raw.toUpperCase();
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ type: "name", text: raw, digits: run, label: raw });
        }
        continue;
      }
      pushNumber(run);
    }
    return { items: items, unknown: unknown, capped: capped };
  }

  function buildReturnIndex() {
    const byName = new Map();
    const byNumber = new Map();
    const push = (map, key, photo) => {
      if (!map.has(key)) map.set(key, []);
      const list = map.get(key);
      if (list.indexOf(photo) < 0) list.push(photo);
    };
    for (const photo of state.photos) {
      const base = F.baseName(photo.name).toUpperCase();
      if (base) push(byName, base, photo);
      const runs = base.match(/\d+/g) || [];
      if (runs.length) {
        push(byNumber, Number(runs[0]), photo);
        if (runs.length > 1) push(byNumber, Number(runs[runs.length - 1]), photo);
      }
    }
    return { byName: byName, byNumber: byNumber };
  }

  // 客户文件夹里的名字 → 项目里的原片；初筛导出时重名加过 -2，这里剥掉再试一次。
  function resolveBatchPhoto(name, index) {
    const base = F.baseName(name).toUpperCase();
    if (!base) return null;
    if (index.byName.has(base)) return index.byName.get(base)[0];
    const stripped = base.replace(/-\d+$/, "");
    if (stripped !== base && index.byName.has(stripped)) return index.byName.get(stripped)[0];
    const digits = (base.match(/\d+/) || [""])[0];
    if (digits) {
      const exact = index.byNumber.get(Number(digits));
      if (exact && exact.length === 1) return exact[0];
    }
    return null;
  }

  function buildReturnBatch(names, index) {
    return names.map((name) => {
      const base = F.baseName(name);
      return {
        name: name,
        base: base,
        baseUpper: String(base).toUpperCase(),
        digits: (String(base).match(/\d+/) || [""])[0],
        photo: resolveBatchPhoto(name, index)
      };
    });
  }

  function dedupeEntries(list) {
    const out = [];
    for (const entry of list) {
      if (out.indexOf(entry) < 0) out.push(entry);
    }
    return out;
  }

  function classifyReturnMatches(entries) {
    const sorted = dedupeEntries(entries).sort((a, b) => {
      if (b.digits.length !== a.digits.length) return b.digits.length - a.digits.length;
      return a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true });
    });
    return { kind: sorted.length === 1 ? "one" : "many", candidates: sorted };
  }

  // 三级匹配：完整名 → 数字相等 → 数字后缀（≥3 位）。
  // 1~2 位数字不做后缀匹配，否则一个「34」能命中半批文件。
  function matchReturnToken(token, batch) {
    if (!batch.length) return { kind: "none", candidates: [] };
    if (token.type === "name") {
      const upper = String(token.text || "").toUpperCase().replace(/\.[A-Z0-9]+$/, "");
      const exact = batch.filter((entry) => entry.baseUpper === upper);
      if (exact.length) return classifyReturnMatches(exact);
      const stripped = upper.replace(/-\d+$/, "");
      if (stripped !== upper) {
        const alt = batch.filter((entry) => entry.baseUpper === stripped);
        if (alt.length) return classifyReturnMatches(alt);
      }
    }
    const digits = token.digits || "";
    if (!digits) return { kind: "none", candidates: [] };
    const num = Number(digits);
    const same = batch.filter((entry) => entry.digits && Number(entry.digits) === num);
    const suffix =
      digits.length >= 3
        ? batch.filter(
            (entry) =>
              entry.digits && entry.digits !== digits && entry.digits.endsWith(digits)
          )
        : [];
    const candidates = dedupeEntries(same.concat(suffix));
    if (!candidates.length) return { kind: "none", candidates: [] };
    return classifyReturnMatches(candidates);
  }

  function computeReturnClient(client, text) {
    const parsed = parseReturnText(text);
    const batch = returns.batches.get(client.id) || [];
    // 还没导出过 JPG（客户文件夹是空的）才退回整卡匹配，歧义会更多。
    const fallback = batch.length === 0;
    const universe = fallback
      ? state.photos.map((photo) => {
          const base = F.baseName(photo.name);
          return {
            name: photo.name,
            base: base,
            baseUpper: String(base).toUpperCase(),
            digits: (String(base).match(/\d+/) || [""])[0],
            photo: photo
          };
        })
      : batch;
    const choices = returns.choices[client.id] || {};
    const matched = [];
    const matchedNames = [];
    const ambiguous = [];
    const missing = [];
    const skipped = [];
    const addEntry = (entry) => {
      if (!entry || !entry.photo) return;
      if (matched.indexOf(entry.photo) < 0) matched.push(entry.photo);
      if (matchedNames.indexOf(entry.name) < 0) matchedNames.push(entry.name);
    };
    for (const token of parsed.items) {
      const choice = choices[token.label];
      if (choice === "skip") {
        skipped.push(token.label);
        continue;
      }
      const result = matchReturnToken(token, universe);
      if (result.kind === "one") {
        addEntry(result.candidates[0]);
        continue;
      }
      if (result.kind === "many") {
        if (choice === "all") {
          for (const entry of result.candidates) addEntry(entry);
          continue;
        }
        if (choice) {
          const picked = result.candidates.filter((entry) => entry.name === choice);
          if (picked.length) {
            addEntry(picked[0]);
            continue;
          }
        }
        ambiguous.push({ token: token, candidates: result.candidates, choice: choice || null });
        continue;
      }
      missing.push(token.label);
    }
    const hints = {};
    for (const token of parsed.items) {
      if (missing.indexOf(token.label) < 0) continue;
      for (const other of state.clients) {
        if (other.id === client.id) continue;
        const otherBatch = returns.batches.get(other.id) || [];
        if (!otherBatch.length) continue;
        if (matchReturnToken(token, otherBatch).candidates.length) {
          hints[token.label] = other.name;
          break;
        }
      }
    }
    return {
      client: client,
      text: text,
      parsed: parsed,
      matched: matched,
      matchedNames: matchedNames,
      ambiguous: ambiguous,
      missing: missing,
      skipped: skipped,
      hints: hints,
      fallback: fallback,
      count: parsed.items.length
    };
  }

  function returnPlan() {
    const rows = Array.from(el.returnRows.querySelectorAll(".return-row"));
    const withJpg = el.returnJpg.checked;
    return rows.map((row) => {
      const client = clientById(row.dataset.client);
      const text = row.querySelector(".return-input").value;
      const item = client
        ? computeReturnClient(client, text)
        : {
            client: null,
            text: text,
            parsed: { items: [], unknown: 0 },
            matched: [],
            matchedNames: [],
            ambiguous: [],
            missing: [],
            skipped: [],
            hints: {},
            fallback: false,
            count: 0
          };
      item.files = item.matched.reduce(
        (n, photo) => n + (photo.rawFile ? 1 : 0) + (withJpg && photo.jpgFile ? 1 : 0),
        0
      );
      item.noRaw = item.matched.filter((photo) => !photo.rawFile).length;
      return item;
    });
  }

  function summarizeReturns(plan) {
    let matched = 0;
    let missing = 0;
    let ambiguous = 0;
    let files = 0;
    let clients = 0;
    for (const item of plan) {
      matched += item.matched.length;
      missing += item.missing.length;
      ambiguous += item.ambiguous.length;
      files += item.files;
      if (item.files) clients += 1;
    }
    return { matched: matched, missing: missing, ambiguous: ambiguous, files: files, clients: clients };
  }

  function renderReturnRows() {
    el.returnRows.innerHTML = "";
    if (!state.clients.length) {
      el.returnRows.innerHTML = '<div class="session-empty">项目里还没有客户文件夹。</div>';
      return;
    }
    for (const client of state.clients) {
      const record = state.returns[client.id];
      const row = document.createElement("div");
      row.className = "return-row";
      row.dataset.client = client.id;
      row.innerHTML =
        '<div class="return-head"><strong>' +
        F.escapeHtml(client.name) +
        '</strong><span class="return-status">—</span></div>' +
        '<textarea class="return-input" rows="2" spellcheck="false" placeholder="例如 034, 9034, PANA9034, 9038-9042"></textarea>' +
        '<div class="return-info">未粘贴内容</div>' +
        '<div class="return-amb" hidden></div>';
      row.querySelector(".return-input").value = record && record.raw ? record.raw : "";
      el.returnRows.appendChild(row);
    }
  }

  function updateReturnSourceNote() {
    if (!state.project) {
      el.returnsSourceNote.textContent = "";
      return;
    }
    const bits = [];
    for (const client of state.clients) {
      const batch = returns.batches.get(client.id);
      if (batch && batch.length) {
        bits.push(client.name + " " + batch.length + " 个文件");
      } else if (returns.listErrors.get(client.id)) {
        bits.push(client.name + " " + returns.listErrors.get(client.id));
      } else {
        bits.push(client.name + " 还没导出 JPG");
      }
    }
    el.returnsSourceNote.textContent = bits.length ? "清单：" + bits.join(" · ") : "";
  }

  function renderReturnAmbiguities(row, item) {
    const box = row.querySelector(".return-amb");
    if (!box || !item.client) return;
    if (!item.ambiguous.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const choices = returns.choices[item.client.id] || {};
    box.hidden = false;
    box.innerHTML =
      '<div class="return-amb-title">' +
      item.ambiguous.length +
      " 个编号在他那批里对上了多张，点一下确定：" +
      "</div>" +
      item.ambiguous
        .map((entry) => {
          const token = entry.token.label;
          const chips = entry.candidates
            .map((candidate) => {
              const on = choices[token] === candidate.name;
              return (
                '<button class="rt-chip' +
                (on ? " is-on" : "") +
                '" type="button" data-token="' +
                F.escapeHtml(token) +
                '" data-name="' +
                F.escapeHtml(candidate.name) +
                '">' +
                F.escapeHtml(candidate.name) +
                "</button>"
              );
            })
            .join("");
          return (
            '<div class="return-amb-row"><span class="return-token">' +
            F.escapeHtml(token) +
            "</span>" +
            chips +
            '<button class="rt-chip subtle' +
            (choices[token] === "all" ? " is-on" : "") +
            '" type="button" data-token="' +
            F.escapeHtml(token) +
            '" data-name="*">全部要</button>' +
            '<button class="rt-chip subtle" type="button" data-token="' +
            F.escapeHtml(token) +
            '" data-name="">跳过</button></div>'
          );
        })
        .join("");
  }

  function updateReturnSummaries() {
    if (el.returnsModal.hidden) return;
    const plan = returnPlan();
    const totals = summarizeReturns(plan);
    const rows = Array.from(el.returnRows.querySelectorAll(".return-row"));
    rows.forEach((row, i) => {
      const item = plan[i];
      if (!item || !item.client) return;
      const status = row.querySelector(".return-status");
      const info = row.querySelector(".return-info");
      const record = state.returns[item.client.id];
      const bits = [];
      const batch = returns.batches.get(item.client.id);
      if (batch && batch.length) bits.push("初筛 " + batch.length + " 个");
      else if (returns.listErrors.get(item.client.id)) bits.push(returns.listErrors.get(item.client.id));
      if (record && record.matched && record.matched.length) {
        bits.push("<b>已回传 " + record.matched.length + " 张</b>");
      }
      status.innerHTML = bits.join(" · ") || "—";

      renderReturnAmbiguities(row, item);

      if (!item.text || !item.text.trim()) {
        info.textContent = "未粘贴内容";
        return;
      }
      if (!item.count) {
        info.textContent = "没认出编号，检查一下粘贴的内容";
        return;
      }
      const parts = [];
      parts.push("<b>" + item.count + "</b> 个编号");
      parts.push("匹配 <b>" + item.matched.length + "</b> 张");
      if (item.files) parts.push(item.files + " 个文件");
      if (item.ambiguous.length) {
        parts.push('<span class="warn">待确认 ' + item.ambiguous.length + " 个</span>");
      }
      if (item.missing.length) {
        const head = item.missing.slice(0, 6).join(" ");
        const hintNames = Object.keys(item.hints)
          .map((label) => label + "→" + item.hints[label]);
        parts.push(
          '<span class="warn">缺号 ' +
            item.missing.length +
            "（" +
            F.escapeHtml(head) +
            (item.missing.length > 6 ? " …" : "") +
            "）</span>" +
            (hintNames.length
              ? '<span class="hint">注意：' + F.escapeHtml(hintNames.slice(0, 3).join("、")) + " 的清单里有</span>"
              : "")
        );
      }
      if (item.skipped.length) parts.push("已跳过 " + item.skipped.length + " 个");
      if (item.matched.length && item.noRaw === item.matched.length) {
        parts.push('<span class="warn">没有 RAW，可勾 JPG</span>');
      }
      if (item.fallback) parts.push('<span class="warn">按整卡匹配</span>');
      info.innerHTML = parts.join(" · ");
    });

    el.returnSummary.textContent = totals.files
      ? totals.matched +
        " 张 · " +
        totals.files +
        " 个文件 · " +
        totals.clients +
        " 个客户" +
        (totals.ambiguous ? " · 待确认 " + totals.ambiguous : "") +
        (totals.missing ? " · 缺号 " + totals.missing : "")
      : "把客户发来的编号粘进对应客户的框里";
    el.returnsStart.disabled = !totals.files || returns.busy;
    el.returnsStart.textContent = totals.files
      ? "写入 " + totals.files + " 个文件"
      : "写入 选图集";
  }

  async function loadReturnLists(force) {
    if (!state.project || !state.project.handle) return;
    const index = buildReturnIndex();
    for (const client of state.clients) {
      if (!force && returns.batches.has(client.id)) continue;
      const folder = client.folder || client.name;
      try {
        const dir = await state.project.handle.getDirectoryHandle(folder);
        const names = [];
        for await (const entry of dir.values()) {
          if (!entry || entry.kind !== "file") continue;
          if (!entry.name || entry.name.startsWith(".")) continue;
          if (!F.canPreviewExt(F.extOf(entry.name))) continue;
          names.push(nfc(entry.name));
        }
        names.sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true }));
        returns.lists.set(client.id, names);
        returns.batches.set(client.id, buildReturnBatch(names, index));
        returns.listErrors.delete(client.id);
      } catch (err) {
        returns.lists.set(client.id, []);
        returns.batches.set(client.id, []);
        returns.listErrors.set(
          client.id,
          err && err.name === "NotFoundError" ? "文件夹不存在" : "读不到文件夹"
        );
      }
    }
  }

  function resetReturnProgress() {
    el.returnProgress.hidden = true;
    el.returnSpinner.hidden = false;
    el.returnIcon.hidden = true;
    el.returnIcon.classList.remove("is-error");
    el.returnStop.hidden = false;
    el.returnStop.disabled = false;
    el.returnStop.textContent = "停止";
    el.returnDone.hidden = true;
    el.returnBar.style.width = "0%";
    el.returnsClose.disabled = false;
    el.returnsCancel.disabled = false;
    returns.busy = false;
    returns.cancel = false;
  }

  function setReturnProgress(fraction, sub) {
    el.returnBar.style.width = Math.round(F.clamp(fraction, 0, 1) * 100) + "%";
    if (sub != null) el.returnProgressSub.textContent = sub;
  }

  function openReturnsModal() {
    if (!state.project) {
      toast("先新建或打开一个项目。");
      return;
    }
    closeProjectMenu();
    if (!state.clients.length) {
      toast("项目里还没有客户文件夹。", "error");
      return;
    }
    returns.busy = false;
    returns.cancel = false;
    renderReturnRows();
    resetReturnProgress();
    el.returnsModal.hidden = false;
    document.body.classList.add("modal-open");
    updateReturnSourceNote();
    updateReturnSummaries();
    loadReturnLists().then(() => {
      updateReturnSourceNote();
      updateReturnSummaries();
    });
  }

  function closeReturnsModal() {
    if (returns.busy) return;
    el.returnsModal.hidden = true;
    resetReturnProgress();
    document.body.classList.remove("modal-open");
  }

  async function runReturns() {
    if (returns.busy || !state.project) return;
    const plan = returnPlan().filter((item) => item.files && item.client);
    if (!plan.length) {
      toast("没有匹配到可写入的照片。");
      return;
    }
    const root = state.project.handle;
    if (!root) {
      toast("项目没有可写入的文件夹。", "error");
      return;
    }
    const withJpg = el.returnJpg.checked;
    const total = plan.reduce((sum, item) => sum + item.files, 0);
    const failures = [];
    const noRaw = [];
    let written = 0;
    let index = 0;

    returns.busy = true;
    returns.cancel = false;
    el.returnsStart.disabled = true;
    el.returnsCancel.disabled = true;
    el.returnsClose.disabled = true;
    el.returnProgress.hidden = false;
    el.returnSpinner.hidden = false;
    el.returnIcon.hidden = true;
    el.returnProgressTitle.textContent = "正在写入 选图集…";
    el.returnProgressSub.textContent = "0 / " + total;
    el.returnBar.style.width = "0%";
    el.returnStop.hidden = false;
    el.returnStop.disabled = false;
    el.returnStop.textContent = "停止";
    el.returnDone.hidden = true;

    try {
      for (const item of plan) {
        if (returns.cancel) break;
        const folder = item.client.folder || item.client.name;
        let dir = null;
        try {
          const clientDir = await root.getDirectoryHandle(folder, { create: true });
          dir = await clientDir.getDirectoryHandle("选图集", { create: true });
          // 成品集提前建好，LR 导出时目标文件夹已经存在。
          try {
            await clientDir.getDirectoryHandle("成品集", { create: true });
          } catch (err) {
            /* ignore */
          }
        } catch (err) {
          failures.push(folder + "：无法创建 选图集（" + (err && err.message ? err.message : err) + "）");
          continue;
        }
        const used = new Set();
        let copiedRaw = 0;
        for (const photo of item.matched) {
          if (returns.cancel) break;
          const files = [];
          if (photo.rawFile) files.push(photo.rawFile);
          if (withJpg && photo.jpgFile) files.push(photo.jpgFile);
          if (!photo.rawFile) noRaw.push(photo);
          for (const file of files) {
            if (returns.cancel) break;
            index += 1;
            try {
              const name = await uniqueName(dir, file.name, used, "");
              await writeBlob(dir, name, file);
              written += 1;
              if (photo.rawFile === file) copiedRaw += 1;
            } catch (err) {
              failures.push(file.name + "：" + (err && err.message ? err.message : err));
              if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
                throw err;
              }
            }
            setReturnProgress(
              index / Math.max(1, total) * 0.98,
              index + " / " + total + " · " + item.client.name + " · " + file.name
            );
          }
          if (index % 8 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
        }
        state.returns[item.client.id] = {
          raw: item.text,
          tokens: item.parsed.items.map((entry) => entry.label).slice(0, 5000),
          matched: item.matched.map((photo) => photo.id),
          matchedNames: item.matchedNames.slice(0, 500),
          missing: item.missing.slice(0, 200),
          ambiguous: item.ambiguous.map((entry) => entry.token.label).slice(0, 200),
          skipped: item.skipped.slice(0, 200),
          fallback: item.fallback,
          files: item.files,
          rawCopied: copiedRaw,
          at: Date.now()
        };
        invalidateReturns();
      }
    } catch (err) {
      failures.push("写入被中断：" + (err && err.message ? err.message : err));
    }

    const cancelled = returns.cancel && written < total;
    returns.busy = false;
    el.returnSpinner.hidden = true;
    el.returnIcon.hidden = false;
    el.returnIcon.textContent = written ? "✓" : "×";
    el.returnIcon.classList.toggle("is-error", !written);
    el.returnStop.hidden = true;
    el.returnDone.hidden = false;
    el.returnsClose.disabled = false;
    el.returnsCancel.disabled = false;
    el.returnsStart.disabled = false;
    el.returnBar.style.width = "100%";

    if (cancelled) {
      el.returnProgressTitle.textContent = "已停止写入";
      el.returnProgressSub.textContent = "已写入 " + written + " / " + total + " 个文件。";
      toast("已停止写入，已写入 " + written + " 个文件。", "error", 3800);
    } else if (!written) {
      el.returnProgressTitle.textContent = "写入失败";
      el.returnProgressSub.textContent = failures.slice(0, 2).join(" · ") || "没有文件写入。";
      toast("没有文件成功写入：" + (failures[0] || "未知原因"), "error", 5200);
    } else {
      el.returnProgressTitle.textContent = failures.length ? "回传已写入（部分失败）" : "回传已写入";
      el.returnProgressSub.textContent =
        written +
        " 个文件 · " +
        plan.length +
        " 个客户 · 客户文件夹/选图集/" +
        (noRaw.length ? " · " + noRaw.length + " 张没有 RAW" : "") +
        (failures.length ? " · " + failures.length + " 个失败：" + failures.slice(0, 2).join(" · ") : "");
      toast("已写入 " + written + " 个文件到 选图集。", "success", 4000);
    }

    renderClientList();
    applyFilters({ resetScroll: false });
    updateReturnSummaries();
    scheduleSave();
    requestAnimationFrame(() => el.returnDone.focus({ preventScroll: true }));
  }

  /* ---------- ledger (交付台账) ---------- */

  const LEDGER_FILE = "交付台账.csv";
  const LEDGER_HEADER = "单号,类型,展会,客户,底片,成品,包名,日期";

  const ledger = {
    handle: null,
    rootName: "",
    rows: [],
    error: null,
    queried: false
  };

  function ledgerDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("当前浏览器不支持 IndexedDB"));
        return;
      }
      const request = indexedDB.open("furix-ledger", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("handles")) db.createObjectStore("handles");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB 打开失败"));
    });
  }

  async function saveLedgerHandle(handle) {
    if (!handle) return;
    ledger.handle = handle;
    ledger.rootName = handle.name || "";
    try {
      const db = await ledgerDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readwrite");
        tx.objectStore("handles").put(handle, "root");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (err) {
      /* 句柄只在这个会话里有效 */
    }
  }

  async function loadLedgerHandle() {
    if (ledger.handle) return ledger.handle;
    if (ledger.queried) return null;
    ledger.queried = true;
    try {
      const db = await ledgerDb();
      const handle = await new Promise((resolve, reject) => {
        const tx = db.transaction("handles", "readonly");
        const req = tx.objectStore("handles").get("root");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (!handle) return null;
      if (handle.queryPermission) {
        const status = await handle.queryPermission({ mode: "readwrite" });
        if (status !== "granted") {
          ledger.error = "台账文件夹需要重新授权";
          return null;
        }
      }
      ledger.handle = handle;
      ledger.rootName = handle.name || "";
      return handle;
    } catch (err) {
      return null;
    }
  }

  async function ensureLedger() {
    const handle = await loadLedgerHandle();
    if (!handle) {
      if (!ledger.error) ledger.error = "还没有选择台账文件夹";
      return false;
    }
    return true;
  }

  function csvCell(value) {
    return String(value == null ? "" : value)
      .replace(/[,\r\n]/g, " ")
      .trim();
  }

  function parseLedgerCsv(text) {
    const rows = [];
    const lines = String(text || "").replace(/^\ufeff/, "").split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = line.split(",").map((cell) => cell.replace(/^\ufeff/, "").trim());
      if (!cells.length || cells[0] === "单号") continue;
      // 空行或坏行（比如文件里混进 NUL）不要变成一条 0 号记录。
      if (!Number(cells[0]) && !cells[2] && !cells[3]) continue;
      rows.push({
        seq: Number(cells[0]) || 0,
        type: cells[1] === "玩拍" ? "fun" : "order",
        show: cells[2] || "",
        client: cells[3] || "",
        negatives: Number(cells[4]) || 0,
        products: Number(cells[5]) || 0,
        pack: cells[6] || "",
        date: cells[7] || ""
      });
    }
    return rows;
  }

  function ledgerCsvText(rows) {
    const lines = [LEDGER_HEADER];
    for (const row of rows) {
      lines.push(
        [
          row.seq,
          row.type === "fun" ? "玩拍" : "订单",
          csvCell(row.show),
          csvCell(row.client),
          row.negatives,
          row.products,
          csvCell(row.pack),
          row.date
        ].join(",")
      );
    }
    return "\ufeff" + lines.join("\r\n") + "\r\n";
  }

  async function readLedgerRows() {
    ledger.error = null;
    if (!(await ensureLedger())) {
      ledger.rows = [];
      return ledger.rows;
    }
    try {
      const fileHandle = await ledger.handle.getFileHandle(LEDGER_FILE, { create: true });
      const file = await fileHandle.getFile();
      const text = await file.text();
      ledger.rows = parseLedgerCsv(text);
    } catch (err) {
      ledger.rows = [];
      ledger.error = "台账读取失败：" + (err && err.message ? err.message : err);
    }
    return ledger.rows;
  }

  async function writeLedgerRows(rows) {
    if (!(await ensureLedger())) return false;
    try {
      const fileHandle = await ledger.handle.getFileHandle(LEDGER_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(ledgerCsvText(rows));
      } finally {
        await writable.close();
      }
      ledger.rows = rows;
      return true;
    } catch (err) {
      ledger.error = "台账写入失败：" + (err && err.message ? err.message : err);
      return false;
    }
  }

  function ledgerYearOf(row) {
    return Number(String(row.date || "").slice(0, 4)) || 0;
  }

  function ledgerSeqFor(rows, type, show, clientName) {
    const existing = rows.find(
      (row) => row.type === type && row.show === show && row.client === clientName
    );
    if (existing) return existing.seq;
    const year = new Date().getFullYear();
    let max = 0;
    for (const row of rows) {
      if (row.type !== type) continue;
      if (ledgerYearOf(row) !== year) continue;
      if (row.seq > max) max = row.seq;
    }
    return max + 1;
  }

  function upsertLedgerRow(rows, row) {
    const index = rows.findIndex(
      (item) => item.type === row.type && item.show === row.show && item.client === row.client
    );
    if (index >= 0) {
      rows[index] = Object.assign({}, rows[index], {
        negatives: row.negatives,
        products: row.products,
        pack: row.pack,
        date: row.date
      });
      return rows;
    }
    rows.push(row);
    return rows;
  }

  function ledgerYearTotals(rows, year) {
    const totals = {
      order: { count: 0, negatives: 0, products: 0 },
      fun: { count: 0, negatives: 0, products: 0 }
    };
    for (const row of rows) {
      if (ledgerYearOf(row) !== year) continue;
      const bucket = totals[row.type === "fun" ? "fun" : "order"];
      bucket.count += 1;
      bucket.negatives += row.negatives;
      bucket.products += row.products;
    }
    return totals;
  }

  function projectDeliveryTotals() {
    const totals = { count: 0, negatives: 0, products: 0, pending: 0 };
    for (const client of state.clients) {
      const record = state.deliveries[client.id];
      const info = delivery.scan.get(client.id);
      if (record) {
        totals.count += 1;
        totals.negatives += info ? info.negatives : record.negatives || 0;
        totals.products += info ? info.products : record.products || 0;
      } else if (info && info.products) {
        totals.pending += 1;
      }
    }
    return totals;
  }

  /* ---------- delivery (成品集 / 打包) ---------- */

  const delivery = { busy: false, cancel: false, scan: new Map(), loaded: false };

  function deliveryPackageName(client) {
    const code = (state.project && (state.project.code || state.project.name)) || "project";
    return F.sanitizeFileName(code + "_" + client.name, "package") + ".zip";
  }

  function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  async function scanClientDelivery(client) {
    const info = {
      folder: client.folder || client.name,
      negatives: 0,
      selections: 0,
      products: 0,
      bytes: 0,
      updated: 0,
      files: [],
      error: null
    };
    const root = state.project && state.project.handle;
    if (!root) {
      info.error = "没有项目文件夹";
      return info;
    }
    let dir = null;
    try {
      dir = await root.getDirectoryHandle(info.folder);
    } catch (err) {
      info.error = "文件夹不存在";
      return info;
    }
    try {
      for await (const entry of dir.values()) {
        if (!entry || entry.kind !== "file") continue;
        if (!entry.name || entry.name.startsWith(".")) continue;
        if (!F.canPreviewExt(F.extOf(entry.name))) continue;
        info.negatives += 1;
      }
    } catch (err) {
      /* 底片数拿不到就算了 */
    }
    try {
      const sel = await dir.getDirectoryHandle("选图集");
      for await (const entry of sel.values()) {
        if (!entry || entry.kind !== "file") continue;
        if (!entry.name || entry.name.startsWith(".")) continue;
        info.selections += 1;
      }
    } catch (err) {
      /* 还没回传 */
    }
    try {
      const prod = await dir.getDirectoryHandle("成品集");
      for await (const entry of prod.values()) {
        if (!entry || entry.kind !== "file") continue;
        if (!entry.name || entry.name.startsWith(".")) continue;
        info.products += 1;
        info.files.push(entry);
        try {
          const file = await entry.getFile();
          info.bytes += file.size || 0;
          if (file.lastModified > info.updated) info.updated = file.lastModified;
        } catch (err) {
          /* 单个文件读不到不影响计数 */
        }
      }
    } catch (err) {
      /* 还没有成品集 */
    }
    info.files.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true }));
    return info;
  }

  async function scanDeliveries() {
    delivery.scan = new Map();
    if (!state.project || !state.project.handle) {
      delivery.loaded = false;
      return delivery.scan;
    }
    for (const client of state.clients) {
      delivery.scan.set(client.id, await scanClientDelivery(client));
    }
    delivery.loaded = true;
    return delivery.scan;
  }

  function deliveryIssue(client) {
    const info = delivery.scan.get(client.id);
    if (!info) return { ok: false, reason: "还没扫描" };
    if (info.error) return { ok: false, reason: info.error };
    if (!info.products) return { ok: false, reason: "成品集还是空的" };
    if (info.selections > 0 && info.products < info.selections) {
      return {
        ok: false,
        reason: "少 " + (info.selections - info.products) + " 张（回传 " + info.selections + "）"
      };
    }
    if (!info.selections) return { ok: true, normal: false, note: "未回传，直接交付" };
    if (info.products > info.selections) {
      return { ok: true, normal: false, note: "比回传多 " + (info.products - info.selections) + " 张" };
    }
    return { ok: true, normal: true, note: "对上了" };
  }

  function renderDeliveryRows() {
    el.deliveryRows.innerHTML = "";
    if (!state.clients.length) {
      el.deliveryRows.innerHTML = '<div class="session-empty">项目里还没有客户文件夹。</div>';
      return;
    }
    let ready = 0;
    let totalBytes = 0;
    for (const client of state.clients) {
      const info = delivery.scan.get(client.id);
      const record = state.deliveries[client.id];
      const issue = deliveryIssue(client);
      const row = document.createElement("div");
      row.className = "delivery-row";
      row.dataset.client = client.id;
      if (issue.ok && info && info.products) {
        ready += 1;
        totalBytes += info.bytes;
      }
      const status = record
        ? '<span class="dv-state ok">第 ' +
          record.seq +
          " 单 · 已交付" +
          (packs.list.some((pack) => pack.name === deliveryPackageName(client)) ? "" : "（包已清理）") +
          "</span>"
        : issue.ok
          ? '<span class="dv-state">' + (issue.normal ? "待打包" : issue.note) + "</span>"
          : '<span class="dv-state warn">' + F.escapeHtml(issue.reason) + "</span>";
      const nums = info
        ? '<span class="dv-num">底片 <b>' +
          info.negatives +
          "</b></span>" +
          '<span class="dv-num">选 <b>' +
          info.selections +
          "</b></span>" +
          '<span class="dv-num">成品 <b>' +
          info.products +
          "</b></span>" +
          '<span class="dv-size">' +
          F.formatBytes(info.bytes) +
          "</span>"
        : '<span class="dv-num">扫描中…</span>';
      row.innerHTML =
        '<div class="dv-head"><strong>' +
        F.escapeHtml(client.name) +
        "</strong>" +
        status +
        "</div>" +
        '<div class="dv-meta">' +
        nums +
        "</div>" +
        '<div class="dv-actions">' +
        '<span class="dv-pack-name">' +
        F.escapeHtml(deliveryPackageName(client)) +
        "</span>" +
        '<button class="btn btn-outline btn-sm dv-pack" type="button" data-client="' +
        F.escapeHtml(client.id) +
        '">' +
        (record ? "重打" : "打包") +
        "</button></div>";
      el.deliveryRows.appendChild(row);
    }
    el.deliveryNote.textContent = ready
      ? ready + " 个可交付 · " + F.formatBytes(totalBytes)
      : "还没有可交付的成品集";
    el.deliveryStart.disabled = !ready || delivery.busy;
    el.deliveryStart.textContent = ready ? "打包 " + ready + " 个客户" : "全部打包";
  }

  async function openDeliveryModal() {
    if (!state.project) {
      toast("先新建或打开一个项目。");
      return;
    }
    closeProjectMenu();
    delivery.busy = false;
    delivery.cancel = false;
    el.deliveryModal.hidden = false;
    document.body.classList.add("modal-open");
    resetDeliveryProgress();
    el.deliveryRows.innerHTML = '<div class="session-empty">正在扫描客户文件夹…</div>';
    el.deliveryNote.textContent = "";
    await ensureLedger();
    await readLedgerRows();
    await scanDeliveries();
    await scanDeliveryPacks();
    renderPackList();
    renderDeliveryRows();
  }

  function closeDeliveryModal() {
    if (delivery.busy) return;
    el.deliveryModal.hidden = true;
    resetDeliveryProgress();
    document.body.classList.remove("modal-open");
  }

  function resetDeliveryProgress() {
    el.deliveryProgress.hidden = true;
    el.deliverySpinner.hidden = false;
    el.deliveryIcon.hidden = true;
    el.deliveryIcon.classList.remove("is-error");
    el.deliveryStop.hidden = false;
    el.deliveryStop.disabled = false;
    el.deliveryStop.textContent = "停止";
    el.deliveryDone.hidden = true;
    el.deliveryBar.style.width = "0%";
    el.deliveryClose.disabled = false;
    el.deliveryCancel.disabled = false;
    delivery.busy = false;
    delivery.cancel = false;
  }

  function setDeliveryProgress(fraction, sub, title) {
    el.deliveryBar.style.width = Math.round(F.clamp(fraction, 0, 1) * 100) + "%";
    if (sub != null) el.deliveryProgressSub.textContent = sub;
    if (title) el.deliveryProgressTitle.textContent = title;
  }

  function deliveryJobList(onlyClientId) {
    const force = el.deliveryForce.checked;
    const jobs = [];
    const skipped = [];
    for (const client of state.clients) {
      if (onlyClientId && client.id !== onlyClientId) continue;
      const info = delivery.scan.get(client.id);
      if (!info) continue;
      if (!info.products) {
        skipped.push(client.name + "：成品集是空的");
        continue;
      }
      const issue = deliveryIssue(client);
      if (!issue.ok && !force) {
        skipped.push(client.name + "：" + issue.reason);
        continue;
      }
      jobs.push({ client: client, info: info });
    }
    return { jobs: jobs, skipped: skipped };
  }

  async function runDelivery(onlyClientId) {
    if (delivery.busy || !state.project) return;
    if (!delivery.loaded) await scanDeliveries();
    const plan = deliveryJobList(onlyClientId);
    if (!plan.jobs.length) {
      toast(
        plan.skipped.length
          ? "没有可打包的客户 —— " + plan.skipped.slice(0, 2).join("；")
          : "没有可打包的客户。",
        "error",
        5200
      );
      renderDeliveryRows();
      return;
    }
    const root = state.project.handle;
    if (!root) {
      toast("项目没有可写入的文件夹。", "error");
      return;
    }
    const ledgerReady = await ensureLedger();
    if (ledgerReady) await readLedgerRows();
    const rows = ledger.rows.slice();
    const showCode = state.project.code || state.project.name;
    const projectType = state.project.projectType === "fun" ? "fun" : "order";
    const total = plan.jobs.reduce((sum, job) => sum + job.info.products, 0);
    const failures = [];
    let packed = 0;
    let doneFiles = 0;

    delivery.busy = true;
    delivery.cancel = false;
    el.deliveryStart.disabled = true;
    el.deliveryCancel.disabled = true;
    el.deliveryClose.disabled = true;
    el.deliveryProgress.hidden = false;
    el.deliverySpinner.hidden = false;
    el.deliveryIcon.hidden = true;
    el.deliveryProgressTitle.textContent = "正在打包…";
    el.deliveryProgressSub.textContent = "0 / " + total;
    el.deliveryBar.style.width = "0%";
    el.deliveryStop.hidden = false;
    el.deliveryStop.disabled = false;
    el.deliveryStop.textContent = "停止";
    el.deliveryDone.hidden = true;

    let deliveriesDir = null;
    try {
      deliveriesDir = await root.getDirectoryHandle("交付", { create: true });
    } catch (err) {
      failures.push("无法创建 交付 文件夹：" + (err && err.message ? err.message : err));
    }

    try {
      for (const job of plan.jobs) {
        if (delivery.cancel || !deliveriesDir) break;
        const client = job.client;
        const info = job.info;
        const packName = deliveryPackageName(client);
        setDeliveryProgress(
          doneFiles / Math.max(1, total),
          doneFiles + " / " + total + " · " + client.name,
          "正在打包 " + client.name + "…"
        );
        try {
          const entries = [];
          for (const entry of info.files) {
            if (delivery.cancel) break;
            const file = await entry.getFile();
            entries.push({ name: entry.name, blob: file });
          }
          if (!entries.length) throw new Error("成品集里没有文件");
          const blob = await F.zipStore(entries, (fraction, done) => {
            setDeliveryProgress(
              (doneFiles + done) / Math.max(1, total),
              doneFiles + " / " + total + " · " + client.name + " · " + done + "/" + entries.length
            );
          });
          const fileHandle = await deliveriesDir.getFileHandle(packName, { create: true });
          const writable = await fileHandle.createWritable();
          try {
            await writable.write(blob);
          } finally {
            await writable.close();
          }
          doneFiles += entries.length;
          packed += 1;
          const seq = ledgerSeqFor(rows, projectType, showCode, client.name);
          const record = {
            seq: seq,
            at: Date.now(),
            date: todayIso(),
            name: packName,
            files: entries.length,
            bytes: blob.size,
            negatives: info.negatives,
            selections: info.selections,
            products: info.products
          };
          state.deliveries[client.id] = record;
          upsertLedgerRow(rows, {
            seq: seq,
            type: projectType,
            show: showCode,
            client: client.name,
            negatives: info.negatives,
            products: info.products,
            pack: packName,
            date: record.date
          });
          setDeliveryProgress(
            doneFiles / Math.max(1, total),
            doneFiles + " / " + total + " · " + client.name + "（第 " + seq + " 单）"
          );
        } catch (err) {
          failures.push(
            client.name + "：" + (err && err.message ? err.message : err)
          );
          if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) break;
        }
        if (delivery.cancel) break;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      delivery.busy = false;
    }

    if (ledgerReady && packed) await writeLedgerRows(rows);
    const cancelled = delivery.cancel && packed < plan.jobs.length;

    el.deliverySpinner.hidden = true;
    el.deliveryIcon.hidden = false;
    el.deliveryIcon.textContent = packed ? "✓" : "×";
    el.deliveryIcon.classList.toggle("is-error", !packed);
    el.deliveryStop.hidden = true;
    el.deliveryDone.hidden = false;
    el.deliveryClose.disabled = false;
    el.deliveryCancel.disabled = false;
    el.deliveryStart.disabled = false;
    el.deliveryBar.style.width = "100%";

    if (cancelled) {
      el.deliveryProgressTitle.textContent = "已停止打包";
      el.deliveryProgressSub.textContent = "已打包 " + packed + " 个客户。";
      toast("已停止打包。", "error", 3600);
    } else if (!packed) {
      el.deliveryProgressTitle.textContent = "打包失败";
      el.deliveryProgressSub.textContent = failures.slice(0, 2).join(" · ") || "没有包写入。";
      toast("没有包成功写入：" + (failures[0] || "未知原因"), "error", 5200);
    } else {
      el.deliveryProgressTitle.textContent = failures.length ? "打包完成（部分失败）" : "打包完成";
      el.deliveryProgressSub.textContent =
        packed +
        " 个客户包 · " +
        doneFiles +
        " 个成品 · 写到 项目/交付/" +
        (ledgerReady ? " · 台账已更新" : " · 未记台账（没选台账文件夹）") +
        (failures.length ? " · " + failures.length + " 个失败：" + failures.slice(0, 2).join(" · ") : "");
      toast("已打包 " + packed + " 个客户。", "success", 4000);
    }

    await scanDeliveries();
    await scanDeliveryPacks();
    renderPackList();
    renderDeliveryRows();
    renderClientList();
    scheduleSave();
    requestAnimationFrame(() => el.deliveryDone.focus({ preventScroll: true }));
  }

  /* ---------- clients rename ---------- */

  async function dirIsEmpty(dir) {
    try {
      for await (const entry of dir.values()) {
        if (entry) return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function openClientsModal() {
    if (!state.project) {
      toast("先新建或打开一个项目。");
      return;
    }
    closeProjectMenu();
    el.clientEditRows.innerHTML = state.clients
      .map(
        (client) =>
          '<label class="client-edit-row"><span class="client-edit-old">' +
          F.escapeHtml(client.folder) +
          '</span><input data-client="' +
          F.escapeHtml(client.id) +
          '" value="' +
          F.escapeHtml(client.name) +
          '" maxlength="30" spellcheck="false" autocomplete="off"></label>'
      )
      .join("");
    el.clientsSummary.textContent = state.clients.length + " 个客户";
    el.clientsModal.hidden = false;
    document.body.classList.add("modal-open");
    const first = el.clientEditRows.querySelector("input");
    if (first) requestAnimationFrame(() => first.focus());
  }

  function closeClientsModal() {
    el.clientsModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function saveClientsFromModal() {
    const inputs = Array.from(el.clientEditRows.querySelectorAll("input[data-client]"));
    const changes = [];
    for (const input of inputs) {
      const client = clientById(input.dataset.client);
      if (!client) continue;
      const name = F.sanitizeFileName(input.value.trim(), "");
      if (!name) continue;
      if (name.toLowerCase() === String(client.name).toLowerCase()) continue;
      if (inputs.some((other) => other !== input && other.value.trim() === name)) continue;
      changes.push({ client: client, name: name, original: client.name });
    }
    if (!changes.length) {
      closeClientsModal();
      return;
    }
    el.clientsSave.disabled = true;
    try {
      for (const change of changes) {
        const oldFolder = change.client.folder || change.client.name;
        let newFolder = oldFolder;
        if (change.name !== oldFolder) {
          try {
            const oldDir = await state.project.handle.getDirectoryHandle(oldFolder);
            if (await dirIsEmpty(oldDir)) {
              await state.project.handle.getDirectoryHandle(change.name, { create: true });
              try {
                await state.project.handle.removeEntry(oldFolder);
              } catch (err) {
                /* 删不掉就留着空目录，不影响 */
              }
              newFolder = change.name;
            }
          } catch (err) {
            try {
              await state.project.handle.getDirectoryHandle(change.name, { create: true });
              newFolder = change.name;
            } catch (e) {
              newFolder = oldFolder;
            }
          }
        }
        change.client.name = change.name;
        change.client.folder = newFolder;
        returns.batches.delete(change.client.id);
        returns.lists.delete(change.client.id);
      }
      await saveProjectNow();
      renderClientList();
      updateProjectUI();
      toast("客户名已更新。", "success");
      closeClientsModal();
    } catch (err) {
      toast("改名失败：" + (err && err.message ? err.message : err), "error", 5000);
    } finally {
      el.clientsSave.disabled = false;
    }
  }

  /* ---------- ledger modal ---------- */

  function ledgerCard(title, value, sub) {
    return (
      '<div class="ledger-card"><span>' +
      F.escapeHtml(title) +
      "</span><strong>" +
      F.escapeHtml(value) +
      "</strong><small>" +
      F.escapeHtml(sub) +
      "</small></div>"
    );
  }

  function fmtNum(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function renderLedgerModal() {
    const year = new Date().getFullYear();
    const totals = ledgerYearTotals(ledger.rows, year);
    const project = projectDeliveryTotals();
    el.ledgerCards.innerHTML =
      ledgerCard(
        "今年 · 订单",
        totals.order.count + " 单",
        "底片 " + fmtNum(totals.order.negatives) + " · 成品 " + fmtNum(totals.order.products)
      ) +
      ledgerCard(
        "今年 · 玩拍",
        totals.fun.count + " 套",
        "底片 " + fmtNum(totals.fun.negatives) + " · 成品 " + fmtNum(totals.fun.products)
      ) +
      ledgerCard(
        "本项目",
        project.count + " 单",
        "底片 " + fmtNum(project.negatives) + " · 成品 " + fmtNum(project.products) +
          (project.pending ? " · 待打包 " + project.pending : "")
      );

    const projectRows = state.clients.map((client) => {
      const record = state.deliveries[client.id];
      const info = delivery.scan.get(client.id);
      return {
        name: client.name,
        seq: record ? record.seq : 0,
        negatives: info ? info.negatives : record ? record.negatives || 0 : 0,
        products: info ? info.products : record ? record.products || 0 : 0,
        date: record ? record.date : ""
      };
    });
    el.ledgerProject.innerHTML =
      '<div class="ledger-sub">本项目明细</div>' +
      '<table class="ledger-table-el"><thead><tr><th>客户</th><th>单号</th><th>底片</th><th>成品</th><th>日期</th></tr></thead><tbody>' +
      projectRows
        .map(
          (row) =>
            "<tr><td>" +
            F.escapeHtml(row.name) +
            "</td><td>" +
            (row.seq ? "第 " + row.seq + " 单" : "—") +
            "</td><td>" +
            row.negatives +
            "</td><td>" +
            row.products +
            "</td><td>" +
            F.escapeHtml(row.date) +
            "</td></tr>"
        )
        .join("") +
      "</tbody></table>";

    const yearRows = ledger.rows
      .filter((row) => ledgerYearOf(row) === year)
      .slice()
      .sort((a, b) => b.seq - a.seq || String(b.date).localeCompare(String(a.date)))
      .slice(0, 40);
    el.ledgerTable.innerHTML = yearRows.length
      ? '<div class="ledger-sub">今年已交付</div>' +
        '<table class="ledger-table-el"><thead><tr><th>单号</th><th>类型</th><th>展会</th><th>客户</th><th>底片</th><th>成品</th><th>日期</th></tr></thead><tbody>' +
        yearRows
          .map(
            (row) =>
              "<tr><td>" +
              row.seq +
              "</td><td>" +
              (row.type === "fun" ? "玩拍" : "订单") +
              "</td><td>" +
              F.escapeHtml(row.show) +
              "</td><td>" +
              F.escapeHtml(row.client) +
              "</td><td>" +
              row.negatives +
              "</td><td>" +
              row.products +
              "</td><td>" +
              F.escapeHtml(row.date) +
              "</td></tr>"
          )
          .join("") +
        "</tbody></table>"
      : '<div class="ledger-sub">今年已交付</div><p class="field-help">还没有交付记录。打包一次就会写进台账。</p>';

    const where = ledger.handle ? "台账文件：<code>" + F.escapeHtml(ledger.handle.name) + "/" + LEDGER_FILE + "</code>" : "";
    el.ledgerHint.innerHTML =
      (ledger.error ? '<span class="warn">' + F.escapeHtml(ledger.error) + "</span> · " : "") +
      (where || "台账文件放在项目父文件夹里，跨项目累计；换电脑时把这个文件夹一起拷走。");
    el.ledgerSummary.textContent =
      "今年 " + (totals.order.count + totals.fun.count) + " 单 · 底片 " +
      fmtNum(totals.order.negatives + totals.fun.negatives) +
      " · 成品 " +
      fmtNum(totals.order.products + totals.fun.products);
  }

  async function openLedgerModal() {
    if (!state.project) {
      toast("先新建或打开一个项目。");
      return;
    }
    closeProjectMenu();
    if (!delivery.loaded) await scanDeliveries();
    el.ledgerModal.hidden = false;
    document.body.classList.add("modal-open");
    renderLedgerModal();
    await ensureLedger();
    await readLedgerRows();
    renderLedgerModal();
  }

  function closeLedgerModal() {
    el.ledgerModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function pickLedgerFolder() {
    if (!("showDirectoryPicker" in window)) {
      toast("当前浏览器无法选择文件夹，请使用 Chrome / Edge。", "error");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "furix-ledger",
        mode: "readwrite"
      });
      await saveLedgerHandle(handle);
      ledger.error = null;
      await readLedgerRows();
      renderLedgerModal();
      toast("台账文件夹已设置：" + handle.name, "success");
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("选择台账文件夹失败：" + (err && err.message ? err.message : err), "error");
    }
  }

  /* ---------- delivery packs cleanup ---------- */

  const packs = { list: [], selected: new Set() };

  async function scanDeliveryPacks() {
    packs.list = [];
    if (!state.project || !state.project.handle) return packs.list;
    let dir = null;
    try {
      dir = await state.project.handle.getDirectoryHandle("交付");
    } catch (err) {
      return packs.list;
    }
    try {
      for await (const entry of dir.values()) {
        if (!entry || entry.kind !== "file") continue;
        if (!/\.zip$/i.test(entry.name)) continue;
        let size = 0;
        let mtime = 0;
        try {
          const file = await entry.getFile();
          size = file.size;
          mtime = file.lastModified;
        } catch (err) {
          /* 读不到大小也照样列出 */
        }
        packs.list.push({ name: entry.name, size: size, mtime: mtime });
      }
    } catch (err) {
      /* 空目录 */
    }
    packs.list.sort((a, b) => b.mtime - a.mtime);
    const names = new Set(packs.list.map((pack) => pack.name));
    for (const name of Array.from(packs.selected)) {
      if (!names.has(name)) packs.selected.delete(name);
    }
    return packs.list;
  }

  function renderPackList() {
    if (!el.packList) return;
    if (!packs.list.length) {
      el.packList.innerHTML = '<p class="field-help">交付文件夹里还没有包。</p>';
      el.packNote.textContent = "";
      el.packDelete.disabled = true;
      el.packDelete.textContent = "删除所选";
      el.packAll.checked = false;
      return;
    }
    let total = 0;
    let picked = 0;
    const html = packs.list.map((pack) => {
      total += pack.size;
      const on = packs.selected.has(pack.name);
      if (on) picked += pack.size;
      return (
        '<label class="pack-row"><input type="checkbox" data-pack="' +
        F.escapeHtml(pack.name) +
        '"' +
        (on ? " checked" : "") +
        '><span class="pack-name">' +
        F.escapeHtml(pack.name) +
        '</span><span class="pack-size">' +
        F.formatBytes(pack.size) +
        "</span></label>"
      );
    });
    el.packList.innerHTML = html.join("");
    el.packNote.textContent = packs.list.length + " 个包 · " + F.formatBytes(total);
    el.packDelete.disabled = !packs.selected.size;
    el.packDelete.textContent = packs.selected.size
      ? "删除所选（" + F.formatBytes(picked) + "）"
      : "删除所选";
    el.packAll.checked = packs.selected.size > 0 && packs.selected.size === packs.list.length;
  }

  async function deleteSelectedPacks() {
    if (!packs.selected.size || !state.project) return;
    const names = Array.from(packs.selected);
    let dir = null;
    try {
      dir = await state.project.handle.getDirectoryHandle("交付");
    } catch (err) {
      toast("找不到 交付 文件夹。", "error");
      return;
    }
    let removed = 0;
    let bytes = 0;
    const failures = [];
    for (const name of names) {
      const pack = packs.list.find((item) => item.name === name);
      try {
        await dir.removeEntry(name);
        removed += 1;
        bytes += pack ? pack.size : 0;
      } catch (err) {
        failures.push(name);
      }
    }
    packs.selected.clear();
    await scanDeliveryPacks();
    renderPackList();
    renderDeliveryRows();
    toast(
      failures.length
        ? "删除了 " + removed + " 个，失败 " + failures.length + " 个"
        : "已删除 " + removed + " 个交付包，释放 " + F.formatBytes(bytes),
      failures.length ? "error" : "success",
      4200
    );
  }

  /* ---------- archive (往年冷存) ---------- */

  const ARCHIVE_FILE = "归档.zip";
  const archive = { busy: false, contents: new Map(), armed: "" };

  function archiveSelection() {
    return {
      negatives: !!el.arcNegatives.checked,
      raws: !!el.arcRaws.checked,
      products: !!el.arcProducts.checked,
      packs: !!el.arcPacks.checked
    };
  }

  async function listClientArchiveSource(client) {
    const source = { negatives: [], raws: [], products: [], packs: [], bytes: 0, files: 0 };
    if (!state.project || !state.project.handle) return source;
    let dir = null;
    try {
      dir = await state.project.handle.getDirectoryHandle(client.folder || client.name);
    } catch (err) {
      return source;
    }
    try {
      for await (const entry of dir.values()) {
        if (!entry || entry.kind !== "file") continue;
        if (!entry.name || entry.name.startsWith(".")) continue;
        if (!F.canPreviewExt(F.extOf(entry.name))) continue;
        try {
          const file = await entry.getFile();
          source.negatives.push({ name: "底片/" + entry.name, file: file });
          source.bytes += file.size;
          source.files += 1;
        } catch (err) {
          /* 单个读不到就跳过 */
        }
      }
    } catch (err) {
      /* ignore */
    }
    const readDir = async (subName, prefix, bucket) => {
      let sub = null;
      try {
        sub = await dir.getDirectoryHandle(subName);
      } catch (err) {
        return;
      }
      try {
        for await (const entry of sub.values()) {
          if (!entry || entry.kind !== "file") continue;
          if (!entry.name || entry.name.startsWith(".")) continue;
          try {
            const file = await entry.getFile();
            bucket.push({ name: prefix + entry.name, file: file });
            source.bytes += file.size;
            source.files += 1;
          } catch (err) {
            /* ignore */
          }
        }
      } catch (err) {
        /* ignore */
      }
    };
    await readDir("选图集", "选图集/", source.raws);
    await readDir("成品集", "成品集/", source.products);
    try {
      const packDir = await state.project.handle.getDirectoryHandle("交付");
      const packName = deliveryPackageName(client);
      const handle = await packDir.getFileHandle(packName);
      const file = await handle.getFile();
      source.packs.push({ name: "交付/" + packName, file: file });
      source.bytes += file.size;
      source.files += 1;
    } catch (err) {
      /* 没有交付包 */
    }
    return source;
  }

  async function renderArchiveRows() {
    if (!el.archiveRows) return;
    el.archiveRows.innerHTML = "";
    if (!state.clients.length) {
      el.archiveRows.innerHTML = '<div class="session-empty">项目里还没有客户文件夹。</div>';
      return;
    }
    const sel = archiveSelection();
    let totalBytes = 0;
    let archived = 0;
    const rows = [];
    for (const client of state.clients) {
      let source = archive.contents.get(client.id);
      if (!source) {
        source = await listClientArchiveSource(client);
        archive.contents.set(client.id, source);
      }
      const rec = state.archives[client.id];
      if (rec) archived += 1;
      totalBytes += source.bytes;
      const picked = [];
      if (sel.negatives && source.negatives.length) picked.push("底片 " + source.negatives.length);
      if (sel.raws && source.raws.length) picked.push("选 " + source.raws.length);
      if (sel.products && source.products.length) picked.push("成品 " + source.products.length);
      if (sel.packs && source.packs.length) picked.push("包 " + source.packs.length);
      const status = rec
        ? rec.cleaned
          ? '<span class="dv-state ok">已归档 · 原图已清理 · ' + F.formatBytes(rec.bytes) + "</span>"
          : '<span class="dv-state ok">已归档 · 待清理 · ' + F.formatBytes(rec.bytes) + "</span>"
        : '<span class="dv-state">未归档</span>';
      const buttons = [];
      if (!rec || !rec.cleaned) {
        buttons.push(
          '<button class="btn btn-outline btn-sm arc-go" type="button" data-client="' +
            F.escapeHtml(client.id) +
            '"' +
            (picked.length ? "" : " disabled") +
            ">" +
            (rec ? "重归档" : "归档") +
            "</button>"
        );
      }
      if (rec && !rec.cleaned) {
        const armed = archive.armed === client.id;
        buttons.push(
          '<button class="btn btn-sm ' +
            (armed ? "btn-primary" : "btn-ghost") +
            ' arc-clean" type="button" data-client="' +
            F.escapeHtml(client.id) +
            '">' +
            (armed ? "再点一次确认删除" : "删除原图") +
            "</button>"
        );
      }
      if (rec && rec.cleaned) {
        buttons.push(
          '<button class="btn btn-outline btn-sm arc-restore" type="button" data-client="' +
            F.escapeHtml(client.id) +
            '">恢复</button>'
        );
      }
      rows.push(
        '<div class="archive-row"><div class="arc-head"><strong>' +
          F.escapeHtml(client.name) +
          "</strong>" +
          status +
          "</div>" +
          '<div class="arc-meta"><span>底片 ' +
          source.negatives.length +
          "</span><span>选 " +
          source.raws.length +
          "</span><span>成品 " +
          source.products.length +
          "</span><span>交付包 " +
          source.packs.length +
          "</span><span class='dv-size'>" +
          F.formatBytes(source.bytes) +
          "</span></div>" +
          '<div class="arc-picked">' +
          (picked.length ? "本次会收进：" + picked.join(" · ") : "没有勾选到内容") +
          "</div>" +
          '<div class="arc-actions">' +
          buttons.join("") +
          "</div></div>"
      );
    }
    el.archiveRows.innerHTML = rows.join("");
    el.archiveSummary.textContent =
      archived + " / " + state.clients.length + " 个客户已归档 · 素材共 " + F.formatBytes(totalBytes);
  }

  async function openArchiveModal() {
    if (!state.project) {
      toast("先新建或打开一个项目。");
      return;
    }
    closeProjectMenu();
    archive.contents = new Map();
    archive.armed = "";
    el.archiveModal.hidden = false;
    document.body.classList.add("modal-open");
    el.archiveRows.innerHTML = '<div class="session-empty">正在扫描客户文件夹…</div>';
    await renderArchiveRows();
  }

  function closeArchiveModal() {
    if (archive.busy) return;
    el.archiveModal.hidden = true;
    archive.armed = "";
    document.body.classList.remove("modal-open");
  }

  async function runArchive(clientId) {
    if (archive.busy || !state.project) return;
    const client = clientById(clientId);
    if (!client) return;
    const sel = archiveSelection();
    const source = await listClientArchiveSource(client);
    const picked = [];
    if (sel.negatives) picked.push.apply(picked, source.negatives);
    if (sel.raws) picked.push.apply(picked, source.raws);
    if (sel.products) picked.push.apply(picked, source.products);
    if (sel.packs) picked.push.apply(picked, source.packs);
    if (!picked.length) {
      toast("没有勾选到可归档的内容。");
      return;
    }
    archive.busy = true;
    el.archiveNote.textContent = "正在打包 " + client.name + "…";
    try {
      const dir = await state.project.handle.getDirectoryHandle(client.folder || client.name);
      const blob = await F.zipStore(
        picked.map((item) => ({ name: item.name, blob: item.file })),
        (fraction, done, total) => {
          el.archiveNote.textContent = "正在打包 " + client.name + " " + done + "/" + total;
        }
      );
      const fileHandle = await dir.getFileHandle(ARCHIVE_FILE, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        await writable.write(blob);
      } finally {
        await writable.close();
      }
      el.archiveNote.textContent = "正在校验 " + client.name + " 的归档目录…";
      const written = await (await dir.getFileHandle(ARCHIVE_FILE)).getFile();
      const central = await F.readZipCentral(written);
      const expected = new Map(picked.map((item) => [item.name, item.file.size]));
      let verified = central.length === picked.length;
      if (verified) {
        for (const [name, size] of expected) {
          if (central.find((entry) => entry.name === name && entry.size === size) == null) {
            verified = false;
            break;
          }
        }
      }
      if (!verified) {
        throw new Error("归档目录校验没通过（包内 " + central.length + " / 应有 " + picked.length + "）");
      }
      state.archives[client.id] = {
        at: Date.now(),
        name: ARCHIVE_FILE,
        bytes: written.size,
        files: picked.length,
        contents: sel,
        verified: true,
        cleaned: false
      };
      archive.contents.delete(client.id);
      await saveProjectNow();
      await renderArchiveRows();
      toast(
        "已归档 " + client.name + "：" + picked.length + " 个文件 · " + F.formatBytes(written.size),
        "success",
        4200
      );
    } catch (err) {
      toast("归档失败：" + (err && err.message ? err.message : err), "error", 5200);
    } finally {
      archive.busy = false;
      el.archiveNote.textContent = "";
    }
  }

  function armArchiveClean(clientId, button) {
    if (archive.armed === clientId) {
      archive.armed = "";
      deleteArchiveOriginals(clientId);
      return;
    }
    archive.armed = clientId;
    if (button) {
      button.classList.remove("btn-ghost");
      button.classList.add("btn-primary");
      button.textContent = "再点一次确认删除";
    }
    clearTimeout(archive.timer);
    archive.timer = window.setTimeout(() => {
      if (archive.armed !== clientId) return;
      archive.armed = "";
      if (button && button.isConnected) {
        button.classList.remove("btn-primary");
        button.classList.add("btn-ghost");
        button.textContent = "删除原图";
      }
    }, 6000);
  }

  async function deleteArchiveOriginals(clientId) {
    if (archive.busy || !state.project) return;
    const client = clientById(clientId);
    const rec = state.archives[client.id];
    if (!rec || !rec.verified) return;
    archive.busy = true;
    el.archiveNote.textContent = "正在删除 " + client.name + " 的原图…";
    try {
      const dir = await state.project.handle.getDirectoryHandle(client.folder || client.name);
      let removed = 0;
      if (rec.contents.negatives) {
        const names = [];
        for await (const entry of dir.values()) {
          if (!entry || entry.kind !== "file") continue;
          if (!entry.name || entry.name.startsWith(".")) continue;
          if (!F.canPreviewExt(F.extOf(entry.name))) continue;
          names.push(entry.name);
        }
        for (const name of names) {
          try {
            await dir.removeEntry(name);
            removed += 1;
          } catch (err) {
            /* ignore */
          }
        }
      }
      if (rec.contents.raws) {
        try {
          await dir.removeEntry("选图集", { recursive: true });
          removed += 1;
        } catch (err) {
          /* ignore */
        }
      }
      if (rec.contents.products) {
        try {
          await dir.removeEntry("成品集", { recursive: true });
          removed += 1;
        } catch (err) {
          /* ignore */
        }
      }
      if (rec.contents.packs) {
        try {
          const packDir = await state.project.handle.getDirectoryHandle("交付");
          await packDir.removeEntry(deliveryPackageName(client));
          removed += 1;
        } catch (err) {
          /* ignore */
        }
      }
      rec.cleaned = true;
      rec.cleanedAt = Date.now();
      archive.contents.delete(client.id);
      await saveProjectNow();
      await scanDeliveries();
      await scanDeliveryPacks();
      renderPackList();
      renderDeliveryRows();
      renderClientList();
      renderArchiveRows();
      toast("已删除 " + client.name + " 的原图，归档包保留。", "success", 4200);
    } catch (err) {
      toast("删除失败：" + (err && err.message ? err.message : err), "error", 5000);
    } finally {
      archive.busy = false;
      el.archiveNote.textContent = "";
    }
  }

  async function restoreArchive(clientId) {
    if (archive.busy || !state.project) return;
    const client = clientById(clientId);
    archive.busy = true;
    el.archiveNote.textContent = "正在读取 " + client.name + " 的归档包…";
    try {
      const root = state.project.handle;
      const dir = await root.getDirectoryHandle(client.folder || client.name);
      let handle = null;
      try {
        handle = await dir.getFileHandle(ARCHIVE_FILE);
      } catch (err) {
        toast("这个客户文件夹里没有 归档.zip。", "error", 4600);
        return;
      }
      const blob = await handle.getFile();
      const entries = await F.readZipCentral(blob);
      let written = 0;
      const failures = [];
      for (const entry of entries) {
        try {
          const parts = entry.name.split("/").filter(Boolean);
          const fileName = parts.pop();
          if (!fileName) continue;
          let target = dir;
          if (parts[0] === "底片") parts.shift();
          else if (parts[0] === "交付") {
            parts.shift();
            target = await root.getDirectoryHandle("交付", { create: true });
          }
          for (const part of parts) {
            target = await target.getDirectoryHandle(part, { create: true });
          }
          const data = await F.zipEntryBlob(blob, entry);
          const fileHandle = await target.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          try {
            await writable.write(data);
          } finally {
            await writable.close();
          }
          written += 1;
          el.archiveNote.textContent = "正在恢复 " + client.name + " " + written + "/" + entries.length;
        } catch (err) {
          failures.push(entry.name);
        }
      }
      const rec = state.archives[client.id];
      if (rec) {
        rec.cleaned = false;
        rec.restoredAt = Date.now();
      }
      archive.contents.delete(client.id);
      await saveProjectNow();
      await scanDeliveries();
      await scanDeliveryPacks();
      renderPackList();
      renderDeliveryRows();
      renderArchiveRows();
      toast(
        "已恢复 " + written + " / " + entries.length + " 个文件" + (failures.length ? "，" + failures.length + " 个失败" : ""),
        failures.length ? "error" : "success",
        4600
      );
    } catch (err) {
      toast("恢复失败：" + (err && err.message ? err.message : err), "error", 5200);
    } finally {
      archive.busy = false;
      el.archiveNote.textContent = "";
    }
  }

  /* ---------- adopt existing project（接入旧项目） ---------- */

  const ADOPT_SKIP = new Set(["选图集", "成品集", "交付", "归档", "底片", "成品", "原片"]);
  const adopt = { handle: null, rows: [], busy: false };

  function adoptDateFromParts(month, day) {
    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, Number(month) - 1, Number(day));
    // 文件夹名不带年份：如果算出来是"未来"很久，说明是去年的项目
    if (candidate.getTime() > now.getTime() + 7 * 24 * 3600 * 1000) year -= 1;
    const pad = (n) => String(n).padStart(2, "0");
    return year + "-" + pad(Number(month)) + "-" + pad(Number(day));
  }

  async function scanAdoptClient(dir, folder) {
    const info = {
      folder: folder,
      name: folder,
      negatives: 0,
      selections: 0,
      products: 0,
      bytes: 0,
      latest: 0,
      hasArchive: false
    };
    try {
      for await (const entry of dir.values()) {
        if (!entry || entry.kind !== "file") continue;
        if (!entry.name || entry.name.startsWith(".")) continue;
        if (/^归档\.zip$/i.test(entry.name)) info.hasArchive = true;
        if (F.canPreviewExt(F.extOf(entry.name))) info.negatives += 1;
      }
    } catch (err) {
      /* ignore */
    }
    for (const [sub, key] of [["选图集", "selections"], ["成品集", "products"]]) {
      let child = null;
      try {
        child = await dir.getDirectoryHandle(sub);
      } catch (err) {
        continue;
      }
      try {
        for await (const entry of child.values()) {
          if (!entry || entry.kind !== "file") continue;
          if (!entry.name || entry.name.startsWith(".")) continue;
          info[key] += 1;
          try {
            const file = await entry.getFile();
            info.bytes += file.size || 0;
            if (file.lastModified > info.latest) info.latest = file.lastModified;
          } catch (err) {
            /* ignore */
          }
        }
      } catch (err) {
        /* ignore */
      }
    }
    return info;
  }

  async function adoptExistingProject() {
    if (!("showDirectoryPicker" in window)) {
      toast("接入项目需要 Chrome / Edge 的文件夹授权。", "error");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({
        id: "furix-adopt-project",
        mode: "readwrite"
      });
      await prepareAdopt(handle);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast("打开文件夹失败：" + (err && err.message ? err.message : err), "error");
    }
  }

  async function prepareAdopt(handle) {
    let existing = null;
    try {
      existing = await F.readProjectFile(handle);
    } catch (err) {
      existing = null;
    }
    if (existing) {
      await applyProjectPayload(existing, handle);
      toast("这个文件夹已经是项目，已直接打开。", "success", 3200);
      return;
    }
    adopt.handle = handle;
    const name = handle.name || "项目";
    const parsed = /^([AB])\s*(\d{1,2})\.(\d{1,2})\s*(.+)$/i.exec(name);
    el.adoptCode.value = name;
    el.adoptType.value = parsed && parsed[1].toUpperCase() === "B" ? "fun" : "order";
    el.adoptDate.value = parsed
      ? adoptDateFromParts(parsed[2], parsed[3])
      : todayInputValue();
    el.adoptHint.textContent = "正在扫描客户文件夹…";
    adopt.rows = [];
    renderAdoptRows();
    el.adoptModal.hidden = false;
    document.body.classList.add("modal-open");

    const rows = [];
    try {
      for await (const entry of handle.values()) {
        if (!entry || entry.kind !== "directory") continue;
        if (!entry.name || entry.name.startsWith(".")) continue;
        if (ADOPT_SKIP.has(entry.name)) continue;
        rows.push(await scanAdoptClient(entry, entry.name));
      }
    } catch (err) {
      /* ignore */
    }
    rows.sort((a, b) => a.folder.localeCompare(b.folder, "zh-Hans-CN", { numeric: true }));
    for (const row of rows) {
      row.delivered = row.products > 0;
      row.date = row.latest ? isoFromTime(row.latest) : todayInputValue();
    }
    adopt.rows = rows;
    renderAdoptRows();
    el.adoptHint.innerHTML =
      "只新建 <code>.furix-project.json</code>，不会动任何照片。已交付的客户会补一条交付记录（包名按当前规则生成，即使当初是直接发成品集文件夹）。";
  }

  function isoFromTime(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function renderAdoptRows() {
    if (!el.adoptRows) return;
    if (!adopt.rows.length) {
      el.adoptRows.innerHTML =
        '<div class="session-empty">没有扫描到客户文件夹。这个目录里可能只有图片，没有按客户分的子目录。</div>';
      el.adoptSummary.textContent = "0 个客户";
      el.adoptConfirm.disabled = true;
      return;
    }
    el.adoptRows.innerHTML = adopt.rows
      .map((row, index) => {
        const counts =
          "底 " + row.negatives + " · 选 " + row.selections + " · 成 " + row.products;
        return (
          '<div class="adopt-row" data-index="' +
          index +
          '">' +
          '<input class="adopt-name" value="' +
          F.escapeHtml(row.name) +
          '" maxlength="30" spellcheck="false">' +
          '<span class="adopt-counts">' +
          counts +
          "</span>" +
          '<span class="adopt-state">' +
          '<select class="adopt-delivered"><option value="no">未交付</option><option value="yes">已交付</option></select>' +
          '<input class="adopt-date" type="date" value="' +
          F.escapeHtml(row.date) +
          '">' +
          "</span></div>"
        );
      })
      .join("");
    $$("#adopt-rows .adopt-row").forEach((node, index) => {
      const select = node.querySelector(".adopt-delivered");
      select.value = adopt.rows[index].delivered ? "yes" : "no";
      select.classList.toggle("is-done", !!adopt.rows[index].delivered);
      node.querySelector(".adopt-name").addEventListener("input", (event) => {
        adopt.rows[index].name = event.target.value;
      });
      select.addEventListener("change", () => {
        adopt.rows[index].delivered = select.value === "yes";
        select.classList.toggle("is-done", adopt.rows[index].delivered);
        updateAdoptSummary();
      });
      node.querySelector(".adopt-date").addEventListener("change", (event) => {
        adopt.rows[index].date = event.target.value;
      });
    });
    updateAdoptSummary();
  }

  function updateAdoptSummary() {
    const total = adopt.rows.length;
    const delivered = adopt.rows.filter((row) => row.delivered).length;
    const products = adopt.rows.reduce((sum, row) => sum + row.products, 0);
    el.adoptSummary.textContent =
      total + " 个客户 · 已交付 " + delivered + " · 成品合计 " + products + " 张";
    el.adoptConfirm.disabled = total === 0 || adopt.busy;
  }

  function closeAdoptModal() {
    if (adopt.busy) return;
    el.adoptModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  async function confirmAdopt() {
    if (!adopt.handle || adopt.busy) return;
    if (!adopt.rows.length) return;
    const code = F.sanitizeFileName((el.adoptCode.value || "").trim() || adopt.handle.name, "项目");
    const projectType = el.adoptType.value === "fun" ? "fun" : "order";
    const modeNode = document.querySelector('input[name="adopt-ledger"]:checked');
    const mode = modeNode ? modeNode.value : "none";
    let seq = Math.max(1, Number(el.adoptSeq.value) || 1);

    const clients = adopt.rows.map((row, index) => ({
      id: "c" + (index + 1),
      name: F.sanitizeFileName((row.name || "").trim() || row.folder, row.folder),
      folder: row.folder
    }));
    const deliveries = {};
    const ledgerRows = [];
    adopt.rows.forEach((row, index) => {
      if (!row.delivered) return;
      const packName = F.sanitizeFileName(code + "_" + clients[index].name, "package") + ".zip";
      const record = {
        seq: 0,
        at: row.latest || Date.now(),
        date: row.date || todayIso(),
        name: packName,
        files: row.products,
        bytes: row.bytes,
        negatives: row.negatives,
        selections: row.selections,
        products: row.products,
        adopted: true
      };
      if (mode === "backfill") {
        record.seq = seq;
        ledgerRows.push({
          seq: seq,
          type: projectType,
          show: code,
          client: clients[index].name,
          negatives: row.negatives,
          products: row.products,
          pack: packName,
          date: record.date
        });
        seq += 1;
      }
      deliveries[clients[index].id] = record;
    });

    adopt.busy = true;
    el.adoptConfirm.disabled = true;
    try {
      const payload = {
        app: "FURIX Selects",
        type: "furix-project",
        version: 1,
        name: code,
        code: code,
        projectType: projectType,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        clients: clients,
        sessions: [],
        marks: {},
        returns: {},
        deliveries: deliveries,
        archives: {},
        adopted: true,
        settings: { sessionGap: 30, sessionMin: 15, fileFilter: "jpg" }
      };
      await F.writeProjectFile(adopt.handle, payload);

      if (ledgerRows.length) {
        const ready = await ensureLedger();
        if (ready) {
          await readLedgerRows();
          const rows = ledger.rows.slice();
          for (const row of ledgerRows) upsertLedgerRow(rows, row);
          await writeLedgerRows(rows);
        } else {
          toast("台账文件夹还没连接，单号没有补登（可以稍后在「台账统计」里选）。", "error", 5200);
        }
      }

      await applyProjectPayload(payload, adopt.handle);
      el.adoptModal.hidden = true;
      document.body.classList.remove("modal-open");
      const deliveredCount = Object.keys(deliveries).length;
      toast(
        "已接入 " + code + "：" + clients.length + " 个客户" +
          (deliveredCount ? "，" + deliveredCount + " 单标为已交付" : "") +
          (ledgerRows.length ? "，台账补了 " + ledgerRows.length + " 单" : "") +
          "。下一步选择 SD 卡素材目录。",
        "success",
        5200
      );
      updateProjectUI();
    } catch (err) {
      toast("接入失败：" + (err && err.message ? err.message : err), "error", 5200);
    } finally {
      adopt.busy = false;
      el.adoptConfirm.disabled = false;
    }
  }

  /* ---------- recent projects（首页最近项目） ---------- */


  function recentDb() {
    if (recentDbPromise) return recentDbPromise;
    recentDbPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const request = indexedDB.open(RECENT_DB, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(RECENT_STORE)) {
            db.createObjectStore(RECENT_STORE, { keyPath: "code" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
    return recentDbPromise;
  }

  async function recentDbReady() {
    const db = await Promise.race([
      recentDb(),
      new Promise((resolve) => setTimeout(() => resolve(null), 400))
    ]);
    return db || null;
  }

  async function recentAll() {
    const db = await recentDbReady();
    if (!db) return [];
    const rows = await Promise.race([
      new Promise((resolve) => {
        try {
          const tx = db.transaction(RECENT_STORE, "readonly");
          const req = tx.objectStore(RECENT_STORE).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch (err) {
          resolve([]);
        }
      }),
      new Promise((resolve) => setTimeout(() => resolve([]), 500))
    ]);
    return (rows || []).sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
  }

  /* localStorage 里再存一份纯文本摘要：IndexedDB 不可用时首页至少还能列出项目 */
  const RECENT_LOCAL_KEY = "furix.recent.v1";

  function recentLocalLoad() {
    try {
      const raw = localStorage.getItem(RECENT_LOCAL_KEY);
      const rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      return [];
    }
  }

  function recentLocalSave(meta) {
    try {
      const rows = recentLocalLoad().filter((row) => row.code !== meta.code);
      rows.unshift(meta);
      localStorage.setItem(RECENT_LOCAL_KEY, JSON.stringify(rows.slice(0, RECENT_MAX)));
    } catch (err) {
      /* ignore */
    }
  }

  function recentLocalRemove(code) {
    try {
      const rows = recentLocalLoad().filter((row) => row.code !== code);
      localStorage.setItem(RECENT_LOCAL_KEY, JSON.stringify(rows));
    } catch (err) {
      /* ignore */
    }
  }

  async function recentPut(record) {
    recentLocalSave({
      code: record.code,
      name: record.name,
      projectType: record.projectType,
      clients: record.clients,
      delivered: record.delivered,
      undelivered: record.undelivered,
      negatives: record.negatives,
      products: record.products,
      openedAt: record.openedAt
    });
    const db = await recentDbReady();
    if (!db) return;
    try {
      const tx = db.transaction(RECENT_STORE, "readwrite");
      tx.objectStore(RECENT_STORE).put(record);
    } catch (err) {
      /* ignore */
    }
    const rows = await recentAll();
    const extra = rows.slice(RECENT_MAX);
    if (!extra.length) return;
    try {
      const tx = db.transaction(RECENT_STORE, "readwrite");
      const store = tx.objectStore(RECENT_STORE);
      for (const row of extra) store.delete(row.code);
    } catch (err) {
      /* ignore */
    }
  }

  async function recentRemove(code) {
    recentLocalRemove(code);
    const db = await recentDbReady();
    if (db) {
      try {
        const tx = db.transaction(RECENT_STORE, "readwrite");
        tx.objectStore(RECENT_STORE).delete(code);
      } catch (err) {
        /* ignore */
      }
    }
    renderHub();
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const minute = 60000;
    const hour = 3600000;
    const day = 86400000;
    if (diff < minute) return "刚刚";
    if (diff < hour) return Math.floor(diff / minute) + " 分钟前";
    if (diff < day) return Math.floor(diff / hour) + " 小时前";
    if (diff < day * 2) return "昨天";
    if (diff < day * 7) return Math.floor(diff / day) + " 天前";
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function recentSummary() {
    const total = state.clients.length;
    const delivered = Object.keys(state.deliveries || {}).length;
    let negatives = 0;
    let products = 0;
    let scanned = false;
    if (delivery.scan && delivery.scan.size) {
      scanned = true;
      for (const info of delivery.scan.values()) {
        negatives += info.negatives || 0;
        products += info.products || 0;
      }
    } else {
      for (const id of Object.keys(state.deliveries || {})) {
        const record = state.deliveries[id];
        negatives += record.negatives || 0;
        products += record.products || 0;
      }
    }
    return {
      clients: total,
      delivered: delivered,
      undelivered: Math.max(0, total - delivered),
      negatives: negatives,
      products: products,
      scanned: scanned
    };
  }

  function recordRecent(delay) {
    if (!state.project || !state.project.handle) return;
    clearTimeout(recentTimer);
    recentTimer = window.setTimeout(async () => {
      if (!state.project || !state.project.handle) return;
      const summary = recentSummary();
      await recentPut({
        code: state.project.code || state.project.name,
        name: state.project.name,
        projectType: state.project.projectType || "order",
        handle: state.project.handle,
        clients: summary.clients,
        delivered: summary.delivered,
        undelivered: summary.undelivered,
        negatives: summary.negatives,
        products: summary.products,
        openedAt: Date.now(),
        scannedAt: summary.scanned ? Date.now() : 0
      });
      if (!state.project) renderHub();
    }, delay == null ? 700 : delay);
  }

  async function renderHub() {
    if (!el.hubList) return;
    if (state.project) {
      el.hubRecent.hidden = true;
      return;
    }
    let rows = await recentAll();
    if (!rows.length) {
      rows = recentLocalLoad().map((row) => Object.assign({}, row, { handle: null }));
    }
    rows = rows.slice(0, RECENT_HUB_MAX);
    el.hubRecent.hidden = rows.length === 0;
    if (!rows.length) return;
    el.hubList.innerHTML = rows
      .map((record, index) => {
        const main = index === 0;
        const type = record.projectType === "fun" ? "玩拍" : "订单";
        const clients = Number(record.clients) || 0;
        const delivered = Number(record.delivered) || 0;
        const undelivered = Number(record.undelivered) || 0;
        const pct = clients > 0 ? Math.max(0, Math.min(100, Math.round((delivered / clients) * 100))) : 0;
        // 只有最新那个项目带环形可视化，其余行只显示数据
        const ring = main
          ? '<span class="hub-ring" title="已交付 ' +
            delivered +
            " / " +
            clients +
            ' 个客户"><svg viewBox="0 0 36 36" aria-hidden="true">' +
            '<circle class="hub-ring-track" cx="18" cy="18" r="15.5"></circle>' +
            '<circle class="hub-ring-bar" cx="18" cy="18" r="15.5" stroke-dasharray="97.4" stroke-dashoffset="' +
            (97.4 * (1 - pct / 100)).toFixed(1) +
            '"></circle></svg><b class="hub-ring-num">' +
            pct +
            "%</b></span>"
          : "";
        const stats =
          clients +
          " 个客户 · 已交付 " +
          delivered +
          " / 未交付 " +
          undelivered +
          " · 底片 " +
          fmtNum(record.negatives) +
          " · 成品 " +
          fmtNum(record.products);
        return (
          '<div class="hub-row' +
          (main ? " is-main" : "") +
          '" data-code="' +
          F.escapeHtml(record.code) +
          '" role="button" tabindex="0">' +
          '<span class="hub-ring-slot">' +
          ring +
          "</span>" +
          '<span class="hub-row-name">' +
          F.escapeHtml(record.code) +
          "</span>" +
          '<span class="hub-row-type">' +
          type +
          "</span>" +
          '<span class="hub-row-stats">' +
          F.escapeHtml(stats) +
          "</span>" +
          '<span class="hub-row-time">' +
          timeAgo(record.openedAt) +
          "</span>" +
          '<button class="hub-remove" type="button" data-remove="' +
          F.escapeHtml(record.code) +
          '" title="从列表移除">×</button>' +
          "</div>"
        );
      })
      .join("");
  }

  async function openRecent(code) {
    let rows = await recentAll();
    if (!rows.some((row) => row.code === code)) {
      rows = recentLocalLoad().map((row) => Object.assign({}, row, { handle: null }));
    }
    const record = rows.find((row) => row.code === code);
    if (!record) {
      toast("这个项目已经不在列表里了。", "error");
      renderHub();
      return;
    }
    if (!record.handle) {
      // 句柄没存下来（IndexedDB 不可用/被清），让用户重新指一下目录
      if (!("showDirectoryPicker" in window)) {
        toast("需要 Chrome / Edge 才能重新定位项目文件夹。", "error");
        return;
      }
      let handle = null;
      try {
        handle = await window.showDirectoryPicker({ id: "furix-recent-project", mode: "readwrite" });
      } catch (err) {
        if (err && err.name === "AbortError") return;
        toast("打开文件夹失败：" + (err && err.message ? err.message : err), "error");
        return;
      }
      let payload = null;
      try {
        payload = await F.readProjectFile(handle);
      } catch (err) {
        payload = null;
      }
      if (!payload) {
        toast("这个文件夹里没有 .furix-project.json。", "error", 4600);
        return;
      }
      const opened = payload.code || payload.name;
      if (opened !== record.code) {
        toast("打开的是「" + opened + "」，和列表里的「" + record.code + "」不一致。", "error", 5200);
        return;
      }
      await applyProjectPayload(payload, handle);
      toast("已打开 " + record.code + "。", "success", 2600);
      return;
    }
    try {
      let permission = "granted";
      if (record.handle.queryPermission) {
        permission = await record.handle.queryPermission({ mode: "readwrite" });
        if (permission !== "granted" && record.handle.requestPermission) {
          permission = await record.handle.requestPermission({ mode: "readwrite" });
        }
      }
      if (permission !== "granted") {
        toast("需要文件夹读写权限才能打开项目。", "error", 4200);
        return;
      }
      const payload = await F.readProjectFile(record.handle);
      if (!payload) {
        toast("这个文件夹里找不到项目文件，可能已被移动或删除。", "error", 4600);
        return;
      }
      await applyProjectPayload(payload, record.handle);
      toast("已打开 " + (payload.code || payload.name) + "。", "success", 2600);
    } catch (err) {
      toast("打开失败：" + (err && err.message ? err.message : err), "error", 4600);
    }
  }

  function renderProjectEmpty() {
    const project = state.project;
    if (!project || !el.peName) return;
    el.peName.textContent = project.code || project.name;
    el.peType.textContent = project.projectType === "fun" ? "玩拍" : "订单";
    const total = state.clients.length;
    const delivered = Object.keys(state.deliveries || {}).length;
    const bits = [
      total + " 个客户",
      "已交付 " + delivered,
      "未交付 " + Math.max(0, total - delivered),
      state.sourceName ? "素材源 " + state.sourceName : "未挂载素材源"
    ];
    el.peMeta.textContent = bits.join(" · ");
  }

  function updateStartPanels() {
    const hasPhotos = state.photos.length > 0;
    const projectMode = !!state.project;
    if (el.empty) el.empty.hidden = hasPhotos || projectMode;
    if (el.projectEmpty) el.projectEmpty.hidden = !projectMode || hasPhotos;
    if (projectMode) {
      renderProjectEmpty();
      refreshPeRecent();
    } else {
      renderHub();
    }
  }

  async function finishLoad(photos, folderName, handle, writable) {
    virtual.disabled = false;
    flushPendingMarks();
    if (state.photos.length) revokeLibraryUrls();
    state.photos = photos;
    state.byId = new Map(photos.map((p) => [p.id, p]));
    state.selection = new Set();
    state.focusId = null;
    state.anchorId = null;
    state.folderName = folderName || "图库";
    state.folderHandle = handle || null;
    state.writable = !!writable;
    state.demo = folderName === "示例图库 · FURIX";
    state.currentLoupeId = null;
    stopExifScan(true);
    state.filter = {
      flag: "all",
      minRating: 0,
      colors: new Set(),
      query: "",
      camera: "all",
      lens: "all",
      focal: "all",
      aperture: "all"
    };
    state.view = "grid";
    el.app.dataset.view = "grid";
    el.loupe.hidden = true;
    el.search.value = "";
    resetFilterUI();
    resetExifFacets();
    state.fileFilter = photos.some((p) => p.hasJpg) ? "jpg" : "all";
    updateFileFilterUI();

    let local = { marks: {}, updatedAt: 0 };
    try {
      local = F.readLocalCatalog(state.folderName);
    } catch (err) {
      /* ignore */
    }
    let fromFolder = null;
    if (handle) {
      try {
        fromFolder = await F.readFolderCatalog(handle);
      } catch (err) {
        fromFolder = null;
      }
    }
    const merged = F.mergeMarks(local, fromFolder);
    state.meta = new Map(Object.entries(merged));
    // Migrate marks written before JPG/RAW pairing (keys included extensions).
    for (const [key, record] of Array.from(state.meta.entries())) {
      if (state.byId.has(key)) continue;
      const baseKey = key.replace(/\.[^./]+$/, "");
      if (state.byId.has(baseKey) && !state.meta.has(baseKey)) {
        state.meta.delete(key);
        state.meta.set(baseKey, record);
      }
    }
    syncNameMarks();

    el.app.classList.toggle("no-library", !photos.length);
    updateFolderUI();
    updateCounts();
    applyFilters({ resetScroll: true });
    updateStatus();
    setSaveKind(writable ? "folder" : "local");
    document.title = state.folderName + " · FURIX SELECTS";
    updateMenuState();
    applyDebugParams();
    const scanSet = photos;
    window.setTimeout(() => {
      if (state.photos === scanSet) startExifScan(scanSet);
    }, 400);
  }

  function loadFromFiles(fileList) {
    if (state.loading) return;
    const files = Array.from(fileList || []).filter((f) => F.isImageName(f.name));
    if (!files.length) {
      toast("没有找到可识别的照片。", "error");
      return;
    }
    let rootName = "拖入的照片";
    const first = files[0];
    if (first.webkitRelativePath) {
      rootName = first.webkitRelativePath.split("/")[0] || rootName;
    }
    const items = files.map((file) => {
      const rel = file.webkitRelativePath
        ? file.webkitRelativePath.split("/").slice(1).join("/") || file.name
        : file.name;
      return {
        relPath: rel,
        name: file.name,
        file: file,
        size: file.size,
        mtime: file.lastModified
      };
    });
    const photos = buildPhotos(items, false);
    finishLoad(photos, rootName, null, false);
    toast("已载入 " + photos.length + " 张照片。", "success");
  }

  async function loadFromDrop(event) {
    if (state.loading) return;
    const dt = event.dataTransfer;
    if (!dt) return;
    const entries = [];
    try {
      for (const item of Array.from(dt.items || [])) {
        if (item.kind !== "file") continue;
        const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
    } catch (err) {
      /* ignore */
    }

    if (!entries.length) {
      if (dt.files && dt.files.length) loadFromFiles(dt.files);
      return;
    }

    showLoading("正在读取拖入的照片…", "0 个文件");
    const collected = [];
    let rootName = "拖入的照片";
    const firstDir = entries.find((entry) => entry.isDirectory);
    if (firstDir) rootName = firstDir.name;

    async function readEntry(entry, prefix) {
      if (state.loadCancelled) return;
      if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve, () => resolve(null)));
        if (file && F.isImageName(file.name)) {
          collected.push({
            relPath: prefix + file.name,
            name: file.name,
            file: file,
            size: file.size,
            mtime: file.lastModified
          });
          if (collected.length % 20 === 0) {
            el.loadingSub.textContent = collected.length + " 个文件";
            setLoadingProgress(0.35, collected.length + " 个文件");
          }
        }
        return;
      }
      if (entry.isDirectory) {
        if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) return;
        const reader = entry.createReader();
        for (;;) {
          const batch = await new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));
          if (!batch.length) break;
          for (const child of batch) {
            await readEntry(child, prefix + entry.name + "/");
          }
        }
      }
    }

    try {
      for (const entry of entries) {
        await readEntry(entry, "");
      }
    } catch (err) {
      /* ignore */
    }

    if (state.loadCancelled) {
      hideLoading();
      return;
    }
    if (!collected.length) {
      hideLoading();
      toast("拖入的内容里没有可识别的照片。", "error");
      return;
    }
    setLoadingProgress(0.7, collected.length + " 张");
    const photos = buildPhotos(collected, false);
    if (!photos.length) {
      hideLoading();
      toast("照片文件无法读取。", "error");
      return;
    }
    await finishLoad(photos, rootName, null, false);
    hideLoading();
    toast("已载入 " + photos.length + " 张照片。", "success");
  }

  function revokeLibraryUrls() {
    if (thumbObserver) thumbObserver.disconnect();
    if (filmObserver) filmObserver.disconnect();
    for (const photo of state.photos) {
      if (photo.thumbUrl && photo.thumbUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photo.thumbUrl);
      }
      photo.thumbUrl = null;
      photo.thumbPromise = null;
    }
    for (const url of state.fullUrls.values()) {
      URL.revokeObjectURL(url);
    }
    state.fullUrls.clear();
    state.thumbUrls.clear();
    el.inspectorImg.removeAttribute("src");
    el.inspectorImg.classList.remove("loaded");
  }

  async function loadDemo(force) {
    if (state.loading) return;
    if (state.photos.length && !force) return;
    showLoading("正在载入示例图库…", "0 张");
    try {
      const response = await fetch("demo/manifest.json?v=exif1", { cache: "no-store" });
      if (!response.ok) throw new Error("missing demo");
      const manifest = await response.json();
      const items = [];
      for (let i = 0; i < manifest.photos.length; i += 1) {
        if (state.loadCancelled) break;
        const item = manifest.photos[i];
        const fileResponse = await fetch("demo/" + item.file + "?v=exif1");
        if (!fileResponse.ok) continue;
        const buffer = await fileResponse.arrayBuffer();
        const file = new File([buffer], item.name || item.file, {
          type: "image/jpeg",
          lastModified: item.mtime || Date.now() - i * 3600 * 1000
        });
        items.push({
          relPath: item.name || item.file,
          name: item.name || item.file,
          file: file,
          size: file.size,
          mtime: file.lastModified
        });
        setLoadingProgress(
          (i + 1) / manifest.photos.length,
          i + 1 + " / " + manifest.photos.length + " 张"
        );
      }
      if (state.loadCancelled) {
        hideLoading();
        return;
      }
      const photos = buildPhotos(items, false);
      if (!photos.length) throw new Error("empty demo");
      await finishLoad(photos, "示例图库 · FURIX", null, false);
      hideLoading();
      toast("这是示例图库。打开你自己的文件夹即可开始。", "success", 4200);
    } catch (err) {
      hideLoading();
      toast("示例图库未能载入。请通过“启动选片台”打开，或直接选择照片文件夹。", "error", 5000);
    }
  }

  /* ============================================================
     filters, sorting, counts
     ============================================================ */

  function hasExifFilter() {
    return (
      state.filter.camera !== "all" ||
      state.filter.lens !== "all" ||
      state.filter.focal !== "all" ||
      state.filter.aperture !== "all"
    );
  }

  function hasStructuralFilter() {
    return (
      state.filter.flag !== "all" ||
      state.filter.minRating > 0 ||
      state.filter.colors.size > 0 ||
      hasExifFilter()
    );
  }

  function selectLabel(select) {
    if (!select || !select.selectedOptions || !select.selectedOptions[0]) return "";
    const text = select.selectedOptions[0].textContent.replace(/\s+\(\d+\)\s*$/, "").trim();
    return text === "全部" ? "" : text;
  }

  function filterIsActive() {
    return (
      hasStructuralFilter() ||
      !!state.filter.query ||
      state.fileFilter !== "all" ||
      (state.project && (state.clientFilter !== "all" || state.sessionFilter !== "all"))
    );
  }

  function updateFileFilterUI() {
    if (!el.fileFilter) return;
    $$("#file-filter button").forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.file === state.fileFilter)
    );
  }

  function setFileFilter(value) {
    state.fileFilter = ["all", "jpg", "raw"].includes(value) ? value : "all";
    updateFileFilterUI();
    applyFilters({ resetScroll: true });
  }

  function toggleHideDuplicates() {
    state.hideDuplicates = !state.hideDuplicates;
    savePrefs();
    updateDuplicateUI();
    applyFilters({ resetScroll: true });
    const summary = duplicateSummary();
    toast(
      state.hideDuplicates
        ? "已隐藏 " + summary.duplicates + " 张同名副本（保留最外层那张）"
        : "已显示全部照片，包括重复副本",
      "success",
      2600
    );
  }

  function filterLabel() {
    const parts = [];
    if (state.fileFilter === "jpg") parts.push("JPG 视图");
    else if (state.fileFilter === "raw") parts.push("RAW 视图");
    if (state.filter.flag !== "all") parts.push(F.flagLabel(state.filter.flag));
    if (state.filter.minRating > 0) parts.push("★" + state.filter.minRating + "+");
    if (state.filter.colors.size > 0) {
      parts.push(
        Array.from(state.filter.colors)
          .map((c) => F.colorLabel(c))
          .join("/")
      );
    }
    if (state.filter.camera !== "all") parts.push("机身 " + selectLabel(el.filterCamera));
    if (state.filter.lens !== "all") parts.push("镜头 " + selectLabel(el.filterLens));
    if (state.filter.focal !== "all") parts.push("焦段 " + selectLabel(el.filterFocal));
    if (state.filter.aperture !== "all") parts.push("光圈 " + selectLabel(el.filterAperture));
    if (state.project && state.clientFilter !== "all") {
      parts.push("客户 " + (state.clientFilter === "unassigned" ? "未分配" : clientName(state.clientFilter)));
    }
    if (state.project && state.sessionFilter !== "all") {
      if (state.sessionFilter === "unassigned") {
        parts.push("未进场次");
      } else {
        const session = state.sessions.find((s) => s.id === state.sessionFilter);
        if (session) parts.push(session.name);
      }
    }
    if (state.filter.query) parts.push("“" + state.filter.query + "”");
    return parts.join(" · ");
  }

  function applyFilters(options) {
    const opts = options || {};
    const previousFocusIndex = state.visible.findIndex((p) => p.id === state.focusId);
    const previousCurrentIndex = state.visible.findIndex(
      (p) => p.id === state.currentLoupeId
    );
    const previousScroll = el.gridScroll.scrollTop;

    let list = state.photos.filter((photo) => {
      if (state.hideDuplicates && photo.dupOf) return false;
      if (state.fileFilter === "jpg" && !photo.hasJpg) return false;
      if (state.fileFilter === "raw" && !photo.hasRaw) return false;
      if (!F.matchesFilter(photo, state.filter, getMeta)) return false;
      if (state.project) {
        const session = sessionForPhoto(photo);
        if (state.clientFilter !== "all") {
          if (state.clientFilter === "unassigned") {
            if (session && session.clientId) return false;
          } else if (!session || session.clientId !== state.clientFilter) {
            return false;
          }
        }
        if (state.sessionFilter !== "all") {
          if (state.sessionFilter === "unassigned") {
            if (session) return false;
          } else if (!session || session.id !== state.sessionFilter) {
            return false;
          }
        }
      }
      return true;
    });
    list = F.sortPhotos(list, state.sort, getMeta);
    state.visible = list;
    state.visibleIndex = new Map(list.map((photo, index) => [photo.id, index]));
    const visibleIds = new Set(list.map((p) => p.id));

    if (state.selection.size) {
      const pruned = new Set(
        Array.from(state.selection).filter((id) => visibleIds.has(id))
      );
      if (pruned.size !== state.selection.size) state.selection = pruned;
    }

    if (!state.photos.length) {
      exitVirtualGrid();
      updateStartPanels();
      el.noResults.hidden = true;
      el.grid.hidden = true;
      el.grid.innerHTML = "";
      state.focusId = null;
      state.selection.clear();
    } else if (!list.length) {
      exitVirtualGrid();
      el.empty.hidden = true;
      if (el.projectEmpty) el.projectEmpty.hidden = true;
      el.noResults.hidden = false;
      el.grid.hidden = true;
      el.grid.innerHTML = "";
      state.focusId = null;
    } else {
      el.empty.hidden = true;
      if (el.projectEmpty) el.projectEmpty.hidden = true;
      el.noResults.hidden = true;
      el.grid.hidden = false;
      if (!visibleIds.has(state.focusId)) {
        if (previousFocusIndex >= 0) {
          const target = state.visible[Math.min(previousFocusIndex, state.visible.length - 1)];
          state.focusId = target ? target.id : null;
        } else {
          state.focusId = null;
        }
      }
      renderGrid(opts.resetScroll ? 0 : previousScroll);
    }

    if (state.view === "loupe") {
      if (!visibleIds.has(state.currentLoupeId)) {
        if (list.length) {
          const nextIndex = F.clamp(
            previousCurrentIndex >= 0 ? previousCurrentIndex : 0,
            0,
            list.length - 1
          );
          showPhoto(list[nextIndex].id, { select: true });
          renderFilmstrip();
        } else {
          closeLoupe();
          toast("当前照片已不在筛选结果中。");
        }
      } else {
        renderFilmstrip();
      }
    }

    updateStageHeader();
    updateSelectedCount();
    updateStatus();
    updateInspector();
    updateExportCountsIfOpen();
  }

  function updateStageHeader() {
    const active = filterIsActive();
    el.stageTitle.textContent = active
      ? state.filter.flag !== "all" &&
        !state.filter.minRating &&
        !state.filter.colors.size &&
        !state.filter.query &&
        !hasExifFilter()
        ? F.flagLabel(state.filter.flag)
        : "筛选结果"
      : "全部照片";
    el.stageCount.textContent = active
      ? state.visible.length + " / " + state.photos.length + " 张"
      : state.photos.length + " 张";
    el.statusFilter.textContent = active ? filterLabel() || "无筛选" : "无筛选";
  }

  function updateCounts() {
    const counts = { all: state.photos.length, pick: 0, none: 0, reject: 0 };
    const colors = { red: 0, yellow: 0, green: 0, blue: 0, purple: 0 };
    let marked = 0;
    for (const photo of state.photos) {
      const meta = getMeta(photo);
      if (meta.flag === "pick") counts.pick += 1;
      else if (meta.flag === "reject") counts.reject += 1;
      else counts.none += 1;
      if (meta.color && colors[meta.color] != null) colors[meta.color] += 1;
      if (meta.flag || meta.rating || meta.color) marked += 1;
    }
    el.countAll.textContent = counts.all;
    el.countPick.textContent = counts.pick;
    el.countNone.textContent = counts.none;
    el.countReject.textContent = counts.reject;
    el.markCount.textContent = marked;
    for (const key of Object.keys(colors)) {
      if (el.colorCounts[key]) el.colorCounts[key].textContent = colors[key];
    }
    if (state.folderName) {
      el.crumbCount.textContent = state.photos.length ? state.photos.length + " 张" : "";
    }
    updateDuplicateUI();
  }

  function updateDuplicateUI() {
    if (!el.dupToggle) return;
    const summary = duplicateSummary();
    el.dupToggle.classList.toggle("is-on", !!state.hideDuplicates);
    el.dupToggle.setAttribute("aria-pressed", state.hideDuplicates ? "true" : "false");
    el.dupToggle.disabled = summary.groups === 0;
    el.dupCount.textContent = summary.duplicates
      ? summary.duplicates + " 张"
      : "";
    el.dupToggle.title = summary.groups
      ? summary.groups +
        " 组同名副本，共 " +
        summary.duplicates +
        " 张多余；只保留最外层、无后缀的那张"
      : "没有发现同名重复照片";
  }

  function updateSelectedCount() {
    el.statusSelected.textContent = state.selection.size
      ? "已选 " + state.selection.size + (state.view === "loupe" ? " 张" : " 张")
      : "未选择";
    if (el.inspectorExportCount) {
      el.inspectorExportCount.textContent = state.selection.size
        ? "(" + state.selection.size + ")"
        : "";
    }
  }

  function updateStatus() {
    el.statusCount.textContent = state.photos.length + " 张照片";
    updateSelectedCount();
    updateStageHeader();
  }

  function updateFolderUI() {
    const name = state.folderName || "未打开";
    const projectMode = !!state.project;
    el.crumbName.textContent = state.photos.length || projectMode ? name : "未打开图库";
    el.folderName.textContent = name;
    if (projectMode) {
      el.folderSub.textContent = state.sourceName
        ? state.sourceName + " · " + state.photos.length + " 个镜头"
        : "项目已创建，等待素材源";
    } else {
      el.folderSub.textContent = state.photos.length
        ? state.photos.length + " 张照片 · " + (state.writable ? "可写" : "只读")
        : "选择一个照片文件夹";
    }
    el.btnExport.disabled = !state.photos.length;
    el.viewGrid.disabled = !state.photos.length;
    el.viewLoupe.disabled = !state.photos.length;
    if (state.photos.length) {
      el.crumbCount.textContent = state.photos.length + " 张";
    } else {
      el.crumbCount.textContent = "";
    }
  }

  function resetFilterUI() {
    $$(".filter-row").forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.flag === "all")
    );
    $$("#rating-filter button").forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.min === "0")
    );
    $$("#color-filter button").forEach((btn) => btn.classList.remove("is-active"));
    el.clearColors.classList.add("hidden");
    el.clearExif.classList.add("hidden");
    state.filter.colors.clear();
    state.filter.flag = "all";
    state.filter.minRating = 0;
    state.filter.query = "";
    state.filter.camera = "all";
    state.filter.lens = "all";
    state.filter.focal = "all";
    state.filter.aperture = "all";
    state.fileFilter = "all";
    state.clientFilter = "all";
    state.sessionFilter = "all";
    updateFileFilterUI();
    if (state.project) {
      renderClientList();
      updateSessionFilterOptions();
    }
    if (el.filterCamera) el.filterCamera.value = "all";
    if (el.filterLens) el.filterLens.value = "all";
    if (el.filterFocal) el.filterFocal.value = "all";
    if (el.filterAperture) el.filterAperture.value = "all";
    el.search.value = "";
  }

  function updateExifClearButton() {
    const active =
      state.filter.camera !== "all" ||
      state.filter.lens !== "all" ||
      state.filter.focal !== "all" ||
      state.filter.aperture !== "all";
    el.clearExif.classList.toggle("hidden", !active);
  }

  function setExifFilter(kind, value) {
    state.filter[kind] = value || "all";
    updateExifClearButton();
    applyFilters({ resetScroll: true });
  }

  function clearExifFilters() {
    state.filter.camera = "all";
    state.filter.lens = "all";
    state.filter.focal = "all";
    state.filter.aperture = "all";
    el.filterCamera.value = "all";
    el.filterLens.value = "all";
    el.filterFocal.value = "all";
    el.filterAperture.value = "all";
    updateExifClearButton();
    applyFilters({ resetScroll: true });
  }

  function clearAllFilters() {
    resetFilterUI();
    applyFilters({ resetScroll: true });
  }

  function setFlagFilter(flag) {
    state.filter.flag = flag;
    $$(".filter-row").forEach((btn) =>
      btn.classList.toggle("is-active", btn.dataset.flag === flag)
    );
    applyFilters({ resetScroll: true });
    updateMenuState();
  }

  function setRatingFilter(min) {
    state.filter.minRating = Number(min) || 0;
    $$("#rating-filter button").forEach((btn) =>
      btn.classList.toggle("is-active", Number(btn.dataset.min) === state.filter.minRating)
    );
    applyFilters({ resetScroll: true });
  }

  function toggleColorFilter(color) {
    if (state.filter.colors.has(color)) state.filter.colors.delete(color);
    else state.filter.colors.add(color);
    $$("#color-filter button").forEach((btn) =>
      btn.classList.toggle("is-active", state.filter.colors.has(btn.dataset.color))
    );
    el.clearColors.classList.toggle("hidden", state.filter.colors.size === 0);
    applyFilters({ resetScroll: true });
  }

  function setQuery(value) {
    state.filter.query = String(value || "").trim().toLowerCase();
    applyFilters({ resetScroll: true });
  }

  /* ============================================================
     EXIF
     ============================================================ */

  let exifRun = null;
  let exifEpoch = 0;
  let exifFacetTimer = 0;

  async function parsePhotoExif(photo) {
    if (!photo) return null;
    if (photo.exifState === "ready" || photo.exifState === "empty") return photo.exif;
    if (photo.exifPromise) return photo.exifPromise;
    photo.exifState = "loading";
    photo.exifPromise = (async () => {
      let exif = null;
      try {
        const headerSize = photo.hasRaw ? 640 * 1024 : 256 * 1024;
        const header = await photo.file.slice(0, headerSize).arrayBuffer();
        exif = F.parseExif(header);
        if (!exif && photo.rawFile && photo.rawFile !== photo.file) {
          const rawHeader = await photo.rawFile.slice(0, 640 * 1024).arrayBuffer();
          exif = F.parseExif(rawHeader);
        }
        if (!exif && photo.isRaw && photo.previewRange) {
          const preview = rawPreviewBlob(photo);
          if (preview) {
            const previewHeader = await preview.slice(0, 256 * 1024).arrayBuffer();
            exif = F.parseExif(previewHeader);
          }
        }
      } catch (err) {
        exif = null;
      }
      if (!photo.exif && exif) photo.exif = exif;
      photo.exifState = photo.exif ? "ready" : "empty";
      photo.exifPromise = null;
      if (photo.exif) scheduleExifFacetRefresh();
      if (state.selection.has(photo.id)) updateInspector();
      return photo.exif;
    })();
    return photo.exifPromise;
  }

  async function parsePreviewExif(photo, blob) {
    if (!photo || !blob || photo.previewExifTried) return;
    photo.previewExifTried = true;
    try {
      const header = await blob.slice(0, 256 * 1024).arrayBuffer();
      const exif = F.parseExif(header);
      if (!exif) return;
      const merged = { ...(photo.exif || {}) };
      for (const key of Object.keys(exif)) {
        if (merged[key] == null || merged[key] === "") merged[key] = exif[key];
      }
      photo.exif = merged;
      photo.exifState = "ready";
      if (state.selection.has(photo.id)) updateInspector();
      scheduleExifFacetRefresh();
    } catch (err) {
      /* ignore */
    }
  }

  function startExifScan(photos) {
    if (!photos || !photos.length) return;
    stopExifScan(false);
    const run = {
      photos,
      queue: photos.slice(),
      active: 0,
      done: 0,
      total: photos.length,
      finished: false,
      epoch: ++exifEpoch
    };
    exifRun = run;
    state.exifScan = run;
    updateExifScanUI();
    pumpExif(run);
  }

  function pumpExif(run) {
    if (exifRun !== run) return;
    while (run.active < 3 && run.queue.length) {
      const photo = run.queue.shift();
      if (photo.exifState !== "idle") {
        run.done += 1;
        continue;
      }
      run.active += 1;
      parsePhotoExif(photo).finally(() => {
        run.active -= 1;
        run.done += 1;
        if (exifRun === run) {
          if (run.done % 8 === 0 || run.done === run.total) updateExifScanUI();
        }
        if (exifRun === run) {
          if (run.done >= run.total) finishExifScan(run);
          else pumpExif(run);
        }
      });
    }
    if (exifRun === run && run.active === 0 && run.done >= run.total) {
      finishExifScan(run);
    }
  }

  function finishExifScan(run) {
    if (!run || run.finished) return;
    run.finished = true;
    if (exifRun !== run) return;
    refreshExifFacets();
    updateExifScanUI();
    if (state.project && state.photos.length && !state.sessions.length) {
      const suggested = suggestSessions();
      if (suggested.length) {
        state.sessions = suggested;
        scheduleSave();
        updateProjectUI();
        toast(
          "已按拍摄时间建议 " +
            suggested.length +
            " 个场次，客户按顺序预填，可在「场次与客户」里调整。",
          "success",
          5200
        );
      }
    }
    if (exifDependentActive() || (state.project && state.sessions.length)) {
      applyFilters({ resetScroll: false });
    }
  }

  function stopExifScan(clearUI) {
    exifEpoch += 1;
    exifRun = null;
    state.exifScan = null;
    clearTimeout(exifFacetTimer);
    if (clearUI !== false && el.exifScanState) el.exifScanState.textContent = "";
  }

  function updateExifScanUI() {
    if (!el.exifScanState) return;
    const run = exifRun;
    if (!run) {
      el.exifScanState.textContent = "";
      return;
    }
    if (run.done < run.total) {
      el.exifScanState.textContent = "读取中 " + run.done + "/" + run.total;
    } else {
      const count = run.photos.reduce((n, p) => n + (p.exif ? 1 : 0), 0);
      el.exifScanState.textContent = "已识别 " + count + "/" + run.total;
    }
  }

  function exifDependentActive() {
    if (["camera", "lens", "focal", "aperture"].some((k) => state.filter[k] !== "all")) {
      return true;
    }
    return [
      "taken-desc",
      "taken-asc",
      "focal-asc",
      "focal-desc",
      "aperture-asc",
      "aperture-desc"
    ].includes(state.sort);
  }

  function refreshExifFacets() {
    const cameras = new Map();
    const lenses = new Map();
    for (const photo of state.photos) {
      const exif = photo.exif;
      if (!exif) continue;
      if (exif.camera) cameras.set(exif.camera, (cameras.get(exif.camera) || 0) + 1);
      if (exif.lens) lenses.set(exif.lens, (lenses.get(exif.lens) || 0) + 1);
    }
    fillFacetSelect(el.filterCamera, cameras, state.filter.camera);
    fillFacetSelect(el.filterLens, lenses, state.filter.lens);
    updateExifClearButton();
  }

  function fillFacetSelect(select, counts, selected) {
    if (!select) return;
    const current = selected || "all";
    const values = Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], "zh-Hans-CN", { numeric: true });
    });
    select.innerHTML = "";
    const add = (value, label) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    };
    add("all", "全部");
    add("unknown", "未知");
    for (const [value, count] of values) {
      add(value, value + " (" + count + ")");
    }
    if (current !== "all" && current !== "unknown" && !counts.has(current)) {
      add(current, current);
    }
    select.value = current;
  }

  function resetExifFacets() {
    for (const select of [el.filterCamera, el.filterLens]) {
      if (!select) continue;
      select.innerHTML = "";
      const all = document.createElement("option");
      all.value = "all";
      all.textContent = "全部";
      select.appendChild(all);
      const unknown = document.createElement("option");
      unknown.value = "unknown";
      unknown.textContent = "未知";
      select.appendChild(unknown);
      select.value = "all";
    }
    if (el.filterFocal) el.filterFocal.value = "all";
    if (el.filterAperture) el.filterAperture.value = "all";
    updateExifClearButton();
  }

  function scheduleExifFacetRefresh() {
    clearTimeout(exifFacetTimer);
    exifFacetTimer = window.setTimeout(() => {
      if (!state.photos.length) return;
      refreshExifFacets();
      if (state.exifScan) updateExifScanUI();
      if (exifDependentActive()) applyFilters({ resetScroll: false });
    }, 300);
  }

  /* ============================================================
     thumbnails
     ============================================================ */

  function ensureGridObserver() {
    if (thumbObserver) thumbObserver.disconnect();
    thumbObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target;
          thumbObserver.unobserve(img);
          const card = img.closest(".card");
          const photo = card ? state.byId.get(card.dataset.id) : null;
          if (photo) requestThumb(photo, img);
        }
      },
      { root: el.gridScroll, rootMargin: "1400px 0px" }
    );
  }

  function ensureFilmObserver() {
    if (filmObserver) filmObserver.disconnect();
    filmObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const img = entry.target;
          filmObserver.unobserve(img);
          const item = img.closest(".film-item");
          const photo = item ? state.byId.get(item.dataset.id) : null;
          if (photo) requestThumb(photo, img);
        }
      },
      { root: el.filmstrip, rootMargin: "300px 300px" }
    );
  }

  function observeGridThumbs(root) {
    if (!thumbObserver) ensureGridObserver();
    const imgs = [];
    if (Array.isArray(root)) {
      for (const card of root) {
        Array.from(card.querySelectorAll("img[data-thumb]")).forEach((img) => imgs.push(img));
      }
    } else {
      const scope = root || el.grid;
      Array.from(scope.querySelectorAll("img[data-thumb]")).forEach((img) => imgs.push(img));
      if (scope.matches && scope.matches("img[data-thumb]")) imgs.push(scope);
    }
    for (const img of imgs) thumbObserver.observe(img);
  }

  function observeFilmThumbs() {
    if (!filmObserver) ensureFilmObserver();
    $$("#filmstrip img[data-thumb]").forEach((img) => filmObserver.observe(img));
  }

  function rawStateLabel(photo) {
    if (!photo || !photo.isRaw) return "无预览";
    if (photo.rawState === "failed") return "无内嵌预览";
    if (photo.rawState === "loading") return "提取中…";
    if (photo.rawState === "ready") return "载入预览…";
    return "内嵌预览";
  }

  function updateRawPlaceholder(photo) {
    if (!photo || !photo.isRaw) return;
    const card = state.cardMap.get(photo.id);
    if (!card || card.classList.contains("is-loaded")) return;
    let fallback = card.querySelector(".thumb-fallback");
    if (!fallback) {
      const wrap = card.querySelector(".thumb-wrap");
      if (!wrap) return;
      wrap.insertAdjacentHTML("beforeend", fallbackMarkup("RAW", rawStateLabel(photo)));
      return;
    }
    const label = fallback.querySelector("span");
    if (label) label.textContent = rawStateLabel(photo);
  }

  function setRawState(photo, next) {
    if (!photo) return;
    photo.rawState = next;
    updateRawPlaceholder(photo);
    if (state.selection.has(photo.id)) {
      updateInspector();
    }
  }

  function rawPreviewBlob(photo) {
    if (!photo || !photo.isRaw || !photo.previewRange) return null;
    return (photo.rawFile || photo.file).slice(
      photo.previewRange.start,
      photo.previewRange.end,
      "image/jpeg"
    );
  }

  function ensureRawPreview(photo) {
    if (!photo || !photo.isRaw) return Promise.reject(new Error("not raw"));
    if (photo.previewRange) return Promise.resolve(rawPreviewBlob(photo));
    if (photo.rawPromise) return photo.rawPromise;

    setRawState(photo, "loading");
    photo.rawPromise = new Promise((resolve, reject) => {
      rawQueue.push({ photo, resolve, reject });
      pumpRawPreviews();
    });
    return photo.rawPromise;
  }

  function pumpRawPreviews() {
    // RAW 内嵌预览主要是 IO，串行 1 路太慢；开 2 路能明显加快 RAW 首屏出图。
    const limit = 2;
    while (rawActive < limit && rawQueue.length) {
      const task = rawQueue.shift();
      rawActive += 1;
      F.extractEmbeddedJpeg(task.photo.rawFile || task.photo.file)
        .then((result) => {
          task.photo.previewRange = { start: result.start, end: result.end };
          task.photo.previewWidth = result.width;
          task.photo.previewHeight = result.height;
          task.photo.width = result.width;
          task.photo.height = result.height;
          setRawState(task.photo, "ready");
          parsePreviewExif(task.photo, result.blob);
          task.resolve(result.blob);
        })
        .catch((err) => {
          task.photo.rawPreviewError = err;
          setRawState(task.photo, "failed");
          task.reject(err);
        })
        .finally(() => {
          if (task.photo.rawState === "ready") {
            task.photo.rawPromise = null;
          }
          rawActive -= 1;
          pumpRawPreviews();
        });
    }
  }

  function requestThumb(photo, img) {
    if (!photo) return;
    if (photo.thumbUrl) {
      applyThumb(img, photo.thumbUrl);
      return;
    }
    if (!photo.previewable) return;
    if (photo.isRaw && photo.rawState === "idle") {
      setRawState(photo, "loading");
    }
    if (!photo.thumbPromise) {
      photo.thumbPromise = enqueueThumb(photo);
    }
    photo.thumbPromise
      .then((url) => {
        applyThumb(img, url);
      })
      .catch(() => {
        photo.thumbError = true;
        if (photo.isRaw) setRawState(photo, "failed");
        markThumbFailure(img, photo);
      });
  }

  function applyThumb(img, url) {
    if (!img || !img.isConnected) return;
    img.onload = () => {
      img.classList.add("loaded");
      const card = img.closest(".card");
      if (card) {
        card.classList.add("is-loaded");
        const skel = card.querySelector(".thumb-skel");
        if (skel) skel.remove();
        const fallback = card.querySelector(".thumb-fallback");
        if (fallback) fallback.remove();
      }
      const film = img.closest(".film-item");
      if (film) film.classList.add("is-loaded");
    };
    img.onerror = () => markThumbFailure(img);
    img.src = url;
    img.removeAttribute("data-thumb");
    if (img.complete && img.naturalWidth) {
      img.classList.add("loaded");
      const card = img.closest(".card");
      if (card) {
        card.classList.add("is-loaded");
        const skel = card.querySelector(".thumb-skel");
        if (skel) skel.remove();
        const fallback = card.querySelector(".thumb-fallback");
        if (fallback) fallback.remove();
      }
    }
  }

  function markThumbFailure(img, photo) {
    if (!img || !img.isConnected) return;
    const target = photo || (img.closest(".card") ? state.byId.get(img.closest(".card").dataset.id) : null);
    const wrap = img.closest(".thumb-wrap");
    const film = img.closest(".film-item");
    const card = img.closest(".card");
    img.remove();
    if (card) card.classList.add("thumb-failed");
    if (wrap) {
      const skel = wrap.querySelector(".thumb-skel");
      if (skel) skel.remove();
      const fallback = wrap.querySelector(".thumb-fallback");
      const label = target && target.isRaw ? "无内嵌预览" : "无预览";
      if (fallback) {
        const span = fallback.querySelector("span");
        if (span) span.textContent = label;
      } else {
        const ext = target ? target.ext || "" : card ? (state.byId.get(card.dataset.id) || {}).ext || "" : "";
        const name = target && target.isRaw ? "RAW" : ext;
        wrap.insertAdjacentHTML("beforeend", fallbackMarkup(name, label));
      }
    }
    if (film) {
      film.classList.add("is-missing");
      if (!film.querySelector("img") && !film.querySelector(".film-ext")) {
        const span = document.createElement("span");
        span.className = "film-ext";
        span.textContent = target && target.isRaw ? "RAW" : (target && target.ext ? target.ext.toUpperCase() : "?");
        film.appendChild(span);
      }
    }
  }

  function enqueueThumb(photo) {
    return new Promise((resolve, reject) => {
      thumbQueue.push({ photo: photo, resolve: resolve, reject: reject });
      pumpThumbs();
    });
  }

  /* ---------- 缩略图：优先级队列 + 并发 + 磁盘缓存 ---------- */

  const THUMB_DB = "furix-thumbs";
  const THUMB_DB_STORE = "blobs";
  const THUMB_DB_MAX = 6000;
  let thumbDbPromise = null;
  let thumbDbBroken = false;
  let thumbDbWrites = 0;

  function thumbKey(photo) {
    if (!photo) return "";
    const meta = state.meta.get(photo.id);
    const rot = meta ? Number(meta.rotation) || 0 : 0;
    const mir = meta && meta.mirror ? 1 : 0;
    return (
      photo.id +
      "|" +
      (photo.size || 0) +
      "|" +
      (photo.mtime || 0) +
      "|" +
      state.thumbSize +
      "|r" +
      rot +
      "|m" +
      mir
    );
  }

  function thumbDb() {
    if (thumbDbPromise) return thumbDbPromise;
    thumbDbPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const request = indexedDB.open(THUMB_DB, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(THUMB_DB_STORE)) {
            const store = db.createObjectStore(THUMB_DB_STORE, { keyPath: "key" });
            store.createIndex("at", "at");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
    return thumbDbPromise;
  }

  // 缓存永远不能挡路：打不开（隐私模式/被策略禁用）就立刻放弃，直接生成。
  async function thumbDbReady() {
    if (thumbDbBroken) return null;
    const db = await Promise.race([
      thumbDb(),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 400))
    ]);
    if (db === "timeout" || !db) {
      thumbDbBroken = true;
      return null;
    }
    return db;
  }

  async function thumbCacheGet(key) {
    const db = await thumbDbReady();
    if (!db) return null;
    const result = await Promise.race([
      new Promise((resolve) => {
        try {
          const tx = db.transaction(THUMB_DB_STORE, "readonly");
          const req = tx.objectStore(THUMB_DB_STORE).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (err) {
          resolve(null);
        }
      }),
      new Promise((resolve) => setTimeout(() => resolve(null), 300))
    ]);
    return result || null;
  }

  async function thumbCachePut(key, blob, width, height) {
    if (thumbDbBroken) return;
    const db = await thumbDbReady();
    if (!db || !blob) return;
    try {
      const tx = db.transaction(THUMB_DB_STORE, "readwrite");
      const store = tx.objectStore(THUMB_DB_STORE);
      store.put({ key: key, blob: blob, width: width || 0, height: height || 0, at: Date.now() });
      thumbDbWrites += 1;
      if (thumbDbWrites % 200 === 0) {
        const countReq = store.count();
        countReq.onsuccess = () => {
          if (countReq.result <= THUMB_DB_MAX) return;
          const cursorReq = store.index("at").openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            cursor.delete();
            cursor.continue();
          };
        };
      }
    } catch (err) {
      /* 缓存失败不影响显示 */
    }
  }

  function thumbConcurrency() {
    const cores = Number(navigator.hardwareConcurrency) || 4;
    return Math.min(6, Math.max(3, cores - 1));
  }

  function thumbAnchorIndex() {
    if (virtual.active && virtual.startRow >= 0) {
      return Math.max(0, virtual.startRow * (virtual.columns || 1));
    }
    const focus = state.focusId && state.visibleIndex.get(state.focusId);
    return typeof focus === "number" ? focus : 0;
  }

  function pumpThumbs() {
    const limit = thumbConcurrency();
    while (thumbActive < limit && thumbQueue.length) {
      const anchor = thumbAnchorIndex();
      let best = 0;
      let bestScore = Infinity;
      for (let i = 0; i < thumbQueue.length; i += 1) {
        const idx = state.visibleIndex.get(thumbQueue[i].photo.id);
        const score = idx == null ? 1e9 : Math.abs(idx - anchor);
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      const task = thumbQueue.splice(best, 1)[0];
      thumbActive += 1;
      buildPhotoThumb(task.photo)
        .then((result) => {
          const url = URL.createObjectURL(result.blob);
          registerThumbUrl(task.photo, url);
          task.photo.thumbUrl = url;
          task.photo.width = result.width;
          task.photo.height = result.height;
          if (state.selection.has(task.photo.id) && state.focusId === task.photo.id) {
            refreshInspectorImage(task.photo);
            updateInspectorMeta();
          }
          task.resolve(url);
        })
        .catch(() => {
          if (task.photo.isRaw) {
            if (task.photo.previewRange) {
              const url = URL.createObjectURL(rawPreviewBlob(task.photo));
              registerThumbUrl(task.photo, url);
              task.photo.thumbUrl = url;
              task.resolve(url);
              return;
            }
            task.reject(new Error("RAW 缩略图失败"));
            return;
          }
          const url = URL.createObjectURL(task.photo.file);
          registerThumbUrl(task.photo, url);
          task.photo.thumbUrl = url;
          task.resolve(url);
        })
        .finally(() => {
          thumbActive -= 1;
          pumpThumbs();
        });
    }
  }

  const thumbDebug = { start: 0, cacheHit: 0, cacheMiss: 0, decoded: 0 };

  async function buildPhotoThumb(photo) {
    thumbDebug.start += 1;
    const key = thumbKey(photo);
    const cached = await thumbCacheGet(key);
    if (cached && cached.blob) {
      thumbDebug.cacheHit += 1;
      return { blob: cached.blob, width: cached.width || 0, height: cached.height || 0 };
    }
    thumbDebug.cacheMiss += 1;
    let source = photo.file;
    if (photo.isRaw) {
      source = await ensureRawPreview(photo);
    }
    // 显示尺寸 ×1.4 已经足够清晰；比 ×1.7 少 decode 和编码量。
    const edge = Math.max(240, Math.min(420, Math.round(state.thumbSize * 1.4)));
    const meta = state.meta.get(photo.id);
    const result = await F.makeThumbnail(source, edge, {
      rotation: meta ? Number(meta.rotation) || 0 : 0,
      mirror: !!(meta && meta.mirror)
    });
    thumbDebug.decoded += 1;
    thumbCachePut(key, result.blob, result.width, result.height);
    return result;
  }

  /* 空闲时预取下一屏，滚动到时已经是现成的 */
  let thumbPrefetchTimer = 0;
  function scheduleThumbPrefetch() {
    if (!virtual.active) return;
    clearTimeout(thumbPrefetchTimer);
    thumbPrefetchTimer = window.setTimeout(() => {
      if (!virtual.active || thumbQueue.length > 30) return;
      const metrics = gridMetrics();
      const start = Math.max(0, (virtual.endRow + 1) * metrics.columns);
      const span = Math.min(metrics.columns * 6, 48);
      const total = state.visible.length;
      for (let i = start; i < start + span && i < total; i += 1) {
        const photo = state.visible[i];
        if (!photo || photo.thumbUrl || photo.thumbPromise) continue;
        photo.thumbPromise = enqueueThumb(photo).catch(() => {
          photo.thumbPromise = null;
        });
      }
    }, 220);
  }

  function registerThumbUrl(photo, url) {
    if (!photo || !url) return;
    state.thumbUrls.set(photo.id, url);
    while (state.thumbUrls.size > THUMB_CACHE_MAX) {
      const oldestId = state.thumbUrls.keys().next().value;
      if (oldestId == null || oldestId === photo.id) break;
      const oldestPhoto = state.byId.get(oldestId);
      // 还在屏幕上的卡片不能回收，否则图会闪白。
      if (state.cardMap && state.cardMap.has(oldestId)) {
        state.thumbUrls.delete(oldestId);
        state.thumbUrls.set(oldestId, state.thumbUrls.get(oldestId) || "");
        if (state.thumbUrls.size > THUMB_CACHE_MAX * 2) break;
        continue;
      }
      const oldUrl = state.thumbUrls.get(oldestId);
      state.thumbUrls.delete(oldestId);
      if (oldUrl && oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
      if (oldestPhoto) {
        oldestPhoto.thumbUrl = null;
        oldestPhoto.thumbPromise = null;
      }
    }
  }

  function fallbackMarkup(ext, label) {
    return (
      '<div class="thumb-fallback"><strong>' +
      F.escapeHtml(String(ext || "?").toUpperCase()) +
      "</strong><span>" +
      F.escapeHtml(label || "无预览") +
      "</span></div>"
    );
  }

  /* ============================================================
     grid rendering
     ============================================================ */

  function starsMarkup(rating) {
    let out = "";
    for (let i = 1; i <= 5; i += 1) {
      out += '<span class="' + (i <= rating ? "on" : "") + '">★</span>';
    }
    return out;
  }

  function cardMarkup(photo, index, box) {
    const meta = getMeta(photo);
    const classes = ["card"];
    if (meta.flag === "pick") classes.push("is-pick");
    if (meta.flag === "reject") classes.push("is-reject");
    if (state.selection.has(photo.id)) classes.push("is-selected");
    if (state.focusId === photo.id) classes.push("is-focused");
    if (photo.thumbUrl) classes.push("is-loaded");

    let media = "";
    if (photo.thumbUrl) {
      media =
        '<img class="thumb loaded" src="' +
        F.escapeHtml(photo.thumbUrl) +
        '" alt="" draggable="false">';
    } else if (photo.isRaw) {
      if (photo.thumbError || photo.rawState === "failed") {
        media = fallbackMarkup("RAW", "无内嵌预览");
      } else {
        media =
          '<img class="thumb" data-thumb alt="" draggable="false">' +
          fallbackMarkup("RAW", rawStateLabel(photo));
      }
    } else if (!photo.previewable || photo.thumbError) {
      media = fallbackMarkup(photo.ext, photo.thumbError ? "无法预览" : "无预览");
    } else {
      media = '<div class="thumb-skel"></div><img class="thumb" data-thumb alt="" draggable="false">';
    }

    let flag = "";
    if (meta.flag === "pick") flag = '<span class="thumb-flag pick" aria-hidden="true">✓</span>';
    else if (meta.flag === "reject") flag = '<span class="thumb-flag reject" aria-hidden="true">×</span>';

    const color = meta.color
      ? '<span class="thumb-color ' + meta.color + '" aria-hidden="true"></span>'
      : "";

    const rawChip = photo.hasRaw
      ? '<span class="raw-chip" aria-hidden="true">' +
        (photo.hasJpg ? "JPG+RAW" : "RAW") +
        "</span>"
      : "";
    const clientId = state.project ? clientForPhoto(photo) : null;
    const clientChip = clientId
      ? '<span class="thumb-client" aria-hidden="true">' +
        F.escapeHtml(clientName(clientId)) +
        "</span>"
      : "";
    const returnChip =
      state.project && returnedIdSet().has(photo.id)
        ? '<span class="thumb-return" aria-hidden="true">回</span>'
        : "";
    const dupChip =
      photo.dupGroupSize > 1
        ? '<span class="thumb-dup" aria-hidden="true">' +
          (photo.dupOf ? "重" : "重 " + photo.dupGroupSize) +
          "</span>"
        : "";

    return (
      '<article class="' +
      classes.join(" ") +
      '" data-id="' +
      F.escapeHtml(photo.id) +
      '" tabindex="-1" role="option" aria-selected="' +
      (state.selection.has(photo.id) ? "true" : "false") +
      '" title="' +
      F.escapeHtml(photo.relPath || photo.name) +
      '"' +
      (box
        ? ' style="left:' +
          box.left +
          "px;top:" +
          box.top +
          "px;width:" +
          box.width +
          'px"'
        : "") +
      ">" +
      '<div class="thumb-wrap">' +
      media +
      rawChip +
      returnChip +
      dupChip +
      clientChip +
      flag +
      color +
      '<span class="thumb-index">' +
      String(index + 1).padStart(2, "0") +
      "</span>" +
      "</div>" +
      '<div class="card-meta">' +
      '<span class="card-name">' +
      F.escapeHtml(photo.name) +
      "</span>" +
      '<span class="card-stars" aria-hidden="true">' +
      starsMarkup(Number(meta.rating) || 0) +
      "</span>" +
      "</div>" +
      "</article>"
    );
  }

  /* ============================================================
     virtual grid（大图库只渲染可视区，避免一次性建上万张卡片）
     ============================================================ */


  function gridMetrics() {
    const thumb = state.thumbSize;
    const width = el.grid.clientWidth || el.gridScroll.clientWidth || 800;
    const columns = Math.max(1, Math.floor((width - GRID_PAD_X * 2 + GRID_GAP) / (thumb + GRID_GAP)));
    const cardHeight = virtual.cardHeight > 40 ? virtual.cardHeight : thumb + 22;
    return {
      thumb: thumb,
      columns: columns,
      cardHeight: cardHeight,
      rowHeight: cardHeight + GRID_GAP
    };
  }

  function virtualTotalHeight(metrics, total) {
    const rows = Math.ceil(total / metrics.columns);
    if (!rows) return GRID_PAD_TOP + GRID_PAD_BOTTOM;
    return GRID_PAD_TOP + rows * metrics.rowHeight - GRID_GAP + GRID_PAD_BOTTOM;
  }

  function renderVirtualGrid(scrollTop) {
    el.grid.classList.add("is-virtual");
    el.grid.innerHTML = "";
    state.cardMap = new Map();
    virtual.startRow = -1;
    virtual.endRow = -1;
    el.grid.style.height = virtualTotalHeight(gridMetrics(), state.visible.length) + "px";
    if (scrollTop != null) el.gridScroll.scrollTop = scrollTop;
    updateVirtualWindow(true);
  }

  function updateVirtualWindow(force) {
    if (!virtual.active) return;
    const metrics = gridMetrics();
    const total = state.visible.length;
    const rowHeight = metrics.rowHeight;
    const columns = metrics.columns;
    const thumb = metrics.thumb;
    const scrollTop = el.gridScroll.scrollTop;
    const viewH = el.gridScroll.clientHeight || 600;
    const visibleRows = Math.max(1, Math.ceil(viewH / rowHeight));
    // 上下各预留两屏，快速甩动时窗口也盖得住。
    const overscan = Math.max(3, visibleRows * 2);
    const rows = Math.ceil(total / columns);
    let startRow = Math.max(0, Math.floor((scrollTop - GRID_PAD_TOP) / rowHeight) - overscan);
    let endRow = Math.min(rows - 1, startRow + visibleRows + overscan * 2);
    if (endRow < startRow) endRow = startRow;

    const layoutChanged = force || columns !== virtual.columns;
    if (
      !layoutChanged &&
      startRow === virtual.startRow &&
      endRow === virtual.endRow
    ) {
      return;
    }
    virtual.startRow = startRow;
    virtual.endRow = endRow;
    virtual.columns = columns;

    const from = startRow * columns;
    const to = Math.min(total, (endRow + 1) * columns);
    const keep = new Set();
    const wanted = [];
    for (let i = from; i < to; i += 1) {
      const photo = state.visible[i];
      if (!photo) continue;
      keep.add(photo.id);
      wanted.push({ photo: photo, index: i });
    }

    // 只摘掉滚出窗口的卡片；留在窗口里的原封不动，图片不会重载闪白。
    for (const [id, card] of Array.from(state.cardMap.entries())) {
      if (keep.has(id)) continue;
      card.remove();
      state.cardMap.delete(id);
    }

    const fragment = document.createDocumentFragment();
    const fresh = [];
    for (const entry of wanted) {
      const row = Math.floor(entry.index / columns);
      const col = entry.index % columns;
      const left = GRID_PAD_X + col * (thumb + GRID_GAP);
      const top = GRID_PAD_TOP + row * rowHeight;
      let card = state.cardMap.get(entry.photo.id);
      if (!card) {
        const template = document.createElement("template");
        template.innerHTML = cardMarkup(entry.photo, entry.index, {
          left: left,
          top: top,
          width: thumb
        });
        card = template.content.firstElementChild;
        if (!card) continue;
        state.cardMap.set(entry.photo.id, card);
        fragment.appendChild(card);
        fresh.push(card);
      } else if (layoutChanged) {
        card.style.left = left + "px";
        card.style.top = top + "px";
        card.style.width = thumb + "px";
      }
    }
    if (fragment.childNodes.length) el.grid.appendChild(fragment);
    if (fresh.length) observeGridThumbs(fresh);
    primeGridThumbs();
    scheduleThumbPrefetch();
    syncSelectionUI(false);
    if (!(virtual.cardHeight > 40)) {
      // 只接受「像一张卡片」的测量值；量到 0 或离谱值时按网格尺寸推算，
      // 绝不让行高塌成一条线（那会让整屏变成细条纹）。
      const first = el.grid.querySelector(".card");
      const measured = first ? first.offsetHeight : 0;
      const thumb = state.thumbSize;
      virtual.cardHeight =
        measured >= thumb && measured <= thumb * 2.4 ? measured : thumb + 22;
      el.grid.style.height = virtualTotalHeight(gridMetrics(), state.visible.length) + "px";
      if (measured < thumb) {
        // 量出来不像卡片：按推算值重排一次
        updateVirtualWindow(true);
      }
    }
    // 最后一道保险：万一卡片还是塌了（高度远小于缩略图），
    // 宁可退回全量渲染慢一点，也不能给你一屏细条纹。
    if (virtual.cardHeight > 40) {
      const probe = el.grid.querySelector(".card");
      if (probe && probe.getBoundingClientRect().height < state.thumbSize * 0.6) {
        virtual.disabled = true;
        virtual.active = false;
        exitVirtualGrid();
        renderGrid(el.gridScroll.scrollTop);
      }
    }
  }

  function windowOutOfView() {
    if (!virtual.active) return false;
    const metrics = gridMetrics();
    const viewTop = el.gridScroll.scrollTop;
    const viewBottom = viewTop + (el.gridScroll.clientHeight || 600);
    // 用卡片的真实底边算，而不是「行高 × 行数」——行高含间距，会高估覆盖范围。
    const windowTop = GRID_PAD_TOP + virtual.startRow * metrics.rowHeight;
    const windowBottom = GRID_PAD_TOP + virtual.endRow * metrics.rowHeight + metrics.cardHeight;
    return windowBottom < viewTop + 60 || windowTop > viewBottom - 60;
  }

  function onGridScroll() {
    if (!virtual.active) return;
    virtual.scrollDirty = true;
    // 跳跃式滚动（拖滚动条、触控板甩动）时窗口可能已经盖不住视口，
    // 这种情况不等下一帧，立刻补渲染，避免出现白屏/半截。
    if (windowOutOfView()) {
      updateVirtualWindow(false);
      if (windowOutOfView()) updateVirtualWindow(true);
    }
    if (virtual.scrollRaf) return;
    virtual.scrollRaf = requestAnimationFrame(() => {
      virtual.scrollRaf = 0;
      if (!virtual.active) return;
      virtual.scrollDirty = false;
      updateVirtualWindow(false);
      if (windowOutOfView()) updateVirtualWindow(true);
    });
    clearTimeout(virtual.settleTimer);
    virtual.settleTimer = window.setTimeout(() => {
      if (!virtual.active) return;
      if (windowOutOfView()) updateVirtualWindow(true);
    }, 140);
  }

  function onGridResize() {
    if (!virtual.active) return;
    clearTimeout(virtual.resizeTimer);
    virtual.resizeTimer = window.setTimeout(() => {
      if (!virtual.active) return;
      el.grid.style.height = virtualTotalHeight(gridMetrics(), state.visible.length) + "px";
      updateVirtualWindow(true);
    }, 120);
  }

  function exitVirtualGrid() {
    virtual.active = false;
    virtual.startRow = -1;
    virtual.endRow = -1;
    el.grid.classList.remove("is-virtual");
    el.grid.style.height = "";
  }

  function renderGrid(scrollTop) {
    if (thumbObserver) thumbObserver.disconnect();
    virtual.active = !virtual.disabled && state.visible.length > virtual.threshold;
    if (virtual.active) {
      el.grid.innerHTML = "";
      el.grid.hidden = false;
      renderVirtualGrid(scrollTop);
      el.grid.hidden = !state.visible.length;
      return;
    }
    exitVirtualGrid();
    const html = state.visible.map((photo, index) => cardMarkup(photo, index)).join("");
    el.grid.innerHTML = html;
    state.cardMap = new Map(
      Array.from(el.grid.querySelectorAll(".card")).map((card) => [card.dataset.id, card])
    );
    el.grid.hidden = !state.visible.length;
    observeGridThumbs();
    primeGridThumbs();
    el.gridScroll.scrollTop = scrollTop == null ? el.gridScroll.scrollTop : scrollTop;
    syncSelectionUI(false);
  }

  function primeGridThumbs() {
    requestAnimationFrame(() => {
      const view = el.gridScroll.getBoundingClientRect();
      const cards = $$("#grid .card").slice(0, 60);
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.bottom < view.top - 700 || rect.top > view.bottom + 700) return;
        const img = card.querySelector("img[data-thumb]");
        if (!img) return;
        const photo = state.byId.get(card.dataset.id);
        if (photo) requestThumb(photo, img);
      });
    });
  }

  function updateCardElement(card, photo) {
    if (!card || !photo) return;
    const meta = getMeta(photo);
    card.classList.toggle("is-pick", meta.flag === "pick");
    card.classList.toggle("is-reject", meta.flag === "reject");
    card.classList.toggle("is-selected", state.selection.has(photo.id));
    card.classList.toggle("is-focused", state.focusId === photo.id);
    card.setAttribute("aria-selected", state.selection.has(photo.id) ? "true" : "false");

    const wrap = card.querySelector(".thumb-wrap");
    if (!wrap) return;
    let badge = wrap.querySelector(".thumb-flag");
    if (meta.flag === "pick" || meta.flag === "reject") {
      if (!badge) {
        badge = document.createElement("span");
        wrap.appendChild(badge);
      }
      badge.className = "thumb-flag " + meta.flag;
      badge.textContent = meta.flag === "pick" ? "✓" : "×";
      badge.setAttribute("aria-hidden", "true");
    } else if (badge) {
      badge.remove();
    }

    let dot = wrap.querySelector(".thumb-color");
    if (meta.color) {
      if (!dot) {
        dot = document.createElement("span");
        wrap.appendChild(dot);
      }
      dot.className = "thumb-color " + meta.color;
      dot.setAttribute("aria-hidden", "true");
    } else if (dot) {
      dot.remove();
    }

    const stars = card.querySelector(".card-stars");
    if (stars) stars.innerHTML = starsMarkup(Number(meta.rating) || 0);
  }

  function updateVisibleCards(ids) {
    const wanted = new Set(ids);
    $$("#grid .card").forEach((card) => {
      if (wanted.has(card.dataset.id)) {
        updateCardElement(card, state.byId.get(card.dataset.id));
      }
    });
    updateFilmstripFlags(ids);
  }

  /* ============================================================
     selection
     ============================================================ */

  function selectOnly(id, options) {
    const opts = options || {};
    if (!state.byId.has(id)) return;
    state.selection = new Set([id]);
    state.focusId = id;
    if (!opts.keepAnchor) state.anchorId = id;
    syncSelectionUI(true);
    scrollCardIntoView(id);
  }

  function toggleSelection(id) {
    if (!state.byId.has(id)) return;
    if (state.selection.has(id)) state.selection.delete(id);
    else state.selection.add(id);
    state.focusId = id;
    state.anchorId = id;
    syncSelectionUI(true);
    scrollCardIntoView(id);
  }

  function selectRange(fromId, toId) {
    const from = state.visible.findIndex((p) => p.id === fromId);
    const to = state.visible.findIndex((p) => p.id === toId);
    if (from < 0 || to < 0) {
      selectOnly(toId);
      return;
    }
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    state.selection = new Set(state.visible.slice(start, end + 1).map((p) => p.id));
    state.focusId = toId;
    syncSelectionUI(true);
    scrollCardIntoView(toId);
  }

  function selectAllVisible() {
    if (!state.visible.length) return;
    state.selection = new Set(state.visible.map((p) => p.id));
    state.focusId = state.focusId && state.visible.some((p) => p.id === state.focusId)
      ? state.focusId
      : state.visible[0].id;
    state.anchorId = state.visible[0].id;
    syncSelectionUI(true);
  }

  function clearSelection() {
    state.selection.clear();
    syncSelectionUI(true);
  }

  function syncSelectionUI(updateInspectorPanel) {
    $$("#grid .card").forEach((card) => {
      const selected = state.selection.has(card.dataset.id);
      card.classList.toggle("is-selected", selected);
      card.classList.toggle("is-focused", state.focusId === card.dataset.id);
      card.setAttribute("aria-selected", selected ? "true" : "false");
    });
    updateSelectedCount();
    if (updateInspectorPanel !== false) updateInspector();
  }

  function scrollCardIntoView(id) {
    if (state.view !== "grid") return;
    if (virtual.active) {
      const index = state.visible.findIndex((photo) => photo.id === id);
      const metrics = gridMetrics();
      if (index >= 0) {
        const row = Math.floor(index / metrics.columns);
        const top = GRID_PAD_TOP + row * metrics.rowHeight;
        const viewTop = el.gridScroll.scrollTop;
        const viewHeight = el.gridScroll.clientHeight;
        if (top < viewTop + 4 || top + metrics.cardHeight > viewTop + viewHeight - 4) {
          el.gridScroll.scrollTop = Math.max(
            0,
            top - Math.round(viewHeight / 2) + Math.round(metrics.rowHeight / 2)
          );
          updateVirtualWindow(true);
        }
      }
      const card = state.cardMap.get(id);
      if (card) card.focus({ preventScroll: true });
      return;
    }
    const card = state.cardMap.get(id) || $$("#grid .card").find((node) => node.dataset.id === id);
    if (card) card.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function gridColumns() {
    if (virtual.active) return gridMetrics().columns;
    const columns = getComputedStyle(el.grid).gridTemplateColumns;
    const count = columns.split(/\s+/).filter((part) => part && part !== "none").length;
    return Math.max(1, count);
  }

  function moveFocus(delta, extend) {
    if (!state.visible.length) return;
    let index = state.visible.findIndex((p) => p.id === state.focusId);
    if (index < 0) {
      index = 0;
      const first = state.visible[0];
      if (extend) selectRange(first.id, first.id);
      else selectOnly(first.id);
      return;
    }
    const target = F.clamp(index + delta, 0, state.visible.length - 1);
    if (target === index && !extend) return;
    const nextId = state.visible[target].id;
    if (extend) {
      const anchor = state.anchorId || state.visible[index].id;
      selectRange(anchor, nextId);
    } else {
      selectOnly(nextId);
    }
  }

  function handleCardClick(id, event) {
    if (event.shiftKey) {
      const anchor = state.anchorId || state.focusId || id;
      selectRange(anchor, id);
      state.anchorId = anchor;
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      toggleSelection(id);
      state.anchorId = id;
      return;
    }
    selectOnly(id);
  }

  /* ============================================================
     marquee selection
     ============================================================ */

  const marquee = {
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startContentY: 0,
    latestX: 0,
    latestY: 0,
    base: null,
    hits: new Set(),
    raf: 0,
    suppressClick: false
  };

  function marqueeBox() {
    return el.gridScroll.getBoundingClientRect();
  }

  function beginMarquee(event) {
    if (state.view !== "grid") return;
    if (event.button !== 0) return;
    if (!state.visible.length) return;
    if (event.target.closest(".card")) return;
    if (event.target.closest("button, input, select, a")) return;
    const box = marqueeBox();
    marquee.active = true;
    marquee.moved = false;
    marquee.startX = event.clientX;
    marquee.startY = event.clientY;
    marquee.startContentY = event.clientY - box.top + el.gridScroll.scrollTop;
    marquee.latestX = event.clientX;
    marquee.latestY = event.clientY;
    marquee.base = new Set(event.shiftKey || event.metaKey || event.ctrlKey ? state.selection : []);
    marquee.hits = new Set();
    el.marquee.hidden = true;
    window.addEventListener("pointermove", onMarqueeMove);
    window.addEventListener("pointerup", endMarquee);
    window.addEventListener("pointercancel", endMarquee);
  }

  function onMarqueeMove(event) {
    if (!marquee.active) return;
    marquee.latestX = event.clientX;
    marquee.latestY = event.clientY;
    if (!marquee.moved) {
      const dx = marquee.latestX - marquee.startX;
      const dy = marquee.latestY - marquee.startY;
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      marquee.moved = true;
      el.app.classList.add("is-marqueeing");
    }
    event.preventDefault();
    syncMarqueeOrigin();
    drawMarquee();
    applyMarqueeSelection();
    autoScrollMarquee();
  }

  function syncMarqueeOrigin() {
    const box = marqueeBox();
    marquee.startY = box.top + marquee.startContentY - el.gridScroll.scrollTop;
  }

  function drawMarquee() {
    const left = Math.min(marquee.startX, marquee.latestX);
    const top = Math.min(marquee.startY, marquee.latestY);
    const width = Math.abs(marquee.latestX - marquee.startX);
    const height = Math.abs(marquee.latestY - marquee.startY);
    el.marquee.hidden = false;
    el.marquee.style.left = left + "px";
    el.marquee.style.top = top + "px";
    el.marquee.style.width = Math.max(1, width) + "px";
    el.marquee.style.height = Math.max(1, height) + "px";
  }

  function applyMarqueeSelection() {
    const box = {
      left: Math.min(marquee.startX, marquee.latestX),
      right: Math.max(marquee.startX, marquee.latestX),
      top: Math.min(marquee.startY, marquee.latestY),
      bottom: Math.max(marquee.startY, marquee.latestY)
    };
    let focusId = null;
    const cards = el.grid.querySelectorAll(".card");
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const hit =
        !(rect.right < box.left || rect.left > box.right || rect.bottom < box.top || rect.top > box.bottom);
      const id = card.dataset.id;
      if (hit) {
        marquee.hits.add(id);
        focusId = id;
      } else if (marquee.hits.has(id)) {
        marquee.hits.delete(id);
      }
    }
    // 虚拟滚动时卡片会被回收，命中集合要跨窗口累积，否则画过的选区会丢。
    const next = new Set(marquee.base);
    for (const id of marquee.hits) next.add(id);
    state.selection = next;
    if (focusId) state.focusId = focusId;
    syncSelectionUI(false);
  }

  function autoScrollMarquee() {
    if (marquee.raf) return;
    const step = () => {
      marquee.raf = 0;
      if (!marquee.active || !marquee.moved) return;
      const box = marqueeBox();
      const edge = 60;
      let delta = 0;
      if (marquee.latestY < box.top + edge) {
        delta = -Math.ceil((box.top + edge - marquee.latestY) / 4);
      } else if (marquee.latestY > box.bottom - edge) {
        delta = Math.ceil((marquee.latestY - (box.bottom - edge)) / 4);
      }
      if (!delta) return;
      const before = el.gridScroll.scrollTop;
      el.gridScroll.scrollTop = before + F.clamp(delta, -80, 80);
      if (el.gridScroll.scrollTop !== before) {
        syncMarqueeOrigin();
        drawMarquee();
        applyMarqueeSelection();
        marquee.raf = requestAnimationFrame(step);
      }
    };
    marquee.raf = requestAnimationFrame(step);
  }

  function endMarquee() {
    window.removeEventListener("pointermove", onMarqueeMove);
    window.removeEventListener("pointerup", endMarquee);
    window.removeEventListener("pointercancel", endMarquee);
    if (marquee.raf) {
      cancelAnimationFrame(marquee.raf);
      marquee.raf = 0;
    }
    const moved = marquee.moved;
    marquee.active = false;
    marquee.moved = false;
    el.marquee.hidden = true;
    el.app.classList.remove("is-marqueeing");
    if (moved) {
      marquee.suppressClick = true;
      if (state.focusId && state.selection.has(state.focusId)) state.anchorId = state.focusId;
      updateCounts();
      updateInspector();
    }
  }

  function marqueeSwallowedClick() {
    if (!marquee.suppressClick) return false;
    marquee.suppressClick = false;
    return true;
  }

  /* ============================================================
     inspector
     ============================================================ */

  function primarySelected() {
    if (!state.selection.size) return null;
    if (state.focusId && state.selection.has(state.focusId)) {
      return state.byId.get(state.focusId) || null;
    }
    const firstId = state.selection.values().next().value;
    return state.byId.get(firstId) || null;
  }

  function updateInspector() {
    const photo = primarySelected();
    if (!photo) {
      el.inspectorEmpty.hidden = false;
      el.inspectorBody.hidden = true;
      return;
    }
    el.inspectorEmpty.hidden = true;
    el.inspectorBody.hidden = false;

    const ids = Array.from(state.selection);
    const multi = ids.length > 1;
    const metas = ids.map((id) => getMeta(id));
    const allSame = (key) => metas.every((m) => m[key] === metas[0][key]);

    el.inspectorName.textContent = multi ? "已选 " + ids.length + " 张照片" : photo.name;
    el.inspectorPath.textContent = multi
      ? metas.filter((m) => m.flag === "pick").length +
        " 留用 · " +
        metas.filter((m) => m.flag === "reject").length +
        " 淘汰"
      : displayPath(photo);

    if (multi) {
      el.inspectorMulti.hidden = false;
      el.inspectorMulti.textContent = ids.length + " 张";
    } else {
      el.inspectorMulti.hidden = true;
    }

    refreshInspectorImage(photo);

    $$("#flag-buttons .flag-btn").forEach((btn) => {
      const value = btn.dataset.flag === "none" ? null : btn.dataset.flag;
      btn.classList.toggle("is-active", allSame("flag") && metas[0].flag === value);
    });

    const ratingSame = allSame("rating");
    const rating = ratingSame ? Number(metas[0].rating) || 0 : 0;
    $$("#star-buttons button[data-value]").forEach((btn) => {
      const value = Number(btn.dataset.value);
      btn.classList.toggle("is-on", value > 0 && ratingSame && value <= rating);
    });
    el.ratingValue.textContent = ratingSame
      ? rating > 0
        ? rating + " 星"
        : "未评级"
      : "混合";

    const colorSame = allSame("color");
    $$("#color-row .swatch").forEach((btn) => {
      btn.classList.toggle("is-active", colorSame && metas[0].color === btn.dataset.color);
    });

    if (multi) {
      const totalSize = ids.reduce((sum, id) => {
        const p = state.byId.get(id);
        return sum + (p ? p.size : 0);
      }, 0);
      el.metaDimsLabel.textContent = "尺寸";
      el.metaDims.textContent = ids.length + " 张";
      el.metaSize.textContent = F.formatBytes(totalSize);
      el.metaType.textContent = "多种";
      el.metaPreviewRow.hidden = true;
      el.metaDate.textContent = "—";
    } else {
      el.metaDimsLabel.textContent = photo.isRaw ? "预览尺寸" : "尺寸";
      el.metaDims.textContent =
        photo.width && photo.height
          ? photo.width + " × " + photo.height
          : photo.isRaw
          ? photo.rawState === "failed"
            ? "不可预览"
            : "提取中…"
          : photo.previewable
          ? "读取中…"
          : "不可预览";
      el.metaSize.textContent = F.formatBytes(photo.size);
      el.metaType.textContent = photo.typeLabel
        ? photo.typeLabel
        : photo.ext
        ? photo.ext.toUpperCase()
        : "—";
      el.metaDate.textContent = F.formatDate(photo.mtime);
      el.metaPreviewRow.hidden = !photo.isRaw;
      if (photo.isRaw) {
        el.metaPreview.textContent =
          photo.previewRange
            ? "内嵌 JPEG " + photo.previewWidth + " × " + photo.previewHeight
            : photo.rawState === "failed"
            ? "无内嵌预览"
            : photo.rawState === "loading"
            ? "提取中…"
            : "待提取";
      }
    }
    updateInspectorExif(photo, multi);
  }

  function formatExposure(value) {
    if (!value || !Number.isFinite(value)) return "—";
    if (value >= 1) {
      const rounded = Math.round(value * 10) / 10;
      return rounded + " s";
    }
    const denom = Math.round(1 / value);
    if (denom > 1 && Math.abs(1 / denom - value) / value < 0.08) {
      return "1/" + denom + " s";
    }
    return value.toFixed(1) + " s";
  }

  function formatAperture(value) {
    if (!value || !Number.isFinite(value)) return "—";
    const rounded = Math.round(value * 10) / 10;
    return "f/" + (Number.isInteger(rounded) ? rounded : rounded.toFixed(1));
  }

  function updateInspectorExif(photo, multi) {
    if (!photo || multi) {
      el.exifCard.hidden = true;
      return;
    }
    el.exifCard.hidden = false;
    const exif = photo.exif;
    if (!exif) {
      el.exifState.textContent =
        photo.exifState === "loading"
          ? "读取中…"
          : photo.exifState === "empty"
          ? "无 EXIF"
          : "读取中…";
      el.exifCamera.textContent = "—";
      el.exifLens.textContent = "—";
      el.exifCamera.title = "";
      el.exifLens.title = "";
      el.exifFocal.textContent = "—";
      el.exifAperture.textContent = "—";
      el.exifShutter.textContent = "—";
      el.exifIso.textContent = "—";
      el.exifDate.textContent = "—";
      if (photo.exifState === "idle") {
        parsePhotoExif(photo);
      }
      return;
    }

    el.exifState.textContent = "";
    const camera = exif.camera || "—";
    const lens = exif.lens || "—";
    el.exifCamera.textContent = camera;
    el.exifLens.textContent = lens;
    el.exifCamera.title = camera;
    el.exifLens.title = lens;

    let focal = "—";
    if (exif.focal) {
      focal = Math.round(exif.focal) + " mm";
      if (exif.focal35 && Math.abs(exif.focal35 - exif.focal) > 1) {
        focal += "（35mm 等效 " + Math.round(exif.focal35) + " mm）";
      }
    } else if (exif.focal35) {
      focal = Math.round(exif.focal35) + " mm（35mm 等效）";
    }
    el.exifFocal.textContent = focal;
    el.exifAperture.textContent = formatAperture(exif.aperture);
    el.exifShutter.textContent = formatExposure(exif.exposure);
    el.exifIso.textContent = exif.iso ? String(exif.iso) : "—";
    el.exifDate.textContent = exif.takenAtText || F.formatDate(exif.takenAt);
  }

  function refreshInspectorImage(photo) {
    if (!photo) {
      el.inspectorImg.removeAttribute("src");
      el.inspectorImg.classList.remove("loaded");
      el.inspectorPreview.classList.remove("is-opaque");
      el.inspectorPreview.removeAttribute("data-badge");
      return;
    }
    const needsBadge = !photo.previewable || (photo.isRaw && !photo.thumbUrl);
    let badge = "";
    if (needsBadge) {
      if (photo.isRaw) {
        badge =
          photo.rawState === "failed"
            ? "RAW · 无内嵌预览"
            : photo.rawState === "loading"
            ? "RAW · 提取中…"
            : photo.previewRange
            ? "RAW · 载入预览…"
            : "RAW · 内嵌预览";
      } else {
        badge = photo.ext.toUpperCase() + " · 无预览";
      }
    }
    el.inspectorPreview.classList.toggle("is-opaque", needsBadge);
    el.inspectorPreview.dataset.badge = badge;
    if (!photo.thumbUrl) {
      el.inspectorImg.classList.remove("loaded");
      return;
    }
    if (el.inspectorImg.getAttribute("src") !== photo.thumbUrl) {
      el.inspectorImg.classList.remove("loaded");
      el.inspectorImg.src = photo.thumbUrl;
    }
    if (el.inspectorImg.complete && el.inspectorImg.naturalWidth) {
      el.inspectorImg.classList.add("loaded");
    }
  }

  function updateInspectorMeta() {
    const photo = primarySelected();
    if (!photo) return;
    if (state.selection.size === 1) {
      el.metaDimsLabel.textContent = photo.isRaw ? "预览尺寸" : "尺寸";
      el.metaDims.textContent =
        photo.width && photo.height
          ? photo.width + " × " + photo.height
          : photo.isRaw
          ? photo.rawState === "failed"
            ? "不可预览"
            : "提取中…"
          : "读取中…";
      if (photo.isRaw) {
        el.metaPreview.textContent = photo.previewRange
          ? "内嵌 JPEG " + photo.previewWidth + " × " + photo.previewHeight
          : photo.rawState === "failed"
          ? "无内嵌预览"
          : "提取中…";
      }
    }
  }

  /* ============================================================
     metadata mutations
     ============================================================ */

  function targetIds() {
    if (state.selection.size) return Array.from(state.selection);
    if (state.focusId && state.byId.has(state.focusId)) return [state.focusId];
    return [];
  }

  function markTargets(patch, options) {
    const ids = targetIds();
    if (!ids.length) return;
    const now = Date.now();
    ids.forEach((id, index) => {
      const current = state.meta.get(id) || { flag: null, rating: 0, color: null, updatedAt: 0 };
      const next = {
        flag: current.flag || null,
        rating: Number(current.rating) || 0,
        color: current.color || null,
        updatedAt: now + index
      };
      Object.assign(next, patch);
      state.meta.set(id, next);
    });
    // 完全同名的副本共享标记（跨子目录）
    const mirrored = propagateNameMarks(ids);
    const touched = mirrored.length ? ids.concat(mirrored) : ids;

    updateCounts();
    updateStatus();
    updateInspector();
    if (!(options && options.silent)) scheduleSave();

    if (hasStructuralFilter() || state.sort === "rating-desc") {
      clearTimeout(state.filterTimer);
      state.filterTimer = window.setTimeout(() => {
        applyFilters({ resetScroll: false });
      }, 110);
    } else {
      updateVisibleCards(touched);
    }
  }

  function setFlag(flag) {
    markTargets({ flag: flag === "none" ? null : flag });
  }

  /* ---------- 方向（旋转 / 翻转） ---------- */

  function orientationOf(photo) {
    if (!photo) return { rotation: 0, mirror: false };
    const meta = state.meta.get(photo.id);
    return {
      rotation: meta ? ((Number(meta.rotation) || 0) % 360 + 360) % 360 : 0,
      mirror: !!(meta && meta.mirror)
    };
  }

  function setOrientation(patch) {
    const ids = targetIds();
    if (!ids.length) return;
    const now = Date.now();
    ids.forEach((id, index) => {
      const cur = state.meta.get(id) || EMPTY_META;
      const next = {
        flag: cur.flag || null,
        rating: Number(cur.rating) || 0,
        color: cur.color || null,
        rotation: Number(cur.rotation) || 0,
        mirror: !!cur.mirror,
        updatedAt: now + index
      };
      if (patch.rotate) next.rotation = ((next.rotation + patch.rotate) % 360 + 360) % 360;
      if (patch.toggleMirror) next.mirror = !next.mirror;
      if (patch.reset) {
        next.rotation = 0;
        next.mirror = false;
      }
      state.meta.set(id, next);
      const photo = state.byId.get(id);
      if (photo) {
        const url = state.thumbUrls.get(id);
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
        state.thumbUrls.delete(id);
        photo.thumbUrl = null;
        photo.thumbPromise = null;
        // 卡片上已经是一张旧图，得把它退回「待生成」状态，否则不会重画
        const card = state.cardMap.get(id);
        const img = card ? card.querySelector("img") : null;
        if (img) {
          img.classList.remove("loaded");
          img.removeAttribute("src");
          img.setAttribute("data-thumb", "");
          card.classList.remove("is-loaded");
          requestThumb(photo, img);
        }
      }
    });
    scheduleSave();
    updateVisibleCards(ids);
    primeGridThumbs();
    refreshInspectorImage(primarySelected());
    updateInspectorMeta();
    applyLoupeOrientation();
  }

  function applyOrientationAction(mode) {
    if (mode === "left") setOrientation({ rotate: -90 });
    else if (mode === "right") setOrientation({ rotate: 90 });
    else if (mode === "mirror") setOrientation({ toggleMirror: true });
    else if (mode === "reset") setOrientation({ reset: true });
  }

  function setRating(rating) {
    markTargets({ rating: F.clamp(Number(rating) || 0, 0, 5) });
  }

  function toggleColor(color) {
    if (!F.COLORS.includes(color)) return;
    const ids = targetIds();
    if (!ids.length) return;
    const allSame = ids.every((id) => getMeta(id).color === color);
    markTargets({ color: allSame ? null : color });
  }

  function clearColor() {
    markTargets({ color: null });
  }

  /* ============================================================
     catalog persistence
     ============================================================ */

  function collectMarks() {
    const out = {};
    for (const [id, meta] of state.meta.entries()) {
      if (!meta) continue;
      out[id] = {
        flag: meta.flag || null,
        rating: Number(meta.rating) || 0,
        color: meta.color || null,
        rotation: Number(meta.rotation) || 0,
        mirror: !!meta.mirror,
        updatedAt: Number(meta.updatedAt) || 0
      };
    }
    return out;
  }

  function activeMarkCount() {
    let count = 0;
    for (const meta of state.meta.values()) {
      if (meta && (meta.flag || meta.rating || meta.color)) count += 1;
    }
    return count;
  }

  function persistLocal() {
    if (!state.folderName) return false;
    if (state.project) {
      try {
        localStorage.setItem(projectStorageKey(), JSON.stringify(collectProjectPayload()));
        return true;
      } catch (err) {
        return false;
      }
    }
    return F.writeLocalCatalog(state.folderName, collectMarks(), Date.now());
  }

  function flushPendingMarks() {
    clearTimeout(state.saveTimer);
    if (!state.folderName) return;
    persistLocal();
  }

  function scheduleSave() {
    if (!state.folderName) return;
    setSaveKind("saving");
    clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(persistCatalog, 320);
  }

  async function persistCatalog() {
    if (!state.folderName) return;
    if (state.project) {
      await saveProjectNow();
      return;
    }
    const marks = collectMarks();
    const localOk = F.writeLocalCatalog(state.folderName, marks, Date.now());
    if (state.folderHandle && state.writable) {
      try {
        await F.writeFolderCatalog(state.folderHandle, state.folderName, marks);
        setSaveKind("folder");
        return;
      } catch (err) {
        state.writable = false;
        setSaveKind(localOk ? "local" : "error");
        return;
      }
    }
    setSaveKind(localOk ? "local" : "error");
  }

  function exportCatalog() {
    if (!state.photos.length) {
      toast("还没有打开图库。");
      return;
    }
    const payload = {
      app: "FURIX Selects",
      version: 1,
      folder: state.folderName,
      exportedAt: new Date().toISOString(),
      marks: collectMarks()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    F.downloadBlob(
      blob,
      "FURIX_marks_" + F.sanitizeFileName(state.folderName) + "_" + F.timestampForFile() + ".json"
    );
    toast("标记备份已导出。", "success");
  }

  async function importCatalog(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = F.normalizeMarks(parsed);
      const count = Object.keys(imported).length;
      if (!count) {
        toast("这个文件里没有可导入的标记。", "error");
        return;
      }
      const merged = F.mergeMarks(
        Object.fromEntries(state.meta.entries()),
        imported
      );
      state.meta = new Map(Object.entries(merged));
      updateCounts();
      applyFilters({ resetScroll: false });
      updateInspector();
      scheduleSave();
      toast("已导入 " + count + " 条标记。", "success");
    } catch (err) {
      toast("导入失败：不是有效的标记 JSON。", "error");
    }
  }

  function clearAllMarks() {
    if (!activeMarkCount()) return;
    if (!window.confirm("清空当前图库的所有留用/淘汰、星级与颜色标记？照片文件不会被修改。")) {
      return;
    }
    const now = Date.now();
    for (const id of Array.from(state.meta.keys())) {
      state.meta.set(id, {
        flag: null,
        rating: 0,
        color: null,
        updatedAt: now
      });
    }
    scheduleSave();
    updateCounts();
    applyFilters({ resetScroll: false });
    updateInspector();
    updateMenuState();
    toast("已清空当前图库的标记。");
  }

  function closeLibrary(options) {
    if (!state.photos.length && !state.project) return;
    const quiet = !!(options && options.quiet);
    const wasProject = !!state.project;
    flushPendingMarks();
    if (state.project) saveProjectNow();
    stopExifScan(true);
    revokeLibraryUrls();
    state.photos = [];
    state.byId = new Map();
    state.meta = new Map();
    state.selection = new Set();
    state.visible = [];
    state.visibleIndex = new Map();
    state.focusId = null;
    state.folderName = "";
    state.folderHandle = null;
    state.writable = false;
    state.demo = false;
    state.currentLoupeId = null;
    state.view = "grid";
    state.zoom = 1;
    state.project = null;
    state.clients = [];
    state.sessions = [];
    state.sourceHandle = null;
    state.sourceName = "";
    state.clientFilter = "all";
    state.sessionFilter = "all";
    state.returns = {};
    state.deliveries = {};
    delivery.scan = new Map();
    delivery.loaded = false;
    returns.lists = new Map();
    returns.batches = new Map();
    returns.choices = {};
    returns.listErrors = new Map();
    invalidateReturns();
    state.pendingProjectParent = null;
    state.anchorId = null;
    el.app.dataset.view = "grid";
    el.loupe.hidden = true;
    el.app.classList.add("no-library");
    el.app.classList.remove("has-project");
    updateStartPanels();
    el.noResults.hidden = true;
    el.grid.hidden = true;
    el.grid.innerHTML = "";
    el.filmstrip.innerHTML = "";
    el.projectSection.hidden = true;
    el.sessionSelectWrap.hidden = true;
    el.clientList.innerHTML = "";
    closeProjectMenu();
    resetFilterUI();
    resetExifFacets();
    updateFolderUI();
    updateCounts();
    updateStatus();
    updateInspector();
    setSaveKind("local");
    document.title = "FURIX SELECTS · 选片台";
    updateMenuState();
    closeMenu();
    if (quiet) return;
    toast(
      wasProject
        ? "已关闭项目，照片和项目文件都没有被修改。"
        : "已关闭图库，照片文件没有被修改。"
    );
  }

  /* ============================================================
     loupe
     ============================================================ */

  function openLoupe(id, options) {
    const opts = options || {};
    if (!state.visible.length) return;
    let target = id && state.byId.get(id);
    if (!target || !state.visible.some((p) => p.id === target.id)) {
      target = state.visible.find((p) => p.id === state.focusId) || state.visible[0];
    }
    if (!target) return;
    closeMenu();
    if (!opts.keepSelection) {
      state.selection = new Set([target.id]);
      state.anchorId = target.id;
    }
    state.focusId = target.id;
    state.view = "loupe";
    el.app.dataset.view = "loupe";
    el.loupe.hidden = false;
    syncViewButtons();
    renderFilmstrip();
    showPhoto(target.id, { select: false });
    updateInspector();
    updateStatus();
  }

  function closeLoupe() {
    if (state.view !== "loupe") return;
    state.view = "grid";
    el.app.dataset.view = "grid";
    el.loupe.hidden = true;
    resetZoom();
    syncViewButtons();
    updateStatus();
    updateInspector();
    const id = state.focusId;
    requestAnimationFrame(() => {
      if (id) scrollCardIntoView(id);
      primeGridThumbs();
    });
    document.title = state.folderName
      ? state.folderName + " · FURIX SELECTS"
      : "FURIX SELECTS · 选片台";
  }

  function syncViewButtons() {
    el.viewGrid.classList.toggle("is-active", state.view === "grid");
    el.viewLoupe.classList.toggle("is-active", state.view === "loupe");
  }

  function showPhoto(id, options) {
    const opts = options || {};
    const photo = state.byId.get(id);
    if (!photo) return;
    if (opts.select !== false) {
      state.selection = new Set([id]);
      state.anchorId = id;
    }
    state.focusId = id;
    state.currentLoupeId = id;

    const index = state.visible.findIndex((p) => p.id === id);
    el.loupeIndex.textContent =
      (index >= 0 ? index + 1 : "–") + " / " + state.visible.length;
    el.loupeName.textContent = photo.name;
    el.loupeImg.alt = photo.name;
    resetZoom();
    el.loupeUnsupported.hidden = true;
    el.loupeRawChip.hidden = !photo.isRaw;
    if (photo.isRaw) {
      el.loupeRawChip.textContent =
        photo.rawState === "failed" ? "RAW · 无预览" : "RAW · 内嵌预览";
    }

    if (photo.isRaw) {
      if (photo.previewRange) {
        loadLoupeImage(photo);
      } else if (photo.rawState === "failed") {
        showLoupeUnsupported(photo, "raw");
      } else {
        showLoupePending();
        ensureRawPreview(photo)
          .then(() => {
            if (state.currentLoupeId !== id || state.view !== "loupe") return;
            el.loupeRawChip.textContent = "RAW · 内嵌预览";
            loadLoupeImage(photo);
            updateInspector();
          })
          .catch(() => {
            if (state.currentLoupeId !== id || state.view !== "loupe") return;
            showLoupeUnsupported(photo, "raw");
            updateInspector();
          });
      }
    } else if (!photo.previewable) {
      showLoupeUnsupported(photo);
    } else {
      loadLoupeImage(photo);
    }

    syncFilmstripActive(true);
    updateInspector();
    updateStatus();
    preloadNeighbors(index);
    document.title = photo.name + " · FURIX SELECTS";
  }

  function loadLoupeImage(photo) {
    el.loupeUnsupported.hidden = true;
    el.loupeImg.hidden = false;
    el.loupeZoom.disabled = false;
    el.loupeImg.classList.remove("loaded");
    el.loupeImg.src = getFullUrl(photo);
    if (el.loupeImg.complete && el.loupeImg.naturalWidth) {
      el.loupeImg.classList.add("loaded");
      photo.width = el.loupeImg.naturalWidth;
      photo.height = el.loupeImg.naturalHeight;
    }
    applyLoupeOrientation();
  }

  function showLoupePending() {
    el.loupeImg.hidden = true;
    el.loupeImg.classList.remove("loaded");
    el.loupeUnsupported.hidden = false;
    el.loupeZoom.disabled = true;
    el.unsupportedTitle.textContent = "正在提取 RAW 内嵌预览…";
    el.unsupportedText.textContent = "只读取 RAW 内嵌的 JPEG 预览，不会修改原文件。";
    el.loupeZoomReadout.hidden = true;
  }

  function showLoupeUnsupported(photo, reason) {
    el.loupeImg.hidden = true;
    el.loupeImg.classList.remove("loaded");
    el.loupeUnsupported.hidden = false;
    el.loupeZoom.disabled = true;
    if (reason === "raw") {
      el.unsupportedTitle.textContent = "未能提取 RAW 内嵌预览";
      el.unsupportedText.textContent =
        "这张 RAW 没有可用的 JPEG 预览。仍可打标记，导出时会复制原文件。";
      if (photo && photo.isRaw) {
        el.loupeRawChip.hidden = false;
        el.loupeRawChip.textContent = "RAW · 无预览";
      }
    } else {
      const ext = photo && photo.ext ? photo.ext.toUpperCase() : "";
      el.unsupportedTitle.textContent = ext
        ? "浏览器无法预览 " + ext + " 文件"
        : "这张照片无法预览";
      el.unsupportedText.textContent =
        "RAW / HEIC 等格式仍可打标记，并在导出时复制原文件。";
    }
    el.loupeZoomReadout.hidden = true;
  }

  function getFullUrl(photo) {
    let url = state.fullUrls.get(photo.id);
    if (url) {
      state.fullUrls.delete(photo.id);
      state.fullUrls.set(photo.id, url);
      return url;
    }
    const source = photo.isRaw && photo.previewRange ? rawPreviewBlob(photo) : photo.file;
    url = URL.createObjectURL(source);
    state.fullUrls.set(photo.id, url);
    while (state.fullUrls.size > 6) {
      const first = state.fullUrls.entries().next().value;
      if (!first) break;
      state.fullUrls.delete(first[0]);
      URL.revokeObjectURL(first[1]);
    }
    return url;
  }

  function preloadNeighbors(index) {
    if (index < 0) return;
    window.setTimeout(() => {
      for (const offset of [1, -1]) {
        const photo = state.visible[index + offset];
        if (!photo || !photo.previewable) continue;
        if (photo.isRaw && !photo.previewRange) continue;
        const url = getFullUrl(photo);
        const image = new Image();
        image.src = url;
      }
    }, 180);
  }

  function navigateLoupe(delta) {
    if (!state.visible.length) return;
    const index = state.visible.findIndex((p) => p.id === state.currentLoupeId);
    if (index < 0) {
      showPhoto(state.visible[0].id, { select: true });
      return;
    }
    const next = F.clamp(index + delta, 0, state.visible.length - 1);
    if (next === index) return;
    showPhoto(state.visible[next].id, { select: true });
  }

  function resetZoom() {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    state.dragging = false;
    state.dragMoved = false;
    el.loupeFrame.classList.remove("is-dragging", "is-zoomed");
    applyZoom();
  }

  function applyLoupeOrientation() {
    const img = el.loupeImg;
    if (!img) return;
    const photo = state.currentLoupeId ? state.byId.get(state.currentLoupeId) : null;
    const { rotation } = orientationOf(photo);
    const swap = rotation === 90 || rotation === 270;
    const boxW = el.loupeCanvas.clientWidth || 900;
    const boxH = el.loupeCanvas.clientHeight || 600;
    img.style.maxWidth = (swap ? boxH : boxW) + "px";
    img.style.maxHeight = (swap ? boxW : boxH) + "px";
    applyZoom();
  }

  function applyZoom() {
    const zoom = state.zoom;
    const photo = state.currentLoupeId ? state.byId.get(state.currentLoupeId) : null;
    const { rotation, mirror } = orientationOf(photo);
    const parts = [
      "translate(" + state.panX + "px, " + state.panY + "px)"
    ];
    if (rotation) parts.push("rotate(" + rotation + "deg)");
    parts.push("scale(" + zoom + ")");
    if (mirror) parts.push("scaleX(-1)");
    el.loupeImg.style.transform = parts.join(" ");
    const zoomed = zoom > 1.01;
    const natural = el.loupeImg.naturalWidth || 0;
    const rendered = el.loupeImg.clientWidth || 0;
    const fitScale = natural > 0 && rendered > 0 ? rendered / natural : 1;
    const actualPercent = Math.max(1, Math.round(zoom * fitScale * 100));
    el.loupeFrame.classList.toggle("is-zoomed", zoomed);
    el.loupeZoom.textContent = zoomed ? actualPercent + "%" : "适应";
    el.loupeZoom.title = zoomed ? "点击适应画面 (Z)" : "点击放大 (Z)";
    el.loupeZoomReadout.hidden = !zoomed || !state.currentLoupeId;
    if (zoomed) {
      el.loupeZoomReadout.textContent =
        Math.abs(actualPercent - 100) <= 2 ? "100%" : actualPercent + "%";
    }
  }

  function toggleZoom() {
    const photo = state.currentLoupeId && state.byId.get(state.currentLoupeId);
    if (!photo || !photo.previewable) return;
    if (photo.isRaw && !photo.previewRange) return;
    if (state.zoom > 1.01) {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
    } else {
      const natural = el.loupeImg.naturalWidth || photo.width || 0;
      const rendered = el.loupeImg.clientWidth || 0;
      const oneToOne = natural > 0 && rendered > 0 ? natural / rendered : 1;
      state.zoom = oneToOne > 1.02 ? oneToOne : 2;
      state.panX = 0;
      state.panY = 0;
    }
    applyZoom();
  }

  function clampPan() {
    const img = el.loupeImg;
    const canvas = el.loupeCanvas;
    if (!img || !canvas) return;
    const scaledW = img.clientWidth * state.zoom;
    const scaledH = img.clientHeight * state.zoom;
    const maxX = Math.max(0, (scaledW - canvas.clientWidth) / 2) + 40;
    const maxY = Math.max(0, (scaledH - canvas.clientHeight) / 2) + 40;
    state.panX = F.clamp(state.panX, -maxX, maxX);
    state.panY = F.clamp(state.panY, -maxY, maxY);
  }

  function setZoom(next) {
    const photo = state.currentLoupeId && state.byId.get(state.currentLoupeId);
    if (!photo || !photo.previewable) return;
    if (photo.isRaw && !photo.previewRange) return;
    state.zoom = F.clamp(next, 1, 8);
    if (state.zoom <= 1.01) {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
    } else {
      clampPan();
    }
    applyZoom();
  }

  function renderFilmstrip() {
    if (filmObserver) filmObserver.disconnect();
    if (!state.visible.length) {
      el.filmstrip.innerHTML = '<span class="film-empty">没有照片</span>';
      return;
    }
    const html = state.visible
      .map((photo) => {
        const meta = getMeta(photo);
        const classes = ["film-item"];
        if (photo.id === state.currentLoupeId) classes.push("is-active");
        if (meta.flag === "reject") classes.push("is-rejected");
        let media = "";
        if (photo.thumbUrl) {
          media =
            '<img class="loaded" src="' +
            F.escapeHtml(photo.thumbUrl) +
            '" alt="" draggable="false">';
        } else if (photo.previewable) {
          media = '<img data-thumb alt="" draggable="false">';
        } else {
          media = '<span class="film-ext">' + F.escapeHtml(photo.ext.toUpperCase()) + "</span>";
        }
        let flag = "";
        if (meta.flag === "pick") flag = '<span class="film-flag">✓</span>';
        else if (meta.flag === "reject") flag = '<span class="film-flag reject">×</span>';
        return (
          '<button class="' +
          classes.join(" ") +
          '" type="button" data-id="' +
          F.escapeHtml(photo.id) +
          '" title="' +
          F.escapeHtml(photo.name) +
          '" aria-label="' +
          F.escapeHtml(photo.name) +
          '">' +
          media +
          flag +
          "</button>"
        );
      })
      .join("");
    el.filmstrip.innerHTML = html;
    observeFilmThumbs();
    requestAnimationFrame(() => syncFilmstripActive(true));
  }

  function syncFilmstripActive(scroll) {
    let active = null;
    $$("#filmstrip .film-item").forEach((item) => {
      const isActive = item.dataset.id === state.currentLoupeId;
      item.classList.toggle("is-active", isActive);
      if (isActive) active = item;
    });
    if (active && scroll !== false) {
      const left =
        active.offsetLeft - el.filmstrip.clientWidth / 2 + active.offsetWidth / 2;
      el.filmstrip.scrollTo({
        left: Math.max(0, left),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth"
      });
    }
  }

  function updateFilmstripFlags(ids) {
    const wanted = new Set(ids);
    $$("#filmstrip .film-item").forEach((item) => {
      if (!wanted.has(item.dataset.id)) return;
      const photo = state.byId.get(item.dataset.id);
      if (!photo) return;
      const meta = getMeta(photo);
      item.classList.toggle("is-rejected", meta.flag === "reject");
      let flag = item.querySelector(".film-flag");
      if (meta.flag) {
        if (!flag) {
          flag = document.createElement("span");
          item.appendChild(flag);
        }
        flag.className = "film-flag" + (meta.flag === "reject" ? " reject" : "");
        flag.textContent = meta.flag === "pick" ? "✓" : "×";
      } else if (flag) {
        flag.remove();
      }
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast("浏览器拒绝了全屏请求。", "error");
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ============================================================
     export
     ============================================================ */

  function exportPhotos(scope) {
    switch (scope) {
      case "selected":
        return F.sortPhotos(
          state.photos.filter((p) => state.selection.has(p.id)),
          state.sort,
          getMeta
        );
      case "pick":
        return F.sortPhotos(
          state.photos.filter((p) => getMeta(p).flag === "pick"),
          state.sort,
          getMeta
        );
      case "view":
        return state.visible.slice();
      case "all":
      default:
        return F.sortPhotos(state.photos.slice(), state.sort, getMeta);
    }
  }

  function exportCounts() {
    return {
      selected: state.photos.filter((p) => state.selection.has(p.id)).length,
      pick: state.photos.filter((p) => getMeta(p).flag === "pick").length,
      view: state.visible.length,
      all: state.photos.length
    };
  }

  /* ============================================================
     watermark (快速选片导出用)
     ============================================================ */

  const WM_KEY = "furix.watermark.v1";
  // 每条都同时列 Windows 与 macOS 的字体名，两边都能命中
  const WM_FONTS = {
    sans:
      '"Helvetica Neue", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", Arial, sans-serif',
    hei:
      '"PingFang SC", "Heiti SC", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", "SimHei", sans-serif',
    song:
      '"Songti SC", "STSong", "Source Han Serif SC", "Noto Serif SC", "SimSun", "宋体", serif',
    kai: '"Kaiti SC", "STKaiti", "KaiTi", "楷体", "BiauKai", serif',
    serif: 'Georgia, "Times New Roman", "Songti SC", "STSong", serif',
    mono:
      '"SF Mono", "Cascadia Mono", Menlo, Consolas, "Courier New", monospace'
  };

  const wm = {
    enabled: false,
    textOn: true,
    logoOn: false,
    text: "",
    color: "#ffffff",
    opacity: 70,
    fontSize: 3,
    inset: 3,
    anchor: "bottom-right",
    font: "sans",
    family: "",
    weight: "600",
    logoSize: 14,
    logoAnchor: "bottom-left",
    logoInset: 3,
    logoOpacity: 85,
    logo: null,
    logoName: "",
    bitmapCache: new Map(),
    timer: 0
  };

  // 预览重绘令牌：布局一变就重画，旧的异步结果直接丢掉
  let wmPreviewToken = 0;
  let wmFrameObserver = null;
  let wmFrameTimer = 0;

  function wmLoad() {
    try {
      const raw = localStorage.getItem(WM_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
      wm.text = typeof saved.text === "string" ? saved.text : "";
      wm.color = typeof saved.color === "string" ? saved.color : "#ffffff";
      wm.opacity = F.clamp(Number(saved.opacity) || 70, 10, 100);
      wm.fontSize = F.clamp(Number(saved.fontSize) || 3, 1, 10);
      wm.inset = F.clamp(Number(saved.inset) || 3, 0, 12);
      wm.anchor = typeof saved.anchor === "string" ? saved.anchor : "bottom-right";
      wm.font = WM_FONTS[saved.font] ? saved.font : "sans";
      wm.family = typeof saved.family === "string" ? saved.family : "";
      wm.weight = ["400", "600", "800"].includes(String(saved.weight))
        ? String(saved.weight)
        : "600";
      wm.logoSize = F.clamp(Number(saved.logoSize) || 14, 2, 40);
      wm.logoAnchor =
        typeof saved.logoAnchor === "string" ? saved.logoAnchor : "bottom-left";
      wm.logoInset = F.clamp(
        saved.logoInset == null ? 3 : Number(saved.logoInset) || 0,
        0,
        12
      );
      wm.logoOpacity = F.clamp(Number(saved.logoOpacity) || 85, 10, 100);
      wm.textOn =
        saved.textOn === undefined ? !!saved.enabled : !!saved.textOn;
      wm.logoOn = !!saved.logoOn;
      wm.enabled = wm.textOn || wm.logoOn;
    } catch (err) {
      /* ignore */
    }
  }

  function wmSave() {
    try {
      localStorage.setItem(
        WM_KEY,
        JSON.stringify({
          enabled: wm.enabled,
          textOn: wm.textOn,
          logoOn: wm.logoOn,
          text: wm.text,
          color: wm.color,
          opacity: wm.opacity,
          fontSize: wm.fontSize,
          inset: wm.inset,
          anchor: wm.anchor,
          font: wm.font,
          family: wm.family,
          weight: wm.weight,
          logoSize: wm.logoSize,
          logoAnchor: wm.logoAnchor,
          logoInset: wm.logoInset,
          logoOpacity: wm.logoOpacity
        })
      );
    } catch (err) {
      /* ignore */
    }
  }

  function wmRefreshGate() {
    wm.enabled = !!(wm.textOn || wm.logoOn);
    const parts = [];
    if (wm.textOn) parts.push(String(wm.text || "").trim() ? "文字" : "文字（还没填内容）");
    if (wm.logoOn) parts.push(wm.logo ? "图片" : "图片（还没选 logo）");
    if (el.wmGateNote) {
      el.wmGateNote.textContent = parts.length ? parts.join(" + ") : "不加水印";
    }
  }

  function wmSyncInputs() {
    wmRefreshGate();
    el.wmTextOn.checked = wm.textOn;
    el.wmLogoOn.checked = wm.logoOn;
    el.wmTextPanel.hidden = !wm.textOn;
    el.wmLogoPanel.hidden = !wm.logoOn;
    el.wmText.value = wm.text;
    el.wmSize.value = wm.fontSize;
    el.wmSizeVal.textContent = wm.fontSize + "%";
    el.wmInset.value = wm.inset;
    el.wmInsetVal.textContent = wm.inset + "%";
    el.wmOpacity.value = wm.opacity;
    el.wmOpacityVal.textContent = wm.opacity + "%";
    el.wmColor.value = wm.color;
    el.wmFont.value = wm.family ? "custom" : wm.font;
    el.wmFamily.value = wm.family;
    el.wmWeight.value = wm.weight;
    el.wmLogoSize.value = wm.logoSize;
    el.wmLogoVal.textContent = wm.logoSize + "%";
    el.wmLogoInset.value = wm.logoInset;
    el.wmLogoInsetVal.textContent = wm.logoInset + "%";
    el.wmLogoOpacity.value = wm.logoOpacity;
    el.wmLogoOpacityVal.textContent = wm.logoOpacity + "%";
    el.wmLogoName.textContent = wm.logo ? wm.logoName || "已选择" : "未选择";
    $$("#wm-anchor button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.anchor === wm.anchor);
    });
    $$("#wm-logo-anchor button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.anchor === wm.logoAnchor);
    });
  }

  function cssFamily(name) {
    const clean = String(name || "").replace(/["\\]/g, "").trim();
    return clean ? '"' + clean + '"' : "";
  }

  function wmFontStack() {
    const preset = WM_FONTS[wm.font] || WM_FONTS.sans;
    const custom = cssFamily(wm.family);
    if (!custom) return preset;
    return custom + ", " + preset;
  }

  function wmOptions() {
    return {
      text: wm.textOn ? wm.text : "",
      color: wm.color,
      opacity: wm.opacity,
      fontSize: wm.fontSize,
      inset: wm.inset,
      anchor: wm.anchor,
      fontFamily: wmFontStack(),
      fontWeight: wm.weight,
      logo: wm.logoOn && wm.logo ? wm.logo : null,
      logoSize: wm.logoSize,
      logoAnchor: wm.logoAnchor,
      logoInset: wm.logoInset,
      logoOpacity: wm.logoOpacity,
      maxEdge: Number(el.exportSize.value) || 0,
      quality: Number(el.exportQuality.value) || 92
    };
  }

  async function loadSystemFonts() {
    if (!window.queryLocalFonts) {
      toast("当前浏览器不支持读取本机字体，请用 Chrome / Edge。", "error", 4600);
      el.wmFontNote.textContent = "这个浏览器不支持本地字体接口";
      return;
    }
    el.wmFontLoad.disabled = true;
    el.wmFontNote.textContent = "正在读取…（浏览器会弹一次授权）";
    try {
      const fonts = await window.queryLocalFonts();
      const names = Array.from(
        new Set((fonts || []).map((item) => item.family).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
      el.wmFontList.innerHTML = names
        .map((name) => '<option value="' + F.escapeHtml(name) + '"></option>')
        .join("");
      wm.systemFonts = names;
      el.wmFontNote.textContent = "已载入 " + names.length + " 个字体，可直接在左边输入或选择";
    } catch (err) {
      const denied = err && (err.name === "NotAllowedError" || err.name === "SecurityError");
      el.wmFontNote.textContent = denied ? "授权被拒绝，仍然可以用上面的预设字体" : "读取失败";
      toast(
        denied ? "没有授权读取系统字体，继续用预设字体即可。" : "读取系统字体失败：" + (err && err.message ? err.message : err),
        "error",
        4600
      );
    } finally {
      el.wmFontLoad.disabled = false;
    }
  }

  function updateWatermarkUI() {
    wmSyncInputs();
    const on = wm.enabled;
    $$("#export-mode button").forEach((btn) => {
      if (btn.dataset.mode === "jpeg") return;
      btn.disabled = on;
      btn.classList.toggle("is-muted", on);
    });
    if (on && ex.mode !== "jpeg") {
      ex.mode = "jpeg";
      $$("#export-mode button").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.mode === "jpeg");
      });
      el.convertOptions.hidden = false;
    }
    pinExportScroll();
    scheduleWmPreview();
  }

  function scheduleWmPreview() {
    clearTimeout(wm.timer);
    wm.timer = window.setTimeout(() => {
      renderWmPreview();
    }, 120);
  }

  // 兜底：老浏览器不支持 overflow:clip 时，点复选框的 focus 仍可能把弹窗整体滚上去
  function pinExportScroll() {
    if (!el.exportModal) return;
    if (el.exportModal.scrollTop) el.exportModal.scrollTop = 0;
    const body = el.exportModal.querySelector(".export-body");
    if (body && body.scrollTop) body.scrollTop = 0;
  }

  // 左栏尺寸一变（开面板、改窗口、调缩放）就按新尺寸重画，别让预览停在旧大小上
  function watchWmFrame() {
    if (wmFrameObserver || typeof ResizeObserver === "undefined") return;
    const frame = el.wmPreview && el.wmPreview.parentElement;
    if (!frame) return;
    wmFrameObserver = new ResizeObserver(() => {
      if (el.exportModal.hidden) return;
      clearTimeout(wmFrameTimer);
      wmFrameTimer = window.setTimeout(() => {
        if (!el.exportModal.hidden) renderWmPreview();
      }, 60);
    });
    wmFrameObserver.observe(frame);
  }

  function wmPreviewPhoto() {
    const photos = exportPhotos(ex.scope);
    if (!photos.length) return null;
    return (
      photos.find((photo) => photo.previewable && !photo.isRaw) ||
      photos.find((photo) => photo.previewable) ||
      photos[0]
    );
  }

  async function wmBitmapFor(photo) {
    if (!photo) return null;
    if (wm.bitmapCache.has(photo.id)) return wm.bitmapCache.get(photo.id);
    try {
      const bitmap = await createImageBitmap(photo.file, { imageOrientation: "from-image" });
      wm.bitmapCache.set(photo.id, bitmap);
      return bitmap;
    } catch (err) {
      try {
        const bitmap = await createImageBitmap(photo.file);
        wm.bitmapCache.set(photo.id, bitmap);
        return bitmap;
      } catch (err2) {
        wm.bitmapCache.set(photo.id, null);
        return null;
      }
    }
  }

  async function renderWmPreview() {
    if (!el.wmPreview) return;
    const token = ++wmPreviewToken;
    const canvas = el.wmPreview;
    const frame = canvas.parentElement;
    // 还没布局好（弹窗刚开 / 已关闭）就先不画，交给 ResizeObserver 或下一次调度
    const frameW = frame ? frame.clientWidth : 0;
    const frameH = frame ? frame.clientHeight : 0;
    if (frameW < 40 || frameH < 40) return;
    // 预览按左栏实际可用尺寸出图：1:1 像素，缩放后不糊
    const availW = Math.max(160, frameW - 34);
    const availH = Math.max(120, frameH - 34);
    const ctx = canvas.getContext("2d");
    const photo = wmPreviewPhoto();
    // 先用记录里的宽高把画布尺寸定下来，别让首帧停在 <canvas width=640 height=400> 上
    let ratio = 3 / 2;
    if (photo && photo.width && photo.height) ratio = photo.width / photo.height;
    let boxW = availW;
    let boxH = Math.round(boxW / ratio);
    if (boxH > availH) {
      boxH = availH;
      boxW = Math.round(boxH * ratio);
    }
    canvas.width = Math.max(40, boxW);
    canvas.height = Math.max(40, boxH);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bitmap = photo ? await wmBitmapFor(photo) : null;
    if (token !== wmPreviewToken) return;
    if (bitmap && bitmap.width && bitmap.height) {
      const real = bitmap.width / bitmap.height;
      if (Math.abs(real - ratio) > 0.01) {
        ratio = real;
        let w2 = availW;
        let h2 = Math.round(w2 / ratio);
        if (h2 > availH) {
          h2 = availH;
          w2 = Math.round(h2 * ratio);
        }
        canvas.width = Math.max(40, w2);
        canvas.height = Math.max(40, h2);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    } else {
      // 没有可解码的照片时，画一张中性"样片"背景，别挡住水印预览
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#3b4654");
      sky.addColorStop(0.62, "#222932");
      sky.addColorStop(1, "#14181d");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 214, 150, 0.16)";
      ctx.beginPath();
      ctx.arc(canvas.width * 0.78, canvas.height * 0.26, canvas.height * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.78);
      ctx.lineTo(canvas.width * 0.32, canvas.height * 0.58);
      ctx.lineTo(canvas.width * 0.58, canvas.height * 0.74);
      ctx.lineTo(canvas.width * 0.8, canvas.height * 0.62);
      ctx.lineTo(canvas.width, canvas.height * 0.8);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
      ctx.font = '400 10px "Helvetica Neue", Arial, sans-serif';
      ctx.textBaseline = "alphabetic";
      ctx.fillText("样片示意", 12, 18);
    }
    if (wm.enabled) F.drawWatermark(ctx, canvas.width, canvas.height, wmOptions());
    const photos = exportPhotos(ex.scope);
    const copyOnly = photos.filter((item) => !item.previewable || item.isRaw).length;
    if (el.exportPreviewName) {
      el.exportPreviewName.textContent = photo ? photo.name : "没有可预览的照片";
    }
    if (el.exportPreviewDims) {
      el.exportPreviewDims.textContent = bitmap
        ? bitmap.width + " × " + bitmap.height
        : photo
          ? "RAW / 无法解码"
          : "";
    }
    const wmDesc = wm.enabled
      ? wm.textOn && wm.logoOn
        ? "文字 + 图片双水印"
        : wm.textOn
          ? "文字水印"
          : "图片水印"
      : "不加水印";
    el.wmNote.textContent =
      (copyOnly
        ? "有 " + copyOnly + " 张（RAW 或无法解码）会按原图复制，不加印章。"
        : "预览用当前范围里第一张照片，比例与实际导出一致。") +
      " · " +
      wmDesc;
  }

  async function pickWmLogo(file) {
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      wm.logo = bitmap;
      wm.logoName = file.name;
      wmSyncInputs();
      scheduleWmPreview();
    } catch (err) {
      try {
        const bitmap = await createImageBitmap(file);
        wm.logo = bitmap;
        wm.logoName = file.name;
        wmSyncInputs();
        scheduleWmPreview();
      } catch (err2) {
        toast("这个 logo 读不了，换一张 PNG/WebP 试试。", "error");
      }
    }
  }

  function openExport(preferredScope) {
    if (!state.photos.length) {
      toast("先打开一个照片文件夹。");
      return;
    }
    if (ex.busy) return;
    closeMenu();
    closeHelpIfOpen();
    const counts = exportCounts();
    let scope = preferredScope || null;
    if (!scope) {
      if (counts.selected) scope = "selected";
      else if (counts.pick) scope = "pick";
      else if (filterIsActive() && counts.view) scope = "view";
      else scope = "all";
    }
    if (!counts[scope]) {
      scope = counts.selected ? "selected" : counts.pick ? "pick" : "all";
    }
    ex.scope = scope;
    ex.busy = false;
    ex.cancel = false;
    resetExportOverlay();
    wmSyncInputs();
    el.exportModal.hidden = false;
    document.body.classList.add("modal-open");
    watchWmFrame();
    const modalBody = el.exportModal.querySelector(".modal-body");
    if (modalBody) modalBody.scrollTop = 0;
    updateExportUI();
    requestAnimationFrame(() => {
      renderWmPreview();
      el.exportClose.focus({ preventScroll: true });
    });
  }

  function closeExport() {
    if (ex.busy) return;
    el.exportModal.hidden = true;
    if (el.collideModal) el.collideModal.hidden = true;
    resetExportOverlay();
    document.body.classList.remove("modal-open");
    if (state.view === "grid") el.btnExport.focus({ preventScroll: true });
  }

  function resetExportOverlay() {
    el.exportProgress.hidden = true;
    el.exportSpinner.hidden = false;
    el.exportProgressIcon.hidden = true;
    el.exportStop.hidden = false;
    el.exportStop.disabled = false;
    el.exportStop.textContent = "停止";
    el.exportDone.hidden = true;
    el.exportFailures.hidden = true;
    el.exportFailures.textContent = "";
    el.exportProgressBar.style.width = "0%";
    el.exportClose.disabled = false;
    el.exportProgressTitle.textContent = "正在导出…";
    el.exportProgressSub.textContent = "";
    ex.busy = false;
    ex.cancel = false;
  }

  function updateExportUI() {
    const counts = exportCounts();
    $$("#export-scope button").forEach((btn) => {
      const scope = btn.dataset.scope;
      const count = counts[scope] || 0;
      const b = btn.querySelector("b");
      if (b) b.textContent = count;
      btn.classList.toggle("is-active", scope === ex.scope);
      btn.disabled = count === 0;
    });
    $$("#export-mode button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mode === ex.mode);
    });
    el.convertOptions.hidden = ex.mode === "copy";
    el.exportNaming.value = ex.naming;
    $$("#export-collision button").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.collision === (ex.collision || "ask"));
    });
    const prefixDisabled = ex.naming !== "prefix-seq";
    el.exportPrefix.disabled = prefixDisabled;
    el.prefixField.classList.toggle("is-disabled", prefixDisabled);
    el.qualityVal.textContent = el.exportQuality.value;
    updateWatermarkUI();
    updateExportSummary();
  }

  function updateExportSummary() {
    const photos = exportPhotos(ex.scope);
    const count = photos.length;
    const total = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    el.exportScopeNote.textContent = count + " 张 · " + F.formatBytes(total);
    el.exportGo.disabled = count === 0;
    el.exportZip.disabled = count === 0;
    const hasPicker = "showDirectoryPicker" in window;
    el.exportGo.textContent = hasPicker ? "选择文件夹并导出" : "打包 ZIP 下载";
    const rawCount = photos.reduce((n, p) => n + (p.isRaw ? 1 : 0), 0);
    const wmCopy = wm.enabled
      ? photos.reduce((n, p) => n + (!p.previewable || p.isRaw ? 1 : 0), 0)
      : 0;
    const rotatedCount = photos.reduce((n, p) => {
      const meta = state.meta.get(p.id);
      return n + (meta && (Number(meta.rotation) || meta.mirror) ? 1 : 0);
    }, 0);
    const rotateNote =
      rotatedCount && !wm.enabled && ex.mode === "copy"
        ? " · " + rotatedCount + " 张有旋转，复制模式不改像素（XMP 里写了方向）"
        : "";
    const sizeLabel =
      el.exportSize.value === "0" ? "原图尺寸（不缩放）" : "长边 " + el.exportSize.value + " px";
    const wmLabel = wm.textOn && wm.logoOn
      ? "双水印（文字 + 图片）"
      : wm.textOn
        ? "文字水印"
        : "图片水印";
    const collisionLabel =
      ex.collision === "overwrite"
        ? " · 同名覆盖"
        : ex.collision === "skip"
          ? " · 同名跳过"
          : ex.collision === "suffix"
            ? " · 同名加后缀"
            : " · 同名会先问你";
    el.exportFootHint.textContent =
      (wm.enabled
        ? wmLabel + " 导出 JPEG · " + sizeLabel + " · 质量 " + el.exportQuality.value +
          (wmCopy ? " · " + wmCopy + " 张无法加水印（原图复制）" : "")
        : (ex.mode === "copy"
            ? "复制模式保留原始文件与画质"
            : sizeLabel + " · 质量 " + el.exportQuality.value) +
          (ex.mode !== "copy" && rawCount
            ? " · " + rawCount + " 张 RAW 按原件复制"
            : "")) +
      collisionLabel +
      rotateNote;
    el.exportZip.classList.toggle("hidden", !hasPicker);
  }

  function updateExportCountsIfOpen() {
    if (!el.exportModal.hidden) updateExportUI();
  }

  function readExportConfig() {
    const mark = wmOptions();
    const hasMark = !!(String(mark.text || "").trim() || mark.logo);
    return {
      mode: wm.enabled ? "jpeg" : ex.mode,
      watermark: wm.enabled && hasMark ? mark : null,
      naming: ex.naming,
      prefix: F.sanitizeFileName(el.exportPrefix.value || "FURIX", "FURIX"),
      maxEdge: Number(el.exportSize.value) || 0,
      quality: Number(el.exportQuality.value) || 92,
      collision: ex.collision,
      subfolders: el.exportSubfolders.checked,
      xmp: el.exportXmp.checked
    };
  }

  function exportFileName(photo, index, extension, config) {
    const original = F.sanitizeFileName(F.baseName(photo.name), "photo");
    if (config.naming === "seq") {
      return pad(index + 1, 4) + "_" + original + extension;
    }
    if (config.naming === "prefix-seq") {
      return config.prefix + "_" + pad(index + 1, 4) + extension;
    }
    return original + extension;
  }

  async function uniqueName(dir, desired, used, keyPrefix) {
    const clean = F.sanitizeFileName(desired, "photo");
    const base = F.baseName(clean);
    const ext = clean.slice(base.length);
    const prefix = keyPrefix || "";
    let candidate = clean;
    let n = 2;
    while (
      used.has((prefix + candidate).toLowerCase()) ||
      (await fileExists(dir, candidate))
    ) {
      candidate = base + "-" + n + ext;
      n += 1;
      if (n > 9999) throw new Error("无法生成不重复的文件名");
    }
    used.add((prefix + candidate).toLowerCase());
    return candidate;
  }

  async function fileExists(dir, name) {
    try {
      await dir.getFileHandle(name);
      return true;
    } catch (err) {
      return false;
    }
  }

  async function writeBlob(dir, name, blob) {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(blob);
    } finally {
      await writable.close();
    }
  }

  function flagFolder(flag) {
    if (flag === "pick") return "留用";
    if (flag === "reject") return "淘汰";
    return "待定";
  }

  // 按同名文件策略决定最终文件名；返回 null 表示这张跳过
  async function resolveExportName(dir, prepared, used, keyPrefix, policy) {
    const clean = F.sanitizeFileName(prepared.name, "photo");
    const base = F.baseName(clean);
    const ext = clean.slice(base.length);
    const prefix = keyPrefix || "";
    const key = (name) => (prefix + name).toLowerCase();
    const mode = policy === "overwrite" || policy === "skip" ? policy : "suffix";
    let candidate = clean;
    if (!used.has(key(candidate))) {
      const exists = await fileExists(dir, candidate);
      if (!exists || mode === "overwrite") {
        used.add(key(candidate));
        return candidate;
      }
      if (mode === "skip") return null;
    }
    let n = 2;
    while (used.has(key(candidate)) || (await fileExists(dir, candidate))) {
      candidate = base + "-" + n + ext;
      n += 1;
      if (n > 9999) throw new Error("无法生成不重复的文件名");
    }
    used.add(key(candidate));
    return candidate;
  }

  // 导出前先探一遍目标文件夹，统计会撞名的文件
  function exportExtension(photo, config) {
    const fallback = photo.ext ? "." + photo.ext : "";
    if (config.mode === "copy") return fallback;
    if (config.watermark) return ".jpg";
    if (!photo.previewable || photo.isRaw) return fallback;
    return config.mode === "webp" ? ".webp" : ".jpg";
  }

  async function scanCollisions(dest, photos, config) {
    const dirs = new Map();
    async function dirFor(sub) {
      if (!sub) return dest;
      if (dirs.has(sub)) return dirs.get(sub);
      let dir = null;
      try {
        dir = await dest.getDirectoryHandle(sub, { create: false });
      } catch (err) {
        dir = null;
      }
      dirs.set(sub, dir);
      return dir;
    }
    const conflicts = [];
    const seen = new Set();
    for (let i = 0; i < photos.length; i += 1) {
      const photo = photos[i];
      const sub = config.subfolders ? flagFolder(getMeta(photo).flag) : "";
      const name = exportFileName(photo, i, exportExtension(photo, config), config);
      const key = (sub ? sub + "/" : "") + name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const dir = await dirFor(sub);
      if (!dir) continue;
      if (await fileExists(dir, name)) conflicts.push(name);
    }
    return conflicts;
  }

  async function destinationIsSource(dest) {
    if (!dest || !state.folderHandle) return false;
    try {
      if (typeof dest.isSameEntry === "function") {
        return await dest.isSameEntry(state.folderHandle);
      }
    } catch (err) {
      /* 老浏览器没有 isSameEntry */
    }
    return !!(state.folderName && dest.name === state.folderName);
  }

  function askCollision(conflicts, sameFolder) {
    return new Promise((resolve) => {
      const list = conflicts.slice(0, 6).join("\n");
      el.collideText.textContent =
        "目标文件夹里已经有 " +
        conflicts.length +
        " 个同名文件。覆盖会直接替换它们，另存为副本会加 -2、-3 编号。";
      el.collideSample.textContent =
        conflicts.length > 6 ? list + "\n…还有 " + (conflicts.length - 6) + " 个" : list;
      el.collideHint.textContent = sameFolder
        ? "这是原图所在的文件夹，覆盖会改动原图"
        : "覆盖会直接替换同名文件";
      el.collideHint.classList.toggle("is-danger", sameFolder);
      el.collideModal.hidden = false;
      const finish = (value) => {
        el.collideModal.hidden = true;
        el.collideOverwrite.removeEventListener("click", onOverwrite);
        el.collideSuffix.removeEventListener("click", onSuffix);
        el.collideCancel.removeEventListener("click", onCancel);
        el.collideModal.removeEventListener("click", onBackdrop);
        resolve(value);
      };
      const onOverwrite = () => finish("overwrite");
      const onSuffix = () => finish("suffix");
      const onCancel = () => finish("cancel");
      const onBackdrop = (event) => {
        if (event.target === el.collideModal) finish("cancel");
      };
      el.collideOverwrite.addEventListener("click", onOverwrite);
      el.collideSuffix.addEventListener("click", onSuffix);
      el.collideCancel.addEventListener("click", onCancel);
      el.collideModal.addEventListener("click", onBackdrop);
      requestAnimationFrame(() => el.collideSuffix.focus({ preventScroll: true }));
    });
  }

  async function prepareExportFile(photo, index, config) {
    let blob = photo.file;
    let extension = photo.ext ? "." + photo.ext : "";
    let copiedFallback = false;
    const orientation = orientationOf(photo);
    if (config.mode !== "copy") {
      // RAW is previewed through an embedded JPEG, but exported as the
      // original RAW file so we never silently downgrade image quality.
      if (!photo.previewable || photo.isRaw) {
        copiedFallback = true;
      } else {
        try {
          if (config.watermark) {
            const result = await F.watermarkBlob(photo.file, Object.assign({}, config.watermark, {
              rotation: orientation.rotation,
              mirror: orientation.mirror
            }));
            blob = result.blob;
            extension = ".jpg";
          } else {
            const result = await F.convertImage(
              photo.file,
              config.mode,
              config.maxEdge,
              config.quality,
              orientation
            );
            blob = result.blob;
            extension = config.mode === "webp" ? ".webp" : ".jpg";
          }
        } catch (err) {
          copiedFallback = true;
        }
      }
    }
    const name = exportFileName(photo, index, extension, config);
    return { blob: blob, name: name, copiedFallback: copiedFallback };
  }

  function beginExportRun(title, sub) {
    ex.busy = true;
    ex.cancel = false;
    el.exportProgress.hidden = false;
    el.exportSpinner.hidden = false;
    el.exportProgressIcon.hidden = true;
    el.exportProgressTitle.textContent = title || "正在导出…";
    el.exportProgressSub.textContent = sub || "";
    el.exportProgressBar.style.width = "0%";
    el.exportStop.hidden = false;
    el.exportStop.disabled = false;
    el.exportStop.textContent = "停止";
    el.exportDone.hidden = true;
    el.exportFailures.hidden = true;
    el.exportFailures.textContent = "";
    el.exportClose.disabled = true;
  }

  function setExportProgress(fraction, sub, title) {
    el.exportProgressBar.style.width = Math.round(F.clamp(fraction, 0, 1) * 100) + "%";
    if (sub != null) el.exportProgressSub.textContent = sub;
    if (title) el.exportProgressTitle.textContent = title;
  }

  function finishExportRun(result) {
    const res = result || {};
    ex.busy = false;
    ex.cancel = false;
    el.exportSpinner.hidden = true;
    el.exportProgressIcon.hidden = !res.ok;
    el.exportProgressIcon.textContent = res.ok ? "✓" : "×";
    el.exportProgressIcon.classList.toggle("is-error", !res.ok);
    el.exportStop.hidden = true;
    el.exportDone.hidden = false;
    el.exportClose.disabled = false;
    el.exportProgressBar.style.width = "100%";
    el.exportProgressTitle.textContent = res.title || (res.ok ? "导出完成" : "导出已停止");
    el.exportProgressSub.textContent = res.sub || "";
    if (res.failures && res.failures.length) {
      el.exportFailures.hidden = false;
      el.exportFailures.textContent =
        "有 " + res.failures.length + " 个文件未能导出：\n" + res.failures.slice(0, 8).join("\n");
    } else {
      el.exportFailures.hidden = true;
    }
    if (res.ok) toast(res.toast || "导出完成。", "success", 3800);
    else if (!res.cancelled) toast(res.toast || "导出没有完成。", "error", 4200);
    requestAnimationFrame(() => el.exportDone.focus({ preventScroll: true }));
  }

  async function runDirectoryExport(dest, photos, collisionPolicy) {
    const config = readExportConfig();
    if (collisionPolicy) config.collision = collisionPolicy;
    const total = photos.length;
    const used = new Set();
    const dirCache = new Map();
    const failures = [];
    let written = 0;
    let sidecars = 0;
    let fallback = 0;
    let skipped = 0;

    beginExportRun("正在导出…", "0 / " + total);

    async function getDir(sub) {
      if (!sub) return dest;
      if (dirCache.has(sub)) return dirCache.get(sub);
      const dir = await dest.getDirectoryHandle(sub, { create: true });
      dirCache.set(sub, dir);
      return dir;
    }

    for (let i = 0; i < total; i += 1) {
      if (ex.cancel) break;
      const photo = photos[i];
      try {
        const meta = getMeta(photo);
        const sub = config.subfolders ? flagFolder(meta.flag) : "";
        const dir = await getDir(sub);
        const prepared = await prepareExportFile(photo, i, config);
        if (prepared.copiedFallback) fallback += 1;
        const finalName = await resolveExportName(
          dir,
          prepared,
          used,
          sub ? sub + "/" : "",
          config.collision
        );
        if (!finalName) {
          skipped += 1;
          setExportProgress(
            (i + 1) / total * 0.98,
            i + 1 + " / " + total + " · 已跳过同名文件",
            "正在写入…"
          );
          continue;
        }
        await writeBlob(dir, finalName, prepared.blob);
        written += 1;
        if (config.xmp) {
          try {
            const xmpName = F.baseName(finalName) + ".xmp";
            const xmp = F.buildXmp(photo, getMeta(photo));
            await writeBlob(dir, xmpName, new Blob([xmp], { type: "application/rdf+xml" }));
            sidecars += 1;
          } catch (err) {
            failures.push(photo.name + "（XMP）：" + (err.message || err));
          }
        }
        setExportProgress(
          (i + 1) / total * 0.98,
          i + 1 + " / " + total + " · " + photo.name,
          "正在写入…"
        );
      } catch (err) {
        failures.push(photo.name + "：" + (err && err.message ? err.message : err));
        if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) break;
      }
      if (i % 6 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const cancelled = ex.cancel && written < total;
    if (cancelled) {
      finishExportRun({
        ok: false,
        cancelled: true,
        title: "已停止导出",
        sub: "已写入 " + written + " 张，停止时未完成 " + (total - written) + " 张。",
        failures: failures
      });
      return;
    }
    const detail =
      written +
      " 张已写入" +
      (sidecars ? " · " + sidecars + " 个 XMP" : "") +
      (fallback ? " · " + fallback + " 张原件复制" : "") +
      (skipped ? " · " + skipped + " 张因同名跳过" : "");
    const ok = written > 0 || failures.length === 0;
    finishExportRun({
      ok: ok,
      title: ok
        ? failures.length
          ? "导出完成（部分失败）"
          : "导出完成"
        : "导出失败",
      sub: detail + (failures.length ? " · " + failures.length + " 个失败" : ""),
      failures: failures,
      toast: ok
        ? written
          ? "已导出 " + written + " 张到目标文件夹。"
          : "全部同名，已跳过，没有写入文件。"
        : "没有文件成功写入。"
    });
  }

  function uniqueZipName(base, used) {
    let candidate = base;
    let n = 2;
    const slash = base.lastIndexOf("/");
    const folder = slash >= 0 ? base.slice(0, slash + 1) : "";
    const file = slash >= 0 ? base.slice(slash + 1) : base;
    const stem = F.baseName(file);
    const ext = file.slice(stem.length);
    while (used.has(candidate.toLowerCase())) {
      candidate = folder + stem + "-" + n + ext;
      n += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  async function runZipExport(photos) {
    const config = readExportConfig();
    const total = photos.length;
    const entries = [];
    const used = new Set();
    const failures = [];
    let written = 0;
    let fallback = 0;

    beginExportRun("正在准备 ZIP…", "0 / " + total);

    for (let i = 0; i < total; i += 1) {
      if (ex.cancel) break;
      const photo = photos[i];
      try {
        const meta = getMeta(photo);
        const folder = config.subfolders ? flagFolder(meta.flag) + "/" : "";
        const prepared = await prepareExportFile(photo, i, config);
        if (prepared.copiedFallback) fallback += 1;
        const name = uniqueZipName(folder + prepared.name, used);
        entries.push({ name: name, blob: prepared.blob });
        if (config.xmp) {
          const xmpName = folder + F.baseName(prepared.name) + ".xmp";
          entries.push({
            name: uniqueZipName(xmpName, used),
            blob: new Blob([F.buildXmp(photo, meta)], { type: "application/rdf+xml" })
          });
        }
        written += 1;
        setExportProgress(
          (i + 1) / total * 0.55,
          i + 1 + " / " + total + " · " + photo.name,
          "正在准备文件…"
        );
      } catch (err) {
        failures.push(photo.name + "：" + (err && err.message ? err.message : err));
      }
      if (i % 6 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (ex.cancel) {
      finishExportRun({
        ok: false,
        cancelled: true,
        title: "已停止导出",
        sub: "已在打包前停止，没有下载任何文件。",
        failures: failures
      });
      return;
    }
    if (!entries.length) {
      finishExportRun({
        ok: false,
        title: "没有可打包的文件",
        sub: "请检查导出范围。",
        failures: failures
      });
      return;
    }

    try {
      const zip = await F.zipStore(entries, (fraction, index, count) => {
        setExportProgress(
          0.55 + fraction * 0.44,
          index + " / " + count + " 个文件",
          "正在打包 ZIP…"
        );
      });
      if (ex.cancel) {
        finishExportRun({
          ok: false,
          cancelled: true,
          title: "已停止导出",
          sub: "ZIP 已取消，没有下载。",
          failures: failures
        });
        return;
      }
      const zipName =
        "FURIX_" +
        F.sanitizeFileName(state.folderName || "export", "export") +
        "_" +
        F.timestampForFile() +
        ".zip";
      F.downloadBlob(zip, zipName);
      finishExportRun({
        ok: true,
        title: "ZIP 已生成",
        sub:
          "已打包 " +
          entries.length +
          " 个文件（" +
          written +
          " 张照片）" +
          (fallback ? " · " + fallback + " 张原件复制" : "") +
          "，浏览器正在下载。",
        failures: failures,
        toast: "ZIP 已开始下载。"
      });
    } catch (err) {
      finishExportRun({
        ok: false,
        title: "打包失败",
        sub: err && err.message ? err.message : String(err),
        failures: failures
      });
    }
  }

  async function handleExportGo() {
    if (ex.busy) return;
    const photos = exportPhotos(ex.scope);
    if (!photos.length) {
      toast("当前范围内没有照片。");
      return;
    }
    if (!("showDirectoryPicker" in window)) {
      runZipExport(photos);
      return;
    }
    let dest = null;
    try {
      dest = await window.showDirectoryPicker({
        id: "furix-export-output",
        mode: "readwrite",
        startIn: "pictures"
      });
    } catch (err) {
      if (err && err.name === "AbortError") return;
      toast(
        "无法打开目标文件夹" +
          (err && err.message ? "：" + err.message : "") +
          "。已改为打包 ZIP 下载。",
        "error",
        4800
      );
      runZipExport(photos);
      return;
    }
    let policy = ex.collision || "ask";
    if (policy === "ask") {
      let conflicts = [];
      try {
        if (photos.length > 200) {
          toast("正在检查目标文件夹里的同名文件…", "success", 2200);
        }
        conflicts = await scanCollisions(dest, photos, readExportConfig());
      } catch (err) {
        conflicts = [];
      }
      if (conflicts.length) {
        const sameFolder = await destinationIsSource(dest);
        const choice = await askCollision(conflicts, sameFolder);
        if (choice === "cancel") {
          updateExportSummary();
          toast("已取消导出。", "success", 2600);
          return;
        }
        policy = choice;
      } else {
        policy = "suffix";
      }
    }
    runDirectoryExport(dest, photos, policy).catch((err) => {
      finishExportRun({
        ok: false,
        title: "导出失败",
        sub: err && err.message ? err.message : String(err)
      });
    });
  }

  function exportSelectionFromInspector() {
    if (!state.selection.size) return;
    openExport("selected");
  }

  /* ============================================================
     help & menu
     ============================================================ */

  function openHelp() {
    closeMenu();
    el.helpModal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => el.helpClose.focus({ preventScroll: true }));
  }

  function closeHelpIfOpen() {
    if (!el.helpModal.hidden) {
      el.helpModal.hidden = true;
      document.body.classList.remove("modal-open");
    }
  }

  function closeHelp() {
    el.helpModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function toggleInspector() {
    state.inspector = !state.inspector;
    el.app.classList.toggle("inspector-hidden", !state.inspector);
    savePrefs();
  }

  function toggleMenu() {
    if (el.menu.hidden) openMenu();
    else closeMenu();
  }

  function openMenu() {
    updateMenuState();
    el.menu.hidden = false;
    el.btnMenu.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    if (el.menu.hidden) return;
    el.menu.hidden = true;
    el.btnMenu.setAttribute("aria-expanded", "false");
  }

  function updateMenuState() {
    const hasPhotos = state.photos.length > 0;
    const hasHandle = !!state.folderHandle;
    const hasMarks = activeMarkCount() > 0;
    const hasProject = !!state.project;
    const actions = {
      rescan: hasPhotos && (hasHandle || state.demo),
      "export-catalog": hasPhotos,
      "import-catalog": hasPhotos,
      "clear-marks": hasMarks,
      // 项目模式下即使一张素材都没挂，也要能退回首页
      "close-library": hasPhotos || hasProject
    };
    $$("#menu button[data-action]").forEach((btn) => {
      const action = btn.dataset.action;
      if (action in actions) btn.disabled = !actions[action];
    });
    const closeLabel = document.querySelector('#menu button[data-action="close-library"] span');
    if (closeLabel) closeLabel.textContent = hasProject ? "关闭项目" : "关闭当前图库";
  }

  async function handleMenuAction(action) {
    closeMenu();
    if (action === "rescan") {
      if (state.folderHandle) await loadFromHandle(state.folderHandle);
      else if (state.demo) await loadDemo(true);
      else toast("请重新选择照片文件夹。");
      return;
    }
    if (action === "export-catalog") {
      exportCatalog();
      return;
    }
    if (action === "import-catalog") {
      el.jsonInput.value = "";
      el.jsonInput.click();
      return;
    }
    if (action === "clear-marks") {
      clearAllMarks();
      return;
    }
    if (action === "close-library") {
      closeLibrary();
      return;
    }
    if (action === "help") {
      openHelp();
    }
  }

  /* ============================================================
     keyboard
     ============================================================ */

  function isTypingTarget(target) {
    return !!(
      target &&
      target.closest &&
      target.closest("input, textarea, select, [contenteditable='true']")
    );
  }

  function onKeyDown(event) {
    const key = event.key;
    const mod = event.ctrlKey || event.metaKey;

    if (!el.exportModal.hidden) {
      if (key === "Escape" && !ex.busy) {
        event.preventDefault();
        closeExport();
      }
      return;
    }
    if (!el.helpModal.hidden) {
      if (key === "Escape" || key === "Enter") {
        event.preventDefault();
        closeHelp();
      }
      return;
    }

    if (state.loading) {
      if (key === "Escape" && !el.loading.hidden) {
        state.loadCancelled = true;
      }
      return;
    }

    if (isTypingTarget(event.target)) {
      if (key === "Escape") {
        event.target.blur();
      }
      return;
    }

    if (
      (key === " " || key === "Enter") &&
      event.target &&
      event.target.closest &&
      event.target.closest("button, a, [role='button']") &&
      event.target.matches &&
      event.target.matches(":focus-visible")
    ) {
      return;
    }

    if (!el.menu.hidden && key === "Escape") {
      closeMenu();
      event.preventDefault();
      return;
    }

    if (mod) {
      const lower = key.toLowerCase();
      if (lower === "a" && !event.shiftKey) {
        if (state.view === "grid" && state.visible.length) {
          event.preventDefault();
          selectAllVisible();
        }
        return;
      }
      if (lower === "a" && event.shiftKey) {
        event.preventDefault();
        clearSelection();
        return;
      }
      if (lower === "e") {
        event.preventDefault();
        openExport();
        return;
      }
      if (lower === "f") {
        event.preventDefault();
        el.search.focus();
        el.search.select();
        return;
      }
      return;
    }

    if (event.altKey) return;

    if (key === "?" || (event.shiftKey && key === "/")) {
      event.preventDefault();
      openHelp();
      return;
    }

    if (key === "Escape") {
      if (state.view === "loupe") {
        event.preventDefault();
        closeLoupe();
        return;
      }
      if (el.search.value) {
        el.search.value = "";
        setQuery("");
        event.preventDefault();
        return;
      }
      if (filterIsActive()) {
        clearAllFilters();
        event.preventDefault();
        return;
      }
      if (state.selection.size) {
        clearSelection();
        event.preventDefault();
      }
      return;
    }

    if (!state.photos.length) return;

    const markKeys = ["p", "x", "u", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    const lower = key.toLowerCase();

    // 方向：Shift + R / E / M
    if (event.shiftKey && !mod) {
      if (lower === "r") {
        event.preventDefault();
        applyOrientationAction("right");
        return;
      }
      if (lower === "e") {
        event.preventDefault();
        applyOrientationAction("left");
        return;
      }
      if (lower === "m") {
        event.preventDefault();
        applyOrientationAction("mirror");
        return;
      }
    }

    if (state.view === "loupe") {
      if (key === "ArrowLeft") {
        event.preventDefault();
        navigateLoupe(-1);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        navigateLoupe(1);
        return;
      }
      if (key === " ") {
        event.preventDefault();
        toggleZoom();
        return;
      }
      if (lower === "z") {
        event.preventDefault();
        toggleZoom();
        return;
      }
      if (lower === "f") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }
      if (lower === "g") {
        event.preventDefault();
        closeLoupe();
        return;
      }
      if (lower === "i") {
        event.preventDefault();
        toggleInspector();
        return;
      }
    } else {
      if (key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        moveFocus(key === "ArrowLeft" ? -1 : 1, event.shiftKey);
        return;
      }
      if (key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        const delta = key === "ArrowUp" ? -gridColumns() : gridColumns();
        moveFocus(delta, event.shiftKey);
        return;
      }
      if (key === "Home" || key === "End") {
        if (!state.visible.length) return;
        event.preventDefault();
        const photo = key === "Home" ? state.visible[0] : state.visible[state.visible.length - 1];
        if (event.shiftKey) selectRange(state.anchorId || photo.id, photo.id);
        else selectOnly(photo.id);
        return;
      }
      if (key === " " || key === "Enter") {
        event.preventDefault();
        const id =
          state.focusId ||
          (state.selection.size ? state.selection.values().next().value : null) ||
          (state.visible[0] && state.visible[0].id);
        if (id) openLoupe(id, { keepSelection: state.selection.size > 1 });
        return;
      }
      if (lower === "l") {
        event.preventDefault();
        const id =
          state.focusId ||
          (state.selection.size ? state.selection.values().next().value : null) ||
          (state.visible[0] && state.visible[0].id);
        if (id) openLoupe(id, { keepSelection: state.selection.size > 1 });
        return;
      }
      if (lower === "i") {
        event.preventDefault();
        toggleInspector();
        return;
      }
      if (lower === "r" && state.folderHandle) {
        event.preventDefault();
        loadFromHandle(state.folderHandle);
        return;
      }
      if (key === "[" || key === "]") {
        event.preventDefault();
        setThumbSize(state.thumbSize + (key === "]" ? 16 : -16), true);
        return;
      }
    }

    if (markKeys.includes(lower)) {
      event.preventDefault();
      if (lower === "p") setFlag("pick");
      else if (lower === "x") setFlag("reject");
      else if (lower === "u") setFlag("none");
      else if (lower >= "0" && lower <= "5") setRating(Number(lower));
      else if (lower === "6") toggleColor("red");
      else if (lower === "7") toggleColor("yellow");
      else if (lower === "8") toggleColor("green");
      else if (lower === "9") toggleColor("blue");
    }
  }

  /* ============================================================
     drag & drop
     ============================================================ */

  function onDragEnter(event) {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) {
      return;
    }
    event.preventDefault();
    dragDepth += 1;
    el.dropOverlay.hidden = false;
  }

  function onDragOver(event) {
    if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes("Files")) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event) {
    if (!event.dataTransfer) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) el.dropOverlay.hidden = true;
  }

  function onDrop(event) {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragDepth = 0;
    el.dropOverlay.hidden = true;
    loadFromDrop(event);
  }

  /* ============================================================
     debug parameters
     ============================================================ */

  function applyDebugParams() {
    const selectParam = params.get("select");
    if (selectParam) {
      const indexes = selectParam
        .split(",")
        .map((n) => Number(n) - 1)
        .filter((n) => n >= 0 && n < state.visible.length);
      if (indexes.length) {
        state.selection = new Set(indexes.map((i) => state.visible[i].id));
        state.focusId = state.visible[indexes[0]].id;
        state.anchorId = state.focusId;
        syncSelectionUI(true);
      }
    }
    if (params.get("view") === "loupe" && state.visible.length) {
      const index = F.clamp((Number(params.get("i")) || 1) - 1, 0, state.visible.length - 1);
      openLoupe(state.visible[index].id, { keepSelection: true });
    }
    const dialog = params.get("dialog");
    if (dialog === "export") {
      window.setTimeout(() => openExport(params.get("scope") || undefined), 60);
    } else if (dialog === "help") {
      openHelp();
    }
  }

  /* ============================================================
     events
     ============================================================ */

  function bindEvents() {
    el.btnFolders.forEach((btn) => {
      if (btn) btn.addEventListener("click", openFolderAction);
    });
    el.btnOpen.addEventListener("click", openFolderAction);
    el.btnDemo.addEventListener("click", loadDemo);
    el.hubList.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove]");
      if (remove) {
        event.stopPropagation();
        recentRemove(remove.dataset.remove);
        return;
      }
      const row = event.target.closest(".hub-row");
      if (row) openRecent(row.dataset.code);
    });
    el.hubList.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest(".hub-row");
      if (!row) return;
      event.preventDefault();
      openRecent(row.dataset.code);
    });
    el.peSource.addEventListener("click", pickSource);
    if (el.peCloseProject) el.peCloseProject.addEventListener("click", closeLibrary);
    if (el.peSwitch) {
      el.peSwitch.addEventListener("click", () => {
        if (!el.peRecent) return;
        el.peRecent.hidden = !el.peRecent.hidden;
      });
    }
    if (el.peRecent) {
      el.peRecent.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-recent]");
        if (btn) switchToProject(btn.dataset.recent);
      });
    }
    el.peExport.addEventListener("click", () => openProjectExport());
    el.peDelivery.addEventListener("click", openDeliveryModal);
    el.btnNewProject.addEventListener("click", openProjectModal);
    el.btnOpenProject.addEventListener("click", openProjectFolder);
    el.btnAdoptProject.addEventListener("click", adoptExistingProject);
    el.adoptClose.addEventListener("click", closeAdoptModal);
    el.adoptCancel.addEventListener("click", closeAdoptModal);
    el.adoptModal.addEventListener("click", (event) => {
      if (event.target === el.adoptModal) closeAdoptModal();
    });
    el.adoptConfirm.addEventListener("click", confirmAdopt);
    el.adoptAll.addEventListener("click", () => {
      const allDone = adopt.rows.length > 0 && adopt.rows.every((row) => row.delivered);
      adopt.rows.forEach((row) => {
        row.delivered = !allDone;
      });
      renderAdoptRows();
    });
    el.projectClose.addEventListener("click", closeProjectModal);
    el.projectCancel.addEventListener("click", closeProjectModal);
    el.projectModal.addEventListener("click", (event) => {
      if (event.target === el.projectModal) closeProjectModal();
    });
    el.projectParentBtn.addEventListener("click", pickProjectParent);
    el.projectCreate.addEventListener("click", createProjectFromModal);
    el.projectNameInput.addEventListener("input", updateProjectPreview);
    el.projectClientsInput.addEventListener("input", updateProjectPreview);
    el.btnSource.addEventListener("click", pickSource);
    el.btnProjectMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleProjectMenu();
    });
    el.projectMenu.addEventListener("click", (event) => {
      const recent = event.target.closest("button[data-recent]");
      if (recent) {
        switchToProject(recent.dataset.recent);
        return;
      }
      const btn = event.target.closest("button[data-action]");
      if (btn) handleProjectMenuAction(btn.dataset.action);
    });
    el.btnSessions.addEventListener("click", openSessionsModal);
    el.btnProjectExport.addEventListener("click", openProjectExport);
    el.btnReturns.addEventListener("click", openReturnsModal);
    el.btnDelivery.addEventListener("click", openDeliveryModal);
    el.btnLedger.addEventListener("click", openLedgerModal);
    el.btnClients.addEventListener("click", openClientsModal);
    el.deliveryClose.addEventListener("click", closeDeliveryModal);
    el.deliveryCancel.addEventListener("click", closeDeliveryModal);
    el.deliveryDone.addEventListener("click", closeDeliveryModal);
    el.deliveryModal.addEventListener("click", (event) => {
      if (event.target === el.deliveryModal) closeDeliveryModal();
    });
    el.deliveryStart.addEventListener("click", () => runDelivery());
    el.deliveryRefresh.addEventListener("click", async () => {
      el.deliveryRows.innerHTML = '<div class="session-empty">正在重新扫描…</div>';
      await scanDeliveries();
      renderDeliveryRows();
    });
    el.deliveryForce.addEventListener("change", renderDeliveryRows);
    el.deliveryRows.addEventListener("click", (event) => {
      const btn = event.target.closest(".dv-pack");
      if (!btn || delivery.busy) return;
      runDelivery(btn.dataset.client);
    });
    el.deliveryStop.addEventListener("click", () => {
      if (!delivery.busy) return;
      delivery.cancel = true;
      el.deliveryStop.disabled = true;
      el.deliveryStop.textContent = "正在停止…";
      el.deliveryProgressTitle.textContent = "正在停止…";
    });
    el.ledgerClose.addEventListener("click", closeLedgerModal);
    el.ledgerOk.addEventListener("click", closeLedgerModal);
    el.ledgerModal.addEventListener("click", (event) => {
      if (event.target === el.ledgerModal) closeLedgerModal();
    });
    el.ledgerPick.addEventListener("click", pickLedgerFolder);
    el.ledgerRefresh.addEventListener("click", async () => {
      await readLedgerRows();
      renderLedgerModal();
    });
    el.clientsClose.addEventListener("click", closeClientsModal);
    el.clientsCancel.addEventListener("click", closeClientsModal);
    el.clientsModal.addEventListener("click", (event) => {
      if (event.target === el.clientsModal) closeClientsModal();
    });
    el.clientsSave.addEventListener("click", saveClientsFromModal);
    el.btnArchive.addEventListener("click", openArchiveModal);
    el.archiveClose.addEventListener("click", closeArchiveModal);
    el.archiveOk.addEventListener("click", closeArchiveModal);
    el.archiveModal.addEventListener("click", (event) => {
      if (event.target === el.archiveModal) closeArchiveModal();
    });
    [el.arcNegatives, el.arcRaws, el.arcProducts, el.arcPacks].forEach((box) => {
      if (box) box.addEventListener("change", renderArchiveRows);
    });
    el.archiveRefresh.addEventListener("click", async () => {
      archive.contents = new Map();
      archive.armed = "";
      await renderArchiveRows();
    });
    el.archiveRows.addEventListener("click", (event) => {
      const go = event.target.closest(".arc-go");
      if (go && !go.disabled) {
        runArchive(go.dataset.client);
        return;
      }
      const clean = event.target.closest(".arc-clean");
      if (clean) {
        armArchiveClean(clean.dataset.client, clean);
        return;
      }
      const restore = event.target.closest(".arc-restore");
      if (restore) restoreArchive(restore.dataset.client);
    });
    el.packList.addEventListener("change", (event) => {
      const box = event.target.closest("input[data-pack]");
      if (!box) return;
      if (box.checked) packs.selected.add(box.dataset.pack);
      else packs.selected.delete(box.dataset.pack);
      renderPackList();
    });
    el.packAll.addEventListener("change", () => {
      if (el.packAll.checked) packs.list.forEach((pack) => packs.selected.add(pack.name));
      else packs.selected.clear();
      renderPackList();
    });
    el.packDelete.addEventListener("click", deleteSelectedPacks);
    el.returnsClose.addEventListener("click", closeReturnsModal);
    el.returnsCancel.addEventListener("click", closeReturnsModal);
    el.returnDone.addEventListener("click", closeReturnsModal);
    el.returnsModal.addEventListener("click", (event) => {
      if (event.target === el.returnsModal) closeReturnsModal();
    });
    el.returnsStart.addEventListener("click", runReturns);
    el.returnJpg.addEventListener("change", updateReturnSummaries);
    el.returnRows.addEventListener("input", updateReturnSummaries);
    el.returnRows.addEventListener("click", (event) => {
      const chip = event.target.closest(".rt-chip");
      if (!chip) return;
      const row = chip.closest(".return-row");
      if (!row) return;
      const clientId = row.dataset.client;
      const token = chip.dataset.token;
      const name = chip.dataset.name;
      if (!returns.choices[clientId]) returns.choices[clientId] = {};
      if (!name) {
        if (returns.choices[clientId][token] === "skip") delete returns.choices[clientId][token];
        else returns.choices[clientId][token] = "skip";
      } else if (returns.choices[clientId][token] === name) {
        delete returns.choices[clientId][token];
      } else {
        returns.choices[clientId][token] = name;
      }
      updateReturnSummaries();
    });
    el.returnStop.addEventListener("click", () => {
      if (!returns.busy) return;
      returns.cancel = true;
      el.returnStop.disabled = true;
      el.returnStop.textContent = "正在停止…";
      el.returnProgressTitle.textContent = "正在停止…";
    });
    el.clientList.addEventListener("click", (event) => {
      const row = event.target.closest("[data-client]");
      if (row) setClientFilter(row.dataset.client);
    });
    el.sessionFilter.addEventListener("change", () => setSessionFilter(el.sessionFilter.value));
    el.sessionsClose.addEventListener("click", closeSessionsModal);
    el.sessionsCancel.addEventListener("click", closeSessionsModal);
    el.sessionsModal.addEventListener("click", (event) => {
      if (event.target === el.sessionsModal) closeSessionsModal();
    });
    el.sessionsSave.addEventListener("click", saveSessionsFromModal);
    el.sessionAuto.addEventListener("click", () => {
      state.sessionGap = Math.max(5, Number(el.sessionGapInput.value) || 30);
      state.sessionMin = Math.max(1, Number(el.sessionMinInput.value) || 15);
      const suggested = suggestSessions();
      if (!suggested.length) {
        toast("没有找到足够大的拍摄段，可以手动新增场次。", "error");
        return;
      }
      const ordered = suggested.map((s, index) => ({ ...s, name: "场次 " + (index + 1) }));
      renderSessionRows(ordered);
    });
    el.sessionAdd.addEventListener("click", () => {
      const draft = readSessionDraft();
      const base = Date.now();
      const start = Math.floor(base / 60000) * 60000;
      draft.push({
        id: "s" + (draft.length + 1) + "_" + start,
        name: "场次 " + (draft.length + 1),
        start: start,
        end: start + 60 * 60 * 1000,
        clientId: null
      });
      renderSessionRows(draft);
    });
    el.sessionRows.addEventListener("click", (event) => {
      const btn = event.target.closest(".session-delete");
      if (!btn) return;
      const row = btn.closest(".session-row");
      const draft = readSessionDraft().filter((s) => s.id !== row.dataset.id);
      renderSessionRows(draft);
    });
    el.sessionRows.addEventListener("input", () => {
      const draft = readSessionDraft();
      let count = 0;
      for (const session of draft) count += sessionPhotoCount(session);
      el.sessionSummary.textContent = draft.length + " 场 · " + count + " 张";
    });
    el.peClose.addEventListener("click", closeProjectExport);
    el.peCancel.addEventListener("click", closeProjectExport);
    el.peDone.addEventListener("click", closeProjectExport);
    el.peModal.addEventListener("click", (event) => {
      if (event.target === el.peModal) closeProjectExport();
    });
    el.peScope.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-scope]");
      if (!btn || pe.busy) return;
      pe.scope = btn.dataset.scope;
      updatePeUI();
    });
    el.peClient.addEventListener("change", updatePeUI);
    el.peJpg.addEventListener("change", updatePeUI);
    el.peRaw.addEventListener("change", updatePeUI);
    el.peStart.addEventListener("click", runProjectExport);
    el.peStop.addEventListener("click", () => {
      if (!pe.busy) return;
      pe.cancel = true;
      el.peStop.disabled = true;
      el.peStop.textContent = "正在停止…";
      el.peProgressTitle.textContent = "正在停止…";
    });
    el.brand.addEventListener("click", (event) => {
      event.preventDefault();
      if (state.photos.length) closeMenu();
    });

    el.fileInput.addEventListener("change", () => {
      if (el.fileInput.files && el.fileInput.files.length) {
        loadFromFiles(el.fileInput.files);
        el.fileInput.value = "";
      }
    });
    el.jsonInput.addEventListener("change", () => {
      if (el.jsonInput.files && el.jsonInput.files[0]) {
        importCatalog(el.jsonInput.files[0]);
      }
    });

    el.search.addEventListener("input", () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = window.setTimeout(() => setQuery(el.search.value), 150);
    });
    el.search.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        clearTimeout(state.searchTimer);
        setQuery(el.search.value);
      }
      if (event.key === "Escape") {
        el.search.value = "";
        setQuery("");
        el.search.blur();
      }
    });

    el.sort.addEventListener("change", () => {
      state.sort = el.sort.value;
      savePrefs();
      applyFilters({ resetScroll: false });
    });

    el.thumbRange.addEventListener("input", () => setThumbSize(el.thumbRange.value, false));
    el.thumbRange.addEventListener("change", () => setThumbSize(state.thumbSize, true));
    el.thumbSmaller.addEventListener("click", () => setThumbSize(state.thumbSize - 16, true));
    el.thumbLarger.addEventListener("click", () => setThumbSize(state.thumbSize + 16, true));

    $$(".filter-row").forEach((btn) => {
      btn.addEventListener("click", () => setFlagFilter(btn.dataset.flag));
    });
    el.ratingFilter.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-min]");
      if (btn) setRatingFilter(btn.dataset.min);
    });
    el.colorFilter.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-color]");
      if (btn) toggleColorFilter(btn.dataset.color);
    });
    el.clearColors.addEventListener("click", () => {
      state.filter.colors.clear();
      $$("#color-filter button").forEach((btn) => btn.classList.remove("is-active"));
      el.clearColors.classList.add("hidden");
      applyFilters({ resetScroll: true });
    });
    el.clearExif.addEventListener("click", clearExifFilters);
    [
      [el.filterCamera, "camera"],
      [el.filterLens, "lens"],
      [el.filterFocal, "focal"],
      [el.filterAperture, "aperture"]
    ].forEach(([select, kind]) => {
      select.addEventListener("change", () => setExifFilter(kind, select.value));
    });
    el.clearFilters.addEventListener("click", clearAllFilters);
    el.fileFilter.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-file]");
      if (btn) setFileFilter(btn.dataset.file);
    });
    el.dupToggle.addEventListener("click", toggleHideDuplicates);

    el.viewGrid.addEventListener("click", closeLoupe);
    el.viewLoupe.addEventListener("click", () => {
      const id =
        state.focusId ||
        (state.selection.size ? state.selection.values().next().value : null) ||
        (state.visible[0] && state.visible[0].id);
      if (id) openLoupe(id, { keepSelection: state.selection.size > 1 });
    });

    el.btnExport.addEventListener("click", () => {
      if (state.project) openProjectExport();
      else openExport();
    });
    el.inspectorExport.addEventListener("click", () => {
      if (state.project) openProjectExport("selected");
      else exportSelectionFromInspector();
    });
    el.loupeExport.addEventListener("click", () => {
      if (state.project) openProjectExport("selected");
      else openExport("selected");
    });

    el.inspectorClose.addEventListener("click", toggleInspector);
    el.inspectorPreview.addEventListener("click", () => {
      const photo = primarySelected();
      if (photo) openLoupe(photo.id, { keepSelection: state.selection.size > 1 });
    });
    el.inspectorImg.addEventListener("load", () => el.inspectorImg.classList.add("loaded"));
    el.inspectorImg.addEventListener("error", () => el.inspectorImg.classList.remove("loaded"));

    el.flagButtons.addEventListener("click", (event) => {
      const btn = event.target.closest(".flag-btn");
      if (btn) setFlag(btn.dataset.flag);
    });
    el.starButtons.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-value]");
      if (btn) setRating(Number(btn.dataset.value));
    });
    el.colorRow.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-color]");
      if (!btn) return;
      if (btn.dataset.color === "none") clearColor();
      else toggleColor(btn.dataset.color);
    });
    el.orientRow.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-orient]");
      if (!btn) return;
      applyOrientationAction(btn.dataset.orient);
    });
    el.loupeRotLeft.addEventListener("click", () => applyOrientationAction("left"));
    el.loupeRotRight.addEventListener("click", () => applyOrientationAction("right"));

    el.gridScroll.addEventListener("pointerdown", beginMarquee);
    el.gridScroll.addEventListener("scroll", onGridScroll, { passive: true });
    window.addEventListener("resize", onGridResize);
    window.addEventListener("resize", () => {
      if (el.exportModal && !el.exportModal.hidden) {
        pinExportScroll();
        scheduleWmPreview();
      }
    });
    el.grid.addEventListener("click", (event) => {
      if (marqueeSwallowedClick()) return;
      const card = event.target.closest(".card");
      if (!card) return;
      handleCardClick(card.dataset.id, event);
    });
    el.grid.addEventListener("dblclick", (event) => {
      if (marqueeSwallowedClick()) return;
      const card = event.target.closest(".card");
      if (!card) return;
      selectOnly(card.dataset.id);
      openLoupe(card.dataset.id);
    });
    el.gridScroll.addEventListener("click", (event) => {
      if (marqueeSwallowedClick()) return;
      if (
        event.target === el.gridScroll ||
        event.target === el.grid ||
        event.target === el.empty
      ) {
        clearSelection();
      }
    });

    el.loupeBack.addEventListener("click", closeLoupe);
    el.loupePrev.addEventListener("click", () => navigateLoupe(-1));
    el.loupeNext.addEventListener("click", () => navigateLoupe(1));
    el.loupeZoom.addEventListener("click", toggleZoom);
    el.loupeFullscreen.addEventListener("click", toggleFullscreen);
    el.filmstrip.addEventListener("click", (event) => {
      const item = event.target.closest(".film-item");
      if (item) showPhoto(item.dataset.id, { select: true });
    });
    el.loupeImg.addEventListener("click", (event) => {
      if (state.dragMoved) {
        state.dragMoved = false;
        return;
      }
      event.stopPropagation();
      toggleZoom();
    });
    el.loupeImg.addEventListener("load", () => {
      const photo = state.byId.get(state.currentLoupeId);
      if (photo) {
        photo.width = el.loupeImg.naturalWidth;
        photo.height = el.loupeImg.naturalHeight;
      }
      el.loupeImg.classList.add("loaded");
      el.loupeUnsupported.hidden = true;
      updateInspectorMeta();
    });
    el.loupeImg.addEventListener("error", () => {
      const photo = state.byId.get(state.currentLoupeId);
      if (photo) showLoupeUnsupported(photo, photo.isRaw ? "raw" : undefined);
    });
    el.loupeCanvas.addEventListener(
      "wheel",
      (event) => {
        if (state.view !== "loupe") return;
        const photo = state.byId.get(state.currentLoupeId);
        if (!photo || !photo.previewable) return;
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.0016);
        setZoom(state.zoom * factor);
      },
      { passive: false }
    );
    el.loupeCanvas.addEventListener("pointerdown", (event) => {
      if (state.zoom <= 1.01) return;
      if (event.target !== el.loupeImg) return;
      state.dragging = true;
      state.dragMoved = false;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragOriginX = state.panX;
      state.dragOriginY = state.panY;
      el.loupeFrame.classList.add("is-dragging");
      el.loupeCanvas.setPointerCapture(event.pointerId);
    });
    el.loupeCanvas.addEventListener("pointermove", (event) => {
      if (!state.dragging) return;
      const dx = event.clientX - state.dragStartX;
      const dy = event.clientY - state.dragStartY;
      if (Math.abs(dx) + Math.abs(dy) > 3) state.dragMoved = true;
      state.panX = state.dragOriginX + dx;
      state.panY = state.dragOriginY + dy;
      clampPan();
      applyZoom();
    });
    function endDrag() {
      if (!state.dragging) return;
      state.dragging = false;
      el.loupeFrame.classList.remove("is-dragging");
    }
    el.loupeCanvas.addEventListener("pointerup", endDrag);
    el.loupeCanvas.addEventListener("pointercancel", endDrag);

    el.exportClose.addEventListener("click", closeExport);
    el.exportCancel.addEventListener("click", closeExport);
    el.exportModal.addEventListener("click", (event) => {
      if (event.target === el.exportModal) closeExport();
    });
    el.exportScope.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-scope]");
      if (!btn || btn.disabled) return;
      ex.scope = btn.dataset.scope;
      updateExportUI();
    });
    el.exportMode.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-mode]");
      if (!btn) return;
      ex.mode = btn.dataset.mode;
      updateExportUI();
    });
    el.exportNaming.addEventListener("change", () => {
      ex.naming = el.exportNaming.value;
      updateExportUI();
    });
    el.exportQuality.addEventListener("input", () => {
      el.qualityVal.textContent = el.exportQuality.value;
      updateExportSummary();
    });
    el.exportSize.addEventListener("change", updateExportSummary);
    el.exportGo.addEventListener("click", handleExportGo);
    el.exportCollision.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-collision]");
      if (!btn) return;
      ex.collision = btn.dataset.collision;
      $$("#export-collision button").forEach((item) => {
        item.classList.toggle("is-active", item === btn);
      });
      updateExportSummary();
    });
    el.exportZip.addEventListener("click", () => {
      if (ex.busy) return;
      const photos = exportPhotos(ex.scope);
      if (!photos.length) return;
      runZipExport(photos);
    });
    el.exportStop.addEventListener("click", () => {
      if (!ex.busy) return;
      ex.cancel = true;
      el.exportStop.disabled = true;
      el.exportStop.textContent = "停止中…";
      el.exportProgressSub.textContent = "正在完成当前文件…";
    });
    el.exportDone.addEventListener("click", closeExport);
    el.wmTextOn.addEventListener("change", () => {
      wm.textOn = el.wmTextOn.checked;
      wmRefreshGate();
      wmSave();
      updateExportUI();
    });
    el.wmLogoOn.addEventListener("change", () => {
      wm.logoOn = el.wmLogoOn.checked;
      wmRefreshGate();
      wmSave();
      updateExportUI();
    });
    el.wmText.addEventListener("input", () => {
      wm.text = el.wmText.value;
      wmSave();
      scheduleWmPreview();
    });
    el.wmAnchor.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-anchor]");
      if (!btn) return;
      wm.anchor = btn.dataset.anchor;
      $$("#wm-anchor button").forEach((item) => {
        item.classList.toggle("is-active", item === btn);
      });
      wmSave();
      scheduleWmPreview();
    });
    el.wmSize.addEventListener("input", () => {
      wm.fontSize = Number(el.wmSize.value) || 3;
      el.wmSizeVal.textContent = wm.fontSize + "%";
      wmSave();
      scheduleWmPreview();
    });
    el.wmInset.addEventListener("input", () => {
      wm.inset = Number(el.wmInset.value) || 0;
      el.wmInsetVal.textContent = wm.inset + "%";
      wmSave();
      scheduleWmPreview();
    });
    el.wmOpacity.addEventListener("input", () => {
      wm.opacity = Number(el.wmOpacity.value) || 70;
      el.wmOpacityVal.textContent = wm.opacity + "%";
      wmSave();
      scheduleWmPreview();
    });
    el.wmColor.addEventListener("change", () => {
      wm.color = el.wmColor.value;
      wmSave();
      scheduleWmPreview();
    });
    el.wmFont.addEventListener("change", () => {
      if (el.wmFont.value === "custom") {
        el.wmFamily.focus();
        if (!wm.family) {
          el.wmFontNote.textContent = "在左边输入字体名，或点「读取本机字体」挑一个";
        }
        return;
      }
      wm.font = WM_FONTS[el.wmFont.value] ? el.wmFont.value : "sans";
      wm.family = "";
      el.wmFamily.value = "";
      wmSave();
      scheduleWmPreview();
    });
    el.wmFamily.addEventListener("input", () => {
      wm.family = el.wmFamily.value.trim();
      el.wmFont.value = wm.family ? "custom" : wm.font;
      wmSave();
      scheduleWmPreview();
    });
    el.wmFontLoad.addEventListener("click", loadSystemFonts);
    el.wmWeight.addEventListener("change", () => {
      wm.weight = ["400", "600", "800"].includes(el.wmWeight.value) ? el.wmWeight.value : "600";
      wmSave();
      scheduleWmPreview();
    });
    el.wmLogoSize.addEventListener("input", () => {
      wm.logoSize = Number(el.wmLogoSize.value) || 14;
      el.wmLogoVal.textContent = wm.logoSize + "%";
      wmSave();
      scheduleWmPreview();
    });
    el.wmLogoInset.addEventListener("input", () => {
      wm.logoInset = Number(el.wmLogoInset.value) || 0;
      el.wmLogoInsetVal.textContent = wm.logoInset + "%";
      wmSave();
      scheduleWmPreview();
    });
    el.wmLogoOpacity.addEventListener("input", () => {
      wm.logoOpacity = Number(el.wmLogoOpacity.value) || 85;
      el.wmLogoOpacityVal.textContent = wm.logoOpacity + "%";
      wmSave();
      scheduleWmPreview();
    });
    el.wmLogoAnchor.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-anchor]");
      if (!btn) return;
      wm.logoAnchor = btn.dataset.anchor;
      $$("#wm-logo-anchor button").forEach((item) => {
        item.classList.toggle("is-active", item === btn);
      });
      wmSave();
      scheduleWmPreview();
    });
    el.wmLogoFile.addEventListener("change", () => {
      const file = el.wmLogoFile.files && el.wmLogoFile.files[0];
      el.wmLogoFile.value = "";
      pickWmLogo(file);
    });
    el.wmLogoClear.addEventListener("click", () => {
      wm.logo = null;
      wm.logoName = "";
      wmSyncInputs();
      scheduleWmPreview();
    });

    el.helpClose.addEventListener("click", closeHelp);
    el.helpOk.addEventListener("click", closeHelp);
    el.helpModal.addEventListener("click", (event) => {
      if (event.target === el.helpModal) closeHelp();
    });
    el.btnHelp2.addEventListener("click", openHelp);

    el.btnMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });
    el.menu.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-action]");
      if (btn && !btn.disabled) handleMenuAction(btn.dataset.action);
    });
    document.addEventListener("click", (event) => {
      if (el.menu.hidden) return;
      if (el.menu.contains(event.target) || el.btnMenu.contains(event.target)) return;
      closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!el.projectMenu || el.projectMenu.hidden) return;
      if (el.projectMenu.contains(event.target) || el.btnProjectMenu.contains(event.target)) return;
      closeProjectMenu();
    });

    el.loadingCancel.addEventListener("click", () => {
      if (!state.loading) return;
      state.loadCancelled = true;
      el.loadingCancel.disabled = true;
      el.loadingTitle.textContent = "正在取消…";
      el.loadingSub.textContent = "已停止读取新文件";
    });

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    window.addEventListener("pagehide", () => {
      flushPendingMarks();
    });
  }

  window.__FURIX__ = {
    state: state,
    requestThumb: requestThumb,
    applyFilters: applyFilters,
    openExport: openExport,
    runDirectoryExport: runDirectoryExport,
    finishLoad: finishLoad,
    prepareAdopt: prepareAdopt,
    confirmAdopt: confirmAdopt,
    adopt: adopt,
    renderAdoptRows: renderAdoptRows,
    renderGrid: renderGrid,
    updateVirtualWindow: updateVirtualWindow,
    gridMetrics: gridMetrics,
    virtual: virtual,
    scrollCardIntoView: scrollCardIntoView,
    thumbStats: () => ({
      queued: thumbQueue.length,
      active: thumbActive,
      concurrency: thumbConcurrency(),
      prefetching: thumbPrefetchTimer !== 0,
      debug: thumbDebug
    }),
    thumbCacheGet: thumbCacheGet,
    readExportConfig: readExportConfig,
    watermark: wm,
    renderWmPreview: renderWmPreview,
    openLoupe: openLoupe,
    buildPhotos: buildPhotos,
    finishProjectSource: finishProjectSource,
    applyProjectPayload: applyProjectPayload,
    updateProjectUI: updateProjectUI,
    openProjectExport: openProjectExport,
    runProjectExport: runProjectExport,
    suggestSessions: suggestSessions,
    clientForPhoto: clientForPhoto,
    sessionForPhoto: sessionForPhoto,
    saveProjectNow: saveProjectNow,
    openReturnsModal: openReturnsModal,
    closeReturnsModal: closeReturnsModal,
    loadReturnLists: loadReturnLists,
    updateReturnSummaries: updateReturnSummaries,
    runReturns: runReturns,
    returns: returns,
    openDeliveryModal: openDeliveryModal,
    closeDeliveryModal: closeDeliveryModal,
    scanDeliveries: scanDeliveries,
    runDelivery: runDelivery,
    delivery: delivery,
    deliveryPackageName: deliveryPackageName,
    deliveryIssue: deliveryIssue,
    renderDeliveryRows: renderDeliveryRows,
    openLedgerModal: openLedgerModal,
    closeLedgerModal: closeLedgerModal,
    readLedgerRows: readLedgerRows,
    parseLedgerCsv: parseLedgerCsv,
    saveLedgerHandle: saveLedgerHandle,
    writeLedgerRows: writeLedgerRows,
    ledger: ledger,
    openClientsModal: openClientsModal,
    saveClientsFromModal: saveClientsFromModal,
    openProjectModal: openProjectModal,
    updateProjectPreview: updateProjectPreview,
    openArchiveModal: openArchiveModal,
    renderArchiveRows: renderArchiveRows,
    runArchive: runArchive,
    armArchiveClean: armArchiveClean,
    deleteArchiveOriginals: deleteArchiveOriginals,
    restoreArchive: restoreArchive,
    archive: archive,
    scanDeliveryPacks: scanDeliveryPacks,
    renderPackList: renderPackList,
    deleteSelectedPacks: deleteSelectedPacks,
    packs: packs,
    closeLibrary: closeLibrary,
    closeProjectExport: closeProjectExport
  };
})();
