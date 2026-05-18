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

const enterStudio = new URLSearchParams(window.location.search).get("enter") === "1";

if (enterStudio) {
  document.body.classList.add("studio-entering");
  const jumpToWorkspace = () => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  window.addEventListener("load", jumpToWorkspace);
  window.setTimeout(jumpToWorkspace, 80);
  window.setTimeout(jumpToWorkspace, 420);
  window.setTimeout(jumpToWorkspace, 900);
  window.setTimeout(jumpToWorkspace, 1600);
  window.setTimeout(() => {
    document.body.classList.add("studio-entered");
  }, 3600);
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
    const width = clamp(rect.width, 220, Math.max(240, bounds.width));
    const height = clamp(rect.height, 36, Math.max(120, bounds.height));
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

  function fullWorkbenchRect() {
    return {
      left: 0,
      top: 0,
      width: workbench.clientWidth,
      height: workbench.clientHeight,
    };
  }

  function dockTimeline(win) {
    if (isStackedLayout()) return;
    win.classList.remove("is-minimized", "is-hidden");
    win.classList.add("is-docked");
    applyRect(win, fullWorkbenchRect());
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
    applyRect(win, rect);
    bringToFront(win);
    addResizeHandles(win);

    win.addEventListener("pointerdown", () => bringToFront(win));

    const titlebar = win.querySelector(".window-titlebar");
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
        applyRect(win, {
          ...start,
          left: nextLeft,
          top: start.top + moveEvent.clientY - startY,
        });
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
  if (!palette || !menu) return;

  palette.querySelectorAll("[data-import-trigger]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      palette.dataset.importMode = button.dataset.importTrigger;
      palette.classList.toggle("open", palette.dataset.openFor !== button.dataset.importTrigger);
      palette.dataset.openFor = palette.classList.contains("open") ? button.dataset.importTrigger : "";
    });
  });

  document.addEventListener("click", (event) => {
    if (!palette.contains(event.target)) {
      palette.classList.remove("open");
      palette.dataset.openFor = "";
    }
  });
}

initImportMenu();

function initScorePlayhead(totalFrames) {
  const ruler = document.querySelector(".score-ruler");
  const playhead = ruler?.querySelector(".score-playhead");
  if (!ruler || !playhead) return;

  const clampFrame = (frame) => Math.min(Math.max(frame, 1), totalFrames);
  const setFrame = (frame) => {
    const currentFrame = clampFrame(frame);
    const left = totalFrames <= 1 ? 0 : ((currentFrame - 1) / (totalFrames - 1)) * 100;
    playhead.style.left = `${left}%`;
    playhead.dataset.frame = String(currentFrame);
    playhead.setAttribute("aria-valuenow", String(currentFrame));
  };
  const frameFromPointer = (event) => {
    const rect = ruler.getBoundingClientRect();
    const ratio = rect.width ? (event.clientX - rect.left) / rect.width : 0;
    return Math.round(ratio * (totalFrames - 1)) + 1;
  };
  const moveToPointer = (event) => setFrame(frameFromPointer(event));

  setFrame(Number(playhead.dataset.frame || 1));
  playhead.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
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
    moveToPointer(event);
  });
}

const filmForm = document.querySelector("#filmForm");
const outputTitle = document.querySelector("#outputTitle");
const filmTreatment = document.querySelector("#filmTreatment");
const pipelineGrid = document.querySelector("#pipelineGrid");
const sceneBoard = document.querySelector("#sceneBoard");
const sceneCount = document.querySelector("#sceneCount");
const castBin = document.querySelector("#castBin");
const scoreGrid = document.querySelector("#scoreGrid");
const stageScript = document.querySelector("#stageScript");
const aiCueList = document.querySelector("#aiCueList");
const addSceneButton = document.querySelector("#addScene");
const copyMarkdownButton = document.querySelector("#copyMarkdown");
const downloadJsonButton = document.querySelector("#downloadJson");
const filmStorageKey = "ainimation-film-plan";
const scoreLabelsStorageKey = "ainimation-score-labels";

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

