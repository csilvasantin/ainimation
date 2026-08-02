const canvas = document.querySelector("#hero-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const contactEmail = ["hello", "ainimation.studio"].join("@");
let uiAudioContext = null;
let uiAudioReady = false;
let selectedStageKeyframe = null;
let selectedStageTarget = null;
const interfaceThemeStorageKey = "ainimation-interface-theme";

function storedInterfaceTheme() {
  try {
    return localStorage.getItem(interfaceThemeStorageKey) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyInterfaceTheme(theme = "dark") {
  const mode = theme === "light" ? "light" : "dark";
  document.body.dataset.interfaceTheme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "light" ? "#eef3f9" : "#0f1115");
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === mode));
  });
}

applyInterfaceTheme(storedInterfaceTheme());

function contactMailto(subject = "AInimation Studio") {
  return `mai${"lto"}:${contactEmail}?subject=${encodeURIComponent(subject)}`;
}

function getUiAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  uiAudioContext ||= new AudioContextClass();
  return uiAudioContext;
}

function unlockUiAudio() {
  const context = getUiAudioContext();
  if (!context) return;
  if (context.state === "suspended") context.resume().catch(() => {});
  uiAudioReady = true;
}

function playUiTick(kind = "tap") {
  if (!uiAudioReady) return;
  const context = getUiAudioContext();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const settings = {
    import: [740, 0.055, 0.026],
    select: [520, 0.045, 0.02],
    stage: [330, 0.06, 0.024],
    tap: [620, 0.032, 0.014],
  }[kind] || [620, 0.032, 0.014];

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(settings[0], now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, settings[0] * 0.62), now + settings[1]);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings[2], now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[1]);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + settings[1] + 0.01);
}

document.addEventListener("pointerdown", unlockUiAudio, { once: true });
document.addEventListener("keydown", unlockUiAudio, { once: true });
document.addEventListener("click", (event) => {
  if (!event.target.closest("button, a, [role='button'], input[type='file']")) return;
  playUiTick("tap");
}, true);

let width = 0;
let height = 0;
let pixelRatio = 1;
let frame = 0;
let context = null;

function resizeCanvas() {
  if (!canvas || !context) return;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function roundedRect(x, y, w, h, radius) {
  if (!context) return;
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function draw() {
  if (!canvas || !context) return;
  frame += reduceMotion.matches ? 0 : 1;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#17120f";
  context.fillRect(0, 0, width, height);

  const columns = Math.max(4, Math.ceil(width / 180));
  const rows = Math.max(4, Math.ceil(height / 150));
  const cellW = width / columns;
  const cellH = height / rows;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const index = x + y * columns;
      const phase = Math.sin(frame * 0.012 + index * 0.72);
      const lift = phase * 16;
      const pad = 12 + ((index % 3) * 4);
      const rectX = x * cellW + pad;
      const rectY = y * cellH + pad + lift;
      const rectW = cellW - pad * 2;
      const rectH = cellH - pad * 2;

      context.globalAlpha = 0.68;
      context.fillStyle = index % 4 === 0 ? "#c8ff5f" : index % 4 === 1 ? "#ff654f" : index % 4 === 2 ? "#31bed1" : "#7c5cff";
      roundedRect(rectX, rectY, rectW, rectH, 8);
      context.fill();

      context.globalAlpha = 0.52;
      context.strokeStyle = "#fffaf0";
      context.lineWidth = 1;
      for (let stripe = 14; stripe < rectH; stripe += 22) {
        context.beginPath();
        context.moveTo(rectX + 10, rectY + stripe);
        context.lineTo(rectX + rectW - 10, rectY + stripe + phase * 4);
        context.stroke();
      }
    }
  }

  context.globalAlpha = 0.18;
  context.strokeStyle = "#fffaf0";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 28) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + Math.sin(frame * 0.01 + x) * 12, height);
    context.stroke();
  }

  context.globalAlpha = 1;

  if (!reduceMotion.matches) {
    requestAnimationFrame(draw);
  }
}

if (canvas) {
  context = canvas.getContext("2d");
  resizeCanvas();
  draw();
}

window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
  renderStageRulers();
});

reduceMotion.addEventListener("change", () => {
  if (!reduceMotion.matches) {
    requestAnimationFrame(draw);
  } else {
    draw();
  }
});

const params = new URLSearchParams(window.location.search);
const enterStudio = document.body.classList.contains("studio-page") && params.get("intro") !== "1";

if (enterStudio) {
  document.body.classList.add("studio-entering", "studio-entered");
  const jumpToWorkspace = () => {
    const workspace = document.querySelector("#workspace");
    if (!workspace) return;
    workspace.scrollIntoView({ block: "start" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  window.addEventListener("load", jumpToWorkspace);
  window.setTimeout(jumpToWorkspace, 80);
  window.setTimeout(jumpToWorkspace, 420);
  window.setTimeout(jumpToWorkspace, 900);
  window.setTimeout(jumpToWorkspace, 1600);
}

function initDirectorWindowManager() {
  const workbench = document.querySelector(".director-workbench");
  if (!workbench) return;

  const windows = [...workbench.querySelectorAll(".director-window[data-window]")];
  const taskbar = workbench.querySelector(".window-taskbar");
  const menu = document.querySelector(".window-menu");
  const menuButton = menu?.querySelector(".menu-button");
  let topZ = 40;

  function isStackedLayout() {
    return window.matchMedia("(max-width: 860px)").matches;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function bringToFront(win) {
    topZ += 1;
    win.style.zIndex = String(topZ);
  }

  function applyRect(win, rect) {
    if (isStackedLayout()) return;
    const bounds = workbench.getBoundingClientRect();
    const isTools = win.dataset.window === "tools";
    const minWidth = isTools ? 96 : 220;
    const minHeight = isTools ? 120 : 36;
    const width = clamp(rect.width, minWidth, Math.max(minWidth, bounds.width));
    const height = clamp(rect.height, minHeight, Math.max(minHeight, bounds.height));
    const maxLeft = Math.max(0, bounds.width - width);
    const maxTop = Math.max(0, bounds.height - height);
    let left = clamp(rect.left, 0, maxLeft);
    let top = clamp(rect.top, 0, maxTop);
    const snap = 54;
    if (left <= snap) left = 0;
    if (maxLeft - left <= snap) left = maxLeft;
    if (top <= snap) top = 0;
    if (maxTop - top <= snap) top = maxTop;
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
    window.requestAnimationFrame(() => renderStageRulers());
  }

  function addResizeHandles(win) {
    const directions = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];
    const cornerHandle = win.querySelector(".resize-handle:not([data-resize-direction])");
    if (cornerHandle) {
      cornerHandle.classList.add("resize-se");
      cornerHandle.dataset.resizeDirection = "se";
    }
    for (const direction of directions) {
      if (win.querySelector(`[data-resize-direction="${direction}"]`)) continue;
      const handle = document.createElement("span");
      handle.className = `resize-handle resize-${direction}`;
      handle.dataset.resizeDirection = direction;
      handle.setAttribute("aria-hidden", "true");
      win.append(handle);
    }
  }

  function rectValue(value, fallback) {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function currentRect(win) {
    return {
      left: rectValue(win.style.left, win.offsetLeft),
      top: rectValue(win.style.top, win.offsetTop),
      width: rectValue(win.style.width, win.offsetWidth),
      height: rectValue(win.style.height, win.offsetHeight),
    };
  }

  function overlaps(first, second) {
    return (
      first.left < second.left + second.width &&
      first.left + first.width > second.left &&
      first.top < second.top + second.height &&
      first.top + first.height > second.top
    );
  }

  function candidateFits(rect, bounds) {
    return (
      rect.left >= 0 &&
      rect.top >= 0 &&
      rect.left + rect.width <= bounds.width &&
      rect.top + rect.height <= bounds.height
    );
  }

  function magnetizeRect(win, rect) {
    if (isStackedLayout() || win.classList.contains("is-docked")) return rect;
    const bounds = workbench.getBoundingClientRect();
    const snap = 18;
    const gap = 8;
    const next = { ...rect };
    const maxLeft = Math.max(0, bounds.width - next.width);
    const maxTop = Math.max(0, bounds.height - next.height);

    if (Math.abs(next.left) <= snap) next.left = 0;
    if (Math.abs(next.top) <= snap) next.top = 0;
    if (Math.abs(maxLeft - next.left) <= snap) next.left = maxLeft;
    if (Math.abs(maxTop - next.top) <= snap) next.top = maxTop;

    const visibleWindows = windows.filter((other) => (
      other !== win &&
      !other.classList.contains("is-hidden") &&
      !other.classList.contains("is-minimized") &&
      !other.classList.contains("is-docked")
    ));

    for (const other of visibleWindows) {
      const otherRect = currentRect(other);
      const isVerticallyNear = next.top < otherRect.top + otherRect.height && next.top + next.height > otherRect.top;
      const isHorizontallyNear = next.left < otherRect.left + otherRect.width && next.left + next.width > otherRect.left;
      const xSnaps = [
        { value: otherRect.left - next.width - gap, distance: Math.abs(next.left + next.width - otherRect.left) },
        { value: otherRect.left + otherRect.width + gap, distance: Math.abs(next.left - (otherRect.left + otherRect.width)) },
        { value: otherRect.left, distance: Math.abs(next.left - otherRect.left) },
        { value: otherRect.left + otherRect.width - next.width, distance: Math.abs(next.left + next.width - (otherRect.left + otherRect.width)) },
      ];
      const ySnaps = [
        { value: otherRect.top - next.height - gap, distance: Math.abs(next.top + next.height - otherRect.top) },
        { value: otherRect.top + otherRect.height + gap, distance: Math.abs(next.top - (otherRect.top + otherRect.height)) },
        { value: otherRect.top, distance: Math.abs(next.top - otherRect.top) },
        { value: otherRect.top + otherRect.height - next.height, distance: Math.abs(next.top + next.height - (otherRect.top + otherRect.height)) },
      ];
      const xSnap = xSnaps
        .filter((candidate) => candidate.distance <= snap)
        .sort((a, b) => a.distance - b.distance)[0];
      const ySnap = ySnaps
        .filter((candidate) => candidate.distance <= snap)
        .sort((a, b) => a.distance - b.distance)[0];

      if (xSnap && isVerticallyNear) next.left = xSnap.value;
      if (ySnap && isHorizontallyNear) next.top = ySnap.value;

      if (!overlaps(next, otherRect)) continue;
      const separationCandidates = [
        { left: otherRect.left - next.width - gap, top: next.top },
        { left: otherRect.left + otherRect.width + gap, top: next.top },
        { left: next.left, top: otherRect.top - next.height - gap },
        { left: next.left, top: otherRect.top + otherRect.height + gap },
      ]
        .map((candidate) => ({ ...next, ...candidate }))
        .filter((candidate) => candidateFits(candidate, bounds))
        .filter((candidate) => visibleWindows.every((item) => item === other || !overlaps(candidate, currentRect(item))))
        .sort((a, b) => {
          const aDistance = Math.abs(a.left - next.left) + Math.abs(a.top - next.top);
          const bDistance = Math.abs(b.left - next.left) + Math.abs(b.top - next.top);
          return aDistance - bDistance;
        });

      if (separationCandidates[0]) {
        next.left = separationCandidates[0].left;
        next.top = separationCandidates[0].top;
      }
    }

    return next;
  }

  function fullWorkbenchRect() {
    return {
      left: 0,
      top: 0,
      width: workbench.clientWidth,
      height: workbench.clientHeight,
    };
  }

  function defaultLayoutRect(win, fallbackRect) {
    if (isStackedLayout()) return fallbackRect;
    const bounds = workbench.getBoundingClientRect();
    const gap = 10;
    const sideWidth = clamp(Math.round(bounds.width * 0.21), 260, 430);
    const stageWidth = Math.max(420, bounds.width - sideWidth - gap);
    const timelineHeight = clamp(Math.round(bounds.height * 0.2), 250, 360);
    const timelineTop = Math.max(0, bounds.height - timelineHeight);
    const lowerHeight = clamp(Math.round(bounds.height * 0.15), 140, 210);
    const lowerTop = Math.max(0, timelineTop - lowerHeight - gap);
    const stageHeight = Math.max(360, timelineTop - gap);
    const sideLeft = stageWidth + gap;
    const castHeight = clamp(Math.round(bounds.height * 0.18), 190, 300);
    const toolsWidth = 132;
    const toolsTop = castHeight + gap;
    const toolsAvailableHeight = Math.max(0, timelineTop - toolsTop - gap);
    const toolsHeight = toolsAvailableHeight > 0
      ? Math.min(560, Math.max(120, toolsAvailableHeight))
      : 120;
    const inspectorTop = toolsTop + toolsHeight + gap;
    const inspectorHeight = Math.max(160, timelineTop - inspectorTop - gap);
    const scriptWidth = Math.min(540, Math.max(260, stageWidth * 0.34));
    const promptWidth = Math.min(780, Math.max(340, stageWidth * 0.56));
    const promptLeft = stageWidth >= scriptWidth + promptWidth + gap
      ? Math.min(stageWidth * 0.36, Math.max(0, stageWidth - promptWidth))
      : scriptWidth + gap;

    const layouts = {
      stage: { left: 0, top: 0, width: stageWidth, height: stageHeight },
      cast: { left: sideLeft, top: 0, width: sideWidth, height: castHeight },
      tools: { left: sideLeft, top: toolsTop, width: toolsWidth, height: toolsHeight },
      inspector: { left: sideLeft, top: inspectorTop, width: sideWidth, height: inspectorHeight },
      score: { left: 0, top: timelineTop, width: bounds.width, height: timelineHeight },
      script: { left: 0, top: lowerTop, width: scriptWidth, height: lowerHeight },
      prompt: {
        left: promptLeft,
        top: lowerTop,
        width: promptWidth,
        height: lowerHeight,
      },
    };

    return layouts[win.dataset.window] || fallbackRect;
  }

  function restoreAbsoluteWindow(win) {
    if (win.style.position !== "fixed") return;
    const bounds = workbench.getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    win.style.position = "absolute";
    applyRect(win, {
      left: rect.left - bounds.left,
      top: rect.top - bounds.top,
      width: rect.width,
      height: rect.height,
    });
  }

  function dockTimeline(win) {
    if (isStackedLayout()) return;
    const bounds = workbench.getBoundingClientRect();
    win.classList.remove("is-minimized", "is-hidden");
    win.classList.add("is-maximized", "is-docked");
    win.style.position = "fixed";
    win.style.left = `${bounds.left}px`;
    win.style.top = `${bounds.top}px`;
    win.style.width = `${bounds.width}px`;
    win.style.height = `${bounds.height}px`;
  }

  function refreshWindowBounds(resetLayout = false) {
    if (isStackedLayout()) return;
    windows.forEach((win) => {
      const rect = currentRect(win);
      applyRect(win, resetLayout ? defaultLayoutRect(win, rect) : rect);
    });
  }

  window.refreshDirectorWindows = refreshWindowBounds;

  function openWindow(id) {
    const win = windows.find((item) => item.dataset.window === id);
    if (!win) return;
    win.classList.remove("is-hidden", "is-minimized");
    if (id === "score" && !isStackedLayout()) {
      dockTimeline(win);
    }
    bringToFront(win);
    updateTaskbar();
  }

  function closeWindow(win) {
    win.classList.add("is-hidden");
    win.classList.remove("is-minimized", "is-maximized", "is-docked");
    updateTaskbar();
  }

  function minimizeWindow(win) {
    win.classList.remove("is-hidden", "is-maximized", "is-docked");
    win.classList.add("is-minimized");
    bringToFront(win);
    updateTaskbar();
  }

  function toggleMaximize(win) {
    if (isStackedLayout()) return;
    if (win.classList.contains("is-maximized")) {
      win.classList.remove("is-maximized", "is-docked");
      restoreAbsoluteWindow(win);
      if (win._restoreRect) applyRect(win, win._restoreRect);
      return;
    }
    win._restoreRect = currentRect(win);
    win.classList.remove("is-minimized", "is-hidden");
    win.classList.add("is-maximized");
    if (win.dataset.window === "score") {
      dockTimeline(win);
    } else {
      applyRect(win, {
      left: 0,
      top: 0,
      width: workbench.clientWidth,
      height: workbench.clientHeight,
      });
    }
    bringToFront(win);
    updateTaskbar();
  }

  function updateTaskbar() {
    if (!taskbar) return;
    taskbar.innerHTML = "";
    const minimized = windows.filter((win) => win.classList.contains("is-minimized"));
    for (const win of minimized) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = win.dataset.windowTitle || win.dataset.window || "Window";
      button.addEventListener("click", () => openWindow(win.dataset.window));
      taskbar.append(button);
    }
  }

  for (const win of windows) {
    const rect = {
      left: Number(win.dataset.x || 20),
      top: Number(win.dataset.y || 20),
      width: Number(win.dataset.w || 320),
      height: Number(win.dataset.h || 240),
    };
    applyRect(win, defaultLayoutRect(win, rect));
    bringToFront(win);
    addResizeHandles(win);

    win.addEventListener("pointerdown", () => bringToFront(win));

    const titlebar = win.querySelector(".window-titlebar");
    titlebar?.addEventListener("dblclick", (event) => {
      if (event.target.closest("button") || isStackedLayout()) return;
      event.preventDefault();
      toggleMaximize(win);
    });
    titlebar?.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button") || isStackedLayout() || win.classList.contains("is-maximized")) return;
      event.preventDefault();
      bringToFront(win);
      win.classList.add("dragging");
      const startX = event.clientX;
      const startY = event.clientY;
      const start = currentRect(win);
      titlebar.setPointerCapture(event.pointerId);

      const move = (moveEvent) => {
        const bounds = workbench.getBoundingClientRect();
        let nextLeft = start.left + moveEvent.clientX - startX;
        if (win.dataset.window === "score") {
          const edgeSnap = 96;
          const maxLeft = Math.max(0, bounds.width - start.width);
          if (moveEvent.clientX <= bounds.left + edgeSnap) nextLeft = 0;
          if (moveEvent.clientX >= bounds.right - edgeSnap) nextLeft = maxLeft;
        }
        applyRect(win, magnetizeRect(win, {
          ...start,
          left: nextLeft,
          top: start.top + moveEvent.clientY - startY,
        }));
      };
      const up = () => {
        win.classList.remove("dragging");
        titlebar.removeEventListener("pointermove", move);
        titlebar.removeEventListener("pointerup", up);
        titlebar.removeEventListener("pointercancel", up);
      };
      titlebar.addEventListener("pointermove", move);
      titlebar.addEventListener("pointerup", up);
      titlebar.addEventListener("pointercancel", up);
    });

    win.querySelectorAll(".resize-handle").forEach((resizeHandle) => resizeHandle.addEventListener("pointerdown", (event) => {
      if (isStackedLayout()) return;
      event.preventDefault();
      event.stopPropagation();
      bringToFront(win);
      if (win.classList.contains("is-maximized")) {
        win.classList.remove("is-maximized", "is-docked");
        restoreAbsoluteWindow(win);
      }
      const handle = event.currentTarget;
      const direction = handle.dataset.resizeDirection || "se";
      const startX = event.clientX;
      const startY = event.clientY;
      const start = currentRect(win);
      handle.setPointerCapture(event.pointerId);

      const move = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const next = { ...start };
        if (direction.includes("e")) next.width = start.width + deltaX;
        if (direction.includes("s")) next.height = start.height + deltaY;
        if (direction.includes("w")) {
          next.left = start.left + deltaX;
          next.width = start.width - deltaX;
        }
        if (direction.includes("n")) {
          next.top = start.top + deltaY;
          next.height = start.height - deltaY;
        }
        const bounds = workbench.getBoundingClientRect();
        if (direction === "s" || direction === "se" || direction === "sw") {
          next.height = Math.min(next.height, bounds.height - next.top);
        }
        if (direction === "e" || direction === "ne" || direction === "se") {
          next.width = Math.min(next.width, bounds.width - next.left);
        }
        applyRect(win, {
          ...next,
        });
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    }));

    win.querySelectorAll("[data-window-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const action = button.dataset.windowAction;
        if (action === "close") closeWindow(win);
        if (action === "minimize") minimizeWindow(win);
        if (action === "maximize") toggleMaximize(win);
      });
    });
  }

  const toolsWindow = windows.find((item) => item.dataset.window === "tools");
  if (toolsWindow) bringToFront(toolsWindow);

  menuButton?.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  document.querySelectorAll("[data-open-window]").forEach((button) => {
    button.addEventListener("click", () => {
      openWindow(button.dataset.openWindow);
      menu?.classList.remove("open");
      menuButton?.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu?.contains(event.target)) {
      menu?.classList.remove("open");
      menuButton?.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("resize", () => {
    refreshWindowBounds();
  });
}

initDirectorWindowManager();
window.setTimeout(() => window.refreshDirectorWindows?.(true), 80);
window.setTimeout(() => window.refreshDirectorWindows?.(true), 320);

function initStudioCollabBar() {
  const shell = document.querySelector(".director-shell");
  const collabBar = shell?.querySelector(".studio-collab-bar");
  const closeButton = collabBar?.querySelector(".collab-close");
  const openButton = shell?.querySelector("[data-collab-open]");
  if (!shell || !collabBar || !closeButton) return;

  const refreshWorkspace = () => {
    requestAnimationFrame(() => {
      window.refreshDirectorWindows?.(true);
      requestAnimationFrame(() => window.refreshDirectorWindows?.(true));
    });
  };

  if (collabBar.classList.contains("is-hidden")) refreshWorkspace();

  closeButton.addEventListener("click", () => {
    collabBar.classList.add("is-hidden");
    refreshWorkspace();
  });

  openButton?.addEventListener("click", () => {
    collabBar.classList.remove("is-hidden");
    refreshWorkspace();
  });
}

initStudioCollabBar();

function initImportMenu() {
  const palette = document.querySelector(".tool-palette");
  const menu = palette?.querySelector(".import-menu");
  const toolsButton = document.querySelector("[data-tools-open]");
  if (!palette || !menu) return;

  const setToolsVisible = (visible) => {
    palette.classList.toggle("is-hidden", !visible);
    toolsButton?.setAttribute("aria-pressed", String(visible));
    if (!visible) {
      palette.classList.remove("open");
      palette.dataset.openFor = "";
    }
  };
  let toolsPointerHandled = false;

  palette.querySelectorAll("[data-import-trigger]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setToolsVisible(true);
      palette.dataset.importMode = button.dataset.importTrigger;
      palette.classList.toggle("open", palette.dataset.openFor !== button.dataset.importTrigger);
      palette.dataset.openFor = palette.classList.contains("open") ? button.dataset.importTrigger : "";
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("[data-tools-open]")) return;
    event.preventDefault();
    event.stopPropagation();
    toolsPointerHandled = true;
    setToolsVisible(palette.classList.contains("is-hidden"));
  });

  toolsButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (toolsPointerHandled) {
      toolsPointerHandled = false;
      return;
    }
    setToolsVisible(palette.classList.contains("is-hidden"));
  });

  document.addEventListener("click", (event) => {
    if (!palette.contains(event.target)) {
      palette.classList.remove("open");
      palette.dataset.openFor = "";
    }
  });
}

initImportMenu();

function initStageColorPicker() {
  const stageCanvas = document.querySelector(".stage-canvas");
  const backgroundInput = document.querySelector(".stage-color-input");
  const backgroundSwatch = document.querySelector(".stage-background-swatch");
  const foregroundInput = document.querySelector(".foreground-color-input");
  const foregroundSwatch = document.querySelector(".foreground-swatch");
  if (!stageCanvas || !backgroundInput || !backgroundSwatch || !foregroundInput || !foregroundSwatch) return;

  const storageKey = "admira-stage-background";
  const foregroundStorageKey = "admira-stage-foreground";
  const defaultColor = backgroundInput.value || "#10141f";
  const defaultForegroundColor = foregroundInput.value || "#edf6ff";
  const applyBackgroundColor = (color) => {
    const nextColor = /^#[0-9a-f]{6}$/i.test(color) ? color : defaultColor;
    backgroundInput.value = nextColor;
    backgroundSwatch.style.backgroundColor = nextColor;
    stageCanvas.style.setProperty("--stage-fill", nextColor);
    localStorage.setItem(storageKey, nextColor);
  };
  const applyForegroundColor = (color) => {
    const nextColor = /^#[0-9a-f]{6}$/i.test(color) ? color : defaultForegroundColor;
    foregroundInput.value = nextColor;
    foregroundSwatch.style.backgroundColor = nextColor;
    stageCanvas.style.setProperty("--stage-foreground", nextColor);
    localStorage.setItem(foregroundStorageKey, nextColor);
    window.dispatchEvent(new CustomEvent("stageforegroundchange", { detail: { color: nextColor } }));
  };

  applyBackgroundColor(localStorage.getItem(storageKey) || defaultColor);
  applyForegroundColor(localStorage.getItem(foregroundStorageKey) || defaultForegroundColor);
  backgroundSwatch.addEventListener("click", () => backgroundInput.click());
  backgroundInput.addEventListener("input", () => applyBackgroundColor(backgroundInput.value));
  foregroundSwatch.addEventListener("click", () => foregroundInput.click());
  foregroundInput.addEventListener("input", () => applyForegroundColor(foregroundInput.value));
}

initStageColorPicker();

