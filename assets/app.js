const canvas = document.querySelector("#hero-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const contactEmail = ["hello", "ainimation.studio"].join("@");
let uiAudioContext = null;
let uiAudioReady = false;

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
    const minHeight = isTools ? 560 : 36;
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
    const toolsHeight = Math.max(560, timelineTop - toolsTop - gap);
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

  function refreshWindowBounds() {
    if (isStackedLayout()) return;
    windows.forEach((win) => applyRect(win, currentRect(win)));
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

function initStudioCollabBar() {
  const shell = document.querySelector(".director-shell");
  const collabBar = shell?.querySelector(".studio-collab-bar");
  const closeButton = collabBar?.querySelector(".collab-close");
  const openButton = shell?.querySelector("[data-collab-open]");
  if (!shell || !collabBar || !closeButton) return;

  const refreshWorkspace = () => {
    requestAnimationFrame(() => {
      window.refreshDirectorWindows?.();
      requestAnimationFrame(() => window.refreshDirectorWindows?.());
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
  const left = totalFrames <= 1 ? 0 : ((currentFrame - 1) / (totalFrames - 1)) * 100;
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
    const fps = Number(document.querySelector("[data-score-fps]")?.dataset.value || 24);
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

function nextKeyframeFrame(currentFrame, totalFrames, direction) {
  const frames = timelineKeyframeFrames();
  if (!frames.length) return Math.min(Math.max(currentFrame + direction, 1), totalFrames);
  if (direction < 0) {
    return frames.filter((frame) => frame < currentFrame).at(-1) || frames[0] || 1;
  }
  return frames.find((frame) => frame > currentFrame) || frames.at(-1) || totalFrames;
}

function memberHasAudio(member) {
  return ["audio", "video", "animation"].includes(member?.mediaType);
}

function initScorePlayhead(totalFrames) {
  const ruler = document.querySelector(".score-ruler");
  const playhead = ruler?.querySelector(".score-playhead");
  const transport = document.querySelector(".score-tools");
  const fpsReadout = transport?.querySelector("[data-score-fps]");
  const fpsDownButton = transport?.querySelector("[data-score-fps-step='down']");
  const fpsUpButton = transport?.querySelector("[data-score-fps-step='up']");
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
  const clampFrame = (frame) => Math.min(Math.max(frame, 1), totalFrames);
  const setFrame = (frame) => {
    currentFrame = clampFrame(frame);
    const left = totalFrames <= 1 ? 0 : ((currentFrame - 1) / (totalFrames - 1)) * 100;
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
    return Math.round(ratio * (totalFrames - 1)) + 1;
  };
  const moveToPointer = (event) => setFrame(frameFromPointer(event));

  setFps(currentFps);
  setFrame(Number(playhead.dataset.frame || 1));
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
  fpsDownButton?.addEventListener("click", () => stepFps(-1));
  fpsUpButton?.addEventListener("click", () => stepFps(1));
}

const filmForm = document.querySelector("#filmForm");
const outputTitle = document.querySelector("#outputTitle");
const filmTreatment = document.querySelector("#filmTreatment");
const pipelineGrid = document.querySelector("#pipelineGrid");
const sceneBoard = document.querySelector("#sceneBoard");
const sceneCount = document.querySelector("#sceneCount");
const clearStageButton = document.querySelector("[data-clear-stage]");
const castBin = document.querySelector("#castBin");
const scoreGrid = document.querySelector("#scoreGrid");
const stageScript = document.querySelector("#stageScript");
const aiCueList = document.querySelector("#aiCueList");
const addSceneButton = document.querySelector("#addScene");
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
const stageWidthPixels = 1920;
const stageHeightPixels = 1080;
const stageRulerStep = 100;
const admiraStockEndpoints = [
  "https://pixer-eleven.csilvasantin.workers.dev/stock/list?limit=1",
  "https://www.admira.studio/api/stock/latest",
  "https://www.admira.studio/api/stock?limit=1&sort=latest",
  "https://www.admira.studio/api/stock",
  "https://www.admira.studio/stock/latest.json",
  "https://www.admira.studio/stock.json",
  "https://admira.studio/api/stock/latest",
  "https://admira.studio/api/stock?limit=1&sort=latest",
];
const admiraStockExportEndpoints = [
  "https://pixer-eleven.csilvasantin.workers.dev/stock",
  "https://pixer-eleven.csilvasantin.workers.dev/stock/upload",
  "https://pixer-eleven.csilvasantin.workers.dev/stock/create",
  "https://www.admira.studio/api/stock",
  "https://www.admira.studio/api/stock/upload",
];
let activeDirectorWindow = null;
let draggedDirectorWindow = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let selectedStageKeyframe = null;

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
      script: `on ${behavior}\n  askAI("${purpose}", cast, stage, score)\n  updateStage(frame:${startFrame}, duration:${length})\nend`,
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

function buildFilmPlan(extraScene = false) {
  const film = collectFilmData();
  const baseCount = sceneCounts[film.duration] || 5;
  const previous = loadFilmPlan();
  const count = extraScene ? Math.min((previous?.scenes?.length || baseCount) + 1, sceneBeats.length) : baseCount;
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
    scenes: makeScenes(film, count),
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

function initTimelineAudioMute() {
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
    sprite.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const track = sprite.closest(".score-track");
      const castIndex = Number(sprite.dataset.castIndex);
      const stageItemId = sprite.dataset.stageItemId;
      if (!track || (!Number.isInteger(castIndex) && !stageItemId)) return;
      const trackRect = track.getBoundingClientRect();
      const startFrame = Number(sprite.dataset.startFrame || 1);
      const durationFrames = Number(sprite.dataset.durationFrames || 24);
      const action = event.target.closest("[data-sprite-handle='start']")
        ? "trim-start"
        : event.target.closest("[data-sprite-handle='end']")
          ? "trim-end"
          : "move";
      const frameDelta = (clientX) => {
        const delta = trackRect.width ? ((clientX - event.clientX) / trackRect.width) * totalFrames : 0;
        return Math.round(delta);
      };
      const updateSprite = (frame, duration) => {
        sprite.dataset.startFrame = String(frame);
        sprite.dataset.durationFrames = String(duration);
        sprite.style.left = `${((frame - 1) / totalFrames) * 100}%`;
        sprite.style.width = `${(duration / totalFrames) * 100}%`;
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
          syncStageToFrame(currentTimelineFrame(), false);
        }
        if (stageItemId) {
          plan.stageItems = (plan.stageItems || []).map((item) => (
            item.id === stageItemId
              ? { ...item, startFrame: frame, durationFrames: duration }
              : item
          ));
          saveFilmPlan(plan);
          syncStageToFrame(currentTimelineFrame(), false);
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
      };
      sprite.addEventListener("pointermove", move);
      sprite.addEventListener("pointerup", up);
      sprite.addEventListener("pointercancel", up);
    });
  });
}

function initTimelineKeyframeDots() {
  scoreGrid.querySelectorAll(".score-keyframe-dot[data-keyframe-frame]").forEach((dot) => {
    dot.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const frame = Number(dot.dataset.keyframeFrame || 1);
      selectedStageKeyframe = dot.dataset.stageItemId
        ? { stageItemId: dot.dataset.stageItemId, frame }
        : { castIndex: Number(dot.dataset.castIndex), frame };
      setTimelineFrame(frame, false);
      document.querySelectorAll(".score-keyframe-dot.is-selected").forEach((item) => {
        item.classList.remove("is-selected");
      });
      dot.classList.add("is-selected");
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
    script: scene.script || fallback.scenes[index % fallback.scenes.length].script,
  }));
  return merged;
}

function clampPercent(value) {
  return Math.min(Math.max(Number(value) || 0, 0), 100);
}

function clampStageSize(value, fallback = 12) {
  return Math.min(Math.max(Number(value) || fallback, 4), 80);
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
      text.className = "stage-item stage-text-item";
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
        const nextPlan = currentPlan();
        nextPlan.stageItems = (nextPlan.stageItems || []).filter((stageItem) => stageItem.id !== item.id);
        saveFilmPlan(nextPlan);
        renderFilmPlan(nextPlan);
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
      shape.className = "stage-item stage-shape-item";
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
    nextMember.stageX = Math.min(Math.max(0, options.stagePoint.x - 6), 88);
    nextMember.stageY = Math.min(Math.max(0, options.stagePoint.y - 5), 90);
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
  const track = target?.closest?.(".score-track") ||
    document.querySelector(".score-track") ||
    document.querySelector(".score-ruler");
  const rect = track?.getBoundingClientRect();
  if (!rect?.width) return currentTimelineFrame();
  const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
  return Math.round(ratio * (totalFrames - 1)) + 1;
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
  const visibleCastMembers = castMembers
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member.imported || member.src);
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
    castBin.innerHTML = visibleCastMembers.length ? visibleCastMembers.map(({ member, index }) => {
      const media = member.src && ["animation", "image"].includes(member.mediaType)
        ? `<img src="${escapeHtml(member.src)}" alt="" crossorigin="anonymous" />`
        : member.src && member.mediaType === "video"
          ? `<video src="${escapeHtml(member.src)}" muted playsinline crossorigin="anonymous"></video>`
          : member.src
            ? `<b class="cast-member-kind">${escapeHtml(member.mediaType || "asset")}</b>`
            : "";
      return `
      <article class="cast-member ${member.imported ? "imported-member" : ""} ${member.onStage !== false ? "is-on-stage" : ""}" data-media-type="${escapeHtml(member.mediaType || "generated")}" data-cast-index="${index}" role="button" tabindex="0" draggable="false" aria-pressed="${member.onStage !== false}">
        ${media}
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <small>${escapeHtml(member.role)} · ${escapeHtml(member.type)}</small>
        </div>
      </article>
    `;
    }).join("") : `<p class="cast-empty-state">Import cast members to begin</p>`;

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
      const figure = document.createElement("figure");
      figure.className = `stage-imported-member ${member.mediaType === "video" ? "video-member" : member.mediaType === "audio" ? "audio-member" : "image-member"}`;
      figure.dataset.castIndex = String(castMembers.indexOf(member));
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
      const caption = document.createElement("figcaption");
      caption.textContent = member.name;
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "stage-member-resize";
      resizeHandle.setAttribute("aria-hidden", "true");
      figure.append(media, caption, resizeHandle);
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
    const frameMarks = Array.from({ length: 9 }, (_, index) => Math.round(1 + (totalFrames - 1) * (index / 8)));
    const timelineMarkers = loadTimelineMarkers(totalFrames);
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
    scoreGrid.innerHTML = `
      <div class="director-score">
        <div class="score-tools" aria-label="Timeline transport">
          <div class="score-play-cluster" role="group" aria-label="Timeline range controls">
            <button class="score-bound-button" type="button" data-score-bound="start" aria-label="Go to start">|←</button>
            <button class="score-play-top" type="button" data-score-play aria-label="Play timeline" aria-pressed="false">▶</button>
            <button class="score-bound-button" type="button" data-score-bound="end" aria-label="Go to end">→|</button>
          </div>
          <div class="score-transport" role="group" aria-label="Timeline frame controls">
            <button type="button" data-score-step="prev" aria-label="Previous keyframe">←</button>
            <div class="score-fps-stepper" aria-label="Timeline playback speed">
              <output class="score-fps-value" data-score-fps data-value="24" aria-label="24 frames per second">24</output>
              <span class="score-fps-buttons" aria-label="Frames per second controls">
                <button type="button" data-score-fps-step="up" aria-label="Increase FPS">▲</button>
                <button type="button" data-score-fps-step="down" aria-label="Decrease FPS">▼</button>
              </span>
            </div>
            <button type="button" data-score-step="next" aria-label="Next keyframe">→</button>
          </div>
        </div>
        <div class="score-member-title">Member</div>
        <div class="score-ruler">
          ${frameMarks.map((frame) => `<span style="left:${((frame - 1) / (totalFrames - 1)) * 100}%">${frame}</span>`).join("")}
          <div class="score-marker-layer" aria-label="Timeline marks">
            ${timelineMarkers.map((marker) => `
              <button class="score-marker" type="button" style="left:${((marker.frame - 1) / (totalFrames - 1)) * 100}%" data-marker-id="${escapeHtml(marker.id)}" data-marker-frame="${marker.frame}" aria-label="Timeline mark ${escapeHtml(marker.label)} at frame ${marker.frame}">
                <span contenteditable="true" spellcheck="false">${escapeHtml(marker.label)}</span>
              </button>
            `).join("")}
          </div>
          <i class="score-playhead" role="slider" aria-label="Timeline playhead" aria-valuemin="1" aria-valuemax="${totalFrames}" aria-valuenow="1" data-frame="1"></i>
        </div>
        ${scoreChannels.length ? "" : `<div class="score-empty-state">Import cast members to start the timeline</div>`}
        ${scoreChannels.map((channel, channelIndex) => `
          <div class="score-row-label">
            <span contenteditable="true" spellcheck="false" role="textbox" aria-label="Edit timeline row label" data-score-label-index="${channelIndex}" ${Number.isInteger(channel.castIndex) ? `data-cast-index="${channel.castIndex}"` : ""} ${channel.stageItemId ? `data-stage-item-id="${escapeHtml(channel.stageItemId)}"` : ""}>${escapeHtml(channel.name)}</span>
            ${channel.hasAudio ? `<button class="score-audio-mute ${channel.member.muted ? "is-muted" : ""}" type="button" data-audio-mute data-cast-index="${channel.castIndex}" aria-pressed="${channel.member.muted ? "true" : "false"}" aria-label="${channel.member.muted ? "Unmute audio" : "Mute audio"}">${channel.member.muted ? "M" : "S"}</button>` : ""}
          </div>
          <div class="score-track ${channel.lane}">
            ${Number.isInteger(channel.castIndex) ? keyframeDotsForMember(channel.member, totalFrames, channel.castIndex) : ""}
            ${channel.stageItemId ? keyframeDotsForStageItem(channel.member, totalFrames) : ""}
            ${[channel.member].map((item) => {
              const length = Math.max(1, Number(item.durationFrames || 24));
              const start = Math.min(Math.max(1, Number(item.startFrame || 1)), Math.max(1, totalFrames - length + 1));
              const spriteLabel = channel.name;
              return `
                <button class="score-sprite ${channel.lane} imported-member" type="button" style="left:${((start - 1) / totalFrames) * 100}%;width:${(length / totalFrames) * 100}%" ${channel.stageItemId ? `data-stage-item-id="${escapeHtml(channel.stageItemId)}"` : `data-cast-index="${channel.castIndex}"`} data-start-frame="${start}" data-duration-frames="${length}">
                  <i class="score-sprite-handle start" data-sprite-handle="start" aria-hidden="true"></i>
                  <span>${escapeHtml(spriteLabel)}</span>
                  <small>${start}-${start + length - 1}</small>
                  <i class="score-sprite-handle end" data-sprite-handle="end" aria-hidden="true"></i>
                </button>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    `;
    initScorePlayhead(totalFrames);
    initTimelineMarkerEditing(totalFrames);
    initScoreLabelEditing();
    initTimelineAudioMute();
    initTimelineSpriteDragging(totalFrames);
    initTimelineKeyframeDots();
    initCastDropTargets();
    syncStageToFrame(currentTimelineFrame(), false);
  }

  if (stageScript) {
    const leadScene = plan.scenes[0];
    stageScript.innerHTML = `
      <strong>Selected behavior</strong>
      <pre>${leadScene.script}</pre>
    `;
  }

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
    `## Cast`,
    ...(plan.cast || makeCast(plan)).map((member) => `- **${member.name}:** ${member.prompt}`),
    "",
    `## Scenes`,
  ];
  for (const scene of plan.scenes) {
    lines.push("", `### ${scene.number}. ${scene.beat}`, scene.scene, "", `Behavior: ${scene.behavior}()`, `Frames: ${scene.startFrame}-${scene.startFrame + scene.length}`, "", "```lingo", scene.script, "```", "", `Visual prompt: ${scene.visualPrompt}`, `Video prompt: ${scene.videoPrompt}`);
  }
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
    const blob = await renderStageAnimationBlob();
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
    version: "AiDirector v2026.05.20 r19",
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
        prompt: `Imported ${file.mediaType} member. Place in Cast, schedule on Timeline, and prepare for later AI animation passes.`,
      };
    });
  if (!imported.length) return;
  plan.cast = [...existing, ...imported];
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  playUiTick("import");
  window.refreshDirectorWindows?.();
}

