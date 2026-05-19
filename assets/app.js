const canvas = document.querySelector("#hero-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
    const minWidth = isTools ? 112 : 220;
    const minHeight = isTools ? 430 : 36;
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
    const stageHeight = Math.max(360, lowerTop - gap);
    const sideLeft = stageWidth + gap;
    const castHeight = clamp(Math.round(bounds.height * 0.18), 190, 300);
    const toolsWidth = Math.min(180, Math.max(112, sideWidth));
    const toolsHeight = clamp(Math.round(bounds.height * 0.42), 430, 620);
    const toolsTop = castHeight + gap;
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
      importMemberFiles(fileInput.files, fileInput.dataset.memberImportMode || "image");
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

initFileImportMenu(".member-menu", "[data-member-menu]", "[data-member-file-input]");
initFileImportMenu(".cast-menu", "[data-cast-menu]", "[data-cast-file-input]");

function initScorePlayhead(totalFrames) {
  const ruler = document.querySelector(".score-ruler");
  const playhead = ruler?.querySelector(".score-playhead");
  const transport = document.querySelector(".score-tools");
  const fpsReadout = transport?.querySelector("[data-score-fps]");
  const fpsDownButton = transport?.querySelector("[data-score-fps-step='down']");
  const fpsUpButton = transport?.querySelector("[data-score-fps-step='up']");
  const prevButton = transport?.querySelector("[data-score-step='prev']");
  const nextButton = transport?.querySelector("[data-score-step='next']");
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
    setFrame(currentFrame - 1);
  });
  nextButton?.addEventListener("click", () => {
    stopPlayback();
    setFrame(currentFrame + 1);
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
const filmStorageKey = "ainimation-film-plan";
const scoreLabelsStorageKey = "ainimation-score-labels";
const timelineMarkersStorageKey = "ainimation-timeline-markers";

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

function initTimelineSpriteDragging(totalFrames) {
  const sprites = [...scoreGrid.querySelectorAll(".score-sprite.imported-member[data-cast-index]")];
  if (!sprites.length) return;

  sprites.forEach((sprite) => {
    sprite.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const track = sprite.closest(".score-track");
      const castIndex = Number(sprite.dataset.castIndex);
      if (!track || !Number.isInteger(castIndex)) return;
      const trackRect = track.getBoundingClientRect();
      const startFrame = Number(sprite.dataset.startFrame || 1);
      const durationFrames = Number(sprite.dataset.durationFrames || 24);
      const maxStartFrame = Math.max(1, totalFrames - durationFrames + 1);
      const frameFromDelta = (clientX) => {
        const delta = trackRect.width ? ((clientX - event.clientX) / trackRect.width) * totalFrames : 0;
        return Math.min(Math.max(Math.round(startFrame + delta), 1), maxStartFrame);
      };
      const updateSprite = (frame) => {
        sprite.dataset.startFrame = String(frame);
        sprite.style.left = `${((frame - 1) / totalFrames) * 100}%`;
        const range = sprite.querySelector("small");
        if (range) range.textContent = `${frame}-${frame + durationFrames - 1}`;
      };

      sprite.classList.add("is-dragging");
      sprite.setPointerCapture(event.pointerId);
      const move = (moveEvent) => updateSprite(frameFromDelta(moveEvent.clientX));
      const up = () => {
        sprite.classList.remove("is-dragging");
        sprite.removeEventListener("pointermove", move);
        sprite.removeEventListener("pointerup", up);
        sprite.removeEventListener("pointercancel", up);
        const nextFrame = Number(sprite.dataset.startFrame || startFrame);
        const plan = currentPlan();
        if (plan.cast?.[castIndex]) {
          plan.cast[castIndex] = {
            ...plan.cast[castIndex],
            startFrame: nextFrame,
            durationFrames,
          };
          saveFilmPlan(plan);
        }
      };
      sprite.addEventListener("pointermove", move);
      sprite.addEventListener("pointerup", up);
      sprite.addEventListener("pointercancel", up);
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
    stageItems: Array.isArray(plan.stageItems) ? plan.stageItems : [],
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

function stagePointFromEvent(stage, event) {
  const rect = stage.getBoundingClientRect();
  const x = rect.width ? ((event.clientX - rect.left) / rect.width) * 100 : 0;
  const y = rect.height ? ((event.clientY - rect.top) / rect.height) * 100 : 0;
  return { x: clampPercent(x), y: clampPercent(y) };
}

function stageItemId(prefix = "stage") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

function renderStageItems(stage, plan) {
  stage.querySelectorAll(".stage-item").forEach((item) => item.remove());
  (plan.stageItems || []).forEach((item) => {
    if (item.type === "text") {
      const text = document.createElement("div");
      text.className = "stage-item stage-text-item";
      text.dataset.stageItemId = item.id;
      text.contentEditable = "true";
      text.spellcheck = false;
      text.textContent = item.text || "Text";
      text.style.left = `${clampPercent(item.x)}%`;
      text.style.top = `${clampPercent(item.y)}%`;
      text.style.color = item.color || "";
      text.addEventListener("pointerdown", (event) => {
        if (stage.dataset.stageTool === "text") event.stopPropagation();
      });
      text.addEventListener("blur", () => {
        const nextPlan = currentPlan();
        nextPlan.stageItems = (nextPlan.stageItems || []).map((stageItem) => (
          stageItem.id === item.id
            ? { ...stageItem, text: text.textContent.trim() || "Text" }
            : stageItem
        ));
        saveFilmPlan(nextPlan);
      });
      stage.append(text);
    }
    if (item.type === "line") {
      const line = document.createElement("span");
      line.className = "stage-item stage-line-item";
      line.dataset.stageItemId = item.id;
      positionStageLine(line, item);
      stage.append(line);
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

function renderFilmPlan(plan) {
  const castMembers = plan.cast || makeCast(plan);
  const importedTimelineMembers = castMembers.filter((member) => member.imported && member.src);
  const importedStageMembers = importedTimelineMembers.filter((member) => (
    member.onStage !== false &&
    ["animation", "image", "video"].includes(member.mediaType)
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
    castBin.innerHTML = castMembers.map((member, index) => {
      const media = member.src && ["animation", "image"].includes(member.mediaType)
        ? `<img src="${escapeHtml(member.src)}" alt="" />`
        : member.src && member.mediaType === "video"
          ? `<video src="${escapeHtml(member.src)}" muted playsinline></video>`
          : member.src
            ? `<b class="cast-member-kind">${escapeHtml(member.mediaType || "asset")}</b>`
            : "";
      return `
      <article class="cast-member ${member.imported ? "imported-member" : ""}" data-media-type="${escapeHtml(member.mediaType || "generated")}">
        ${media}
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <small>${escapeHtml(member.role)} · ${escapeHtml(member.type)}</small>
        </div>
      </article>
    `;
    }).join("");
  }

  const stageWindow = document.querySelector(".stage-canvas") || document.querySelector(".stage-window");
  if (stageWindow) {
    stageWindow.querySelectorAll(".stage-imported-member, .stage-item").forEach((member) => member.remove());
    importedStageMembers.slice(0, 6).forEach((member, index) => {
      const figure = document.createElement("figure");
      figure.className = `stage-imported-member ${member.mediaType === "video" ? "video-member" : "image-member"}`;
      figure.dataset.castIndex = String(castMembers.indexOf(member));
      figure.style.left = `${clampPercent(member.stageX ?? (16 + (index % 3) * 24))}%`;
      figure.style.top = `${clampPercent(member.stageY ?? (54 + Math.floor(index / 3) * 18))}%`;
      figure.style.width = `${clampStageSize(member.stageW, 12)}%`;
      figure.style.height = `${clampStageSize(member.stageH, 10)}%`;
      const media = document.createElement(member.mediaType === "video" ? "video" : "img");
      media.src = member.src;
      media.alt = "";
      if (member.mediaType === "video") {
        media.muted = true;
        media.playsInline = true;
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
    const importedEndFrames = importedTimelineMembers.map((member) => Number(member.startFrame || 1) + Number(member.durationFrames || 24) - 1);
    const totalFrames = Math.max(...importedEndFrames, 240);
    const frameMarks = Array.from({ length: 9 }, (_, index) => Math.round(1 + (totalFrames - 1) * (index / 8)));
    const timelineMarkers = loadTimelineMarkers(totalFrames);
    const scoreChannels = importedTimelineMembers.map((member) => ({
        name: member.name,
        lane: member.mediaType === "video" || member.mediaType === "animation" ? "video" : member.mediaType === "audio" ? "music" : "cast",
        member,
        castIndex: castMembers.indexOf(member),
      }));
    scoreGrid.style.setProperty("--total-frames", totalFrames);
    scoreGrid.innerHTML = `
      <div class="director-score">
        <div class="score-tools" aria-label="Timeline transport">
          <button class="score-play-top" type="button" data-score-play aria-label="Play timeline" aria-pressed="false">▶</button>
          <div class="score-transport" role="group" aria-label="Timeline frame controls">
            <button type="button" data-score-step="prev" aria-label="Previous frame">←</button>
            <div class="score-fps-stepper" aria-label="Timeline playback speed">
              <output class="score-fps-value" data-score-fps data-value="24" aria-label="24 frames per second">24</output>
              <span class="score-fps-buttons" aria-label="Frames per second controls">
                <button type="button" data-score-fps-step="up" aria-label="Increase FPS">▲</button>
                <button type="button" data-score-fps-step="down" aria-label="Decrease FPS">▼</button>
              </span>
            </div>
            <button type="button" data-score-step="next" aria-label="Next frame">→</button>
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
          <div class="score-row-label" contenteditable="true" spellcheck="false" role="textbox" aria-label="Edit timeline row label" data-score-label-index="${channelIndex}">${escapeHtml(channel.name)}</div>
          <div class="score-track ${channel.lane}">
            ${[channel.member].map((item) => {
              const length = Math.max(1, Number(item.durationFrames || 24));
              const start = Math.min(Math.max(1, Number(item.startFrame || 1)), Math.max(1, totalFrames - length + 1));
              const spriteLabel = item.name;
              return `
                <button class="score-sprite ${channel.lane} imported-member" type="button" style="left:${((start - 1) / totalFrames) * 100}%;width:${(length / totalFrames) * 100}%" data-cast-index="${channel.castIndex}" data-start-frame="${start}" data-duration-frames="${length}">
                  <span>${escapeHtml(spriteLabel)}</span>
                  <small>${start}-${start + length - 1}</small>
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
    initTimelineSpriteDragging(totalFrames);
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

function currentPlan() {
  return normalizeFilmPlan(loadFilmPlan()) || buildFilmPlan();
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
        onStage: ["animation", "image", "video"].includes(file.mediaType),
        startFrame: 1 + (timelineMemberCount + index) * 24,
        durationFrames: 24,
        prompt: `Imported ${file.mediaType} member. Place in Cast, schedule on Timeline, and prepare for later AI animation passes.`,
      };
    });
  if (!imported.length) return;
  plan.cast = [...existing, ...imported];
  saveFilmPlan(plan);
  renderFilmPlan(plan);
  window.refreshDirectorWindows?.();
}

function initStageTools() {
  const stage = document.querySelector(".stage-canvas");
  const palette = document.querySelector(".tool-palette");
  const toolButtons = [...document.querySelectorAll(".tool-symbols [data-stage-tool]")];
  if (!stage || !palette || !toolButtons.length) return;

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

  toolButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      setActiveTool(button.dataset.stageTool);
      palette.classList.remove("open");
      palette.dataset.openFor = "";
    });
  });

  setActiveTool(palette.dataset.stageTool || "hand");

  stage.addEventListener("pointerdown", (event) => {
    const tool = activeTool();
    const member = event.target.closest(".stage-imported-member");
    const textItem = event.target.closest(".stage-text-item");
    if (tool === "hand" && member) {
      event.preventDefault();
      const castIndex = Number(member.dataset.castIndex);
      const start = stagePointFromEvent(stage, event);
      const startLeft = Number.parseFloat(member.style.left) || 0;
      const startTop = Number.parseFloat(member.style.top) || 0;
      const startWidth = Number.parseFloat(member.style.width) || 12;
      const startHeight = Number.parseFloat(member.style.height) || 10;
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
          plan.cast[castIndex] = {
            ...plan.cast[castIndex],
            stageX: Number.parseFloat(member.style.left) || 0,
            stageY: Number.parseFloat(member.style.top) || 0,
            stageW: Number.parseFloat(member.style.width) || startWidth,
            stageH: Number.parseFloat(member.style.height) || startHeight,
          };
          saveFilmPlan(plan);
        }
      };
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", up);
      stage.addEventListener("pointercancel", up);
      return;
    }

    if (tool === "hand" && textItem) {
      event.preventDefault();
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
        plan.stageItems = (plan.stageItems || []).map((item) => (
          item.id === itemId
            ? {
              ...item,
              x: Number.parseFloat(textItem.style.left) || 0,
              y: Number.parseFloat(textItem.style.top) || 0,
              text: textItem.textContent.trim() || "Text",
            }
            : item
        ));
        saveFilmPlan(plan);
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
      };
      plan.stageItems = [...(plan.stageItems || []), item];
      saveFilmPlan(plan);
      renderFilmPlan(plan);
      const text = stage.querySelector(`[data-stage-item-id="${item.id}"]`);
      if (text) {
        text.focus();
        document.getSelection()?.selectAllChildren(text);
      }
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
  renderFilmPlan(initialPlan);
  initStageTools();

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
  });

  document.querySelectorAll("[data-import-asset]").forEach((button) => {
    button.addEventListener("click", () => {
      importCastAsset(button.dataset.importAsset, button.dataset.importKind || "Asset");
    });
  });

  copyMarkdownButton?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(toMarkdown(currentPlan()));
    copyMarkdownButton.textContent = "Copied";
    window.setTimeout(() => { copyMarkdownButton.textContent = "Copy Markdown"; }, 1200);
  });

  downloadJsonButton?.addEventListener("click", () => {
    const plan = currentPlan();
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "film"}-ainimation-plan.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  clearStageButton?.addEventListener("click", () => {
    const plan = currentPlan();
    plan.cast = (plan.cast || makeCast(plan)).map((member) => (
      member.imported && ["animation", "image", "video"].includes(member.mediaType)
        ? { ...member, onStage: false, stageX: undefined, stageY: undefined, stageW: undefined, stageH: undefined }
        : member
    ));
    plan.stageItems = [];
    saveFilmPlan(plan);
    renderFilmPlan(plan);
  });
}