function initFileImportMenu(menuSelector, buttonSelector, inputSelector) {
  const menu = document.querySelector(menuSelector);
  const button = menu?.querySelector(buttonSelector);
  const fileInputs = [...(menu?.querySelectorAll(inputSelector) || [])];
  if (!menu || !button || !fileInputs.length) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !menu.classList.contains("open");
    menu.classList.toggle("open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });

  fileInputs.forEach((fileInput) => {
    fileInput.addEventListener("change", () => {
      if (fileInput.dataset.memberImportMode) {
        importMemberFiles(fileInput.files, fileInput.dataset.memberImportMode || "image");
      }
      fileInput.value = "";
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    }
  });
}

initFileImportMenu(".member-menu", "[data-member-menu]", "[data-project-open-input]");
initFileImportMenu(".cast-menu", "[data-cast-menu]", "[data-cast-file-input]");

function initSettingsMenu() {
  const menu = document.querySelector(".settings-menu");
  const button = menu?.querySelector("[data-settings-menu]");
  const choices = [...(menu?.querySelectorAll("[data-theme-choice]") || [])];
  if (!menu || !button || !choices.length) return;

  const closeMenu = () => {
    menu.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  };

  applyInterfaceTheme(storedInterfaceTheme());

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = !menu.classList.contains("open");
    menu.classList.toggle("open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });

  choices.forEach((choice) => {
    choice.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const mode = choice.dataset.themeChoice === "light" ? "light" : "dark";
      try {
        localStorage.setItem(interfaceThemeStorageKey, mode);
      } catch {}
      applyInterfaceTheme(mode);
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) closeMenu();
  });
}

initSettingsMenu();

function selectedStageTargetExists(plan = null) {
  if (!selectedStageTarget) return false;
  const current = plan || currentPlan();
  if (Number.isInteger(selectedStageTarget.castIndex)) {
    const member = current.cast?.[selectedStageTarget.castIndex];
    return Boolean(member?.imported && member?.src && member?.onStage !== false);
  }
  if (selectedStageTarget.stageItemId) {
    return (current.stageItems || []).some((item) => item.id === selectedStageTarget.stageItemId);
  }
  return false;
}

function updateEditMenuState() {
  const deleteButton = document.querySelector('[data-edit-command="delete"]');
  if (deleteButton) deleteButton.disabled = !selectedStageTargetExists();
}

function setSelectedStageTarget(target) {
  selectedStageTarget = target || null;
  updateEditMenuState();
}

function clearSelectedStageTarget() {
  setSelectedStageTarget(null);
}

function isSelectedCastTarget(castIndex) {
  return selectedStageTarget?.castIndex === castIndex;
}

function selectedCastTargetScope(castIndex) {
  return selectedStageTarget?.castIndex === castIndex ? selectedStageTarget.scope || "" : "";
}

function isSelectedStageItemTarget(stageItemId) {
  return Boolean(stageItemId && selectedStageTarget?.stageItemId === stageItemId);
}

function removeCastMemberFromStage(castIndex) {
  const plan = currentPlan();
  if (!Number.isInteger(castIndex) || !plan.cast?.[castIndex]) return false;
  plan.cast[castIndex] = {
    ...plan.cast[castIndex],
    onStage: false,
    stageX: undefined,
    stageY: undefined,
    stageW: undefined,
    stageH: undefined,
    keyframes: [],
  };
  selectedStageKeyframe = selectedStageKeyframe?.castIndex === castIndex ? null : selectedStageKeyframe;
  clearSelectedStageTarget();
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  syncStageToFrame(currentTimelineFrame(), false);
  return true;
}

function removeStageItem(stageItemId) {
  if (!stageItemId) return false;
  const plan = currentPlan();
  const before = (plan.stageItems || []).length;
  plan.stageItems = (plan.stageItems || []).filter((item) => item.id !== stageItemId);
  if (plan.stageItems.length === before) return false;
  selectedStageKeyframe = selectedStageKeyframe?.stageItemId === stageItemId ? null : selectedStageKeyframe;
  clearSelectedStageTarget();
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  syncStageToFrame(currentTimelineFrame(), false);
  return true;
}

function deleteSelectedStageTarget() {
  if (!selectedStageTargetExists()) {
    clearSelectedStageTarget();
    return false;
  }
  if (Number.isInteger(selectedStageTarget.castIndex)) {
    return removeCastMemberFromStage(selectedStageTarget.castIndex);
  }
  if (selectedStageTarget.stageItemId) {
    return removeStageItem(selectedStageTarget.stageItemId);
  }
  return false;
}

function initEditMenu() {
  const menu = document.querySelector(".edit-menu");
  const button = menu?.querySelector("[data-edit-menu]");
  if (!menu || !button) return;

  const closeMenu = () => {
    menu.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !menu.classList.contains("open");
    menu.classList.toggle("open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("[data-edit-command]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (item.disabled) return;
      const command = item.dataset.editCommand;
      if (command === "find") {
        window.find?.("");
      } else if (command === "delete" && deleteSelectedStageTarget()) {
        playUiTick("select");
      } else {
        const execCommand = command === "pasteText" ? "paste" : command;
        try {
          document.execCommand(execCommand);
        } catch {}
      }
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) closeMenu();
  });
}

initEditMenu();
updateEditMenuState();

function currentTimelineFrame() {
  return Number(document.querySelector(".score-playhead")?.dataset.frame || 1);
}

function setTimelineFrame(frame, shouldPlay = false) {
  const playhead = document.querySelector(".score-playhead");
  const totalFrames = Number(playhead?.getAttribute("aria-valuemax") || 240);
  if (!playhead) {
    syncStageToFrame(frame, shouldPlay);
    return;
  }
  const currentFrame = Math.min(Math.max(Number(frame || 1), 1), Math.max(1, totalFrames));
  const displayFrames = Math.max(1, Number(playhead.dataset.displayFrames || totalFrames));
  const left = displayFrames <= 1 ? 0 : ((currentFrame - 1) / (displayFrames - 1)) * 100;
  playhead.style.left = `${left}%`;
  playhead.dataset.frame = String(currentFrame);
  playhead.setAttribute("aria-valuenow", String(currentFrame));
  syncStageToFrame(currentFrame, shouldPlay);
}

function syncStageToFrame(frame = currentTimelineFrame(), shouldPlay = false) {
  const plan = currentPlan();
  document.querySelectorAll(".stage-imported-member[data-cast-index]").forEach((figure) => {
    const media = figure.querySelector("video, audio");
    const member = plan.cast?.[Number(figure.dataset.castIndex)];
    if (!member) return;
    const start = Number(member.startFrame || 1);
    const duration = Math.max(1, Number(member.durationFrames || 24));
    const isActive = frame >= start && frame <= start + duration - 1;
    const keyframe = interpolateStageKeyframe(member, frame, Number(figure.dataset.stageIndex || 0));
    if (keyframe) {
      figure.style.left = `${keyframe.x}%`;
      figure.style.top = `${keyframe.y}%`;
      figure.style.width = `${keyframe.w}%`;
      figure.style.height = `${keyframe.h}%`;
    }
    figure.classList.toggle("is-out-of-frame", !isActive);
    figure.setAttribute("aria-hidden", String(!isActive));
    if (!media) return;
    if (!isActive || !shouldPlay) {
      media.pause();
      return;
    }
    const fps = timelineFps();
    const targetTime = Math.max(0, (frame - start) / Math.max(1, fps));
    if (Math.abs((media.currentTime || 0) - targetTime) > 0.2) {
      if (Number.isFinite(media.duration) && media.duration > 0) {
        media.currentTime = Math.min(targetTime, Math.max(0, media.duration - 0.05));
      } else {
        media.currentTime = targetTime;
      }
    }
    media.muted = Boolean(member.muted);
    media.play?.().catch(() => {});
  });
  document.querySelectorAll(".stage-item[data-stage-item-id]").forEach((stageItemEl) => {
    const item = (plan.stageItems || []).find((currentItem) => currentItem.id === stageItemEl.dataset.stageItemId);
    if (!item) return;
    const start = Number(item.startFrame || 1);
    const duration = Math.max(1, Number(item.durationFrames || 24));
    const isActive = frame >= start && frame <= start + duration - 1;
    if (isShapeStageItem(item)) applyShapeStyle(stageItemEl, item, frame);
    if (item.type === "text") {
      const values = interpolateStageKeyframe(item, frame) || defaultStageKeyframe(item, start);
      const renderItem = { ...item, ...values };
      const content = stageItemEl.querySelector(".stage-text-content");
      stageItemEl.style.left = `${clampPercent(values.x ?? item.x)}%`;
      stageItemEl.style.top = `${clampPercent(values.y ?? item.y)}%`;
      if (content && document.activeElement !== content) content.textContent = renderItem.text || item.text || "Text";
      applyTextStyleToElement(stageItemEl, renderItem);
    }
    stageItemEl.classList.toggle("is-out-of-frame", !isActive);
    stageItemEl.setAttribute("aria-hidden", String(!isActive));
  });
}

function timelineKeyframeFrames() {
  const plan = currentPlan();
  const castFrames = (plan.cast || []).flatMap((member) => (
    member.imported && Array.isArray(member.keyframes)
      ? member.keyframes.map((keyframe) => Number(keyframe.frame || 1))
      : []
  ));
  const itemFrames = (plan.stageItems || []).flatMap((item) => (
    Array.isArray(item.keyframes)
      ? item.keyframes.map((keyframe) => Number(keyframe.frame || 1))
      : []
  ));
  return [...new Set([...castFrames, ...itemFrames].filter((frame) => Number.isFinite(frame) && frame > 0))]
    .sort((a, b) => a - b);
}

function timelineMarkerFrames(totalFrames) {
  return loadTimelineMarkers(totalFrames)
    .map((marker) => Number(marker.frame || 1))
    .filter((frame) => Number.isFinite(frame) && frame > 0);
}

function timelineNavigationFrames(totalFrames) {
  return [...new Set([...timelineKeyframeFrames(), ...timelineMarkerFrames(totalFrames)])]
    .filter((frame) => frame >= 1 && frame <= totalFrames)
    .sort((a, b) => a - b);
}

function nextKeyframeFrame(currentFrame, totalFrames, direction) {
  const frames = timelineNavigationFrames(totalFrames);
  if (!frames.length) return Math.min(Math.max(currentFrame + direction, 1), totalFrames);
  if (direction < 0) {
    return frames.filter((frame) => frame < currentFrame).at(-1) || frames[0] || 1;
  }
  return frames.find((frame) => frame > currentFrame) || frames.at(-1) || totalFrames;
}

function memberHasAudio(member) {
  return ["audio", "video", "animation"].includes(member?.mediaType);
}

function timelineFps() {
  return Number(document.querySelector("[data-score-fps]")?.dataset.value || 24);
}

function framesFromSeconds(seconds, fps = timelineFps()) {
  return Math.max(1, Math.ceil(Math.max(0, Number(seconds) || 0) * Math.max(1, Number(fps) || 24)));
}

function loadTimelineZoom() {
  const value = Number(localStorage.getItem(timelineZoomStorageKey) || 50);
  return Math.min(Math.max(Number.isFinite(value) ? value : 50, 50), 900);
}

function saveTimelineZoom(value) {
  const numericValue = Math.round(Number(value) || 50);
  const zoom = Math.min(Math.max(numericValue, 50), 900);
  localStorage.setItem(timelineZoomStorageKey, String(zoom));
  return zoom;
}

function timelineDisplayFrames(totalFrames, zoom = loadTimelineZoom()) {
  return Math.max(1, Math.ceil(Math.max(1, totalFrames) * (Math.max(50, Math.min(900, zoom)) / 100)));
}

function timelineFrameMarks(displayFrames) {
  return Array.from({ length: Math.max(1, displayFrames) }, (_, index) => index + 1);
}

function loadTimelineControlsWidth() {
  const value = Number(localStorage.getItem(timelineControlsWidthStorageKey) || 0);
  return Number.isFinite(value) && value >= 340 ? Math.min(value, 900) : 0;
}

function saveTimelineControlsWidth(value) {
  const width = Math.min(Math.max(Math.round(Number(value) || 0), 340), 900);
  localStorage.setItem(timelineControlsWidthStorageKey, String(width));
  return width;
}

function timelineControlsStyle() {
  const width = loadTimelineControlsWidth();
  return width ? ` style="width:${width}px"` : "";
}

function setTimelineControlsWidth(transport, width) {
  if (!transport) return 0;
  const titlebar = transport.closest(".window-titlebar");
  const maxFromTitlebar = titlebar ? Math.max(340, titlebar.getBoundingClientRect().width - 178) : 900;
  const nextWidth = Math.min(Math.max(Math.round(Number(width) || 0), 340), Math.min(900, maxFromTitlebar));
  transport.style.width = `${nextWidth}px`;
  transport.classList.toggle("is-wide", nextWidth >= 520);
  return nextWidth;
}

function initScorePlayhead(totalFrames) {
  const ruler = document.querySelector(".score-ruler");
  const playhead = ruler?.querySelector(".score-playhead");
  const transport = document.querySelector(".score-tools");
  const fpsReadout = transport?.querySelector("[data-score-fps]");
  const fpsDownButton = transport?.querySelector("[data-score-fps-step='down']");
  const fpsUpButton = transport?.querySelector("[data-score-fps-step='up']");
  const zoomReadout = transport?.querySelector("[data-score-zoom]");
  const zoomDownButton = transport?.querySelector("[data-score-zoom-step='down']");
  const zoomUpButton = transport?.querySelector("[data-score-zoom-step='up']");
  const markInput = transport?.querySelector("[data-score-mark-input]");
  const markAddButton = transport?.querySelector("[data-score-mark-add]");
  const controlsResizeHandle = transport?.querySelector("[data-score-tools-resize]");
  const prevButton = transport?.querySelector("[data-score-step='prev']");
  const nextButton = transport?.querySelector("[data-score-step='next']");
  const startButton = transport?.querySelector("[data-score-bound='start']");
  const endButton = transport?.querySelector("[data-score-bound='end']");
  const playButton = transport?.querySelector("[data-score-play]");
  if (!ruler || !playhead) return;

  let currentFrame = Number(playhead.dataset.frame || 1);
  const fpsValues = [12, 24, 25, 30, 60];
  let currentFps = Number(fpsReadout?.dataset.value || fpsReadout?.textContent || 24);
  let playTimer = null;
  let playUntilFrame = null;
  const displayFrames = Math.max(1, Number(playhead.dataset.displayFrames || totalFrames));
  const clampFrame = (frame) => Math.min(Math.max(frame, 1), totalFrames);
  const setFrame = (frame) => {
    currentFrame = clampFrame(frame);
    const left = displayFrames <= 1 ? 0 : ((currentFrame - 1) / (displayFrames - 1)) * 100;
    playhead.style.left = `${left}%`;
    playhead.dataset.frame = String(currentFrame);
    playhead.setAttribute("aria-valuenow", String(currentFrame));
    syncStageToFrame(currentFrame, Boolean(playTimer));
  };
  const setFps = (fps) => {
    currentFps = fpsValues.includes(Number(fps)) ? Number(fps) : 24;
    if (fpsReadout) {
      fpsReadout.textContent = String(currentFps);
      fpsReadout.dataset.value = String(currentFps);
      fpsReadout.setAttribute("aria-label", `${currentFps} frames per second`);
    }
  };
  const getFps = () => currentFps;
  const stepZoom = (direction) => {
    const currentZoom = Number(zoomReadout?.dataset.value || loadTimelineZoom());
    saveTimelineZoom(currentZoom + (direction * 100));
    renderFilmPlan(currentPlan());
    setTimelineFrame(currentFrame, false);
  };
  const commitZoomInput = () => {
    saveTimelineZoom(zoomReadout?.value || zoomReadout?.dataset.value || loadTimelineZoom());
    renderFilmPlan(currentPlan());
    setTimelineFrame(currentFrame, false);
  };
  const saveCurrentFrameMark = () => {
    const label = markInput?.value.trim().slice(0, 14) || `F${currentFrame}`;
    const markers = loadTimelineMarkers(totalFrames).filter((marker) => Number(marker.frame || 1) !== currentFrame);
    markers.push({ id: `mark-${Date.now()}`, frame: currentFrame, label });
    saveTimelineMarkers(markers);
    renderFilmPlan(currentPlan());
    setTimelineFrame(currentFrame, false);
  };
  const stopPlayback = () => {
    if (playTimer) {
      window.clearInterval(playTimer);
      playTimer = null;
    }
    syncStageToFrame(currentFrame, false);
    if (playButton) {
      playButton.textContent = "▶";
      playButton.setAttribute("aria-label", "Play timeline");
      playButton.setAttribute("aria-pressed", "false");
    }
  };
  const startPlayback = () => {
    if (!playButton) return;
    if (currentFrame >= totalFrames) setFrame(1);
    playButton.textContent = "■";
    playButton.setAttribute("aria-label", "Stop timeline");
    playButton.setAttribute("aria-pressed", "true");
    syncStageToFrame(currentFrame, true);
    playTimer = window.setInterval(() => {
      // El playhead del DOM manda: si algo saltó de marca por fuera (una regla
      // XPL con goToMarker), retomamos desde ahí en vez de pisar el salto con
      // nuestro contador. Es lo que convierte el Score en un grafo navegable.
      const domFrame = Number(playhead.dataset.frame || currentFrame);
      if (domFrame !== currentFrame) currentFrame = clampFrame(domFrame);
      if (playUntilFrame && currentFrame >= playUntilFrame) {
        playUntilFrame = null;
        stopPlayback();
        return;
      }
      if (currentFrame >= totalFrames) {
        stopPlayback();
        return;
      }
      setFrame(currentFrame + 1);
    }, 1000 / getFps());
  };
  const restartPlayback = () => {
    const wasPlaying = Boolean(playTimer);
    stopPlayback();
    if (wasPlaying) startPlayback();
  };
  const stepFps = (direction) => {
    const index = Math.max(0, fpsValues.indexOf(currentFps));
    const nextIndex = Math.min(Math.max(index + direction, 0), fpsValues.length - 1);
    setFps(fpsValues[nextIndex]);
    restartPlayback();
  };
  const frameFromPointer = (event) => {
    const rect = ruler.getBoundingClientRect();
    const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
    return Math.round(ratio * (displayFrames - 1)) + 1;
  };
  const moveToPointer = (event) => setFrame(frameFromPointer(event));

  setFps(currentFps);
  setTimelineControlsWidth(transport, loadTimelineControlsWidth() || transport.getBoundingClientRect().width);
  setFrame(Number(playhead.dataset.frame || 1));
  controlsResizeHandle?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = transport.getBoundingClientRect().width;
    controlsResizeHandle.setPointerCapture(event.pointerId);
    transport.classList.add("is-resizing");
    const move = (moveEvent) => {
      setTimelineControlsWidth(transport, startWidth + moveEvent.clientX - startX);
    };
    const up = () => {
      const savedWidth = setTimelineControlsWidth(transport, transport.getBoundingClientRect().width);
      saveTimelineControlsWidth(savedWidth);
      transport.classList.remove("is-resizing");
      controlsResizeHandle.removeEventListener("pointermove", move);
      controlsResizeHandle.removeEventListener("pointerup", up);
      controlsResizeHandle.removeEventListener("pointercancel", up);
    };
    controlsResizeHandle.addEventListener("pointermove", move);
    controlsResizeHandle.addEventListener("pointerup", up);
    controlsResizeHandle.addEventListener("pointercancel", up);
  });
  playhead.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    stopPlayback();
    playhead.setPointerCapture(event.pointerId);
    playhead.classList.add("is-dragging");
    moveToPointer(event);

    const move = (moveEvent) => moveToPointer(moveEvent);
    const up = () => {
      playhead.classList.remove("is-dragging");
      playhead.removeEventListener("pointermove", move);
      playhead.removeEventListener("pointerup", up);
      playhead.removeEventListener("pointercancel", up);
    };

    playhead.addEventListener("pointermove", move);
    playhead.addEventListener("pointerup", up);
    playhead.addEventListener("pointercancel", up);
  });
  ruler.addEventListener("pointerdown", (event) => {
    if (event.target === playhead) return;
    if (event.target.closest(".score-tools, .score-marker")) return;
    stopPlayback();
    moveToPointer(event);
  });
  prevButton?.addEventListener("click", () => {
    stopPlayback();
    setFrame(nextKeyframeFrame(currentFrame, totalFrames, -1));
  });
  nextButton?.addEventListener("click", () => {
    stopPlayback();
    setFrame(nextKeyframeFrame(currentFrame, totalFrames, 1));
  });
  startButton?.addEventListener("click", () => {
    stopPlayback();
    setFrame(1);
  });
  endButton?.addEventListener("click", () => {
    stopPlayback();
    setFrame(totalFrames);
  });
  playButton?.addEventListener("click", () => {
    if (playTimer) stopPlayback();
    else startPlayback();
  });
  markAddButton?.addEventListener("click", () => {
    stopPlayback();
    saveCurrentFrameMark();
  });
  markInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    stopPlayback();
    saveCurrentFrameMark();
  });
  fpsDownButton?.addEventListener("click", () => stepFps(-1));
  fpsUpButton?.addEventListener("click", () => stepFps(1));
  zoomDownButton?.addEventListener("click", () => stepZoom(-1));
  zoomUpButton?.addEventListener("click", () => stepZoom(1));
  zoomReadout?.addEventListener("change", commitZoomInput);
  zoomReadout?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitZoomInput();
  });

  // Transporte accesible desde fuera (motor XPL / modo Play). El Score se
  // re-renderiza a menudo, así que esto se reasigna en cada initScorePlayhead.
  window.ainTransport = {
    totalFrames,
    isPlaying: () => Boolean(playTimer),
    play: () => { if (!playTimer) startPlayback(); },
    stop: () => { playUntilFrame = null; stopPlayback(); },
    setFrame: (frame) => setFrame(clampFrame(Number(frame) || 1)),
    // playSegment: reproducir desde donde estamos hasta un fotograma y parar.
    playUntil: (frame) => {
      playUntilFrame = clampFrame(Number(frame) || totalFrames);
      if (!playTimer) startPlayback();
    },
  };
}

const filmForm = document.querySelector("#filmForm");
const outputTitle = document.querySelector("#outputTitle");
const filmTreatment = document.querySelector("#filmTreatment");
const pipelineGrid = document.querySelector("#pipelineGrid");
const sceneBoard = document.querySelector("#sceneBoard");
const sceneCount = document.querySelector("#sceneCount");
const clearStageButton = document.querySelector("[data-clear-stage]");
const castBin = document.querySelector("#castBin");
const castToolbar = document.querySelector("#castToolbar");
const castViewControls = document.querySelector("#castViewControls");
const scoreGrid = document.querySelector("#scoreGrid");
const stageScript = document.querySelector("#stageScript");
const aiCueList = document.querySelector("#aiCueList");
const addSceneButton = document.querySelector("#addScene");
const productionPassButton = document.querySelector("#productionPass");
const copyMarkdownButton = document.querySelector("#copyMarkdown");
const downloadJsonButton = document.querySelector("#downloadJson");
const exportModal = document.querySelector("#exportModal");
const closeExportButton = document.querySelector("#closeExport");
const exportAllFormatsButton = document.querySelector("#exportAllFormats");
const exportMovieTitle = document.querySelector("#exportMovieTitle");
const includeMetadata = document.querySelector("#includeMetadata");
const helpModal = document.querySelector("#helpModal");
const openHelpButton = document.querySelector("#openHelp");
const closeHelpButton = document.querySelector("#closeHelp");
const fileNewButton = document.querySelector("[data-file-new]");
const projectOpenInput = document.querySelector("[data-project-open-input]");
const stockImportButton = document.querySelector("[data-stock-import]");
const stockExportButton = document.querySelector("[data-stock-export]");
const downloadStageVideoButton = document.querySelector("[data-download-stage-video]");
const directorShell = document.querySelector(".director-shell");
const directorWindows = document.querySelectorAll(".director-window");
const filmStorageKey = "ainimation-film-plan";
const scoreLabelsStorageKey = "ainimation-score-labels";
const timelineMarkersStorageKey = "ainimation-timeline-markers";
const timelineZoomStorageKey = "ainimation-timeline-zoom";
const timelineControlsWidthStorageKey = "ainimation-timeline-controls-width";
const castViewStorageKey = "ainimation-cast-view";
const castFilterStorageKey = "ainimation-cast-filters";
const castFilterTypes = ["image", "video", "audio", "music"];
const stageWidthPixels = 1920;
const stageHeightPixels = 1080;
const stageRulerStep = 100;
const stockImportBatchSize = 3;
const stockImportFetchLimit = 10;
const stockCategoryFilters = ["audio", "music", "image", "video"];
// C1 · el navegador sale de *.workers.dev. Los ISP españoles lo bloquean, así que
// una visita desde España ve el Stock caído aunque el worker responda. La lista ya
// se recorre en orden hasta que una responde, así que basta con poner DELANTE el
// dominio propio: mientras su ruta de Worker no exista, falla y se sigue por
// workers.dev igual que hasta ahora (sin día D, sin romper nada).
// Para activarlo hace falta una ruta de Worker en Cloudflare — ver docs/dominios-propios.md.
const admiraStockEndpoints = [
  `https://api.pixeria.com/stock/list?limit=${stockImportFetchLimit}`,
  `https://pixer-eleven.csilvasantin.workers.dev/stock/list?limit=${stockImportFetchLimit}`,
  "https://www.admira.studio/api/stock/latest",
  `https://www.admira.studio/api/stock?limit=${stockImportFetchLimit}&sort=latest`,
  "https://www.admira.studio/api/stock",
  "https://www.admira.studio/stock/latest.json",
  "https://www.admira.studio/stock.json",
  "https://admira.studio/api/stock/latest",
  `https://admira.studio/api/stock?limit=${stockImportFetchLimit}&sort=latest`,
];
const admiraStockExportEndpoints = [
  "https://api.pixeria.com/stock/publish",
  "https://pixer-eleven.csilvasantin.workers.dev/stock/publish",
];
let activeDirectorWindow = null;
let draggedDirectorWindow = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let stageAnimationCaptureCache = null;
let pendingStockImportMembers = [];
let pendingStockSelectedIndexes = new Set();
let pendingStockActiveCategory = "";
let pendingStockCategoryBuckets = new Map();
let pendingStockCategoryLoading = false;
let pendingStockSearchQuery = "";

const sceneCounts = {
  "60 seconds": 4,
  "3 minutes": 5,
  "8 minutes": 8,
  "22 minutes": 10,
  "90 minutes": 12,
};

const sceneBeats = [
  ["Cold Open", "A striking image introduces the world before anyone explains it.", "fadeInWorld"],
  ["Inciting Signal", "The protagonist receives a message that changes the rules of the story.", "listenForSignal"],
  ["First Choice", "They make a decision that costs something visible.", "branchOnChoice"],
  ["Pressure Builds", "The world pushes back and the emotional stakes become public.", "raiseSystemPressure"],
  ["Mirror Moment", "A quiet scene reveals what the protagonist is afraid to admit.", "holdOnFace"],
  ["False Victory", "The plan appears to work, but the deeper problem gets sharper.", "glitchTheSet"],
  ["Rupture", "A relationship, system, or belief breaks under pressure.", "breakContinuity"],
  ["Revelation", "The hidden truth becomes impossible to ignore.", "revealHiddenLayer"],
  ["Final Movement", "Action, music, and image converge into one clear choice.", "syncAllChannels"],
  ["Afterimage", "The ending leaves one memorable visual echo.", "leaveAfterimage"],
  ["Coda", "A final gesture reframes the theme.", "softResetWorld"],
  ["End Card", "The last image, line, or logo lands with restraint.", "landEndCard"],
];