function closeArchivoMenu() {
  document.querySelector(".member-menu")?.classList.remove("open");
  document.querySelector("[data-member-menu]")?.setAttribute("aria-expanded", "false");
}

function firstStockItem(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] || null;
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
    const item = firstStockItem(candidate);
    if (item) return item;
  }
  return typeof payload === "object" ? payload : null;
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
  const mediaType = stockMediaType(item, src);
  const rawName = findStockField(item, ["title", "name", "fileName", "filename", "label", "slug"]);
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
    onStage: false,
    startFrame: 1 + timelineMemberCount * 24,
    durationFrames: 24,
    prompt: "Imported from admira.studio Stock. Add to Stage from Cast to schedule it on the Timeline.",
  };
}

async function fetchLatestStockMember() {
  let lastError = null;
  for (const endpoint of admiraStockEndpoints) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const item = firstStockItem(await response.json());
      const plan = currentPlan();
      const existing = plan.cast || makeCast(plan);
      const timelineMemberCount = existing.filter((member) => member.imported && member.src).length;
      const member = stockMemberFromItem(item, endpoint, existing.length, timelineMemberCount);
      if (member) return member;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Stock has not returned a usable media asset.");
}

async function importLatestAdmiraStock() {
  if (!stockImportButton) return;
  const originalText = stockImportButton.textContent;
  stockImportButton.disabled = true;
  stockImportButton.textContent = "Importando...";
  try {
    const member = await fetchLatestStockMember();
    const plan = currentPlan();
    plan.cast = [...(plan.cast || makeCast(plan)), member];
    saveFilmPlan(plan);
    renderFilmPlan(plan);
    playUiTick("import");
    window.refreshDirectorWindows?.();
    document.querySelector('[data-open-window="cast"]')?.click();
    stockImportButton.textContent = "Importado";
    window.setTimeout(() => { stockImportButton.textContent = originalText; }, 1200);
  } catch (error) {
    console.warn("Admira Stock import failed", error);
    stockImportButton.textContent = "Stock no disponible";
    window.alert("No se ha podido importar el último contenido de admira.studio Stock.");
    window.setTimeout(() => { stockImportButton.textContent = originalText; }, 1800);
  } finally {
    closeArchivoMenu();
    stockImportButton.disabled = false;
  }
}