function hydrateFilmForm(plan) {
  if (!plan) return;
  for (const [key, value] of Object.entries(plan)) {
    const field = filmForm.elements[key];
    if (!field || typeof value !== "string") continue;
    field.value = value;
  }
}

function renderFilmPlan(plan) {
  outputTitle.textContent = plan.title;
  sceneCount.textContent = `${plan.scenes.length} score rows`;
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
    castBin.innerHTML = (plan.cast || makeCast(plan)).map((member, index) => `
      <article class="cast-member">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${member.name}</strong>
          <small>${member.role} · ${member.type}</small>
        </div>
      </article>
    `).join("");
  }

  if (scoreGrid) {
    const totalFrames = Math.max(...plan.scenes.map((scene) => scene.startFrame + scene.length), 240);
    const frameMarks = Array.from({ length: 9 }, (_, index) => Math.round(1 + (totalFrames - 1) * (index / 8)));
    const castNames = (plan.cast || makeCast(plan)).map((member) => member.name);
    const scoreLabels = loadScoreLabels();
    const scoreChannels = [
      { name: scoreLabels[0], lane: "stage", label: (scene) => scene.beat },
      { name: scoreLabels[1], lane: "cast", label: (scene, index) => castNames[index % Math.max(castNames.length, 1)] || scene.beat },
      { name: scoreLabels[2], lane: "cast", label: (scene, index) => castNames[(index + 1) % Math.max(castNames.length, 1)] || scene.beat },
      { name: scoreLabels[3], lane: "behavior", label: (scene) => scene.behavior },
      { name: scoreLabels[4], lane: "voice", label: (scene) => scene.beat },
      { name: scoreLabels[5], lane: "music", label: (scene) => `${scene.act} motif` },
      { name: scoreLabels[6], lane: "video", label: (scene) => scene.beat },
    ];
    scoreGrid.style.setProperty("--total-frames", totalFrames);
    scoreGrid.innerHTML = `
      <div class="director-score">
        <div class="score-tools" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        <div class="score-member-title">Member</div>
        <div class="score-ruler">
          ${frameMarks.map((frame) => `<span style="left:${((frame - 1) / (totalFrames - 1)) * 100}%">${frame}</span>`).join("")}
          <i class="score-playhead" role="slider" aria-label="Timeline playhead" aria-valuemin="1" aria-valuemax="${totalFrames}" aria-valuenow="${plan.scenes[0]?.startFrame || 1}" data-frame="${plan.scenes[0]?.startFrame || 1}"></i>
        </div>
        ${scoreChannels.map((channel, channelIndex) => `
          <div class="score-row-label" contenteditable="true" spellcheck="false" role="textbox" aria-label="Edit timeline row label" data-score-label-index="${channelIndex}">${channel.name}</div>
          <div class="score-track ${channel.lane}">
            ${plan.scenes.map((scene, sceneIndex) => {
              const stagger = channelIndex < 3 ? channelIndex * 8 : 0;
              const start = Math.min(totalFrames - 8, Math.max(1, scene.startFrame + stagger));
              const length = Math.max(18, Math.min(totalFrames - start, scene.length - stagger));
              return `
                <button class="score-sprite ${channel.lane}" type="button" style="left:${((start - 1) / totalFrames) * 100}%;width:${(length / totalFrames) * 100}%">
                  <span>${channel.label(scene, sceneIndex)}</span>
                  <small>${start}-${start + length}</small>
                </button>
              `;
            }).join("")}
          </div>
        `).join("")}
      </div>
    `;
    initScorePlayhead(totalFrames);
    initScoreLabelEditing();
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

function importCastAsset(name, kind) {
  const plan = currentPlan();
  const mode = document.querySelector(".tool-palette")?.dataset.importMode || "asset";
  const imported = {
    role: "Imported",
    name: `${name} ${String((plan.cast?.length || 0) + 1).padStart(2, "0")}`,
    type: kind,
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
}