function collectFilmData() {
  const data = Object.fromEntries(new FormData(filmForm).entries());
  return {
    title: data.title?.trim() || "Untitled Film",
    format: data.format,
    duration: data.duration,
    genre: data.genre,
    tone: data.tone,
    protagonist: data.protagonist?.trim() || "a protagonist",
    world: data.world?.trim() || "an unresolved world",
    logline: data.logline?.trim() || "A character faces a choice that changes the world.",
  };
}

function makeScenes(film, count) {
  return sceneBeats.slice(0, count).map(([beat, purpose, behavior], index) => {
    const act = index < count * 0.28 ? "Act I" : index < count * 0.72 ? "Act II" : "Act III";
    const startFrame = index * 48 + 1;
    const length = index % 3 === 0 ? 64 : index % 3 === 1 ? 48 : 72;
    return {
      number: index + 1,
      act,
      beat,
      purpose,
      behavior,
      startFrame,
      length,
      scene: `${film.protagonist} moves through ${film.world}, where ${purpose.toLowerCase()}`,
      visualPrompt: `${film.genre}, ${film.tone}, stage-ready frame, ${film.world}, ${film.protagonist}, cast continuity, clear silhouette, editable layers`,
      videoPrompt: `${beat}: camera movement, object behavior, blocking, and edit handles for ${film.duration} ${film.format.toLowerCase()}, ${film.tone}`,
    };
  });
}

function makeCast(film) {
  return [
    {
      role: "Actor",
      name: film.protagonist,
      type: "Character",
      prompt: `Reusable character reference for ${film.protagonist}; wardrobe, face, voice, and performance tags stay consistent.`,
    },
    {
      role: "World",
      name: film.world,
      type: "Environment",
      prompt: `Modular background plates, weather states, color script, props, and atmosphere for ${film.world}.`,
    },
    {
      role: "System",
      name: `${film.genre} rule engine`,
      type: "Behavior",
      prompt: `Controls visual logic, transitions, branching moments, and story constraints for a ${film.genre.toLowerCase()} tone.`,
    },
    {
      role: "Sound",
      name: `${film.tone} motif`,
      type: "Music + voice",
      prompt: `Loops, stingers, sparse narration, and emotion cues that follow the score instead of sitting on top of it.`,
    },
  ];
}

function buildProductionManifest(film, scenes = []) {
  const format = String(film.format || "").toLowerCase();
  const longForm = /feature|22|90/.test(`${film.format} ${film.duration}`.toLowerCase());
  const musicLed = /music/.test(format);
  const launchLed = /launch|brand/.test(format) || /manifesto/.test(String(film.genre || "").toLowerCase());
  const shotCount = scenes.length || sceneCounts[film.duration] || 5;
  const frameBudget = shotCount * (longForm ? 96 : 48);
  return {
    generatedAt: new Date().toISOString(),
    route: [
      {
        lane: "Image",
        job: "Lock reusable cast references, world plates, style frames, and editable matte layers before video generation.",
      },
      {
        lane: "Video",
        job: `Generate ${shotCount} controlled clips from score rows with handles, camera notes, and subject continuity checks.`,
      },
      {
        lane: "Sound",
        job: musicLed
          ? "Build the score first: beat grid, hook moments, stems, stingers, and visual cue points."
          : "Create ambience, motif, transition stingers, and sparse timed voice takes attached to frames.",
      },
      {
        lane: "Edit",
        job: `Assemble a ${frameBudget}-frame working cut with JSON timing, prompt logs, markdown brief, and review notes.`,
      },
    ],
    continuityRules: [
      `Keep ${film.protagonist} visually consistent across all cast references and generated clips.`,
      `Treat ${film.world} as a reusable stage with weather, light, prop, and camera states.`,
      `Every generated asset must map back to one score row and one behavior function.`,
      "Do not accept a clip unless it has edit handles and a clear first/last frame description.",
    ],
    deliverables: [
      "Director board",
      "Cast bible",
      "Shot prompts",
      "Timing map",
      "Voice/music cue sheet",
      "Production JSON",
      launchLed ? "Campaign cutdown map" : "Review cut checklist",
    ],
    risks: [
      "Identity drift between shots",
      "Unusable clips without handles",
      "Audio not locked to score rows",
      "Prompts that describe mood but not behavior",
    ],
  };
}

function buildFilmPlan(extraScene = false) {
  const film = collectFilmData();
  const baseCount = sceneCounts[film.duration] || 5;
  const previous = loadFilmPlan();
  const count = extraScene ? Math.min((previous?.scenes?.length || baseCount) + 1, sceneBeats.length) : baseCount;
  const scenes = makeScenes(film, count);
  return {
    ...film,
    createdAt: new Date().toISOString(),
    treatment: `${film.title} is a ${film.duration.toLowerCase()} ${film.format.toLowerCase()} in the shape of a ${film.genre.toLowerCase()}. It follows ${film.protagonist} inside ${film.world}. The emotional movement is ${film.tone.toLowerCase()}: each scene should feel designed, musical, and ready for AI-assisted production.`,
    theme: "What deserves to be preserved, and what must be transformed?",
    pipeline: {
      image: `Create cast-ready visual members: key art, character reference, world textures, color script, and layered stage plates for ${film.title}.`,
      video: `Generate score-aware clips with controlled object behavior, consistent subject identity, and edit handles for transitions.`,
      music: `Compose score channels: loop beds, scene stingers, pressure ramps, and a final motif locked to frame ranges.`,
      voice: `Create voice cast, sparse narration, and timed reads attached to score rows rather than loose audio files.`,
    },
    cast: makeCast(film),
    stageItems: [],
    scenes,
    productionManifest: buildProductionManifest(film, scenes),
  };
}

function saveFilmPlan(plan) {
  localStorage.setItem(filmStorageKey, JSON.stringify(plan));
}

function loadFilmPlan() {
  try {
    return JSON.parse(localStorage.getItem(filmStorageKey));
  } catch {
    return null;
  }
}

function clearWorkingCastOnBoot() {
  // El proyector NO limpia. Lo que abre un tótem con ?play=1 es la PIEZA, no una
  // sesión de autoría: si al arrancar borrásemos el cast y los items del Stage,
  // el modo Play proyectaría exactamente nada. (La persistencia compartible de
  // verdad —enlace/D1— es otra tarea; esto solo evita que Play se autodestruya.)
  if (new URLSearchParams(window.location.search).get("play") === "1") return;
  const saved = loadFilmPlan();
  if (!saved) return;
  const persistentCast = (saved.cast || []).filter((member) => !member.imported);
  localStorage.setItem(filmStorageKey, JSON.stringify({
    ...saved,
    cast: persistentCast,
    stageItems: [],
  }));
}

clearWorkingCastOnBoot();

function loadScoreLabels() {
  const fallback = ["Member", "1", "2", "3", "Voice", "Music", "Video"];
  try {
    const labels = JSON.parse(localStorage.getItem(scoreLabelsStorageKey));
    if (!Array.isArray(labels)) return fallback;
    return fallback.map((label, index) => String(labels[index] || label).trim() || label);
  } catch {
    return fallback;
  }
}

function saveScoreLabels(labels) {
  localStorage.setItem(scoreLabelsStorageKey, JSON.stringify(labels));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadTimelineMarkers(totalFrames) {
  const fallback = [
    { id: "in", frame: 1, label: "IN" },
    { id: "turn", frame: Math.round(totalFrames * 0.5), label: "MID" },
    { id: "out", frame: totalFrames, label: "OUT" },
  ];
  try {
    const markers = JSON.parse(localStorage.getItem(timelineMarkersStorageKey));
    if (!Array.isArray(markers)) return fallback;
    return markers
      .map((marker, index) => ({
        id: String(marker.id || `mark-${index}`),
        frame: Math.min(Math.max(Number(marker.frame || 1), 1), totalFrames),
        label: String(marker.label || "MARK").slice(0, 14),
      }))
      .sort((a, b) => a.frame - b.frame);
  } catch {
    return fallback;
  }
}

function saveTimelineMarkers(markers) {
  localStorage.setItem(timelineMarkersStorageKey, JSON.stringify(markers));
}

function initTimelineMarkerEditing(totalFrames) {
  const ruler = document.querySelector(".score-ruler");
  const markers = [...scoreGrid.querySelectorAll(".score-marker")];
  if (!ruler) return;

  const frameFromPointer = (event) => {
    const rect = ruler.getBoundingClientRect();
    const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
    return Math.min(Math.max(Math.round(ratio * (totalFrames - 1)) + 1, 1), totalFrames);
  };
  const persistMarkers = () => {
    const next = [...scoreGrid.querySelectorAll(".score-marker")].map((marker) => ({
      id: marker.dataset.markerId,
      frame: Number(marker.dataset.markerFrame || 1),
      label: marker.querySelector("span")?.textContent.trim().slice(0, 14) || "MARK",
    }));
    saveTimelineMarkers(next);
  };

  markers.forEach((marker) => {
    const label = marker.querySelector("span");
    marker.addEventListener("pointerdown", (event) => event.stopPropagation());
    marker.addEventListener("click", (event) => {
      if (document.activeElement === label) return;
      event.preventDefault();
      setTimelineFrame(Number(marker.dataset.markerFrame || 1), false);
    });
    label?.addEventListener("focus", () => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(label);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    label?.addEventListener("blur", () => {
      label.textContent = label.textContent.trim().slice(0, 14) || "MARK";
      persistMarkers();
    });
    label?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        label.blur();
      }
    });
  });

  ruler.addEventListener("dblclick", (event) => {
    if (event.target.closest(".score-marker") || event.target.closest(".score-playhead")) return;
    const frame = frameFromPointer(event);
    const next = [
      ...loadTimelineMarkers(totalFrames),
      { id: `mark-${Date.now()}`, frame, label: `F${frame}` },
    ];
    saveTimelineMarkers(next);
    renderFilmPlan(currentPlan());
  });
}

function initScoreLabelEditing() {
  const labels = [...scoreGrid.querySelectorAll("[data-score-label-index]")];
  if (!labels.length) return;

  const saveLabel = (label) => {
    const index = Number(label.dataset.scoreLabelIndex);
    const currentLabels = loadScoreLabels();
    const fallback = currentLabels[index] || `Row ${index + 1}`;
    const value = label.textContent.trim() || fallback;
    currentLabels[index] = value;
    label.textContent = value;
    saveScoreLabels(currentLabels);
    const castIndex = Number(label.dataset.castIndex);
    const stageItemId = label.dataset.stageItemId;
    const plan = currentPlan();
    if (Number.isInteger(castIndex) && plan.cast?.[castIndex]) {
      plan.cast[castIndex] = { ...plan.cast[castIndex], name: value };
      saveFilmPlan(plan);
    }
    if (stageItemId) {
      plan.stageItems = (plan.stageItems || []).map((item) => (
        item.id === stageItemId && item.type === "text"
          ? { ...item, text: value }
          : item
      ));
      saveFilmPlan(plan);
    }
  };

  labels.forEach((label) => {
    label.addEventListener("pointerdown", (event) => event.stopPropagation());
    label.addEventListener("blur", () => saveLabel(label));
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        label.blur();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        label.textContent = loadScoreLabels()[Number(label.dataset.scoreLabelIndex)] || label.textContent;
        label.blur();
      }
    });
  });
}

function loadCastViewMode() {
  return localStorage.getItem(castViewStorageKey) === "list" ? "list" : "icons";
}

function saveCastViewMode(mode) {
  const next = mode === "list" ? "list" : "icons";
  localStorage.setItem(castViewStorageKey, next);
  return next;
}

function loadCastFilterMode() {
  const value = localStorage.getItem(castFilterStorageKey);
  if (!value || value === "all") return [...castFilterTypes];
  const selected = value.split(",").map((item) => item.trim()).filter((item) => castFilterTypes.includes(item));
  return selected.length ? [...new Set(selected)] : [...castFilterTypes];
}

function saveCastFilterMode(filters) {
  const next = filters.filter((item) => castFilterTypes.includes(item));
  const selected = next.length ? [...new Set(next)] : [...castFilterTypes];
  localStorage.setItem(castFilterStorageKey, selected.join(","));
  return selected;
}

function toggleCastFilterMode(mode, currentFilters) {
  if (!castFilterTypes.includes(mode)) return currentFilters;
  const selected = new Set(currentFilters);
  if (selected.has(mode) && selected.size > 1) {
    selected.delete(mode);
  } else {
    selected.add(mode);
  }
  return saveCastFilterMode([...selected]);
}

function castMemberMatchesFilter(member, filter) {
  const selected = Array.isArray(filter) && filter.length ? filter : castFilterTypes;
  return selected.includes(stockMemberCategory(member));
}

function renderCastToolbar(totalCount, visibleCount, filter, viewMode) {
  if (!castToolbar && !castViewControls) return;
  const selected = Array.isArray(filter) && filter.length ? filter : castFilterTypes;
  const filters = [
    ["image", "Imagen", "Imagen"],
    ["video", "Vídeo", "Vídeo"],
    ["audio", "Audio", "Audio"],
    ["music", "Música", "Música"],
  ];
  if (castToolbar) {
    castToolbar.hidden = true;
    castToolbar.innerHTML = "";
  }
  if (castViewControls) {
    castViewControls.innerHTML = `
      <span class="cast-filter-group" aria-label="Filtrar Cast por tipo">
        ${filters.map(([value, label, title]) => `
          <button type="button" data-cast-filter="${value}" aria-pressed="${selected.includes(value) ? "true" : "false"}" aria-label="${label}" title="${title}">
            <span class="cast-type-icon cast-type-icon-${value}" aria-hidden="true"></span>
          </button>
        `).join("")}
      </span>
      <span class="cast-count" aria-label="${visibleCount} de ${totalCount} miembros visibles">${visibleCount}/${totalCount}</span>
      <span class="cast-view-group" aria-label="Vista del Cast">
      <button type="button" data-cast-view="icons" aria-pressed="${viewMode === "icons" ? "true" : "false"}" aria-label="Vista iconos">▦</button>
      <button type="button" data-cast-view="list" aria-pressed="${viewMode === "list" ? "true" : "false"}" aria-label="Vista listado">☰</button>
      </span>
    `;
  }
  if (castViewControls) {
    castViewControls.onpointerdown = (event) => event.stopPropagation();
  }
  castViewControls?.querySelectorAll("button[data-cast-filter]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", () => {
      toggleCastFilterMode(button.dataset.castFilter || "", selected);
      renderFilmPlan(currentPlan());
    });
  });
  castViewControls?.querySelectorAll("button[data-cast-view]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", () => {
      saveCastViewMode(button.dataset.castView || "icons");
      renderFilmPlan(currentPlan());
    });
  });
}

function initTimelineAudioMute() {
  const muteAllButton = scoreGrid.querySelector("[data-audio-mute-all]");
  muteAllButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const plan = currentPlan();
    const audioIndexes = (plan.cast || [])
      .map((member, index) => ({ member, index }))
      .filter(({ member }) => member.imported && member.src && member.onStage !== false && memberHasAudio(member));
    if (!audioIndexes.length) return;
    const shouldMute = !audioIndexes.every(({ member }) => Boolean(member.muted));
    audioIndexes.forEach(({ index }) => {
      plan.cast[index] = { ...plan.cast[index], muted: shouldMute };
    });
    saveFilmPlan(plan);
    renderFilmPlan(plan);
    syncStageToFrame(currentTimelineFrame(), false);
  });
  scoreGrid.querySelectorAll("[data-audio-mute][data-cast-index]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => event.stopPropagation());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const castIndex = Number(button.dataset.castIndex);
      const plan = currentPlan();
      if (!Number.isInteger(castIndex) || !plan.cast?.[castIndex]) return;
      const muted = !Boolean(plan.cast[castIndex].muted);
      plan.cast[castIndex] = { ...plan.cast[castIndex], muted };
      saveFilmPlan(plan);
      renderFilmPlan(plan);
      syncStageToFrame(currentTimelineFrame(), false);
    });
  });
}

function initTimelineSpriteDragging(totalFrames) {
  const sprites = [...scoreGrid.querySelectorAll(".score-sprite[data-cast-index], .score-sprite[data-stage-item-id]")];
  if (!sprites.length) return;

  sprites.forEach((sprite) => {
    const selectSprite = () => {
      const castIndex = Number(sprite.dataset.castIndex);
      const stageItemId = sprite.dataset.stageItemId;
      if (Number.isInteger(castIndex)) {
        selectedStageKeyframe = null;
        setSelectedStageTarget({ castIndex, scope: "clip" });
      } else if (stageItemId) {
        selectedStageKeyframe = null;
        setSelectedStageTarget({ stageItemId, scope: "clip" });
      }
      scoreGrid.querySelectorAll(".score-sprite.is-selected").forEach((item) => item.classList.remove("is-selected"));
      sprite.classList.add("is-selected");
      setTimelineFrame(Number(sprite.dataset.startFrame || 1), false);
    };
    sprite.querySelector("[data-sprite-remove]")?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    sprite.querySelector("[data-sprite-remove]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const castIndex = Number(sprite.dataset.castIndex);
      if (Number.isInteger(castIndex)) {
        removeCastMemberFromStage(castIndex);
        return;
      }
      removeStageItem(sprite.dataset.stageItemId);
    });
    sprite.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const track = sprite.closest(".score-track");
      const castIndex = Number(sprite.dataset.castIndex);
      const stageItemId = sprite.dataset.stageItemId;
      if (!track || (!Number.isInteger(castIndex) && !stageItemId)) return;
      selectSprite();
      if (event.target.closest("[data-sprite-remove]")) return;
      const trackRect = track.getBoundingClientRect();
      const startFrame = Number(sprite.dataset.startFrame || 1);
      const durationFrames = Number(sprite.dataset.durationFrames || 24);
      let activeStartFrame = startFrame;
      const displayFrames = Math.max(1, Number(document.querySelector(".score-playhead")?.dataset.displayFrames || totalFrames));
      const action = event.target.closest("[data-sprite-handle='start']")
        ? "trim-start"
        : event.target.closest("[data-sprite-handle='end']")
          ? "trim-end"
          : "move";
      const frameDelta = (clientX) => {
        const delta = trackRect.width ? ((clientX - event.clientX) / trackRect.width) * displayFrames : 0;
        return Math.round(delta);
      };
      const updateSprite = (frame, duration) => {
        activeStartFrame = frame;
        sprite.dataset.startFrame = String(frame);
        sprite.dataset.durationFrames = String(duration);
        sprite.style.left = `${((frame - 1) / displayFrames) * 100}%`;
        sprite.style.width = `${(duration / displayFrames) * 100}%`;
        const range = sprite.querySelector("small");
        if (range) range.textContent = `${frame}-${frame + duration - 1}`;
        const plan = currentPlan();
        if (plan.cast?.[castIndex]) {
          plan.cast[castIndex] = {
            ...plan.cast[castIndex],
            startFrame: frame,
            durationFrames: duration,
          };
          saveFilmPlan(plan);
          setTimelineFrame(frame, false);
        }
        if (stageItemId) {
          plan.stageItems = (plan.stageItems || []).map((item) => (
            item.id === stageItemId
              ? { ...item, startFrame: frame, durationFrames: duration }
              : item
          ));
          saveFilmPlan(plan);
          setTimelineFrame(frame, false);
        }
      };
      const updateFromPointer = (clientX) => {
        const delta = frameDelta(clientX);
        let nextStart = startFrame;
        let nextDuration = durationFrames;
        if (action === "move") {
          const maxStartFrame = Math.max(1, totalFrames - durationFrames + 1);
          nextStart = Math.min(Math.max(startFrame + delta, 1), maxStartFrame);
        }
        if (action === "trim-start") {
          const endFrame = startFrame + durationFrames - 1;
          nextStart = Math.min(Math.max(startFrame + delta, 1), endFrame);
          nextDuration = Math.max(1, endFrame - nextStart + 1);
        }
        if (action === "trim-end") {
          const endFrame = Math.min(Math.max(startFrame + durationFrames - 1 + delta, startFrame), totalFrames);
          nextDuration = Math.max(1, endFrame - startFrame + 1);
        }
        updateSprite(nextStart, nextDuration);
      };

      sprite.classList.add("is-dragging");
      sprite.setPointerCapture(event.pointerId);
      const move = (moveEvent) => updateFromPointer(moveEvent.clientX);
      const up = () => {
        sprite.classList.remove("is-dragging");
        sprite.removeEventListener("pointermove", move);
        sprite.removeEventListener("pointerup", up);
        sprite.removeEventListener("pointercancel", up);
        renderFilmPlan(currentPlan());
        setTimelineFrame(activeStartFrame, false);
      };
      sprite.addEventListener("pointermove", move);
      sprite.addEventListener("pointerup", up);
      sprite.addEventListener("pointercancel", up);
    });
  });
}

function initTimelineKeyframeDots() {
  const playhead = document.querySelector(".score-playhead");
  const totalFrames = Math.max(1, Number(playhead?.getAttribute("aria-valuemax") || 240));
  const displayFrames = Math.max(1, Number(playhead?.dataset.displayFrames || totalFrames));
  const clampFrame = (frame, minFrame = 1, maxFrame = totalFrames) => (
    Math.min(Math.max(Math.round(Number(frame || 1)), minFrame), Math.max(minFrame, maxFrame))
  );
  const frameFromTrackPointer = (track, clientX, minFrame = 1, maxFrame = totalFrames) => {
    const rect = track?.getBoundingClientRect();
    if (!rect?.width) return minFrame;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return clampFrame((ratio * (displayFrames - 1)) + 1, minFrame, maxFrame);
  };
  const selectDot = (dot, frame = Number(dot.dataset.keyframeFrame || 1)) => {
    selectedStageKeyframe = dot.dataset.stageItemId
      ? { stageItemId: dot.dataset.stageItemId, frame }
      : { castIndex: Number(dot.dataset.castIndex), frame };
    if (dot.dataset.stageItemId) {
      setSelectedStageTarget({ stageItemId: dot.dataset.stageItemId, scope: "keyframe" });
    } else {
      setSelectedStageTarget({ castIndex: Number(dot.dataset.castIndex), scope: "keyframe" });
    }
    document.querySelectorAll(".score-keyframe-dot.is-selected").forEach((item) => {
      item.classList.remove("is-selected");
    });
    dot.classList.add("is-selected");
    setTimelineFrame(frame, false);
  };
  const moveKeyframe = (dot, fromFrame, toFrame) => {
    const plan = currentPlan();
    let movedFrame = fromFrame;
    const castIndex = Number(dot.dataset.castIndex);
    const stageItemId = dot.dataset.stageItemId;
    if (Number.isInteger(castIndex) && plan.cast?.[castIndex]) {
      const member = plan.cast[castIndex];
      const start = Math.max(1, Number(member.startFrame || 1));
      const end = start + Math.max(1, Number(member.durationFrames || 24)) - 1;
      movedFrame = clampFrame(toFrame, start, end);
      let moved = false;
      plan.cast[castIndex] = {
        ...member,
        keyframes: stageKeyframesFor(member).map((keyframe) => {
          if (moved || keyframe.frame !== fromFrame) return keyframe;
          moved = true;
          return { ...keyframe, frame: movedFrame };
        }).sort((a, b) => a.frame - b.frame),
      };
    }
    if (stageItemId) {
      const items = plan.stageItems || [];
      const item = items.find((stageItem) => stageItem.id === stageItemId);
      if (item) {
        const start = Math.max(1, Number(item.startFrame || 1));
        const end = start + Math.max(1, Number(item.durationFrames || 24)) - 1;
        movedFrame = clampFrame(toFrame, start, end);
        let moved = false;
        plan.stageItems = items.map((stageItem) => {
          if (stageItem.id !== stageItemId) return stageItem;
          return {
            ...stageItem,
            keyframes: stageKeyframesFor(stageItem).map((keyframe) => {
              if (moved || keyframe.frame !== fromFrame) return keyframe;
              moved = true;
              return { ...keyframe, frame: movedFrame };
            }).sort((a, b) => a.frame - b.frame),
          };
        });
      }
    }
    dot.dataset.keyframeFrame = String(movedFrame);
    dot.style.left = `${displayFrames <= 1 ? 0 : ((movedFrame - 1) / (displayFrames - 1)) * 100}%`;
    dot.setAttribute("aria-label", `Keyframe at frame ${movedFrame}`);
    dot.title = `Keyframe ${movedFrame}`;
    saveFilmPlan(plan);
    selectDot(dot, movedFrame);
    return movedFrame;
  };
  scoreGrid.querySelectorAll(".score-keyframe-dot[data-keyframe-frame]").forEach((dot) => {
    dot.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const track = dot.closest(".score-track");
      if (!track) return;
      let activeFrame = Number(dot.dataset.keyframeFrame || 1);
      let didDrag = false;
      const castIndex = Number(dot.dataset.castIndex);
      const stageItemId = dot.dataset.stageItemId;
      const plan = currentPlan();
      const target = Number.isInteger(castIndex)
        ? plan.cast?.[castIndex]
        : (plan.stageItems || []).find((item) => item.id === stageItemId);
      const minFrame = Math.max(1, Number(target?.startFrame || 1));
      const maxFrame = minFrame + Math.max(1, Number(target?.durationFrames || totalFrames)) - 1;
      selectDot(dot, activeFrame);
      dot.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const nextFrame = frameFromTrackPointer(track, moveEvent.clientX, minFrame, Math.min(maxFrame, totalFrames));
        if (nextFrame === activeFrame) return;
        didDrag = true;
        activeFrame = moveKeyframe(dot, activeFrame, nextFrame);
      };
      const up = () => {
        dot.classList.toggle("is-dragging", false);
        dot.removeEventListener("pointermove", move);
        dot.removeEventListener("pointerup", up);
        dot.removeEventListener("pointercancel", up);
        if (didDrag) {
          renderFilmPlan(currentPlan());
          setTimelineFrame(activeFrame, false);
        }
      };
      dot.classList.add("is-dragging");
      dot.addEventListener("pointermove", move);
      dot.addEventListener("pointerup", up);
      dot.addEventListener("pointercancel", up);
    });
    dot.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const frame = Number(dot.dataset.keyframeFrame || 1);
      selectDot(dot, frame);
    });
  });
}