async function postStageAnimationToStock(endpoint, blob, metadata) {
  const fileName = `${planSlug(metadata.project)}-animation.webm`;
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("title", metadata.title);
  formData.append("name", metadata.title);
  formData.append("type", "animation");
  formData.append("mediaType", "animation");
  formData.append("mimeType", blob.type || "video/webm");
  formData.append("fileName", fileName);
  formData.append("metadata", JSON.stringify(metadata));
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : { ok: true };
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
    const blob = await renderStageAnimationBlob();
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
        const payload = await postStageAnimationToStock(endpoint, blob, metadata);
        const item = firstStockItem(payload) || payload;
        const nextPlan = currentPlan();
        const existing = nextPlan.cast || makeCast(nextPlan);
        const timelineMemberCount = existing.filter((member) => member.imported && member.src).length;
        const member = stockMemberFromItem(item, endpoint, existing.length, timelineMemberCount);
        if (member) {
          nextPlan.cast = [...existing, { ...member, mediaType: "animation", type: memberTypeLabel("animation"), stock: true }];
          saveFilmPlan(nextPlan);
          renderFilmPlan(nextPlan);
        }
        playUiTick("import");
        document.querySelector('[data-open-window="cast"]')?.click();
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

    if (event.target.closest(".stage-item") || member) return;

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
    importLatestAdmiraStock();
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