function normalizeFilmPlan(plan) {
  if (!plan) return plan;
  const fallback = buildFilmPlan(false);
  const merged = {
    ...fallback,
    ...plan,
    pipeline: {
      ...fallback.pipeline,
      ...(plan.pipeline || {}),
    },
    productionManifest: {
      ...buildProductionManifest(plan, plan.scenes || fallback.scenes),
      ...(plan.productionManifest || {}),
    },
    cast: plan.cast || makeCast(plan),
    stageItems: Array.isArray(plan.stageItems)
      ? plan.stageItems.map((item) => (
        item.type === "text" || isShapeStageItem(item)
          ? {
            ...item,
            startFrame: Math.max(1, Number(item.startFrame || 1)),
            durationFrames: Math.max(1, Number(item.durationFrames || 24)),
            keyframes: Array.isArray(item.keyframes) ? item.keyframes : undefined,
          }
          : item
      ))
      : [],
  };
  merged.scenes = (plan.scenes || fallback.scenes).map((scene, index) => ({
    ...fallback.scenes[index % fallback.scenes.length],
    ...scene,
    number: index + 1,
    behavior: scene.behavior || fallback.scenes[index % fallback.scenes.length].behavior,
    startFrame: scene.startFrame || index * 48 + 1,
    length: scene.length || 48,
  }));
  // Las reglas XPL viajan con el plan (las escribe el editor de la ventana
  // Behaviour). Sin ellas la pieza es un vídeo lineal; con ellas, un interactivo.
  merged.rules = Array.isArray(plan.rules) ? plan.rules : [];
  return merged;
}

function clampPercent(value) {
  return Math.min(Math.max(Number(value) || 0, 0), 100);
}

function clampStageSize(value, fallback = 12) {
  return Math.min(Math.max(Number(value) || fallback, 4), 80);
}

function visualStageAspectRatio() {
  return stageWidthPixels / stageHeightPixels;
}

function stagePercentRatioFromMedia(aspectRatio) {
  const ratio = Number(aspectRatio || 0);
  return ratio > 0 ? ratio / visualStageAspectRatio() : null;
}

function stageBoxForMediaAspect(aspectRatio, bounds = {}) {
  const fallback = {
    w: clampStageSize(bounds.w, 24),
    h: clampStageSize(bounds.h, 24),
  };
  const ratio = stagePercentRatioFromMedia(aspectRatio);
  if (!ratio) return fallback;
  const maxW = clampStageSize(bounds.maxW ?? bounds.w, fallback.w);
  const maxH = clampStageSize(bounds.maxH ?? bounds.h, fallback.h);
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  return {
    w: clampStageSize(w, fallback.w),
    h: clampStageSize(h, fallback.h),
  };
}

function mediaAspectRatioForMember(member) {
  const explicit = Number(member?.aspectRatio || 0);
  if (explicit > 0) return explicit;
  const width = Number(member?.sourceWidth || 0);
  const height = Number(member?.sourceHeight || 0);
  return width > 0 && height > 0 ? width / height : null;
}

function stageBoxWithMediaAspect(member, bounds = {}) {
  if (!["image", "video"].includes(member?.mediaType)) {
    return {
      w: clampStageSize(bounds.w, 24),
      h: clampStageSize(bounds.h, 24),
    };
  }
  return stageBoxForMediaAspect(mediaAspectRatioForMember(member), bounds);
}

function centerStageBoxInBounds(bounds, box) {
  const x = clampPercent(Number(bounds.x || 0) + ((Number(bounds.w || box.w) - box.w) / 2));
  const y = clampPercent(Number(bounds.y || 0) + ((Number(bounds.h || box.h) - box.h) / 2));
  return {
    x: Math.min(x, 100 - box.w),
    y: Math.min(y, 100 - box.h),
    w: box.w,
    h: box.h,
  };
}

function keyframeWithMediaAspect(keyframe, aspectRatio) {
  const box = stageBoxForMediaAspect(aspectRatio, {
    w: keyframe.w,
    h: keyframe.h,
    maxW: keyframe.w,
    maxH: keyframe.h,
  });
  const centerX = Number(keyframe.x || 0) + (Number(keyframe.w || box.w) / 2);
  const centerY = Number(keyframe.y || 0) + (Number(keyframe.h || box.h) / 2);
  return {
    ...keyframe,
    x: Math.min(Math.max(0, centerX - (box.w / 2)), 100 - box.w),
    y: Math.min(Math.max(0, centerY - (box.h / 2)), 100 - box.h),
    w: box.w,
    h: box.h,
  };
}

function defaultStageKeyframe(member, frame = Number(member?.startFrame || 1), index = 0) {
  return {
    frame: Number(frame) || 1,
    x: clampPercent(member?.stageX ?? member?.x ?? (16 + (index % 3) * 24)),
    y: clampPercent(member?.stageY ?? member?.y ?? (54 + Math.floor(index / 3) * 18)),
    w: clampStageSize(member?.stageW ?? member?.w, 12),
    h: clampStageSize(member?.stageH ?? member?.h, 10),
    color: member?.color || "",
    text: member?.text || "",
    fontWeight: member?.fontWeight || "850",
    fontStyle: member?.fontStyle || "normal",
    textDecoration: member?.textDecoration || "none",
    textAlign: member?.textAlign || "left",
    fontSize: member?.fontSize || "",
  };
}

function stageKeyframesFor(member, index = 0) {
  const fallback = defaultStageKeyframe(member, Number(member?.startFrame || 1), index);
  const keyframes = Array.isArray(member?.keyframes) && member.keyframes.length
    ? member.keyframes
    : [fallback];
  return keyframes
    .map((keyframe) => ({
      frame: Math.max(1, Number(keyframe.frame || fallback.frame)),
      x: clampPercent(keyframe.x ?? fallback.x),
      y: clampPercent(keyframe.y ?? fallback.y),
      w: clampStageSize(keyframe.w, fallback.w),
      h: clampStageSize(keyframe.h, fallback.h),
      color: keyframe.color || member?.color || "",
      text: keyframe.text ?? member?.text ?? "",
      fontWeight: keyframe.fontWeight || member?.fontWeight || "850",
      fontStyle: keyframe.fontStyle || member?.fontStyle || "normal",
      textDecoration: keyframe.textDecoration || member?.textDecoration || "none",
      textAlign: keyframe.textAlign || member?.textAlign || "left",
      fontSize: keyframe.fontSize || member?.fontSize || "",
    }))
    .sort((a, b) => a.frame - b.frame);
}

function interpolateStageKeyframe(member, frame, index = 0) {
  const keyframes = stageKeyframesFor(member, index);
  const currentFrame = Number(frame || 1);
  let previous = keyframes[0];
  let next = keyframes[keyframes.length - 1];
  for (const keyframe of keyframes) {
    if (keyframe.frame <= currentFrame) previous = keyframe;
    if (keyframe.frame >= currentFrame) {
      next = keyframe;
      break;
    }
  }
  if (!previous || !next || previous.frame === next.frame) return previous || next;
  const progress = (currentFrame - previous.frame) / (next.frame - previous.frame);
  return {
    frame: currentFrame,
    x: previous.x + (next.x - previous.x) * progress,
    y: previous.y + (next.y - previous.y) * progress,
    w: previous.w + (next.w - previous.w) * progress,
    h: previous.h + (next.h - previous.h) * progress,
    color: previous.color || next.color || "",
    text: previous.text || next.text || "",
    fontWeight: previous.fontWeight || next.fontWeight || "850",
    fontStyle: previous.fontStyle || next.fontStyle || "normal",
    textDecoration: previous.textDecoration || next.textDecoration || "none",
    textAlign: previous.textAlign || next.textAlign || "left",
    fontSize: previous.fontSize || next.fontSize || "",
  };
}

function upsertStageKeyframe(member, frame, values, index = 0) {
  const nextFrame = Math.max(1, Number(frame || 1));
  const base = interpolateStageKeyframe(member, nextFrame, index) || defaultStageKeyframe(member, nextFrame, index);
  const nextKeyframe = {
    frame: nextFrame,
    x: clampPercent(values.x ?? base.x),
    y: clampPercent(values.y ?? base.y),
    w: clampStageSize(values.w, base.w),
    h: clampStageSize(values.h, base.h),
    color: values.color || base.color || member?.color || "",
    text: values.text ?? base.text ?? member?.text ?? "",
    fontWeight: values.fontWeight || base.fontWeight || member?.fontWeight || "850",
    fontStyle: values.fontStyle || base.fontStyle || member?.fontStyle || "normal",
    textDecoration: values.textDecoration || base.textDecoration || member?.textDecoration || "none",
    textAlign: values.textAlign || base.textAlign || member?.textAlign || "left",
    fontSize: values.fontSize || base.fontSize || member?.fontSize || "",
  };
  return [
    ...stageKeyframesFor(member, index).filter((keyframe) => keyframe.frame !== nextFrame),
    nextKeyframe,
  ].sort((a, b) => a.frame - b.frame);
}

function transformMemberClipKeyframes(member, before, after, index = 0) {
  const delta = {
    x: Number(after.x || 0) - Number(before.x || 0),
    y: Number(after.y || 0) - Number(before.y || 0),
    w: Number(after.w || 0) - Number(before.w || 0),
    h: Number(after.h || 0) - Number(before.h || 0),
  };
  const keyframes = stageKeyframesFor(member, index).map((keyframe) => ({
    ...keyframe,
    x: clampPercent(keyframe.x + delta.x),
    y: clampPercent(keyframe.y + delta.y),
    w: clampStageSize(keyframe.w + delta.w, keyframe.w),
    h: clampStageSize(keyframe.h + delta.h, keyframe.h),
  }));
  const first = keyframes[0] || {
    x: clampPercent(after.x),
    y: clampPercent(after.y),
    w: clampStageSize(after.w, before.w || 12),
    h: clampStageSize(after.h, before.h || 10),
  };
  return {
    ...member,
    stageX: first.x,
    stageY: first.y,
    stageW: first.w,
    stageH: first.h,
    keyframes,
  };
}

function stageValuesChanged(before, after) {
  return ["x", "y", "w", "h"].some((key) => Math.abs(Number(before[key] || 0) - Number(after[key] || 0)) > 0.05) ||
    String(before.color || "") !== String(after.color || "");
}

function stageTextValuesChanged(before, after) {
  return stageValuesChanged(before, after) ||
    ["text", "fontWeight", "fontStyle", "textDecoration", "textAlign", "fontSize"].some((key) => (
      String(before[key] || "") !== String(after[key] || "")
    ));
}

function nextStageKeyframeTiming(member, currentFrame, castIndex) {
  const start = Math.max(1, Number(member?.startFrame || 1));
  const duration = Math.max(1, Number(member?.durationFrames || 24));
  const end = start + duration - 1;
  const existingFrames = stageKeyframesFor(member).map((keyframe) => keyframe.frame);
  const selectedFrame = selectedStageKeyframe?.castIndex === castIndex ? selectedStageKeyframe.frame : null;
  const existingFrame = existingFrames.find((frame) => frame === selectedFrame && frame === currentFrame);
  if (existingFrame) {
    return {
      frame: existingFrame,
      durationFrames: Math.max(duration, existingFrame - start + 1),
      isExisting: true,
    };
  }
  const nextFrame = currentFrame > end ? currentFrame : end + 1;
  return {
    frame: nextFrame,
    durationFrames: Math.max(duration + 24, nextFrame - start + 24),
    isExisting: false,
  };
}

function nextStageItemKeyframeTiming(item, currentFrame) {
  const start = Math.max(1, Number(item?.startFrame || 1));
  const duration = Math.max(1, Number(item?.durationFrames || 24));
  const end = start + duration - 1;
  const selectedFrame = selectedStageKeyframe?.stageItemId === item?.id ? selectedStageKeyframe.frame : null;
  const existingFrame = stageKeyframesFor(item).map((keyframe) => keyframe.frame).find((frame) => frame === selectedFrame && frame === currentFrame);
  if (existingFrame) {
    return {
      frame: existingFrame,
      durationFrames: Math.max(duration, existingFrame - start + 1),
      isExisting: true,
    };
  }
  const nextFrame = currentFrame > end ? currentFrame : end + 1;
  return {
    frame: nextFrame,
    durationFrames: Math.max(duration + 24, nextFrame - start + 24),
    isExisting: false,
  };
}

function keyframeDotButtons(keyframes, totalFrames, attributes, isSelected) {
  return keyframes
    .map((keyframe) => {
      const frame = Math.min(Math.max(1, keyframe.frame), totalFrames);
      const left = totalFrames <= 1 ? 0 : ((frame - 1) / (totalFrames - 1)) * 100;
      const dataAttributes = Object.entries({ ...attributes, keyframeFrame: frame })
        .map(([key, value]) => `data-${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}="${escapeHtml(String(value))}"`)
        .join(" ");
      return `
        <button class="score-keyframe-dot ${isSelected(frame) ? "is-selected" : ""}" type="button" style="left:${left}%" ${dataAttributes} aria-label="Keyframe at frame ${frame}" title="Keyframe ${frame}"></button>
      `;
    })
    .join("");
}

function keyframeDotsForMember(member, totalFrames, castIndex) {
  if (!member || !Array.isArray(member.keyframes) || !member.keyframes.length) return "";
  return keyframeDotButtons(
    stageKeyframesFor(member),
    totalFrames,
    { castIndex },
    (frame) => selectedStageKeyframe?.castIndex === castIndex && selectedStageKeyframe?.frame === frame,
  );
}

function keyframeDotsForStageItem(item, totalFrames) {
  if (!item || !Array.isArray(item.keyframes) || !item.keyframes.length) return "";
  return keyframeDotButtons(
    stageKeyframesFor(item),
    totalFrames,
    { stageItemId: item.id },
    (frame) => selectedStageKeyframe?.stageItemId === item.id && selectedStageKeyframe?.frame === frame,
  );
}

function stagePointFromEvent(stage, event) {
  return stagePointFromClient(stage, event.clientX, event.clientY);
}

function stagePointFromClient(stage, clientX, clientY) {
  const rect = stage.getBoundingClientRect();
  const x = rect.width ? ((clientX - rect.left) / rect.width) * 100 : 0;
  const y = rect.height ? ((clientY - rect.top) / rect.height) * 100 : 0;
  return { x: clampPercent(x), y: clampPercent(y) };
}

function stageItemId(prefix = "stage") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function textStyleForItem(item) {
  return {
    fontWeight: item.fontWeight || "850",
    fontStyle: item.fontStyle || "normal",
    textDecoration: item.textDecoration || "none",
    textAlign: item.textAlign || "left",
    fontSize: item.fontSize || "",
  };
}

function applyTextStyleToElement(textItem, item) {
  const content = textItem.querySelector(".stage-text-content");
  const style = textStyleForItem(item);
  textItem.style.color = item.color || "";
  if (!content) return;
  content.style.fontWeight = style.fontWeight;
  content.style.fontStyle = style.fontStyle;
  content.style.textDecoration = style.textDecoration;
  content.style.textAlign = style.textAlign;
  content.style.fontSize = style.fontSize || "";
}

function positionStageLine(line, item) {
  const x1 = clampPercent(item.x1);
  const y1 = clampPercent(item.y1);
  const x2 = clampPercent(item.x2);
  const y2 = clampPercent(item.y2);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  line.style.left = `${x1}%`;
  line.style.top = `${y1}%`;
  line.style.width = `${length}%`;
  line.style.transform = `rotate(${angle}deg)`;
  line.style.backgroundColor = item.color || "";
}

function isShapeStageItem(item) {
  return ["oval", "oval-fill", "rect", "rect-fill"].includes(item?.type);
}

function applyShapeStyle(shape, item, frame = currentTimelineFrame()) {
  const values = interpolateStageKeyframe(item, frame) || defaultStageKeyframe(item, Number(item.startFrame || 1));
  shape.style.left = `${clampPercent(values.x ?? item.x)}%`;
  shape.style.top = `${clampPercent(values.y ?? item.y)}%`;
  shape.style.width = `${clampStageSize(values.w, item.w || 12)}%`;
  shape.style.height = `${clampStageSize(values.h, item.h || 10)}%`;
  const color = values.color || item.color || "";
  shape.style.borderColor = color;
  shape.style.backgroundColor = item.type.endsWith("-fill") ? color : "transparent";
  shape.classList.toggle("is-filled", item.type.endsWith("-fill"));
  shape.classList.toggle("is-oval", item.type.startsWith("oval"));
}

function renderStageItems(stage, plan) {
  stage.querySelectorAll(".stage-item").forEach((item) => item.remove());
  (plan.stageItems || []).forEach((item) => {
    if (item.type === "text") {
      const values = interpolateStageKeyframe(item, currentTimelineFrame()) || defaultStageKeyframe(item, Number(item.startFrame || 1));
      const renderItem = { ...item, ...values };
      const text = document.createElement("div");
      text.className = `stage-item stage-text-item ${isSelectedStageItemTarget(item.id) ? "is-selected" : ""}`;
      text.dataset.stageItemId = item.id;
      text.style.left = `${clampPercent(renderItem.x)}%`;
      text.style.top = `${clampPercent(renderItem.y)}%`;
      const content = document.createElement("span");
      content.className = "stage-text-content";
      content.contentEditable = "true";
      content.spellcheck = false;
      content.textContent = renderItem.text || item.text || "Text";
      const removeButton = document.createElement("button");
      removeButton.className = "stage-text-remove";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", "Remove stage text");
      removeButton.textContent = "×";
      text.addEventListener("pointerdown", (event) => {
        if (stage.dataset.stageTool === "text") event.stopPropagation();
        window.dispatchEvent(new CustomEvent("stagetextselect", { detail: { id: item.id } }));
      });
      content.addEventListener("focus", () => {
        window.dispatchEvent(new CustomEvent("stagetextselect", { detail: { id: item.id } }));
      });
      content.addEventListener("blur", () => {
        const nextPlan = currentPlan();
        const nextText = content.textContent.trim() || "Text";
        let nextFrame = currentTimelineFrame();
        nextPlan.stageItems = (nextPlan.stageItems || []).map((stageItem) => {
          if (stageItem.id !== item.id) return stageItem;
          const currentValues = interpolateStageKeyframe(stageItem, currentTimelineFrame()) || defaultStageKeyframe(stageItem);
          const values = {
            ...currentValues,
            x: Number.parseFloat(text.style.left) || stageItem.x || 0,
            y: Number.parseFloat(text.style.top) || stageItem.y || 0,
            color: stageItem.color || currentValues.color || "",
            text: nextText,
            ...textStyleForItem(stageItem),
          };
          if (!stageTextValuesChanged(currentValues, values)) return stageItem;
          const timing = nextStageItemKeyframeTiming(stageItem, currentTimelineFrame());
          nextFrame = timing.frame;
          selectedStageKeyframe = timing.isExisting ? { stageItemId: stageItem.id, frame: timing.frame } : null;
          return {
            ...stageItem,
            ...values,
            durationFrames: timing.durationFrames,
            keyframes: upsertStageKeyframe(stageItem, timing.frame, values),
          };
        });
        saveFilmPlan(nextPlan);
        renderFilmPlan(nextPlan);
        setTimelineFrame(nextFrame, false);
      });
      removeButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      removeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeStageItem(item.id);
      });
      text.append(content, removeButton);
      applyTextStyleToElement(text, renderItem);
      stage.append(text);
    }
    if (item.type === "line") {
      const line = document.createElement("span");
      line.className = "stage-item stage-line-item";
      line.dataset.stageItemId = item.id;
      positionStageLine(line, item);
      stage.append(line);
    }
    if (isShapeStageItem(item)) {
      const shape = document.createElement("div");
      shape.className = `stage-item stage-shape-item ${isSelectedStageItemTarget(item.id) ? "is-selected" : ""}`;
      shape.dataset.stageItemId = item.id;
      shape.dataset.stageItemType = item.type;
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "stage-shape-resize";
      resizeHandle.setAttribute("aria-hidden", "true");
      shape.append(resizeHandle);
      applyShapeStyle(shape, item);
      stage.append(shape);
    }
  });
}

function hydrateFilmForm(plan) {
  if (!plan) return;
  for (const [key, value] of Object.entries(plan)) {
    const field = filmForm.elements[key];
    if (!field || typeof value !== "string") continue;
    field.value = value;
  }
}

function scheduleCastMember(plan, castIndex, options = {}) {
  if (!Number.isInteger(castIndex) || !plan.cast?.[castIndex]?.src) return null;
  const selectedCount = plan.cast.filter((member) => member.imported && member.src && member.onStage !== false).length;
  const wasSelected = plan.cast[castIndex].onStage !== false;
  const startFrame = Math.max(1, Number(options.startFrame || plan.cast[castIndex].startFrame || (1 + selectedCount * 24)));
  const durationFrames = Math.max(1, Number(plan.cast[castIndex].durationFrames || 24));
  const nextMember = {
    ...plan.cast[castIndex],
    onStage: true,
    startFrame,
    durationFrames,
  };
  if (options.stagePoint) {
    const box = stageBoxWithMediaAspect(nextMember, { w: 24, h: 24, maxW: 34, maxH: 34 });
    nextMember.stageX = Math.min(Math.max(0, options.stagePoint.x - (box.w / 2)), 100 - box.w);
    nextMember.stageY = Math.min(Math.max(0, options.stagePoint.y - (box.h / 2)), 100 - box.h);
    nextMember.stageW = box.w;
    nextMember.stageH = box.h;
  } else if (isVisualMediaType(nextMember.mediaType) && (!nextMember.stageW || !nextMember.stageH)) {
    const box = stageBoxWithMediaAspect(nextMember, { w: 24, h: 24, maxW: 34, maxH: 34 });
    nextMember.stageW = box.w;
    nextMember.stageH = box.h;
  }
  if (!wasSelected || !nextMember.keyframes?.length || options.stagePoint) {
    nextMember.keyframes = [
      defaultStageKeyframe(nextMember, startFrame, selectedCount),
    ];
  }
  plan.cast[castIndex] = nextMember;
  return nextMember;
}

function frameFromTimelineClientX(clientX, target = null) {
  const playhead = document.querySelector(".score-playhead");
  const totalFrames = Math.max(1, Number(playhead?.getAttribute("aria-valuemax") || 240));
  const displayFrames = Math.max(1, Number(playhead?.dataset.displayFrames || totalFrames));
  const track = target?.closest?.(".score-track") ||
    document.querySelector(".score-track") ||
    document.querySelector(".score-ruler");
  const rect = track?.getBoundingClientRect();
  if (!rect?.width) return currentTimelineFrame();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  return Math.min(Math.round(ratio * (displayFrames - 1)) + 1, totalFrames);
}

function castDropTargetAt(clientX, clientY) {
  const hiddenClass = "is-cast-pointer-dragging";
  document.body.classList.add(hiddenClass);
  const target = document.elementFromPoint(clientX, clientY);
  document.body.classList.remove(hiddenClass);
  const stage = target?.closest?.(".stage-canvas");
  const timelineTarget = target?.closest?.(".director-score, .score-track, .score-ruler");
  if (stage) {
    return {
      type: "stage",
      options: { stagePoint: stagePointFromClient(stage, clientX, clientY) },
    };
  }
  if (timelineTarget) {
    return {
      type: "timeline",
      options: { startFrame: frameFromTimelineClientX(clientX, timelineTarget) },
    };
  }
  return null;
}

function initCastPointerDrag(card, castIndex, toggleCastMember) {
  let pointerDrag = null;
  let suppressNextClick = false;
  card.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".cast-member img, .cast-member video, .cast-member-kind")) return;
    if (
      event.button !== 0 ||
      event.target.closest("input, textarea, [contenteditable='true']") ||
      (event.target.closest("button") && event.target.closest("button") !== card)
    ) return;
    pointerDrag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    card.setPointerCapture(event.pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
    if (distance < 8 && !pointerDrag.active) return;
    pointerDrag.active = true;
    card.classList.add("is-dragging");
    event.preventDefault();
  });
  const finishPointerDrag = (event) => {
    if (!pointerDrag || pointerDrag.id !== event.pointerId) return;
    const wasActive = pointerDrag.active;
    pointerDrag = null;
    card.classList.remove("is-dragging");
    try {
      card.releasePointerCapture(event.pointerId);
    } catch {}
    if (!wasActive) return;
    suppressNextClick = true;
    event.preventDefault();
    event.stopPropagation();
    const target = castDropTargetAt(event.clientX, event.clientY);
    if (target) activateCastMemberFromDrop(castIndex, target.options);
  };
  card.addEventListener("pointerup", finishPointerDrag);
  card.addEventListener("pointercancel", finishPointerDrag);
  card.addEventListener("click", (event) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);
  card.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCastMember();
  });
}

function castIndexFromDrag(event) {
  const custom = event.dataTransfer?.getData("application/x-ainimation-cast-index");
  if (custom !== "") return Number(custom);
  const plain = event.dataTransfer?.getData("text/plain") || "";
  return plain.startsWith("cast:") ? Number(plain.slice(5)) : NaN;
}

function initCastDropTargets() {
  const stage = document.querySelector(".stage-canvas");
  const timeline = document.querySelector(".director-score");
  if (stage) {
    stage.ondragover = (event) => {
      if (!Number.isInteger(castIndexFromDrag(event))) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    stage.ondrop = (event) => {
      const castIndex = castIndexFromDrag(event);
      if (!Number.isInteger(castIndex)) return;
      event.preventDefault();
      activateCastMemberFromDrop(castIndex, {
        stagePoint: stagePointFromClient(stage, event.clientX, event.clientY),
      });
    };
  }
  if (timeline) {
    timeline.ondragover = (event) => {
      if (!Number.isInteger(castIndexFromDrag(event))) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    timeline.ondrop = (event) => {
      const castIndex = castIndexFromDrag(event);
      if (!Number.isInteger(castIndex)) return;
      event.preventDefault();
      activateCastMemberFromDrop(castIndex, {
        startFrame: frameFromTimelineClientX(event.clientX, event.target),
      });
    };
  }
}

function activateCastMemberFromDrop(castIndex, options = {}) {
  const plan = currentPlan();
  const member = scheduleCastMember(plan, castIndex, options);
  if (!member) return false;
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  setTimelineFrame(member.startFrame || currentTimelineFrame(), false);
  playUiTick(options.stagePoint ? "stage" : "select");
  return true;
}

function renderFilmPlan(plan) {
  const castMembers = plan.cast || makeCast(plan);
  const castFilter = loadCastFilterMode();
  const castViewMode = loadCastViewMode();
  const availableCastMembers = castMembers
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member.imported || member.src);
  const visibleCastMembers = availableCastMembers
    .filter(({ member }) => castMemberMatchesFilter(member, castFilter));
  const importedTimelineMembers = castMembers.filter((member) => (
    member.imported &&
    member.src &&
    member.onStage !== false
  ));
  const timelineTextItems = (plan.stageItems || []).filter((item) => item.type === "text");
  const timelineShapeItems = (plan.stageItems || []).filter((item) => isShapeStageItem(item));
  const importedStageMembers = importedTimelineMembers.filter((member) => (
    member.onStage !== false &&
    ["animation", "audio", "image", "video"].includes(member.mediaType)
  ));
  outputTitle.textContent = plan.title;
  sceneCount.textContent = "1920 × 1080";
  filmTreatment.innerHTML = `
    <p><strong>Authoring brief</strong><br>${plan.treatment}</p>
    <p><strong>Interaction theme</strong><br>${plan.theme}</p>
    ${plan.productionManifest ? `
      <div class="production-passport">
        <strong>Production pass</strong>
        <div class="passport-grid">
          ${(plan.productionManifest.route || []).map((item) => `
            <article>
              <span>${escapeHtml(item.lane)}</span>
              <p>${escapeHtml(item.job)}</p>
            </article>
          `).join("")}
        </div>
        <p><strong>Continuity rules</strong><br>${(plan.productionManifest.continuityRules || []).map(escapeHtml).join(" · ")}</p>
        <p><strong>Deliverables</strong><br>${(plan.productionManifest.deliverables || []).map(escapeHtml).join(" · ")}</p>
      </div>
    ` : ""}
  `;

  pipelineGrid.innerHTML = [
    ["image", "AI Image", plan.pipeline.image],
    ["video", "AI Video", plan.pipeline.video],
    ["music", "AI Music", plan.pipeline.music],
    ["voice", "AI Voiceover", plan.pipeline.voice],
  ].map(([kind, title, body]) => `
    <article class="pipeline-item ${kind}">
      <h4>${title}</h4>
      <p>${body}</p>
    </article>
  `).join("");

  if (castBin) {
    castBin.dataset.castView = castViewMode;
    castBin.dataset.castFilter = castFilter.join(",");
    renderCastToolbar(availableCastMembers.length, visibleCastMembers.length, castFilter, castViewMode);
    castBin.innerHTML = visibleCastMembers.length ? visibleCastMembers.map(({ member, index }) => {
      const media = member.src && ["animation", "image"].includes(member.mediaType)
        ? `<img src="${escapeHtml(member.src)}" alt="" crossorigin="anonymous" />`
        : member.src && member.mediaType === "video"
          ? `<video src="${escapeHtml(member.src)}" muted playsinline crossorigin="anonymous"></video>`
          : member.src
            ? `<b class="cast-member-kind">${escapeHtml(member.mediaType || "asset")}</b>`
            : "";
      return `
      <article class="cast-member ${member.imported ? "imported-member" : ""} ${member.onStage !== false ? "is-on-stage" : ""}" data-media-type="${escapeHtml(member.mediaType || "generated")}" data-cast-index="${index}" role="button" tabindex="0" draggable="true" aria-pressed="${member.onStage !== false}">
        ${media}
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <small>${escapeHtml(member.role)} · ${escapeHtml(member.type)}</small>
        </div>
      </article>
    `;
    }).join("") : `<p class="cast-empty-state">${availableCastMembers.length ? "No cast members match this filter" : "Import cast members to begin"}</p>`;

    castBin.querySelectorAll("[data-cast-index]").forEach((item) => {
      const castIndex = Number(item.dataset.castIndex);
      const toggleCastMember = () => {
        const nextPlan = currentPlan();
        if (!Number.isInteger(castIndex) || !nextPlan.cast?.[castIndex]?.src) return;
        const wasSelected = nextPlan.cast[castIndex].onStage !== false;
        if (wasSelected) {
          nextPlan.cast[castIndex] = {
            ...nextPlan.cast[castIndex],
            onStage: false,
          };
        } else {
          scheduleCastMember(nextPlan, castIndex);
        }
        playUiTick(wasSelected ? "select" : "stage");
        saveFilmPlan(nextPlan);
        renderFilmPlan(nextPlan);
      };
      item.addEventListener("click", toggleCastMember);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleCastMember();
        }
      });
      item.addEventListener("dragstart", (event) => {
        item.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.setData("text/plain", `cast:${item.dataset.castIndex}`);
        event.dataTransfer.setData("application/x-ainimation-cast-index", item.dataset.castIndex);
      });
      item.addEventListener("dragend", () => {
        item.classList.remove("is-dragging");
      });
      initCastPointerDrag(item, castIndex, toggleCastMember);
    });
  }

  const stageWindow = document.querySelector(".stage-canvas") || document.querySelector(".stage-window");
  if (stageWindow) {
    stageWindow.querySelectorAll(".stage-imported-member, .stage-item").forEach((member) => member.remove());
    importedStageMembers.slice(0, 6).forEach((member, index) => {
      const castIndex = castMembers.indexOf(member);
      const figure = document.createElement("figure");
      const stageMediaClass = member.mediaType === "video"
        ? "video-member"
        : member.mediaType === "audio"
          ? `audio-member ${audioStageKind(member) === "music" ? "music-member" : "sound-member"}`
          : "image-member";
      figure.className = `stage-imported-member ${stageMediaClass} ${isSelectedCastTarget(castIndex) ? "is-selected" : ""}`;
      figure.dataset.castIndex = String(castIndex);
      figure.dataset.stageIndex = String(index);
      const keyframe = interpolateStageKeyframe(member, currentTimelineFrame(), index) || defaultStageKeyframe(member, Number(member.startFrame || 1), index);
      figure.style.left = `${keyframe.x}%`;
      figure.style.top = `${keyframe.y}%`;
      figure.style.width = `${keyframe.w}%`;
      figure.style.height = `${keyframe.h}%`;
      const media = document.createElement(member.mediaType === "video" ? "video" : member.mediaType === "audio" ? "audio" : "img");
      if (member.stock || /^https?:\/\//i.test(member.src || "")) {
        media.crossOrigin = "anonymous";
      }
      media.src = member.src;
      media.alt = "";
      if (member.mediaType === "video") {
        media.muted = Boolean(member.muted);
        media.playsInline = true;
      }
      if (member.mediaType === "audio") {
        media.muted = Boolean(member.muted);
        media.preload = "metadata";
      }
      const audioGlyph = document.createElement("span");
      if (member.mediaType === "audio") {
        audioGlyph.className = `stage-audio-glyph ${audioStageKind(member)}`;
        audioGlyph.setAttribute("aria-hidden", "true");
      }
      const caption = document.createElement("figcaption");
      caption.textContent = member.name;
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "stage-member-resize";
      resizeHandle.setAttribute("aria-hidden", "true");
      const removeButton = document.createElement("button");
      removeButton.className = "stage-member-remove";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", "Remove cast member from stage");
      removeButton.textContent = "×";
      removeButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      removeButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeCastMemberFromStage(castIndex);
      });
      figure.append(media);
      if (member.mediaType === "audio") figure.append(audioGlyph);
      figure.append(caption, resizeHandle, removeButton);
      stageWindow.append(figure);
    });
    renderStageItems(stageWindow, plan);
  }

  if (scoreGrid) {
    const importedEndFrames = [
      ...importedTimelineMembers.map((member) => Number(member.startFrame || 1) + Number(member.durationFrames || 24) - 1),
      ...timelineTextItems.map((item) => Number(item.startFrame || 1) + Number(item.durationFrames || 24) - 1),
      ...timelineShapeItems.map((item) => Number(item.startFrame || 1) + Number(item.durationFrames || 24) - 1),
    ];
    const totalFrames = Math.max(...importedEndFrames, 240);
    const timelineZoom = loadTimelineZoom();
    const displayFrames = timelineDisplayFrames(totalFrames, timelineZoom);
    const frameMarks = timelineFrameMarks(displayFrames);
    const timelineMarkers = loadTimelineMarkers(totalFrames);
    const timelineAudioMembers = importedTimelineMembers.filter((member) => memberHasAudio(member));
    const allTimelineAudioMuted = timelineAudioMembers.length > 0 && timelineAudioMembers.every((member) => Boolean(member.muted));
    const scoreChannels = [
      ...importedTimelineMembers.map((member) => ({
        name: member.name,
        lane: member.mediaType === "video" || member.mediaType === "animation" ? "video" : member.mediaType === "audio" ? "music" : "cast",
        member,
        castIndex: castMembers.indexOf(member),
        hasAudio: memberHasAudio(member),
      })),
      ...timelineTextItems.map((item, index) => ({
        name: item.text || `Text ${index + 1}`,
        lane: "cast",
        member: item,
        stageItemId: item.id,
        hasAudio: false,
      })),
      ...timelineShapeItems.map((item, index) => ({
        name: item.type.startsWith("oval") ? `Oval ${index + 1}` : `Rectangle ${index + 1}`,
        lane: "stage",
        member: item,
        stageItemId: item.id,
        hasAudio: false,
      })),
    ];
    scoreGrid.style.setProperty("--total-frames", totalFrames);
    scoreGrid.style.setProperty("--timeline-display-frames", displayFrames);
    scoreGrid.style.setProperty("--timeline-zoom", timelineZoom);
    scoreGrid.innerHTML = `
      <div class="director-score">
        <div class="score-member-title">
          <span>Member</span>
          <button class="score-audio-mute-all ${allTimelineAudioMuted ? "is-muted" : ""}" type="button" data-audio-mute-all aria-pressed="${allTimelineAudioMuted ? "true" : "false"}" aria-label="${allTimelineAudioMuted ? "Unmute all timeline audio" : "Mute all timeline audio"}">
            <i class="score-audio-icon" aria-hidden="true"></i>
          </button>
        </div>
        <div class="score-ruler">
          <div class="score-tools" aria-label="Timeline transport"${timelineControlsStyle()}>
            <div class="score-play-cluster" role="group" aria-label="Timeline range controls">
              <button class="score-bound-button" type="button" data-score-bound="start" aria-label="Go to start">|←</button>
              <button class="score-play-top" type="button" data-score-play aria-label="Play timeline" aria-pressed="false">▶</button>
              <button class="score-bound-button" type="button" data-score-bound="end" aria-label="Go to end">→|</button>
            </div>
            <div class="score-transport" role="group" aria-label="Timeline frame controls">
              <button type="button" data-score-step="prev" aria-label="Previous mark">←</button>
              <div class="score-fps-stepper" aria-label="Timeline playback speed">
                <output class="score-fps-value" data-score-fps data-value="24" aria-label="24 frames per second">24</output>
                <span class="score-fps-buttons" aria-label="Frames per second controls">
                  <button type="button" data-score-fps-step="up" aria-label="Increase FPS">▲</button>
                  <button type="button" data-score-fps-step="down" aria-label="Decrease FPS">▼</button>
                </span>
              </div>
              <button type="button" data-score-step="next" aria-label="Next mark">→</button>
            </div>
            <div class="score-zoom-stepper" aria-label="Timeline zoom">
              <button type="button" data-score-zoom-step="down" aria-label="Make timeline larger">−</button>
              <input type="number" data-score-zoom data-value="${timelineZoom}" value="${timelineZoom}" min="50" max="900" step="100" aria-label="Timeline zoom ${timelineZoom} percent" />
              <button type="button" data-score-zoom-step="up" aria-label="Make timeline smaller">+</button>
            </div>
            <label class="score-mark-entry" aria-label="Create timeline mark at current frame">
              <span>Mark</span>
              <input type="text" data-score-mark-input maxlength="14" placeholder="F${currentTimelineFrame()}" />
              <button type="button" data-score-mark-add aria-label="Save mark at current frame">+</button>
            </label>
            <span class="score-tools-resize" data-score-tools-resize aria-hidden="true"></span>
          </div>
          ${frameMarks.map((frame) => `<span class="score-frame-number" style="left:${displayFrames <= 1 ? 0 : ((frame - 1) / (displayFrames - 1)) * 100}%">${frame}</span>`).join("")}
          <div class="score-marker-layer" aria-label="Timeline marks">
            ${timelineMarkers.map((marker) => `
              <button class="score-marker" type="button" style="left:${displayFrames <= 1 ? 0 : ((marker.frame - 1) / (displayFrames - 1)) * 100}%" data-marker-id="${escapeHtml(marker.id)}" data-marker-frame="${marker.frame}" aria-label="Timeline mark ${escapeHtml(marker.label)} at frame ${marker.frame}">
                <span contenteditable="true" spellcheck="false">${escapeHtml(marker.label)}</span>
              </button>
            `).join("")}
          </div>
          <i class="score-playhead" role="slider" aria-label="Timeline playhead" aria-valuemin="1" aria-valuemax="${totalFrames}" aria-valuenow="1" data-frame="1" data-display-frames="${displayFrames}"></i>
        </div>
        ${scoreChannels.length ? "" : `<div class="score-empty-state">Import cast members to start the timeline</div>`}
        ${scoreChannels.map((channel, channelIndex) => `
          <div class="score-row-label">
            <span contenteditable="true" spellcheck="false" role="textbox" aria-label="Edit timeline row label" data-score-label-index="${channelIndex}" ${Number.isInteger(channel.castIndex) ? `data-cast-index="${channel.castIndex}"` : ""} ${channel.stageItemId ? `data-stage-item-id="${escapeHtml(channel.stageItemId)}"` : ""}>${escapeHtml(channel.name)}</span>
            ${channel.hasAudio ? `<button class="score-audio-mute ${channel.member.muted ? "is-muted" : ""}" type="button" data-audio-mute data-cast-index="${channel.castIndex}" aria-pressed="${channel.member.muted ? "true" : "false"}" aria-label="${channel.member.muted ? "Unmute audio" : "Mute audio"}">${channel.member.muted ? "M" : "S"}</button>` : ""}
          </div>
          <div class="score-track ${channel.lane}">
            ${Number.isInteger(channel.castIndex) ? keyframeDotsForMember(channel.member, displayFrames, channel.castIndex) : ""}
            ${channel.stageItemId ? keyframeDotsForStageItem(channel.member, displayFrames) : ""}
            ${[channel.member].map((item) => {
              const length = Math.max(1, Number(item.durationFrames || 24));
              const start = Math.min(Math.max(1, Number(item.startFrame || 1)), Math.max(1, totalFrames - length + 1));
              const spriteLabel = channel.name;
              const selectedClass = Number.isInteger(channel.castIndex)
                ? isSelectedCastTarget(channel.castIndex)
                : isSelectedStageItemTarget(channel.stageItemId);
              const removeLabel = Number.isInteger(channel.castIndex)
                ? "Remove cast member from timeline"
                : "Remove stage item from timeline";
              return `
                <button class="score-sprite ${channel.lane} imported-member ${selectedClass ? "is-selected" : ""}" type="button" style="left:${((start - 1) / displayFrames) * 100}%;width:${(length / displayFrames) * 100}%" ${channel.stageItemId ? `data-stage-item-id="${escapeHtml(channel.stageItemId)}"` : `data-cast-index="${channel.castIndex}"`} data-start-frame="${start}" data-duration-frames="${length}">
                  <i class="score-sprite-handle start" data-sprite-handle="start" aria-hidden="true"></i>
                  <span>${escapeHtml(spriteLabel)}</span>
                  <small>${start}-${start + length - 1}</small>
                  <i class="score-sprite-remove" data-sprite-remove aria-label="${removeLabel}" title="Eliminar" role="button" tabindex="-1">×</i>
                  <i class="score-sprite-handle end" data-sprite-handle="end" aria-hidden="true"></i>
                </button>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    `;
    dockTimelineControlsInTitlebar();
    initScorePlayhead(totalFrames);
    initTimelineMarkerEditing(totalFrames);
    initScoreLabelEditing();
    initTimelineAudioMute();
    initTimelineSpriteDragging(totalFrames);
    initTimelineKeyframeDots();
    initCastDropTargets();
    syncStageToFrame(currentTimelineFrame(), false);
  }

  // La ventana Behaviour la pinta el editor XPL (assets/xpl-studio.js): reglas
  // reales que el motor ejecuta, no el texto Lingo de atrezzo de antes.
  window.ainXPL?.renderBehaviourWindow?.(plan);

  if (aiCueList) {
    aiCueList.innerHTML = plan.scenes.slice(0, 4).map((scene) => `
      <article>
        <span>${scene.behavior}()</span>
        <p>${scene.videoPrompt}</p>
      </article>
    `).join("");
  }

  sceneBoard.innerHTML = plan.scenes.map((scene) => `
    <article class="scene-row">
      <span>${String(scene.number).padStart(2, "0")}<br>${scene.act}</span>
      <div>
        <h4>${scene.beat}</h4>
        <p>${scene.scene}</p>
      </div>
      <div class="scene-prompt"><strong>${scene.behavior}()</strong><br>${scene.visualPrompt}</div>
    </article>
  `).join("");
  updateEditMenuState();
}

function toMarkdown(plan) {
  const lines = [
    `# ${plan.title}`,
    "",
    `**Format:** ${plan.format}`,
    `**Duration:** ${plan.duration}`,
    `**Genre:** ${plan.genre}`,
    `**Tone:** ${plan.tone}`,
    "",
    `## Logline`,
    plan.logline,
    "",
    `## Treatment`,
    plan.treatment,
    "",
    `## Pipeline`,
    `- **AI Image:** ${plan.pipeline.image}`,
    `- **AI Video:** ${plan.pipeline.video}`,
    `- **AI Music:** ${plan.pipeline.music}`,
    `- **AI Voiceover:** ${plan.pipeline.voice}`,
    "",
    `## Production Pass`,
    ...(plan.productionManifest?.route || []).map((item) => `- **${item.lane}:** ${item.job}`),
    "",
    `### Continuity Rules`,
    ...(plan.productionManifest?.continuityRules || []).map((rule) => `- ${rule}`),
    "",
    `### Deliverables`,
    ...(plan.productionManifest?.deliverables || []).map((item) => `- ${item}`),
    "",
    `### Risks`,
    ...(plan.productionManifest?.risks || []).map((risk) => `- ${risk}`),
    "",
    `## Cast`,
    ...(plan.cast || makeCast(plan)).map((member) => `- **${member.name}:** ${member.prompt}`),
    "",
    `## Scenes`,
  ];
  for (const scene of plan.scenes) {
    lines.push("", `### ${scene.number}. ${scene.beat}`, scene.scene, "", `Behavior: ${scene.behavior}()`, `Frames: ${scene.startFrame}-${scene.startFrame + scene.length}`, "", `Visual prompt: ${scene.visualPrompt}`, `Video prompt: ${scene.videoPrompt}`);
  }
  // Las reglas XPL de verdad — las que ejecuta el motor, no una frase decorativa.
  const rules = Array.isArray(plan.rules) ? plan.rules : [];
  lines.push("", "## Behaviours (XPL)");
  lines.push(rules.length
    ? rules.map((rule) => `- ${rule.enabled === false ? "(off) " : ""}**${rule.name || rule.id}** — ${window.XPL?.ruleSentence(rule, "es") || ""}`).join("\n")
    : "_Sin reglas: la pieza es lineal._");
  return lines.join("\n");
}

function planSlug(plan) {
  return plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "film";
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadPlanFile(plan, suffix, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${planSlug(plan)}-${suffix}.json`);
}

function totalTimelineFrames(plan) {
  const castEnds = (plan.cast || [])
    .filter((member) => member.imported && member.src && member.onStage !== false)
    .map((member) => Number(member.startFrame || 1) + Number(member.durationFrames || 24) - 1);
  const stageItemEnds = (plan.stageItems || [])
    .map((item) => Number(item.startFrame || 1) + Number(item.durationFrames || 24) - 1);
  const keyframeEnds = [
    ...(plan.cast || []),
    ...(plan.stageItems || []),
  ].flatMap((item) => (
    Array.isArray(item.keyframes)
      ? item.keyframes.map((keyframe) => Number(keyframe.frame || 1))
      : []
  ));
  return Math.max(1, ...castEnds, ...stageItemEnds, ...keyframeEnds);
}

window.totalTimelineFrames = totalTimelineFrames;

function stageAnimationSignature(plan = currentPlan()) {
  const cast = (plan.cast || [])
    .filter((member) => member.imported && member.src && member.onStage !== false)
    .map((member) => ({
      src: member.src,
      mediaType: member.mediaType,
      muted: Boolean(member.muted),
      startFrame: Number(member.startFrame || 1),
      durationFrames: Number(member.durationFrames || 24),
      keyframes: stageKeyframesFor(member),
    }));
  const stageItems = (plan.stageItems || [])
    .filter((item) => item.type === "text" || isShapeStageItem(item))
    .map((item) => ({
      id: item.id,
      type: item.type,
      text: item.text || "",
      color: item.color || "",
      startFrame: Number(item.startFrame || 1),
      durationFrames: Number(item.durationFrames || 24),
      keyframes: stageKeyframesFor(item),
      fontWeight: item.fontWeight || "",
      fontStyle: item.fontStyle || "",
      textDecoration: item.textDecoration || "",
      textAlign: item.textAlign || "",
      fontSize: item.fontSize || "",
    }));
  return JSON.stringify({
    fps: timelineFps(),
    totalFrames: totalTimelineFrames(plan),
    cast,
    stageItems,
  });
}

function getStageAnimationCapture() {
  const signature = stageAnimationSignature();
  if (stageAnimationCaptureCache?.signature === signature) {
    if (stageAnimationCaptureCache.blob) return Promise.resolve(stageAnimationCaptureCache.blob);
    if (stageAnimationCaptureCache.promise) return stageAnimationCaptureCache.promise;
  }
  const promise = renderStageAnimationBlob()
    .then((blob) => {
      stageAnimationCaptureCache = { signature, blob };
      return blob;
    })
    .catch((error) => {
      if (stageAnimationCaptureCache?.signature === signature) stageAnimationCaptureCache = null;
      throw error;
    });
  stageAnimationCaptureCache = { signature, promise };
  return promise;
}

window.getStageAnimationCapture = getStageAnimationCapture;

function captureAudioTracksFromStage() {
  return [...document.querySelectorAll(".stage-imported-member:not(.is-out-of-frame) video, .stage-imported-member:not(.is-out-of-frame) audio")]
    .filter((media) => !media.muted)
    .flatMap((media) => {
      const capture = media.captureStream || media.mozCaptureStream;
      if (typeof capture !== "function") return [];
      try {
        return capture.call(media)?.getAudioTracks?.() || [];
      } catch {
        return [];
      }
    });
}

function mergeCanvasAndAudioStreams(canvasStream, audioTracks) {
  if (typeof MediaStream === "undefined" || !canvasStream?.getTracks) return canvasStream;
  return new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);
}

function stageGradient(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0b1327");
  gradient.addColorStop(0.48, "#152640");
  gradient.addColorStop(1, "#10141f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawStageGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(190, 231, 255, 0.16)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= stageWidthPixels; x += stageRulerStep) {
    const px = (x / stageWidthPixels) * width;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }
  for (let y = 0; y <= stageHeightPixels; y += stageRulerStep) {
    const py = (y / stageHeightPixels) * height;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(width, py);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoundedImage(ctx, media, x, y, width, height, radius = 8) {
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(media, x, y, width, height);
  ctx.restore();
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStageDomFrame(ctx, stage, width, height) {
  const stageRect = stage.getBoundingClientRect();
  stageGradient(ctx, width, height);

  stage.querySelectorAll(".stage-imported-member:not(.is-out-of-frame)").forEach((figure) => {
    const rect = figure.getBoundingClientRect();
    const x = ((rect.left - stageRect.left) / stageRect.width) * width;
    const y = ((rect.top - stageRect.top) / stageRect.height) * height;
    const itemWidth = (rect.width / stageRect.width) * width;
    const itemHeight = (rect.height / stageRect.height) * height;
    const media = figure.querySelector("img, video");
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(230, 246, 255, 0.86)";
    ctx.lineWidth = 1;
    roundedRectPath(ctx, x, y, itemWidth, itemHeight, 8);
    ctx.stroke();
    ctx.restore();
    try {
      if (media && (media.tagName === "VIDEO" || media.complete)) {
        drawRoundedImage(ctx, media, x, y, itemWidth, itemHeight, 8);
      }
    } catch {
      ctx.fillStyle = "rgba(49, 190, 209, 0.28)";
      ctx.fillRect(x, y, itemWidth, itemHeight);
    }
    const caption = figure.querySelector("figcaption")?.textContent.trim();
    if (caption) {
      ctx.fillStyle = "rgba(5, 8, 14, 0.82)";
      ctx.fillRect(x, y + itemHeight - 22, itemWidth, 22);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(caption, x + 6, y + itemHeight - 7, Math.max(10, itemWidth - 12));
    }
  });

  stage.querySelectorAll(".stage-line-item").forEach((line) => {
    const rect = line.getBoundingClientRect();
    const style = getComputedStyle(line);
    const x = ((rect.left - stageRect.left) / stageRect.width) * width;
    const y = ((rect.top - stageRect.top + rect.height / 2) / stageRect.height) * height;
    const lineWidth = (rect.width / stageRect.width) * width;
    ctx.save();
    ctx.translate(x, y);
    if (style.transform !== "none") {
      const matrix = new DOMMatrixReadOnly(style.transform);
      ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0);
    }
    ctx.strokeStyle = style.backgroundColor || "#edf6ff";
    ctx.lineWidth = Math.max(2, (rect.height / stageRect.height) * height);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(lineWidth, 0);
    ctx.stroke();
    ctx.restore();
  });

  stage.querySelectorAll(".stage-shape-item:not(.is-out-of-frame)").forEach((shape) => {
    const rect = shape.getBoundingClientRect();
    const style = getComputedStyle(shape);
    const x = ((rect.left - stageRect.left) / stageRect.width) * width;
    const y = ((rect.top - stageRect.top) / stageRect.height) * height;
    const itemWidth = (rect.width / stageRect.width) * width;
    const itemHeight = (rect.height / stageRect.height) * height;
    ctx.save();
    ctx.lineWidth = Math.max(2, (2 / stageRect.height) * height);
    ctx.strokeStyle = style.borderColor || "#edf6ff";
    ctx.fillStyle = style.backgroundColor || "transparent";
    ctx.beginPath();
    if (shape.classList.contains("is-oval")) {
      ctx.ellipse(x + itemWidth / 2, y + itemHeight / 2, itemWidth / 2, itemHeight / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.rect(x, y, itemWidth, itemHeight);
    }
    if (shape.classList.contains("is-filled")) ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  stage.querySelectorAll(".stage-text-item:not(.is-out-of-frame)").forEach((item) => {
    const content = item.querySelector(".stage-text-content");
    if (!content) return;
    const rect = item.getBoundingClientRect();
    const contentStyle = getComputedStyle(content);
    const itemStyle = getComputedStyle(item);
    const x = ((rect.left - stageRect.left) / stageRect.width) * width;
    const y = ((rect.top - stageRect.top) / stageRect.height) * height;
    const itemWidth = (rect.width / stageRect.width) * width;
    const fontSize = Math.max(12, (Number.parseFloat(contentStyle.fontSize) / stageRect.height) * height);
    ctx.fillStyle = itemStyle.color || "#edf6ff";
    ctx.font = `${contentStyle.fontStyle} ${contentStyle.fontWeight} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = contentStyle.textAlign || "left";
    ctx.textBaseline = "top";
    const textX = contentStyle.textAlign === "center" ? x + itemWidth / 2 : contentStyle.textAlign === "right" ? x + itemWidth - 10 : x + 10;
    ctx.fillText(content.textContent.trim() || "Text", textX, y + 8, Math.max(20, itemWidth - 18));
  });
}

function renderStageAnimationBlob() {
  const stage = document.querySelector(".stage-canvas");
  const plan = currentPlan();
  const fps = Number(document.querySelector("[data-score-fps]")?.dataset.value || 24);
  if (!stage || typeof MediaRecorder === "undefined") {
    return Promise.reject(new Error("Video export is not available in this browser yet."));
  }
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof canvas.captureStream !== "function") {
    return Promise.reject(new Error("Video export is not available in this browser yet."));
  }
  const exportFps = Math.max(30, Math.min(60, fps * 2));
  const canvasStream = canvas.captureStream(exportFps);
  syncStageToFrame(1, true);
  const stream = mergeCanvasAndAudioStreams(canvasStream, captureAudioTracksFromStage());
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  const totalFrames = totalTimelineFrames(plan);
  const durationMs = (totalFrames / Math.max(1, fps)) * 1000;
  let animationFrame = null;
  let startedAt = 0;
  let stopped = false;

  return new Promise((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      syncStageToFrame(currentTimelineFrame(), false);
      reject(new Error("Could not record Stage animation."));
    });
    recorder.addEventListener("stop", () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      syncStageToFrame(currentTimelineFrame(), false);
      resolve(new Blob(chunks, { type: "video/webm" }));
    });

    const renderAt = (timestamp) => {
      if (!startedAt) startedAt = timestamp;
      const elapsed = Math.max(0, timestamp - startedAt);
      const frame = Math.min(totalFrames, 1 + (elapsed / 1000) * Math.max(1, fps));
      syncStageToFrame(frame, true);
      drawStageDomFrame(ctx, stage, canvas.width, canvas.height);
      if (elapsed >= durationMs && !stopped) {
        stopped = true;
        recorder.stop();
        return;
      }
      animationFrame = window.requestAnimationFrame(renderAt);
    };

    syncStageToFrame(1, true);
    drawStageDomFrame(ctx, stage, canvas.width, canvas.height);
    recorder.start();
    animationFrame = window.requestAnimationFrame(renderAt);
  });
}

async function exportStageVideo() {
  const plan = currentPlan();
  const previousLabel = downloadStageVideoButton?.textContent;
  if (downloadStageVideoButton) {
    downloadStageVideoButton.disabled = true;
    downloadStageVideoButton.textContent = "Exportando...";
  }
  try {
    const blob = await getStageAnimationCapture();
    downloadBlob(blob, `${planSlug(plan)}-stage.webm`);
  } catch (error) {
    window.alert(error.message || "Video export is not available in this browser yet.");
  } finally {
    if (downloadStageVideoButton) {
      downloadStageVideoButton.disabled = false;
      downloadStageVideoButton.textContent = previousLabel || "Descargar";
    }
  }
}

function makeExportPackage(plan) {
  return {
    package: "Admira Player Ready",
    version: "AiDirector v2026.05.20 r22",
    includeMetadata: Boolean(includeMetadata?.checked),
    formats: {
      video: ["MP4", "MOV", "ProRes", "4K/8K", "PP Solving"],
      audio: ["WAV", "MP3", "Stem Tracks", "Full Score + Voice"],
      text: ["PNG Sequence", "EXR", "Prompts Log", "Production Bible"],
      animations: ["Lottie", "JSON", "SRT", "USDz", "GLB"],
    },
    player: {
      ready: true,
      controls: ["Play Video", "Play Animation", "Preview Audio", "View Image Sequence", "Read Script"],
    },
    project: plan,
    productionManifest: plan.productionManifest || buildProductionManifest(plan, plan.scenes || []),
    markdown: toMarkdown(plan),
  };
}

function openExportStudio() {
  if (!exportModal) return;
  const plan = currentPlan();
  if (exportMovieTitle) exportMovieTitle.textContent = plan.title;
  exportModal.classList.add("open");
  exportModal.setAttribute("aria-hidden", "false");
}

function closeExportStudio() {
  if (!exportModal) return;
  exportModal.classList.remove("open");
  exportModal.setAttribute("aria-hidden", "true");
}

function openHelpStudio() {
  if (!helpModal) return;
  helpModal.classList.add("open");
  helpModal.setAttribute("aria-hidden", "false");
}

function closeHelpStudio() {
  if (!helpModal) return;
  helpModal.classList.remove("open");
  helpModal.setAttribute("aria-hidden", "true");
}

function setActiveDirectorWindow(windowEl) {
  if (!windowEl || windowEl.classList.contains("window-closed")) return;
  directorWindows.forEach((item) => item.classList.remove("window-active"));
  windowEl.classList.add("window-active");
  activeDirectorWindow = windowEl;
}

function getActiveDirectorWindow() {
  if (activeDirectorWindow && !activeDirectorWindow.classList.contains("window-closed")) {
    return activeDirectorWindow;
  }
  return [...directorWindows].find((windowEl) => !windowEl.classList.contains("window-closed")) || null;
}

function maximizeDirectorWindow(windowEl = getActiveDirectorWindow()) {
  if (!windowEl) return;
  setActiveDirectorWindow(windowEl);
  const isMaximized = windowEl.classList.toggle("window-maximized");
  windowEl.classList.remove("window-minimized");
  directorShell?.classList.toggle("has-maximized-window", isMaximized);
  if (!isMaximized) directorShell?.classList.remove("has-maximized-window");
}

function minimizeDirectorWindow(windowEl = getActiveDirectorWindow()) {
  if (!windowEl) return;
  setActiveDirectorWindow(windowEl);
  windowEl.classList.toggle("window-minimized");
  windowEl.classList.remove("window-maximized");
  directorShell?.classList.remove("has-maximized-window");
}

function closeDirectorWindow(windowEl = getActiveDirectorWindow()) {
  if (!windowEl) return;
  windowEl.classList.remove("window-maximized", "window-minimized", "window-active");
  windowEl.classList.add("window-closed");
  directorShell?.classList.remove("has-maximized-window");
  activeDirectorWindow = getActiveDirectorWindow();
  if (activeDirectorWindow) setActiveDirectorWindow(activeDirectorWindow);
}

function makeWindowFreeform(windowEl) {
  if (!windowEl || !directorShell || windowEl.classList.contains("window-freeform")) return;
  const shellRect = directorShell.getBoundingClientRect();
  const rect = windowEl.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  windowEl.style.left = `${rect.left - shellRect.left}px`;
  windowEl.style.top = `${rect.top - shellRect.top}px`;
  windowEl.style.width = `${width}px`;
  windowEl.style.height = `${height}px`;
  windowEl.classList.add("window-freeform");
}

function clampWindowPosition(windowEl, left, top) {
  const shellRect = directorShell.getBoundingClientRect();
  const rect = windowEl.getBoundingClientRect();
  const maxLeft = Math.max(0, shellRect.width - rect.width - 8);
  const maxTop = Math.max(0, shellRect.height - rect.height - 8);
  return {
    left: Math.min(Math.max(8, left), maxLeft),
    top: Math.min(Math.max(8, top), maxTop),
  };
}

directorWindows.forEach((windowEl) => {
  windowEl.addEventListener("pointerdown", () => setActiveDirectorWindow(windowEl));
  windowEl.addEventListener("focusin", () => setActiveDirectorWindow(windowEl));
  const titlebar = windowEl.querySelector(".window-titlebar");

  titlebar?.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".window-controls")) return;
    if (windowEl.classList.contains("window-maximized") || windowEl.classList.contains("window-closed")) return;
    event.preventDefault();
    setActiveDirectorWindow(windowEl);
    makeWindowFreeform(windowEl);
    const shellRect = directorShell.getBoundingClientRect();
    const rect = windowEl.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    draggedDirectorWindow = windowEl;
    windowEl.classList.add("window-dragging");
    windowEl.setPointerCapture?.(event.pointerId);
    const position = clampWindowPosition(windowEl, event.clientX - shellRect.left - dragOffsetX, event.clientY - shellRect.top - dragOffsetY);
    windowEl.style.left = `${position.left}px`;
    windowEl.style.top = `${position.top}px`;
  });

  const controls = windowEl.querySelectorAll(".window-controls i");
  const actions = [
    ["Close", "F3", closeDirectorWindow],
    ["Minimize", "F2", minimizeDirectorWindow],
    ["Maximize", "F1", maximizeDirectorWindow],
  ];

  controls.forEach((control, index) => {
    const [label, shortcut, action] = actions[index] || actions[2];
    control.setAttribute("role", "button");
    control.setAttribute("tabindex", "0");
    control.setAttribute("aria-label", `${label} window (${shortcut})`);
    control.setAttribute("title", `${label} window (${shortcut})`);
    control.dataset.windowAction = label.toLowerCase();
    control.addEventListener("click", (event) => {
      event.stopPropagation();
      setActiveDirectorWindow(windowEl);
      action(windowEl);
    });
    control.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setActiveDirectorWindow(windowEl);
      action(windowEl);
    });
  });
});

document.addEventListener("pointermove", (event) => {
  if (!draggedDirectorWindow || !directorShell) return;
  const shellRect = directorShell.getBoundingClientRect();
  const position = clampWindowPosition(
    draggedDirectorWindow,
    event.clientX - shellRect.left - dragOffsetX,
    event.clientY - shellRect.top - dragOffsetY,
  );
  draggedDirectorWindow.style.left = `${position.left}px`;
  draggedDirectorWindow.style.top = `${position.top}px`;
});

document.addEventListener("pointerup", () => {
  if (!draggedDirectorWindow) return;
  draggedDirectorWindow.classList.remove("window-dragging");
  draggedDirectorWindow = null;
});

if (directorWindows.length) {
  setActiveDirectorWindow(directorWindows[0]);
}

function currentPlan() {
  return normalizeFilmPlan(loadFilmPlan()) || buildFilmPlan();
}

function renderStageRulers() {
  const xRuler = document.querySelector(".stage-ruler-x");
  const yRuler = document.querySelector(".stage-ruler-y");
  const stage = document.querySelector(".stage-canvas");
  if (!xRuler || !yRuler || !stage) return;
  const stageRect = stage.getBoundingClientRect();
  const stageWidth = Math.max(1, Math.round(stageRect.width));
  const stageHeight = Math.max(1, Math.round(stageRect.height));
  const makeMarks = (max) => {
    const marks = [];
    for (let value = 0; value <= max; value += stageRulerStep) {
      marks.push(value);
    }
    if (marks[marks.length - 1] !== max) marks.push(max);
    return marks;
  };
  const xLabel = xRuler.querySelector("b")?.outerHTML || "<b>H px</b>";
  const yLabel = yRuler.querySelector("b")?.outerHTML || "<b>V px</b>";
  xRuler.innerHTML = `${xLabel}${makeMarks(stageWidth).map((value) => (
    `<span style="left:${value}px">${value}</span>`
  )).join("")}`;
  yRuler.innerHTML = `${yLabel}${makeMarks(stageHeight).map((value) => (
    `<span style="top:${value}px">${value}</span>`
  )).join("")}`;
}

window.renderStageRulers = renderStageRulers;

function initStageRulerToggle() {
  const stageWindow = document.querySelector(".stage-window");
  const toggle = document.querySelector("[data-stage-ruler-toggle]");
  const stage = document.querySelector(".stage-canvas");
  if (!stageWindow || !toggle || !stage) return;
  toggle.addEventListener("click", () => {
    const hidden = stageWindow.classList.toggle("rulers-hidden");
    toggle.setAttribute("aria-pressed", String(!hidden));
  });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => renderStageRulers());
    observer.observe(stage);
  }
  window.addEventListener("load", renderStageRulers);
  window.setTimeout(renderStageRulers, 80);
  window.setTimeout(renderStageRulers, 420);
  let refreshCount = 0;
  const refreshTimer = window.setInterval(() => {
    renderStageRulers();
    refreshCount += 1;
    if (refreshCount >= 10) window.clearInterval(refreshTimer);
  }, 250);
}

function cleanMemberName(fileName) {
  return String(fileName || "Imported member")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 34) || "Imported member";
}

function memberTypeFromMode(file, mode) {
  if (mode === "auto") {
    if (file.type.startsWith("image/gif")) return "animation";
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("text/") || /\.(txt|md|rtf|json|lottie)$/i.test(file.name)) return "text";
    return "";
  }
  if (mode === "audio") return file.type.startsWith("audio/") ? "audio" : "";
  if (mode === "text") return file.type.startsWith("text/") || /\.(txt|md|rtf|json)$/i.test(file.name) ? "text" : "";
  if (mode === "animation") {
    if (file.type.startsWith("video/")) return "video";
    if (file.type === "image/gif") return "animation";
    if (/\.(gif|json|lottie)$/i.test(file.name)) return "animation";
    return "";
  }
  if (mode === "video") return file.type.startsWith("video/") ? "video" : "";
  return file.type.startsWith("image/") ? "image" : "";
}

function memberTypeLabel(mediaType) {
  return {
    animation: "Animation member",
    audio: "Sound member",
    image: "Image member",
    text: "Text member",
    video: "Video member",
  }[mediaType] || "Imported member";
}

function isTimedMediaType(mediaType) {
  return ["audio", "video", "animation"].includes(mediaType);
}

function isVisualMediaType(mediaType) {
  return ["image", "video"].includes(mediaType);
}

function probeMediaMetadata(src, mediaType) {
  if (!src) return Promise.resolve({});
  if (mediaType === "image") {
    return new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      const finish = (metadata = {}) => {
        if (settled) return;
        settled = true;
        image.removeAttribute("src");
        resolve(metadata);
      };
      image.crossOrigin = /^https?:\/\//i.test(src) ? "anonymous" : "";
      image.addEventListener("load", () => {
        const aspectRatio = image.naturalWidth > 0 && image.naturalHeight > 0
          ? image.naturalWidth / image.naturalHeight
          : null;
        finish({ aspectRatio });
      }, { once: true });
      image.addEventListener("error", () => finish(), { once: true });
      window.setTimeout(() => finish(), 3000);
      image.src = src;
    });
  }
  if (!isTimedMediaType(mediaType)) return Promise.resolve({});
  return new Promise((resolve) => {
    const media = document.createElement(mediaType === "audio" ? "audio" : "video");
    let settled = false;
    const finish = (metadata = {}) => {
      if (settled) return;
      settled = true;
      media.removeAttribute("src");
      media.load?.();
      resolve(metadata);
    };
    media.preload = "metadata";
    media.muted = true;
    media.playsInline = true;
    media.crossOrigin = /^https?:\/\//i.test(src) ? "anonymous" : "";
    media.addEventListener("loadedmetadata", () => {
      const aspectRatio = media.videoWidth > 0 && media.videoHeight > 0
        ? media.videoWidth / media.videoHeight
        : null;
      finish({
        durationFrames: Number.isFinite(media.duration) && media.duration > 0
          ? framesFromSeconds(media.duration)
          : 24,
        aspectRatio,
      });
    }, { once: true });
    media.addEventListener("error", () => finish({ durationFrames: 24 }), { once: true });
    window.setTimeout(() => finish({ durationFrames: 24 }), 3000);
    media.src = src;
  });
}

function updateMemberMetadataFromMedia(castIndex, src, mediaType) {
  if (!isTimedMediaType(mediaType) && !isVisualMediaType(mediaType)) return;
  probeMediaMetadata(src, mediaType).then((metadata) => {
    const plan = currentPlan();
    const member = plan.cast?.[castIndex];
    if (!member || member.src !== src) return;
    const currentDuration = Math.max(1, Number(member.durationFrames || 24));
    let shouldRender = false;
    const nextMember = {
      ...member,
      durationPending: false,
      aspectPending: false,
    };
    if (Number(metadata.durationFrames || 0) > 0 && (member.durationPending || currentDuration === 24)) {
      const nextDurationFrames = member.onStage
        ? Math.max(currentDuration, metadata.durationFrames)
        : metadata.durationFrames;
      nextMember.durationFrames = nextDurationFrames;
      shouldRender ||= nextDurationFrames !== currentDuration;
    }
    if (Number(metadata.aspectRatio || 0) > 0) {
      const currentAspectRatio = Number(member.aspectRatio || 0);
      nextMember.aspectRatio = metadata.aspectRatio;
      shouldRender ||= Math.abs(currentAspectRatio - metadata.aspectRatio) > 0.001;
      if (member.aspectPending && member.onStage !== false) {
        const keyframes = stageKeyframesFor(member, castIndex).map((keyframe) => (
          keyframeWithMediaAspect(keyframe, metadata.aspectRatio)
        ));
        const first = keyframes[0];
        nextMember.keyframes = keyframes;
        if (first) {
          nextMember.stageX = first.x;
          nextMember.stageY = first.y;
          nextMember.stageW = first.w;
          nextMember.stageH = first.h;
        }
        shouldRender = true;
      }
    }
    plan.cast[castIndex] = nextMember;
    saveFilmPlan(plan);
    if (!shouldRender) return;
    renderFilmPlan(plan);
    setTimelineFrame(currentTimelineFrame(), false);
  }).catch(() => {});
}

function updateMemberDurationFromMetadata(castIndex, src, mediaType) {
  updateMemberMetadataFromMedia(castIndex, src, mediaType);
}

function importMemberFiles(files, mode = "image") {
  const incoming = [...(files || [])];
  if (!incoming.length) return;
  const plan = currentPlan();
  const existing = plan.cast || makeCast(plan);
  const timelineMemberCount = existing.filter((member) => member.imported && member.src).length;
  const imported = incoming
    .map((file) => ({ file, mediaType: memberTypeFromMode(file, mode) }))
    .filter((item) => item.mediaType)
    .map((file, index) => {
      const baseName = cleanMemberName(file.file.name);
      const memberNumber = existing.length + index + 1;
      return {
        role: "Imported",
        name: `${baseName} ${String(memberNumber).padStart(2, "0")}`,
        type: memberTypeLabel(file.mediaType),
        mediaType: file.mediaType,
        fileName: file.file.name,
        src: URL.createObjectURL(file.file),
        imported: true,
        onStage: false,
        startFrame: 1 + (timelineMemberCount + index) * 24,
        durationFrames: 24,
        durationPending: isTimedMediaType(file.mediaType),
        aspectPending: isVisualMediaType(file.mediaType),
        prompt: `Imported ${file.mediaType} member. Place in Cast, schedule on Timeline, and prepare for later AI animation passes.`,
      };
    });
  if (!imported.length) return;
  const firstImportedIndex = existing.length;
  plan.cast = [...existing, ...imported];
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  imported.forEach((member, index) => updateMemberMetadataFromMedia(
    firstImportedIndex + index,
    member.src,
    member.mediaType,
  ));
  playUiTick("import");
  window.refreshDirectorWindows?.();
}

function closeArchivoMenu() {
  document.querySelector(".member-menu")?.classList.remove("open");
  document.querySelector("[data-member-menu]")?.setAttribute("aria-expanded", "false");
}

function stockItemsFromPayload(payload, limit = stockImportBatchSize, visited = new Set()) {
  if (!payload || limit <= 0 || visited.has(payload)) return [];
  if (typeof payload === "object") visited.add(payload);
  if (Array.isArray(payload)) {
    return payload
      .flatMap((item) => stockItemsFromPayload(item, limit, visited))
      .slice(0, limit);
  }
  const candidates = [
    payload.items,
    payload.results,
    payload.stock,
    payload.contents,
    payload.content,
    payload.assets,
    payload.data,
    payload.latest,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const items = stockItemsFromPayload(candidate, limit, visited);
    if (items.length) return items.slice(0, limit);
  }
  return typeof payload === "object" ? [payload] : [];
}

function firstStockItem(payload) {
  return stockItemsFromPayload(payload, 1)[0] || null;
}

function findStockField(source, fieldNames, visited = new Set()) {
  if (!source || typeof source !== "object" || visited.has(source)) return "";
  visited.add(source);
  const names = new Set(fieldNames.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(source)) {
    if (names.has(key.toLowerCase())) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (value && typeof value === "object") {
        const nested = findStockField(value, ["url", "src", "href", "path"], visited);
        if (nested) return nested;
      }
    }
  }
  for (const value of Object.values(source)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findStockField(item, fieldNames, visited);
        if (nested) return nested;
      }
    } else if (value && typeof value === "object") {
      const nested = findStockField(value, fieldNames, visited);
      if (nested) return nested;
    }
  }
  return "";
}

function findStockNumberField(source, fieldNames, visited = new Set()) {
  if (!source || typeof source !== "object" || visited.has(source)) return null;
  visited.add(source);
  const names = new Set(fieldNames.map((name) => name.toLowerCase()));
  for (const [key, value] of Object.entries(source)) {
    if (!names.has(key.toLowerCase())) continue;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  for (const value of Object.values(source)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findStockNumberField(item, fieldNames, visited);
        if (nested) return nested;
      }
    } else if (value && typeof value === "object") {
      const nested = findStockNumberField(value, fieldNames, visited);
      if (nested) return nested;
    }
  }
  return null;
}

function stockUrl(value, endpoint) {
  if (!value) return "";
  try {
    return new URL(value, endpoint).href;
  } catch {
    return value;
  }
}

function stockMediaType(item, src) {
  const mime = findStockField(item, ["mime", "mimeType", "contentType", "mediaType", "type"]);
  if (/video/i.test(mime) || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(src)) return "video";
  if (/audio/i.test(mime) || /\.(mp3|wav|ogg|m4a)(\?|#|$)/i.test(src)) return "audio";
  if (/gif|lottie|animation/i.test(mime) || /\.(gif|lottie)(\?|#|$)/i.test(src)) return "animation";
  if (/text|json|markdown/i.test(mime) || /\.(txt|md|rtf|json)(\?|#|$)/i.test(src)) return "text";
  return "image";
}

function stockTextFingerprint(item) {
  return [
    findStockField(item, ["motor", "engine", "generator", "createdBy", "author"]),
    findStockField(item, ["type", "mediaType", "mime", "mimeType", "contentType"]),
    findStockField(item, ["title", "name", "label"]),
    findStockField(item, ["prompt", "comment", "description"]),
  ].join(" ").toLowerCase();
}

function isAinimationGeneratedAnimation(item, src) {
  const fingerprint = stockTextFingerprint(item);
  const hasAinimationMarker = /\bainimation\b|aidirector/.test(fingerprint);
  const hasAnimationMarker = /\banimation\b|animaci[oó]n|webm/.test(fingerprint) || /\.webm(\?|#|$)/i.test(src || "");
  return hasAinimationMarker && hasAnimationMarker;
}

function formatStockDuration(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  const total = Math.round(value);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return minutes ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
}

function stockMemberFromItem(item, endpoint, existingCount, timelineMemberCount) {
  const rawUrl = findStockField(item, [
    "assetUrl",
    "mediaUrl",
    "downloadUrl",
    "publicUrl",
    "previewUrl",
    "thumbnailUrl",
    "imageUrl",
    "videoUrl",
    "url",
    "src",
    "href",
  ]);
  const src = stockUrl(rawUrl, endpoint);
  if (!src) return null;
  if (isAinimationGeneratedAnimation(item, src)) return null;
  const mediaType = stockMediaType(item, src);
  if (mediaType === "animation") return null;
  const width = findStockNumberField(item, ["width", "w", "naturalWidth", "videoWidth", "imageWidth", "pixelWidth"]);
  const height = findStockNumberField(item, ["height", "h", "naturalHeight", "videoHeight", "imageHeight", "pixelHeight"]);
  const durationSeconds = findStockNumberField(item, ["duration", "durationSeconds", "seconds", "videoDuration", "audioDuration"]);
  const aspectRatio = width && height ? width / height : null;
  const rawName = findStockField(item, ["title", "name", "fileName", "filename", "label", "slug"]);
  const stockPrompt = findStockField(item, ["prompt", "comment", "description", "caption", "alt", "query"]);
  const baseName = cleanMemberName(rawName || "Admira Stock latest");
  return {
    role: "Stock",
    name: `${baseName} ${String(existingCount + 1).padStart(2, "0")}`,
    type: memberTypeLabel(mediaType),
    mediaType,
    fileName: rawName || src.split("/").pop() || "stock",
    src,
    imported: true,
    stock: true,
    source: "admira.studio Stock",
    sourceUrl: src,
    sourceWidth: width || null,
    sourceHeight: height || null,
    sourceDuration: durationSeconds || null,
    stockPrompt,
    stockFingerprint: stockTextFingerprint(item),
    onStage: false,
    startFrame: 1 + timelineMemberCount * 24,
    durationFrames: 96,
    durationPending: isTimedMediaType(mediaType),
    aspectRatio,
    aspectPending: isVisualMediaType(mediaType) && !aspectRatio,
    prompt: "Imported from admira.studio Stock. Add to Stage from Cast to schedule it on the Timeline.",
  };
}

function stockMemberFromImportParams(params, existingCount, timelineMemberCount) {
  const src = params.get("admiraStockUrl") || "";
  if (!src) return null;
  const rawType = (params.get("admiraStockType") || "").toLowerCase();
  const mediaType = rawType === "audio" || rawType === "music"
    ? "audio"
    : rawType === "video" || rawType === "animation"
      ? "video"
      : rawType === "image"
        ? "image"
        : stockMediaType({
    type: rawType,
    mime: params.get("admiraStockMime") || "",
  }, src);
  const width = Number(params.get("admiraStockWidth") || 0) || null;
  const height = Number(params.get("admiraStockHeight") || 0) || null;
  const durationSeconds = Number(params.get("admiraStockDuration") || 0) || null;
  const rawName = params.get("admiraStockTitle") || params.get("admiraStockId") || src.split("/").pop() || "Admira Stock asset";
  const stockPrompt = params.get("admiraStockPrompt") || "";
  return {
    role: "Stock",
    name: `${cleanMemberName(rawName)} ${String(existingCount + 1).padStart(2, "0")}`,
    type: memberTypeLabel(mediaType),
    mediaType,
    fileName: rawName,
    src,
    imported: true,
    stock: true,
    source: "admira.studio Stock direct",
    sourceUrl: src,
    sourceWidth: width,
    sourceHeight: height,
    sourceDuration: durationSeconds,
    thumbnail: params.get("admiraStockThumbnail") || "",
    stockPrompt,
    stockFingerprint: `admira stock direct ${rawType} ${rawName} ${stockPrompt}`.toLowerCase(),
    onStage: false,
    startFrame: 1 + timelineMemberCount * 24,
    durationFrames: 96,
    durationPending: isTimedMediaType(mediaType),
    aspectRatio: width && height ? width / height : null,
    aspectPending: isVisualMediaType(mediaType) && !(width && height),
    prompt: "Imported directly from admira.studio Stock. Add to Stage from Cast to schedule it on the Timeline.",
  };
}

function importAdmiraStockAssetFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("admiraStockUrl")) return false;
  const plan = currentPlan();
  const existing = plan.cast || makeCast(plan);
  const sourceUrl = params.get("admiraStockUrl") || "";
  if (existing.some((member) => member.sourceUrl === sourceUrl || member.src === sourceUrl)) {
    document.querySelector('[data-open-window="cast"]')?.click();
    return true;
  }
  const timelineMemberCount = existing.filter((member) => member.imported && member.src).length;
  const member = stockMemberFromImportParams(params, existing.length, timelineMemberCount);
  if (!member) return false;
  composeStockMembersIntoPlan([member]);
  updateMemberMetadataFromMedia(existing.length, member.src, member.mediaType);
  try {
    const url = new URL(window.location.href);
    [
      "admiraStockUrl",
      "admiraStockType",
      "admiraStockTitle",
      "admiraStockId",
      "admiraStockPrompt",
      "admiraStockThumbnail",
      "admiraStockWidth",
      "admiraStockHeight",
      "admiraStockDuration",
      "admiraStockMime",
    ].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {}
  return true;
}

function composeImportedStockMembers(plan, startIndex, count) {
  const layouts = [
    { x: 10, y: 14, w: 42, h: 38, maxW: 42, maxH: 38 },
    { x: 48, y: 18, w: 42, h: 38, maxW: 42, maxH: 38 },
    { x: 28, y: 48, w: 44, h: 38, maxW: 44, maxH: 38 },
  ];
  for (let offset = 0; offset < count; offset += 1) {
    const castIndex = startIndex + offset;
    const member = plan.cast?.[castIndex];
    if (!member) continue;
    const slot = layouts[offset % layouts.length];
    const layout = centerStageBoxInBounds(slot, stageBoxWithMediaAspect(member, slot));
    const startFrame = 1;
    const durationFrames = Math.max(Number(member.durationFrames || 24), 96);
    const endX = Math.min(100 - layout.w, Math.max(0, layout.x + (offset - 1) * 5));
    const endY = Math.min(100 - layout.h, Math.max(0, layout.y + (offset % 2 ? 4 : -3)));
    plan.cast[castIndex] = {
      ...member,
      onStage: true,
      startFrame,
      durationFrames,
      stageX: layout.x,
      stageY: layout.y,
      stageW: layout.w,
      stageH: layout.h,
      keyframes: [
        {
          frame: startFrame,
          x: layout.x,
          y: layout.y,
          w: layout.w,
          h: layout.h,
          color: member.color || "",
          text: member.text || "",
          fontWeight: member.fontWeight || "850",
          fontStyle: member.fontStyle || "normal",
          textDecoration: member.textDecoration || "none",
          textAlign: member.textAlign || "left",
          fontSize: member.fontSize || "",
        },
        {
          frame: startFrame + durationFrames - 1,
          x: endX,
          y: endY,
          w: layout.w,
          h: layout.h,
          color: member.color || "",
          text: member.text || "",
          fontWeight: member.fontWeight || "850",
          fontStyle: member.fontStyle || "normal",
          textDecoration: member.textDecoration || "none",
          textAlign: member.textAlign || "left",
          fontSize: member.fontSize || "",
        },
      ],
      prompt: "Imported from admira.studio Stock as part of a 3-asset stage composition. Export the Stage to publish it as an animation.",
    };
  }
}

function stockEndpointUrl(endpoint, limit, category = "") {
  try {
    const url = new URL(endpoint);
    url.searchParams.set("limit", String(limit));
    if (category) {
      url.searchParams.set("type", category === "image" ? "images" : category);
      url.searchParams.set("category", category);
    }
    return url.href;
  } catch {
    return endpoint;
  }
}

function stockMemberMatchesCategory(member, category = "") {
  if (!category) return true;
  return stockMemberCategory(member) === category;
}

function audioStageKind(member) {
  return stockMemberCategory(member) === "music" ? "music" : "audio";
}

async function fetchLatestStockMembers(limit = stockImportBatchSize, category = "", options = {}) {
  let lastError = null;
  let hadUsableResponse = false;
  for (const endpoint of admiraStockEndpoints) {
    try {
      const requestUrl = stockEndpointUrl(endpoint, limit, category);
      const response = await fetch(requestUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      hadUsableResponse = true;
      const items = stockItemsFromPayload(await response.json(), Math.max(limit, stockImportFetchLimit));
      const plan = currentPlan();
      const existing = plan.cast || makeCast(plan);
      const timelineMemberCount = existing.filter((member) => member.imported && member.src).length;
      const seenSources = new Set();
      const members = items
        .map((item, index) => stockMemberFromItem(
          item,
          endpoint,
          existing.length + index,
          timelineMemberCount + index,
        ))
        .filter(Boolean)
        .filter((member) => {
          if (seenSources.has(member.sourceUrl)) return false;
          seenSources.add(member.sourceUrl);
          return true;
        })
        .filter((member) => stockMemberMatchesCategory(member, category))
        .slice(0, limit);
      if (members.length) return members;
    } catch (error) {
      lastError = error;
    }
  }
  if (options.allowEmpty && hadUsableResponse) return [];
  throw lastError || new Error("Stock has not returned usable media assets.");
}

function uniqueStockMembers(members) {
  const seenSources = new Set();
  return members.filter((member) => {
    const key = member.sourceUrl || member.src || member.name;
    if (!key || seenSources.has(key)) return false;
    seenSources.add(key);
    return true;
  });
}

async function fetchStockCategoryBuckets() {
  const entries = await Promise.all(stockCategoryFilters.map(async (category) => {
    try {
      const members = await fetchLatestStockMembers(stockImportFetchLimit, category, { allowEmpty: true });
      return [category, members];
    } catch (error) {
      console.warn("Admira Stock category preload failed", category, error);
      return [category, []];
    }
  }));
  return new Map(entries);
}

function stockImportPreviewMedia(member) {
  if (member.mediaType === "image") {
    return `<img src="${escapeHtml(member.src)}" alt="" crossorigin="anonymous" />`;
  }
  if (member.mediaType === "video") {
    return `<video src="${escapeHtml(member.src)}" muted playsinline preload="metadata" crossorigin="anonymous"></video>`;
  }
  if (member.mediaType === "audio") {
    return `<span class="stock-tray-audio" aria-hidden="true">A</span>`;
  }
  return `<span class="stock-tray-audio" aria-hidden="true">${escapeHtml((member.mediaType || "asset").slice(0, 1).toUpperCase())}</span>`;
}

function stockImportMeta(member) {
  const dimensions = member.sourceWidth && member.sourceHeight
    ? `${Math.round(member.sourceWidth)} x ${Math.round(member.sourceHeight)}`
    : member.aspectRatio
      ? `${Number(member.aspectRatio).toFixed(2)} ratio`
      : "";
  const duration = formatStockDuration(member.sourceDuration);
  return [member.mediaType, dimensions, duration].filter(Boolean).join(" · ");
}

function stockMemberCategory(member) {
  if (member.mediaType === "image") return "image";
  if (member.mediaType === "video") return "video";
  if (member.mediaType === "audio") {
    const text = `${member.name || ""} ${member.stockPrompt || ""} ${member.stockFingerprint || ""}`.toLowerCase();
    return /music|m[uú]sica|song|soundtrack|melody|melod[ií]a|beat|stem/.test(text) ? "music" : "audio";
  }
  return member.mediaType || "asset";
}

function stockSearchText(member) {
  return [
    member.name,
    member.fileName,
    member.type,
    member.mediaType,
    member.stockPrompt,
    member.stockFingerprint,
    member.sourceUrl,
  ].filter(Boolean).join(" ").toLowerCase();
}

function stockMemberMatchesTrayFilters(member) {
  if (!stockMemberMatchesCategory(member, pendingStockActiveCategory)) return false;
  const query = pendingStockSearchQuery.trim().toLowerCase();
  if (!query) return true;
  return query.split(/\s+/).every((token) => stockSearchText(member).includes(token));
}

function ensureStockImportTray() {
  let tray = document.querySelector("[data-stock-import-tray]");
  if (tray) return tray;
  tray = document.createElement("section");
  tray.className = "stock-import-tray";
  tray.dataset.stockImportTray = "";
  tray.setAttribute("aria-hidden", "true");
  tray.setAttribute("aria-label", "Admira Stock import review");
  tray.innerHTML = `
    <div class="stock-tray-panel" role="dialog" aria-modal="true" aria-labelledby="stock-tray-title">
      <header class="stock-tray-header">
        <div>
          <strong id="stock-tray-title">Admira Stock</strong>
          <span data-stock-tray-summary>Selecciona assets válidos para componer</span>
        </div>
        <label class="stock-tray-search">
          <span>Prompt</span>
          <input type="text" list="stockPromptOptions" data-stock-prompt-search placeholder="Buscar prompt" autocomplete="off" />
          <datalist id="stockPromptOptions" data-stock-prompt-options></datalist>
        </label>
        <button type="button" data-stock-tray-close aria-label="Cerrar">×</button>
      </header>
      <div class="stock-tray-list" data-stock-tray-list></div>
      <footer class="stock-tray-actions">
        <div class="stock-tray-filters" aria-label="Cargar últimos Stock por tipo">
          <button type="button" data-stock-category-filter="audio" aria-pressed="false">Audio</button>
          <button type="button" data-stock-category-filter="music" aria-pressed="false">Música</button>
          <button type="button" data-stock-category-filter="image" aria-pressed="false">Imágenes</button>
          <button type="button" data-stock-category-filter="video" aria-pressed="false">Vídeo</button>
        </div>
        <span data-stock-selected-count>0 seleccionados</span>
        <button type="button" data-stock-tray-close>Cancelar</button>
        <button type="button" data-stock-tray-compose>Importar al Cast</button>
      </footer>
    </div>
  `;
  tray.addEventListener("click", (event) => {
    if (event.target === tray || event.target.closest("[data-stock-tray-close]")) {
      closeStockImportTray();
    }
  });
  tray.querySelector("[data-stock-tray-compose]")?.addEventListener("click", () => {
    confirmStockImportTray();
  });
  tray.querySelectorAll("[data-stock-category-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.stockCategoryFilter;
      if (!category) return;
      loadStockCategoryIntoTray(category);
    });
  });
  tray.querySelector("[data-stock-prompt-search]")?.addEventListener("input", (event) => {
    pendingStockSearchQuery = event.target.value || "";
    updateStockImportTraySelection();
  });
  document.body.append(tray);
  return tray;
}

function closeStockImportTray() {
  const tray = document.querySelector("[data-stock-import-tray]");
  if (!tray) return;
  tray.classList.remove("open");
  tray.setAttribute("aria-hidden", "true");
  pendingStockImportMembers = [];
  pendingStockSelectedIndexes = new Set();
  pendingStockSearchQuery = "";
  pendingStockActiveCategory = "";
  pendingStockCategoryBuckets = new Map();
  pendingStockCategoryLoading = false;
}

function updateStockImportTraySelection() {
  const tray = document.querySelector("[data-stock-import-tray]");
  if (!tray) return;
  const count = pendingStockSelectedIndexes.size;
  const visibleCount = pendingStockImportMembers.filter(stockMemberMatchesTrayFilters).length;
  tray.querySelector("[data-stock-selected-count]").textContent = `${count} seleccionados`;
  const composeButton = tray.querySelector("[data-stock-tray-compose]");
  if (composeButton) {
    composeButton.disabled = count === 0;
    composeButton.textContent = count === 1 ? "Importar 1 al Cast" : `Importar ${count} al Cast`;
  }
  tray.querySelector("[data-stock-tray-summary]").textContent = `${visibleCount} de ${pendingStockImportMembers.length} assets visibles`;
  tray.querySelectorAll("[data-stock-category-filter]").forEach((button) => {
    const category = button.dataset.stockCategoryFilter;
    const bucket = pendingStockCategoryBuckets.get(category);
    const hasBucket = pendingStockCategoryBuckets.has(category);
    const isEmpty = hasBucket && !bucket.length;
    const active = pendingStockActiveCategory === category;
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-empty", isEmpty);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.dataset.stockCategoryCount = hasBucket ? String(bucket.length) : "";
    button.title = hasBucket
      ? `${bucket.length} últimos ${button.textContent.trim().toLowerCase()} disponibles`
      : button.textContent.trim();
    button.disabled = pendingStockCategoryLoading || isEmpty;
  });
  tray.querySelectorAll("[data-stock-tray-item]").forEach((item) => {
    const index = Number(item.dataset.stockIndex);
    const member = pendingStockImportMembers[index];
    const selected = pendingStockSelectedIndexes.has(index);
    const visible = Boolean(member && stockMemberMatchesTrayFilters(member));
    item.classList.toggle("is-selected", selected);
    item.classList.toggle("is-filtered-out", !visible);
    item.setAttribute("aria-pressed", selected ? "true" : "false");
    item.hidden = !visible;
    item.querySelector("[data-stock-tray-check]").textContent = selected ? "✓" : "";
  });
}

function toggleStockImportTrayItem(index) {
  if (!Number.isInteger(index)) return;
  if (pendingStockSelectedIndexes.has(index)) {
    pendingStockSelectedIndexes.delete(index);
  } else {
    pendingStockSelectedIndexes.add(index);
  }
  updateStockImportTraySelection();
}

function setStockTrayMembers(members, options = {}) {
  pendingStockImportMembers = [...members];
  pendingStockActiveCategory = options.category || "";
  if (options.categoryBuckets) pendingStockCategoryBuckets = new Map(options.categoryBuckets);
  if (options.clearSearch !== false) pendingStockSearchQuery = "";
  pendingStockSelectedIndexes = new Set(
    pendingStockImportMembers.slice(0, stockImportBatchSize).map((_, index) => index),
  );
  const tray = ensureStockImportTray();
  const list = tray.querySelector("[data-stock-tray-list]");
  const searchInput = tray.querySelector("[data-stock-prompt-search]");
  if (searchInput) searchInput.value = "";
  const promptOptions = tray.querySelector("[data-stock-prompt-options]");
  if (promptOptions) {
    promptOptions.innerHTML = [...new Set(pendingStockImportMembers
      .flatMap((member) => [member.stockPrompt, member.name])
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean))]
      .slice(0, stockImportFetchLimit)
      .map((value) => `<option value="${escapeHtml(value)}"></option>`)
      .join("");
  }
  if (list) {
    list.innerHTML = pendingStockImportMembers.map((member, index) => `
      <button class="stock-tray-item" type="button" data-stock-tray-item data-stock-index="${index}" data-media-type="${escapeHtml(member.mediaType || "asset")}" data-stock-category="${escapeHtml(stockMemberCategory(member))}" aria-pressed="false">
        <span class="stock-tray-check" data-stock-tray-check aria-hidden="true"></span>
        <div class="stock-tray-preview">${stockImportPreviewMedia(member)}</div>
        <div class="stock-tray-copy">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(member.name)}</strong>
          <small>${escapeHtml(stockImportMeta(member))}</small>
          ${member.stockPrompt ? `<em>${escapeHtml(member.stockPrompt)}</em>` : ""}
        </div>
      </button>
    `).join("");
    list.querySelectorAll("[data-stock-tray-item]").forEach((item) => {
      item.addEventListener("click", () => toggleStockImportTrayItem(Number(item.dataset.stockIndex)));
    });
  }
  updateStockImportTraySelection();
}

function openStockImportTray(members, options = {}) {
  setStockTrayMembers(members, options);
  const tray = ensureStockImportTray();
  tray.classList.add("open");
  tray.setAttribute("aria-hidden", "false");
}

async function loadStockCategoryIntoTray(category) {
  const tray = ensureStockImportTray();
  if (pendingStockCategoryLoading) return;
  if (pendingStockCategoryBuckets.has(category)) {
    const cachedMembers = pendingStockCategoryBuckets.get(category) || [];
    if (!cachedMembers.length) {
      updateStockImportTraySelection();
      return;
    }
    setStockTrayMembers(cachedMembers, { category, categoryBuckets: pendingStockCategoryBuckets });
    playUiTick("import");
    return;
  }
  const list = tray.querySelector("[data-stock-tray-list]");
  const previousText = tray.querySelector("[data-stock-tray-summary]")?.textContent || "";
  tray.classList.add("is-loading");
  pendingStockCategoryLoading = true;
  tray.querySelector("[data-stock-tray-summary]").textContent = `Cargando últimos ${stockImportFetchLimit}`;
  updateStockImportTraySelection();
  if (list) list.setAttribute("aria-busy", "true");
  try {
    const members = await fetchLatestStockMembers(stockImportFetchLimit, category, { allowEmpty: true });
    pendingStockCategoryBuckets.set(category, members);
    if (members.length) {
      setStockTrayMembers(members, { category, categoryBuckets: pendingStockCategoryBuckets });
      playUiTick("import");
    } else {
      tray.querySelector("[data-stock-tray-summary]").textContent = `No hay últimos contenidos de ${category}`;
      updateStockImportTraySelection();
    }
  } catch (error) {
    console.warn("Admira Stock category import failed", error);
    tray.querySelector("[data-stock-tray-summary]").textContent = previousText || "Stock no disponible";
    window.alert("No se han podido cargar los últimos contenidos de ese tipo.");
  } finally {
    tray.classList.remove("is-loading");
    pendingStockCategoryLoading = false;
    updateStockImportTraySelection();
    if (list) list.removeAttribute("aria-busy");
  }
}

function composeStockMembersIntoPlan(members) {
  const plan = currentPlan();
  const castIndex = (plan.cast || makeCast(plan)).length;
  plan.cast = [...(plan.cast || makeCast(plan)), ...members];
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  members.forEach((member, index) => updateMemberMetadataFromMedia(
    castIndex + index,
    member.src,
    member.mediaType,
  ));
  playUiTick("import");
  window.refreshDirectorWindows?.();
  document.querySelector('[data-open-window="cast"]')?.click();
  return members.length;
}

function dockTimelineControlsInTitlebar() {
  const timelineWindow = document.querySelector('.director-score-window[data-window="score"]');
  const titlebar = timelineWindow?.querySelector(".window-titlebar");
  const tools = scoreGrid?.querySelector(".score-tools");
  if (!titlebar || !tools) return;
  titlebar.querySelector(".score-tools")?.remove();
  tools.addEventListener("pointerdown", (event) => event.stopPropagation());
  titlebar.append(tools);
}

function confirmStockImportTray() {
  const members = [...pendingStockSelectedIndexes]
    .sort((a, b) => a - b)
    .map((index) => pendingStockImportMembers[index])
    .filter(Boolean);
  if (!members.length) return;
  const count = composeStockMembersIntoPlan(members);
  closeStockImportTray();
  if (stockImportButton) {
    const originalText = "Importar";
    stockImportButton.textContent = `${count} importados`;
    window.setTimeout(() => { stockImportButton.textContent = originalText; }, 1200);
  }
}

async function importLatestAdmiraStockBatch() {
  if (!stockImportButton) return;
  const originalText = stockImportButton.textContent;
  stockImportButton.disabled = true;
  stockImportButton.textContent = "Precargando...";
  try {
    const [latestMembers, categoryBuckets] = await Promise.all([
      fetchLatestStockMembers(stockImportFetchLimit, "", { allowEmpty: true }),
      fetchStockCategoryBuckets(),
    ]);
    const fallbackMembers = uniqueStockMembers([...categoryBuckets.values()].flat()).slice(0, stockImportFetchLimit);
    const members = latestMembers.length ? latestMembers : fallbackMembers;
    if (!members.length) throw new Error("Stock has not returned usable media assets.");
    openStockImportTray(members, { categoryBuckets });
    playUiTick("import");
    stockImportButton.textContent = `${members.length} listos`;
    window.setTimeout(() => { stockImportButton.textContent = originalText; }, 1200);
  } catch (error) {
    console.warn("Admira Stock import failed", error);
    stockImportButton.textContent = "Stock no disponible";
    window.alert("No se han podido importar los últimos contenidos de admira.studio Stock.");
    window.setTimeout(() => { stockImportButton.textContent = originalText; }, 1800);
  } finally {
    closeArchivoMenu();
    stockImportButton.disabled = false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = String(reader.result || "");
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function postStageAnimationToStock(endpoint, blob, metadata) {
  // El worker pixer-eleven /stock/publish espera JSON con base64 (o sourceUrl)
  // y un type válido. Las animaciones se publican como type "animation" (tipo
  // real ya admitido por el worker), motor "ainimation". Aparece directamente
  // en admira.studio/stock bajo el filtro "Animaciones".
  const base64 = await blobToBase64(blob);
  const fpsTxt = metadata.fps ? `${metadata.fps} fps` : "";
  const framesTxt = metadata.durationFrames ? `${metadata.durationFrames} frames` : "";
  const payload = {
    type: "animation",
    motor: "ainimation",
    title: metadata.title || "ainimation",
    prompt: metadata.source || "ainimation.studio AiDirector",
    comment: [fpsTxt, framesTxt].filter(Boolean).join(" · ") || null,
    mime: blob.type || "video/webm",
    base64,
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const t = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText} ${t.slice(0, 120)}`);
  }
  return response.json();
}

async function exportStageToAdmiraStock() {
  if (!stockExportButton) return;
  const originalText = stockExportButton.textContent;
  stockExportButton.disabled = true;
  stockExportButton.textContent = "Exportando...";
  let fallbackBlob = null;
  let fallbackPlan = null;
  try {
    const plan = currentPlan();
    fallbackPlan = plan;
    const fps = Number(document.querySelector("[data-score-fps]")?.dataset.value || 24);
    const blob = await getStageAnimationCapture();
    fallbackBlob = blob;
    const metadata = {
      title: `${plan.title || "AiDirector Stage"} animation`,
      source: "ainimation.studio AiDirector",
      type: "animation",
      mediaType: "animation",
      mimeType: blob.type || "video/webm",
      durationFrames: totalTimelineFrames(plan),
      fps,
      exportedAt: new Date().toISOString(),
      project: plan,
    };
    let lastError = null;
    for (const endpoint of admiraStockExportEndpoints) {
      try {
        await postStageAnimationToStock(endpoint, blob, metadata);
        playUiTick("import");
        stockExportButton.textContent = "Exportado";
        window.setTimeout(() => { stockExportButton.textContent = originalText; }, 1400);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Stock did not accept the animation export.");
  } catch (error) {
    console.warn("Admira Stock export failed", error);
    stockExportButton.textContent = "Stock no disponible";
    if (fallbackBlob && fallbackPlan) {
      downloadBlob(fallbackBlob, `${planSlug(fallbackPlan)}-stock-animation.webm`);
    }
    window.alert("No se ha podido exportar la animación a admira.studio Stock. He generado el WebM local como respaldo; falta que Stock acepte subida autenticada o devuelva una URL pública usable.");
    window.setTimeout(() => { stockExportButton.textContent = originalText; }, 1800);
  } finally {
    closeArchivoMenu();
    stockExportButton.disabled = false;
  }
}

function initStageTools() {
  const stage = document.querySelector(".stage-canvas");
  const palette = document.querySelector(".tool-palette");
  const toolButtons = [...document.querySelectorAll(".tool-symbols [data-stage-tool]")];
  const textStyleButtons = [...document.querySelectorAll("[data-text-style]")];
  const textAlignButtons = [...document.querySelectorAll("[data-text-align]")];
  if (!stage || !palette || !toolButtons.length) return;
  let activeTextItem = null;
  let activeShapeItem = null;
  const textStyleState = {
    bold: true,
    italic: false,
    underline: false,
    align: "left",
  };

  const setActiveTool = (tool) => {
    palette.dataset.stageTool = tool;
    stage.dataset.stageTool = tool;
    toolButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.stageTool === tool));
    });
  };
  const activeTool = () => palette.dataset.stageTool || "hand";
  const foregroundColor = () => (
    getComputedStyle(stage).getPropertyValue("--stage-foreground").trim() || "#edf6ff"
  );
  const textStylePayload = () => ({
    fontWeight: textStyleState.bold ? "850" : "400",
    fontStyle: textStyleState.italic ? "italic" : "normal",
    textDecoration: textStyleState.underline ? "underline" : "none",
    textAlign: textStyleState.align,
  });
  const syncTextControlButtons = () => {
    textStyleButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(Boolean(textStyleState[button.dataset.textStyle])));
    });
    textAlignButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.textAlign === textStyleState.align));
    });
  };
  const saveActiveTextPatch = (patch) => {
    if (!activeTextItem) return;
    const itemId = activeTextItem.dataset.stageItemId;
    const plan = currentPlan();
    let nextItem = null;
    let nextFrame = currentTimelineFrame();
    plan.stageItems = (plan.stageItems || []).map((item) => {
      if (item.id !== itemId) return item;
      const currentValues = interpolateStageKeyframe(item, currentTimelineFrame()) || defaultStageKeyframe(item);
      const values = {
        ...currentValues,
        x: Number.parseFloat(activeTextItem.style.left) || item.x || 0,
        y: Number.parseFloat(activeTextItem.style.top) || item.y || 0,
        color: patch.color || currentValues.color || item.color || "",
        text: activeTextItem.querySelector(".stage-text-content")?.textContent.trim() || currentValues.text || item.text || "Text",
        ...textStyleForItem({ ...item, ...currentValues, ...patch }),
      };
      if (!stageTextValuesChanged(currentValues, values)) {
        nextItem = { ...item, ...patch };
        return nextItem;
      }
      const timing = nextStageItemKeyframeTiming(item, currentTimelineFrame());
      nextFrame = timing.frame;
      selectedStageKeyframe = timing.isExisting ? { stageItemId: item.id, frame: timing.frame } : null;
      nextItem = {
        ...item,
        ...values,
        ...patch,
        durationFrames: timing.durationFrames,
        keyframes: upsertStageKeyframe(item, timing.frame, values),
      };
      return nextItem;
    });
    if (!nextItem) return;
    saveFilmPlan(plan);
    renderFilmPlan(plan);
    activeTextItem = stage.querySelector(`[data-stage-item-id="${nextItem.id}"]`);
    if (activeTextItem) setActiveTextItem(activeTextItem);
    setTimelineFrame(nextFrame, false);
  };
  const saveActiveShapePatch = (patch) => {
    if (!activeShapeItem) return;
    const itemId = activeShapeItem.dataset.stageItemId;
    const plan = currentPlan();
    let nextItem = null;
    plan.stageItems = (plan.stageItems || []).map((item) => {
      if (item.id !== itemId) return item;
      const timing = nextStageItemKeyframeTiming(item, currentTimelineFrame());
      const values = {
        x: Number.parseFloat(activeShapeItem.style.left) || item.x || 0,
        y: Number.parseFloat(activeShapeItem.style.top) || item.y || 0,
        w: Number.parseFloat(activeShapeItem.style.width) || item.w || 12,
        h: Number.parseFloat(activeShapeItem.style.height) || item.h || 10,
        color: patch.color || item.color,
      };
      nextItem = {
        ...item,
        ...values,
        ...patch,
        durationFrames: timing.durationFrames,
        keyframes: upsertStageKeyframe(item, timing.frame, values),
      };
      selectedStageKeyframe = timing.isExisting ? { stageItemId: item.id, frame: timing.frame } : null;
      return nextItem;
    });
    if (!nextItem) return;
    saveFilmPlan(plan);
    renderFilmPlan(plan);
    activeShapeItem = stage.querySelector(`[data-stage-item-id="${nextItem.id}"]`);
    if (activeShapeItem) setActiveShapeItem(activeShapeItem);
    setTimelineFrame((nextItem.keyframes || []).at(-1)?.frame || currentTimelineFrame(), false);
  };
  const setActiveTextItem = (textItem) => {
    if (!textItem) return;
    activeTextItem = textItem;
    activeShapeItem = null;
    setSelectedStageTarget({ stageItemId: textItem.dataset.stageItemId });
    stage.querySelectorAll(".stage-text-item").forEach((item) => {
      item.classList.toggle("is-selected", item === activeTextItem);
    });
    stage.querySelectorAll(".stage-shape-item").forEach((item) => item.classList.remove("is-selected"));
    const itemId = textItem.dataset.stageItemId;
    const planItem = (currentPlan().stageItems || []).find((item) => item.id === itemId);
    const style = textStyleForItem(planItem || {});
    textStyleState.bold = style.fontWeight !== "400";
    textStyleState.italic = style.fontStyle === "italic";
    textStyleState.underline = style.textDecoration === "underline";
    textStyleState.align = style.textAlign || "left";
    syncTextControlButtons();
  };
  const setActiveShapeItem = (shapeItem) => {
    if (!shapeItem) return;
    activeShapeItem = shapeItem;
    activeTextItem = null;
    setSelectedStageTarget({ stageItemId: shapeItem.dataset.stageItemId });
    stage.querySelectorAll(".stage-text-item").forEach((item) => item.classList.remove("is-selected"));
    stage.querySelectorAll(".stage-shape-item").forEach((item) => {
      item.classList.toggle("is-selected", item === activeShapeItem);
    });
  };

  toolButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setActiveTool(button.dataset.stageTool);
      palette.classList.remove("open");
      palette.dataset.openFor = "";
    });
  });
  textStyleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.textStyle;
      textStyleState[key] = !textStyleState[key];
      syncTextControlButtons();
      saveActiveTextPatch(textStylePayload());
    });
  });
  textAlignButtons.forEach((button) => {
    button.addEventListener("click", () => {
      textStyleState.align = button.dataset.textAlign || "left";
      syncTextControlButtons();
      saveActiveTextPatch(textStylePayload());
    });
  });
  window.addEventListener("stagetextselect", (event) => {
    const textItem = stage.querySelector(`[data-stage-item-id="${event.detail?.id}"]`);
    setActiveTextItem(textItem);
  });
  window.addEventListener("stageforegroundchange", (event) => {
    const color = event.detail?.color || foregroundColor();
    if (activeTextItem) saveActiveTextPatch({ color });
    if (activeShapeItem) saveActiveShapePatch({ color });
  });

  setActiveTool(palette.dataset.stageTool || "hand");
  syncTextControlButtons();

  stage.addEventListener("pointerdown", (event) => {
    const tool = activeTool();
    const member = event.target.closest(".stage-imported-member");
    const textItem = event.target.closest(".stage-text-item");
    const shapeItem = event.target.closest(".stage-shape-item");
    if (tool === "hand" && member) {
      event.preventDefault();
      const castIndex = Number(member.dataset.castIndex);
      const targetScope = selectedCastTargetScope(castIndex) === "clip" ? "clip" : "keyframe";
      setSelectedStageTarget({ castIndex, scope: targetScope });
      stage.querySelectorAll(".stage-imported-member").forEach((item) => {
        item.classList.toggle("is-selected", item === member);
      });
      stage.querySelectorAll(".stage-text-item, .stage-shape-item").forEach((item) => item.classList.remove("is-selected"));
      const start = stagePointFromEvent(stage, event);
      const startLeft = Number.parseFloat(member.style.left) || 0;
      const startTop = Number.parseFloat(member.style.top) || 0;
      const startWidth = Number.parseFloat(member.style.width) || 12;
      const startHeight = Number.parseFloat(member.style.height) || 10;
      const startValues = {
        x: startLeft,
        y: startTop,
        w: startWidth,
        h: startHeight,
      };
      const isScaling = Boolean(event.target.closest(".stage-member-resize"));
      stage.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const next = stagePointFromEvent(stage, moveEvent);
        if (isScaling) {
          const nextWidth = Math.min(clampStageSize(startWidth + (next.x - start.x), startWidth), 100 - startLeft);
          const nextHeight = Math.min(clampStageSize(startHeight + (next.y - start.y), startHeight), 100 - startTop);
          member.style.width = `${nextWidth}%`;
          member.style.height = `${nextHeight}%`;
        } else {
          const nextLeft = Math.min(clampPercent(startLeft + (next.x - start.x)), 100 - startWidth);
          const nextTop = Math.min(clampPercent(startTop + (next.y - start.y)), 100 - startHeight);
          member.style.left = `${nextLeft}%`;
          member.style.top = `${nextTop}%`;
        }
      };
      const up = () => {
        stage.removeEventListener("pointermove", move);
        stage.removeEventListener("pointerup", up);
        stage.removeEventListener("pointercancel", up);
        const plan = currentPlan();
        if (Number.isInteger(castIndex) && plan.cast?.[castIndex]) {
          const frame = currentTimelineFrame();
          plan.cast[castIndex] = {
            ...plan.cast[castIndex],
            stageX: Number.parseFloat(member.style.left) || 0,
            stageY: Number.parseFloat(member.style.top) || 0,
            stageW: Number.parseFloat(member.style.width) || startWidth,
            stageH: Number.parseFloat(member.style.height) || startHeight,
          };
          const values = {
            x: Number.parseFloat(member.style.left) || 0,
            y: Number.parseFloat(member.style.top) || 0,
            w: Number.parseFloat(member.style.width) || startWidth,
            h: Number.parseFloat(member.style.height) || startHeight,
          };
          if (!stageValuesChanged(startValues, values)) return;
          if (selectedCastTargetScope(castIndex) === "clip") {
            plan.cast[castIndex] = transformMemberClipKeyframes(
              plan.cast[castIndex],
              startValues,
              values,
              Number(member.dataset.stageIndex || 0),
            );
            saveFilmPlan(plan);
            renderFilmPlan(plan);
            setTimelineFrame(frame, false);
            return;
          }
          const timing = nextStageKeyframeTiming(plan.cast[castIndex], frame, castIndex);
          plan.cast[castIndex].durationFrames = timing.durationFrames;
          plan.cast[castIndex].keyframes = upsertStageKeyframe(plan.cast[castIndex], timing.frame, values, Number(member.dataset.stageIndex || 0));
          saveFilmPlan(plan);
          selectedStageKeyframe = timing.isExisting ? { castIndex, frame: timing.frame } : null;
          renderFilmPlan(plan);
          setTimelineFrame(timing.frame, false);
        }
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", up);
      stage.addEventListener("pointercancel", up);
      return;
    }

    if (tool === "hand" && textItem) {
      event.preventDefault();
      setActiveTextItem(textItem);
      const itemId = textItem.dataset.stageItemId;
      const start = stagePointFromEvent(stage, event);
      const startLeft = Number.parseFloat(textItem.style.left) || 0;
      const startTop = Number.parseFloat(textItem.style.top) || 0;
      const stageRect = stage.getBoundingClientRect();
      const itemRect = textItem.getBoundingClientRect();
      const itemWidth = stageRect.width ? (itemRect.width / stageRect.width) * 100 : 0;
      const itemHeight = stageRect.height ? (itemRect.height / stageRect.height) * 100 : 0;
      stage.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const next = stagePointFromEvent(stage, moveEvent);
        const nextLeft = Math.min(clampPercent(startLeft + (next.x - start.x)), Math.max(0, 100 - itemWidth));
        const nextTop = Math.min(clampPercent(startTop + (next.y - start.y)), Math.max(0, 100 - itemHeight));
        textItem.style.left = `${nextLeft}%`;
        textItem.style.top = `${nextTop}%`;
      };
      const up = () => {
        stage.removeEventListener("pointermove", move);
        stage.removeEventListener("pointerup", up);
        stage.removeEventListener("pointercancel", up);
        const plan = currentPlan();
        let nextFrame = currentTimelineFrame();
        plan.stageItems = (plan.stageItems || []).map((item) => {
          if (item.id !== itemId) return item;
          const currentValues = interpolateStageKeyframe(item, currentTimelineFrame()) || defaultStageKeyframe(item);
          const values = {
            ...currentValues,
            x: Number.parseFloat(textItem.style.left) || 0,
            y: Number.parseFloat(textItem.style.top) || 0,
            text: textItem.querySelector(".stage-text-content")?.textContent.trim() || currentValues.text || item.text || "Text",
            color: currentValues.color || item.color || "",
            ...textStyleForItem({ ...item, ...currentValues }),
          };
          if (!stageTextValuesChanged(currentValues, values)) return item;
          const timing = nextStageItemKeyframeTiming(item, currentTimelineFrame());
          nextFrame = timing.frame;
          selectedStageKeyframe = timing.isExisting ? { stageItemId: item.id, frame: timing.frame } : null;
          return {
            ...item,
            ...values,
            durationFrames: timing.durationFrames,
            keyframes: upsertStageKeyframe(item, timing.frame, values),
          };
        });
        saveFilmPlan(plan);
        renderFilmPlan(plan);
        const nextText = stage.querySelector(`[data-stage-item-id="${itemId}"]`);
        if (nextText) setActiveTextItem(nextText);
        setTimelineFrame(nextFrame, false);
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", up);
      stage.addEventListener("pointercancel", up);
      return;
    }

    if (tool === "hand" && shapeItem) {
      event.preventDefault();
      setActiveShapeItem(shapeItem);
      const itemId = shapeItem.dataset.stageItemId;
      const start = stagePointFromEvent(stage, event);
      const startLeft = Number.parseFloat(shapeItem.style.left) || 0;
      const startTop = Number.parseFloat(shapeItem.style.top) || 0;
      const startWidth = Number.parseFloat(shapeItem.style.width) || 12;
      const startHeight = Number.parseFloat(shapeItem.style.height) || 10;
      const isScaling = Boolean(event.target.closest(".stage-shape-resize"));
      const startValues = {
        x: startLeft,
        y: startTop,
        w: startWidth,
        h: startHeight,
        color: shapeItem.style.borderColor || "",
      };
      stage.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const next = stagePointFromEvent(stage, moveEvent);
        if (isScaling) {
          const nextWidth = Math.min(clampStageSize(startWidth + (next.x - start.x), startWidth), 100 - startLeft);
          const nextHeight = Math.min(clampStageSize(startHeight + (next.y - start.y), startHeight), 100 - startTop);
          shapeItem.style.width = `${nextWidth}%`;
          shapeItem.style.height = `${nextHeight}%`;
        } else {
          const nextLeft = Math.min(clampPercent(startLeft + (next.x - start.x)), 100 - startWidth);
          const nextTop = Math.min(clampPercent(startTop + (next.y - start.y)), 100 - startHeight);
          shapeItem.style.left = `${nextLeft}%`;
          shapeItem.style.top = `${nextTop}%`;
        }
      };
      const up = () => {
        stage.removeEventListener("pointermove", move);
        stage.removeEventListener("pointerup", up);
        stage.removeEventListener("pointercancel", up);
        const plan = currentPlan();
        let nextFrame = currentTimelineFrame();
        plan.stageItems = (plan.stageItems || []).map((item) => {
          if (item.id !== itemId) return item;
          const values = {
            x: Number.parseFloat(shapeItem.style.left) || 0,
            y: Number.parseFloat(shapeItem.style.top) || 0,
            w: Number.parseFloat(shapeItem.style.width) || startWidth,
            h: Number.parseFloat(shapeItem.style.height) || startHeight,
            color: item.color || foregroundColor(),
          };
          if (!stageValuesChanged(startValues, values)) return item;
          const timing = nextStageItemKeyframeTiming(item, currentTimelineFrame());
          nextFrame = timing.frame;
          selectedStageKeyframe = timing.isExisting ? { stageItemId: item.id, frame: timing.frame } : null;
          return {
            ...item,
            ...values,
            durationFrames: timing.durationFrames,
            keyframes: upsertStageKeyframe(item, timing.frame, values),
          };
        });
        saveFilmPlan(plan);
        renderFilmPlan(plan);
        const nextShape = stage.querySelector(`[data-stage-item-id="${itemId}"]`);
        if (nextShape) setActiveShapeItem(nextShape);
        setTimelineFrame(nextFrame, false);
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", up);
      stage.addEventListener("pointercancel", up);
      return;
    }

    if (!["text", "line", "rect-fill", "rect", "oval-fill", "oval"].includes(tool) && (event.target.closest(".stage-item") || member)) return;
    clearSelectedStageTarget();
    stage.querySelectorAll(".stage-imported-member, .stage-text-item, .stage-shape-item").forEach((item) => {
      item.classList.remove("is-selected");
    });

    if (tool === "text") {
      event.preventDefault();
      const point = stagePointFromEvent(stage, event);
      const plan = currentPlan();
      const item = {
        id: stageItemId("text"),
        type: "text",
        x: point.x,
        y: point.y,
        text: "Text",
        color: foregroundColor(),
        startFrame: currentTimelineFrame(),
        durationFrames: 24,
        ...textStylePayload(),
      };
      item.keyframes = [defaultStageKeyframe(item, item.startFrame)];
      plan.stageItems = [...(plan.stageItems || []), item];
      saveFilmPlan(plan);
      renderFilmPlan(plan);
      const text = stage.querySelector(`[data-stage-item-id="${item.id}"] .stage-text-content`);
      if (text) {
        setActiveTextItem(text.closest(".stage-text-item"));
        text.focus();
        document.getSelection()?.selectAllChildren(text);
      }
      return;
    }

    if (["rect-fill", "rect", "oval-fill", "oval"].includes(tool)) {
      event.preventDefault();
      const start = stagePointFromEvent(stage, event);
      const item = {
        id: stageItemId(tool),
        type: tool,
        x: start.x,
        y: start.y,
        w: 1,
        h: 1,
        color: foregroundColor(),
        startFrame: currentTimelineFrame(),
        durationFrames: 24,
      };
      item.keyframes = [defaultStageKeyframe(item, item.startFrame)];
      const preview = document.createElement("div");
      preview.className = "stage-item stage-shape-item";
      preview.dataset.stageItemId = item.id;
      preview.dataset.stageItemType = item.type;
      preview.append(Object.assign(document.createElement("span"), { className: "stage-shape-resize" }));
      stage.append(preview);
      applyShapeStyle(preview, item);
      stage.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const next = stagePointFromEvent(stage, moveEvent);
        item.x = Math.min(start.x, next.x);
        item.y = Math.min(start.y, next.y);
        item.w = clampStageSize(Math.abs(next.x - start.x), 1);
        item.h = clampStageSize(Math.abs(next.y - start.y), 1);
        item.keyframes = [defaultStageKeyframe(item, item.startFrame)];
        applyShapeStyle(preview, item);
      };
      const up = () => {
        stage.removeEventListener("pointermove", move);
        stage.removeEventListener("pointerup", up);
        stage.removeEventListener("pointercancel", up);
        if (item.w < 2 || item.h < 2) {
          preview.remove();
          return;
        }
        const plan = currentPlan();
        plan.stageItems = [...(plan.stageItems || []), item];
        saveFilmPlan(plan);
        renderFilmPlan(plan);
        const shape = stage.querySelector(`[data-stage-item-id="${item.id}"]`);
        if (shape) setActiveShapeItem(shape);
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", up);
      stage.addEventListener("pointercancel", up);
      return;
    }

    if (tool === "line") {
      event.preventDefault();
      const start = stagePointFromEvent(stage, event);
      const item = {
        id: stageItemId("line"),
        type: "line",
        x1: start.x,
        y1: start.y,
        x2: start.x,
        y2: start.y,
        color: foregroundColor(),
      };
      const preview = document.createElement("span");
      preview.className = "stage-item stage-line-item";
      preview.dataset.stageItemId = item.id;
      positionStageLine(preview, item);
      stage.append(preview);
      stage.setPointerCapture(event.pointerId);
      const move = (moveEvent) => {
        const next = stagePointFromEvent(stage, moveEvent);
        item.x2 = next.x;
        item.y2 = next.y;
        positionStageLine(preview, item);
      };
      const up = () => {
        stage.removeEventListener("pointermove", move);
        stage.removeEventListener("pointerup", up);
        stage.removeEventListener("pointercancel", up);
        if (Math.hypot(item.x2 - item.x1, item.y2 - item.y1) < 1) {
          preview.remove();
          return;
        }
        const plan = currentPlan();
        plan.stageItems = [...(plan.stageItems || []), item];
        saveFilmPlan(plan);
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", up);
      stage.addEventListener("pointercancel", up);
    }
  });
}

function importCastAsset(name, kind) {
  const plan = currentPlan();
  const mode = document.querySelector(".tool-palette")?.dataset.importMode || "asset";
  const imported = {
    role: "Imported",
    name: `${name} ${String((plan.cast?.length || 0) + 1).padStart(2, "0")}`,
    type: kind,
    imported: true,
    prompt: `Imported via ${mode.toUpperCase()} tool. Store as reusable ${kind.toLowerCase()} inside Cast & Assets for stage, score, and AI Director workflows.`,
  };
  plan.cast = [...(plan.cast || makeCast(plan)), imported];
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  document.querySelector(".tool-palette")?.classList.remove("open");
}

if (filmForm) {
  const initialPlan = currentPlan();
  hydrateFilmForm(initialPlan);
  renderStageRulers();
  initStageRulerToggle();
  renderFilmPlan(initialPlan);
  initStageTools();
  window.requestAnimationFrame(() => window.requestAnimationFrame(renderStageRulers));
  importAdmiraStockAssetFromQuery();

  fileNewButton?.addEventListener("click", () => {
    const plan = buildFilmPlan(false);
    saveFilmPlan(plan);
    hydrateFilmForm(plan);
    renderFilmPlan(plan);
    closeArchivoMenu();
  });

  projectOpenInput?.addEventListener("change", () => {
    const file = projectOpenInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const plan = normalizeFilmPlan(JSON.parse(String(reader.result || "{}")));
        if (!plan) throw new Error("Empty project");
        saveFilmPlan(plan);
        hydrateFilmForm(plan);
        renderFilmPlan(plan);
      } catch {
        window.alert("No se ha podido abrir el archivo del proyecto.");
      }
      projectOpenInput.value = "";
      closeArchivoMenu();
    });
    reader.readAsText(file);
  });

  stockImportButton?.addEventListener("click", () => {
    importLatestAdmiraStockBatch();
  });

  stockExportButton?.addEventListener("click", () => {
    exportStageToAdmiraStock();
  });

  downloadStageVideoButton?.addEventListener("click", () => {
    closeArchivoMenu();
    exportStageVideo();
  });

  filmForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const plan = buildFilmPlan(false);
    saveFilmPlan(plan);
    renderFilmPlan(plan);
  });

  addSceneButton?.addEventListener("click", () => {
    const plan = buildFilmPlan(true);
    saveFilmPlan(plan);
    renderFilmPlan(plan);
    playUiTick("stage");
  });

  productionPassButton?.addEventListener("click", () => {
    const plan = currentPlan();
    plan.productionManifest = buildProductionManifest(plan, plan.scenes || []);
    saveFilmPlan(plan);
    renderFilmPlan(plan);
    document.querySelector('[data-open-window="inspector"]')?.click();
    productionPassButton.textContent = "Pass ready";
    window.setTimeout(() => { productionPassButton.textContent = "Production pass"; }, 1400);
    playUiTick("stage");
  });

  document.querySelectorAll("[data-import-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      importCastAsset(button.dataset.importAsset, button.dataset.importKind || "Asset");
      playUiTick("import");
    });
  });

  copyMarkdownButton?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(toMarkdown(currentPlan()));
    copyMarkdownButton.textContent = "Copied";
    window.setTimeout(() => { copyMarkdownButton.textContent = "Copy Markdown"; }, 1200);
  });

  downloadJsonButton?.addEventListener("click", () => {
    if (exportModal) {
      openExportStudio();
      return;
    }

    const plan = currentPlan();
    downloadPlanFile(plan, "ainimation-plan", plan);
  });

  clearStageButton?.addEventListener("click", () => {
    const plan = currentPlan();
    plan.cast = (plan.cast || makeCast(plan)).map((member) => (
      member.imported && ["animation", "audio", "image", "video"].includes(member.mediaType)
        ? { ...member, onStage: false, stageX: undefined, stageY: undefined, stageW: undefined, stageH: undefined, keyframes: [] }
        : member
    ));
    plan.stageItems = [];
    saveFilmPlan(plan);
    renderFilmPlan(plan);
  });
}

closeExportButton?.addEventListener("click", closeExportStudio);
openHelpButton?.addEventListener("click", openHelpStudio);
closeHelpButton?.addEventListener("click", closeHelpStudio);

exportModal?.addEventListener("click", (event) => {
  if (event.target === exportModal) closeExportStudio();
});

helpModal?.addEventListener("click", (event) => {
  if (event.target === helpModal) closeHelpStudio();
});

document.addEventListener("keydown", (event) => {
  const activeTarget = event.target;
  const isEditingText = activeTarget?.closest?.("input, textarea, [contenteditable='true']");
  if ((event.key === "Delete" || event.key === "Backspace") && !isEditingText && selectedStageTargetExists()) {
    event.preventDefault();
    deleteSelectedStageTarget();
    playUiTick("select");
    return;
  }

  if (["F1", "F2", "F3"].includes(event.key) && getActiveDirectorWindow()) {
    event.preventDefault();
    if (event.key === "F1") maximizeDirectorWindow();
    if (event.key === "F2") minimizeDirectorWindow();
    if (event.key === "F3") closeDirectorWindow();
    return;
  }

  if (event.key === "Escape" && exportModal?.classList.contains("open")) {
    closeExportStudio();
  }
  if (event.key === "Escape" && helpModal?.classList.contains("open")) {
    closeHelpStudio();
  }
  if (event.key === "Escape" && document.querySelector("[data-stock-import-tray]")?.classList.contains("open")) {
    closeStockImportTray();
  }
});

document.querySelectorAll("[data-export-format]").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = currentPlan();
    downloadPlanFile(plan, `ainimation-${button.dataset.exportFormat}`, {
      format: button.dataset.exportFormat,
      project: plan,
    });
  });
});

exportAllFormatsButton?.addEventListener("click", () => {
  const plan = currentPlan();
  downloadPlanFile(plan, "admira-player-export", makeExportPackage(plan));
});

const contactOutput = document.querySelector("#contactOutput");
const contactButtons = document.querySelectorAll("[data-contact-command]");
const contactLinks = document.querySelectorAll("[data-contact-link]");

const contactCommands = {
  "/contact": [
    { text: "Get in touch", cls: "heading" },
    { text: "" },
    { text: `  MAIL  ${contactEmail}`, cls: "accent" },
    { text: "  WEB   ainimation.studio", cls: "green" },
    { text: "  BASE  Barcelona / remote", cls: "purple" },
    { text: "" },
    { text: "  Open to: pilot productions, AI animation systems, creative tooling, partnerships, and consulting." },
    { text: "" },
    { text: "  Let's build something that moves.", cls: "accent" },
    { text: "" },
    { text: `  // or just say hi at ${contactEmail}`, cls: "dim" },
  ],
  "/email": [
    { text: "Email", cls: "heading" },
    { text: "" },
    { text: `  ${contactEmail}`, cls: "accent" },
    { text: "" },
    { text: "  Tap the email link below to start a message.", cls: "dim" },
  ],
  "/site": [
    { text: "Site", cls: "heading" },
    { text: "" },
    { text: "  https://ainimation.studio", cls: "green" },
    { text: "  Director-style AI authoring environment" },
  ],
  "/location": [
    { text: "Location", cls: "heading" },
    { text: "" },
    { text: "  Barcelona / remote", cls: "purple" },
    { text: "  Working with teams in Europe and beyond." },
  ],
};

function renderContactCommand(command = "/contact") {
  if (!contactOutput) return;
  const lines = contactCommands[command] || contactCommands["/contact"];
  contactOutput.innerHTML = "";

  const echo = document.createElement("div");
  echo.className = "contact-line dim";
  echo.textContent = `> ${command}`;
  contactOutput.appendChild(echo);

  for (const line of lines) {
    const row = document.createElement("div");
    row.className = `contact-line ${line.cls || ""}`.trim();
    row.textContent = line.text || "\u00a0";
    contactOutput.appendChild(row);
  }

  if (command === "/contact" || command === "/email") {
    const link = document.createElement("a");
    link.className = "contact-action-link";
    link.href = contactMailto("AInimation Studio contact");
    link.textContent = "Open email";
    contactOutput.appendChild(link);
  }
}

if (contactOutput) {
  renderContactCommand(location.hash === "#contact" ? "/contact" : "/contact");
}

contactButtons.forEach((button) => {
  button.addEventListener("click", () => {
    renderContactCommand(button.dataset.contactCommand);
  });
});

contactLinks.forEach((link) => {
  link.addEventListener("click", () => {
    window.setTimeout(() => renderContactCommand("/email"), 120);
  });
});
