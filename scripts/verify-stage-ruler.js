const { chromium } = require("playwright");

const targetUrl = process.env.STUDIO_URL || "http://127.0.0.1:8097/studio.html";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const useLiveStock = process.env.REAL_STOCK === "1";
  if (useLiveStock) {
    await page.addInitScript(() => {
      window.__USE_LIVE_STOCK__ = true;
    });
  }

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("ainimation-timeline-zoom"));
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => {
    window.refreshDirectorWindows?.();
    const rect = document.querySelector(".stage-canvas")?.getBoundingClientRect();
    return rect && rect.width > 400 && rect.height > 300;
  }, { timeout: 30000 });
  await page.evaluate(() => window.renderFilmPlan?.(window.currentPlan?.()));
  await page.evaluate(() => window.renderStageRulers?.());

  const result = await page.evaluate(() => {
    const stylesheetHref = document.querySelector('link[rel="stylesheet"]')?.href || "";
    const brand = document.querySelector(".director-brand-link");
    const menu = document.querySelector(".director-menubar");
    const stageWindow = document.querySelector('[data-window="stage"]');
    const stageCanvas = document.querySelector(".stage-canvas");
    const timelineWindow = document.querySelector('[data-window="score"]');
    const collabBar = document.querySelector(".studio-collab-bar");
    const promptWindow = document.querySelector('[data-window="prompt"]');
    const scriptWindow = document.querySelector('[data-window="script"]');
    const fileMenu = document.querySelector("[data-member-menu]");
    const fileMenuItems = [...document.querySelectorAll(".member-menu-list button, .member-menu-list label")].map((item) => item.textContent.trim());
    const editMenu = document.querySelector("[data-edit-menu]");
    const editMenuItems = [...document.querySelectorAll(".edit-menu-list button")].map((item) => ({
      text: item.querySelector(".edit-menu-text")?.textContent.trim() || item.textContent.trim(),
      shortcut: item.querySelector("kbd")?.textContent.trim() || "",
      disabled: item.disabled,
      command: item.dataset.editCommand || "",
    }));
    const editMenuSeparators = document.querySelectorAll(".edit-menu-list [role='separator']").length;
    const toolShortcuts = [...document.querySelectorAll(".tool-shortcuts a")].map((link) => ({
      text: link.textContent.trim(),
      href: link.href,
      target: link.target,
      rel: link.rel,
    }));
    const labels = [...document.querySelectorAll(".stage-ruler-y span")].map((label) => {
      const rect = label.getBoundingClientRect();
      const style = getComputedStyle(label);

      return {
        text: label.textContent.trim(),
        transform: style.transform,
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    });
    const xLabels = [...document.querySelectorAll(".stage-ruler-x span")].map((label) => label.textContent.trim());

    const brandRect = brand?.getBoundingClientRect();
    const menuRect = menu?.getBoundingClientRect();
    const stageRect = stageWindow?.getBoundingClientRect();
    const timelineRect = timelineWindow?.getBoundingClientRect();

    return {
      stylesheetHref,
      labels,
      xLabels,
      rulerReference: {
        stageWidth: Math.round(stageCanvas?.getBoundingClientRect().width || 0),
        stageHeight: Math.round(stageCanvas?.getBoundingClientRect().height || 0),
        xLast: xLabels.at(-1) || "",
        yLast: labels.at(-1)?.text || "",
      },
      exportHasGuides: window.drawStageDomFrame?.toString().includes("drawStageGrid") || false,
      fileMenu: {
        text: fileMenu?.textContent.trim() || "",
        items: fileMenuItems,
        hasProjectOpen: Boolean(document.querySelector("[data-project-open-input]")),
        hasStockImport: Boolean(document.querySelector("[data-stock-import]")),
        hasStockExport: Boolean(document.querySelector("[data-stock-export]")),
        hasStageDownload: Boolean(document.querySelector("[data-download-stage-video]")),
      },
      editMenu: {
        text: editMenu?.textContent.trim() || "",
        items: editMenuItems,
        separators: editMenuSeparators,
      },
      toolShortcuts,
      brand: {
        text: brand?.textContent.trim() || "",
        rightGap: brandRect && menuRect ? Number((menuRect.right - brandRect.right).toFixed(2)) : null,
      },
      initialWindows: {
        collabHidden: collabBar?.classList.contains("is-hidden") || false,
        promptHidden: promptWindow?.classList.contains("is-hidden") || false,
        scriptHidden: scriptWindow?.classList.contains("is-hidden") || false,
        stageBottomGapToTimeline: stageRect && timelineRect ? Number((timelineRect.top - stageRect.bottom).toFixed(2)) : null,
      },
    };
  });

  await page.locator("[data-collab-open]").click();

  result.initialWindows.collabOpensOnClick = await page.evaluate(() => (
    !document.querySelector(".studio-collab-bar")?.classList.contains("is-hidden")
  ));

  result.stageVideoExport = await page.evaluate(async () => {
    const button = document.querySelector("[data-download-stage-video]");
    const originalMediaRecorder = window.MediaRecorder;
    const originalCaptureStream = HTMLCanvasElement.prototype.captureStream;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalMediaStream = window.MediaStream;
    const originalSetInterval = window.setInterval;
    const originalClearInterval = window.clearInterval;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    let downloadedFile = "";
    const downloadedFiles = [];
    let recorderCount = 0;

    let recorderTracks = { audio: 0, video: 0 };
    let rafTime = 0;
    class FakeMediaStream {
      constructor(tracks = []) {
        this.tracks = tracks;
      }

      getTracks() { return this.tracks; }
      getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
      getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
    }

    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() {
        return true;
      }

      constructor(stream) {
        super();
        recorderCount += 1;
        recorderTracks = {
          audio: stream?.getAudioTracks?.().length || 0,
          video: stream?.getVideoTracks?.().length || 0,
        };
      }

      start() {}

      stop() {
        const dataEvent = new Event("dataavailable");
        Object.defineProperty(dataEvent, "data", {
          value: new Blob(["stage"], { type: "video/webm" }),
        });
        this.dispatchEvent(dataEvent);
        this.dispatchEvent(new Event("stop"));
      }
    }

    try {
      window.MediaRecorder = FakeMediaRecorder;
      window.MediaStream = FakeMediaStream;
      HTMLCanvasElement.prototype.captureStream = () => new FakeMediaStream([{ kind: "video" }]);
      window.requestAnimationFrame = (callback) => {
        rafTime += 1000 / 60;
        window.setTimeout(() => callback(rafTime), 0);
        return rafTime;
      };
      window.cancelAnimationFrame = () => {};
      window.setInterval = (callback) => { callback(); return 1; };
      window.clearInterval = () => {};
      URL.createObjectURL = () => "blob:stage-test";
      URL.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = function click() {
        downloadedFile = this.download;
        downloadedFiles.push(this.download);
      };
      button.click();
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      button.click();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return {
        downloadedFile,
        downloadedFiles,
        buttonText: button.textContent.trim(),
        buttonDisabled: button.disabled,
        recorderCount,
        recorderTracks,
      };
    } finally {
      window.MediaRecorder = originalMediaRecorder;
      HTMLCanvasElement.prototype.captureStream = originalCaptureStream;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
      window.MediaStream = originalMediaStream;
      window.setInterval = originalSetInterval;
      window.clearInterval = originalClearInterval;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });

  result.stockExport = await page.evaluate(async () => {
    const button = document.querySelector("[data-stock-export]");
    const originalMediaRecorder = window.MediaRecorder;
    const originalCaptureStream = HTMLCanvasElement.prototype.captureStream;
    const originalMediaCaptureStream = HTMLMediaElement.prototype.captureStream;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const originalMediaStream = window.MediaStream;
    const originalFetch = window.fetch;
    const calls = [];
    const formEntries = [];
    let rafTicks = 0;
    let recorderTracks = { audio: 0, video: 0 };

    class FakeMediaStream {
      constructor(tracks = []) {
        this.tracks = tracks;
      }

      getTracks() { return this.tracks; }
      getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
      getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
    }

    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() {
        return true;
      }

      constructor(stream) {
        super();
        recorderTracks = {
          audio: stream?.getAudioTracks?.().length || 0,
          video: stream?.getVideoTracks?.().length || 0,
        };
      }

      start() {}

      stop() {
        const dataEvent = new Event("dataavailable");
        Object.defineProperty(dataEvent, "data", {
          value: new Blob(["stock-stage"], { type: "video/webm" }),
        });
        this.dispatchEvent(dataEvent);
        this.dispatchEvent(new Event("stop"));
      }
    }

    try {
      window.MediaRecorder = FakeMediaRecorder;
      window.MediaStream = FakeMediaStream;
      HTMLCanvasElement.prototype.captureStream = () => new FakeMediaStream([{ kind: "video" }]);
      HTMLMediaElement.prototype.captureStream = () => new FakeMediaStream([{ kind: "audio" }]);
      let rafTime = 0;
      window.requestAnimationFrame = (callback) => {
        rafTicks += 1;
        rafTime += 1000 / 12;
        window.setTimeout(() => callback(rafTime), 0);
        return rafTicks;
      };
      window.cancelAnimationFrame = () => {};
      window.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), method: options.method || "GET" });
        if (options.body instanceof FormData) {
          for (const [key, value] of options.body.entries()) {
            formEntries.push([key, value instanceof Blob ? `${value.type}:${value.size}` : String(value).slice(0, 60)]);
          }
        } else if (typeof options.body === "string") {
          const payload = JSON.parse(options.body);
          for (const key of ["type", "motor", "mime", "comment", "base64"]) {
            const value = payload[key];
            formEntries.push([key, key === "base64" ? String(value || "").slice(0, 12) : String(value || "").slice(0, 60)]);
          }
        }
        return new Response(JSON.stringify({
          title: "AiDirector exported animation",
          assetUrl: "https://www.admira.studio/media/aidirector-export.webm",
          mimeType: "video/webm",
          mediaType: "animation",
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };
      const plan = window.currentPlan?.() || JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
      plan.cast = [
        ...(plan.cast || []),
        {
          name: "Export Audio Bed",
          role: "Audio",
          imported: true,
          mediaType: "audio",
          type: "Sound member",
          src: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
          onStage: true,
          startFrame: 1,
          durationFrames: 121,
          keyframes: [{ frame: 1, x: 16, y: 54, w: 12, h: 10 }],
        },
      ];
      localStorage.setItem("ainimation-film-plan", JSON.stringify(plan));
      window.renderFilmPlan?.(plan);
      button.click();
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      const exportedPlan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
      const member = (exportedPlan.cast || []).find((item) => item.source === "admira.studio Stock" && item.mediaType === "animation");
      localStorage.setItem("ainimation-film-plan", JSON.stringify({
        ...exportedPlan,
        cast: (exportedPlan.cast || []).filter((item) => item !== member && item.name !== "Export Audio Bed"),
      }));
      window.renderFilmPlan?.(JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}"));
      return {
        calls,
        formEntries,
        rafTicks,
        expectedFrames: window.totalTimelineFrames?.(plan) || null,
        recorderTracks,
        buttonText: button.textContent.trim(),
        buttonDisabled: button.disabled,
        castMember: member ? {
          name: member.name,
          mediaType: member.mediaType,
          src: member.src,
          stock: member.stock,
        } : null,
      };
    } finally {
      window.MediaRecorder = originalMediaRecorder;
      HTMLCanvasElement.prototype.captureStream = originalCaptureStream;
      HTMLMediaElement.prototype.captureStream = originalMediaCaptureStream;
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
      window.MediaStream = originalMediaStream;
      window.fetch = originalFetch;
    }
  });

  result.rulerToggle = await page.evaluate(() => {
    const stageWindow = document.querySelector(".stage-window");
    const toggle = document.querySelector("[data-stage-ruler-toggle]");
    toggle.click();
    const hiddenAfterFirstClick = stageWindow.classList.contains("rulers-hidden");
    const pressedAfterFirstClick = toggle.getAttribute("aria-pressed");
    toggle.click();
    return {
      hiddenAfterFirstClick,
      pressedAfterFirstClick,
      hiddenAfterSecondClick: stageWindow.classList.contains("rulers-hidden"),
    };
  });

  result.stockImport = await page.evaluate(async () => {
    const originalFetch = window.fetch;
    const calls = [];
    if (!window.__USE_LIVE_STOCK__) window.fetch = async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify({
        items: [{
          title: "Latest Stock Take",
          assetUrl: "https://www.admira.studio/media/latest-stock-take.png",
          mimeType: "image/png",
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    if (window.__USE_LIVE_STOCK__) {
      window.fetch = async (...args) => {
        calls.push(String(args[0]));
        return originalFetch(...args);
      };
    }

    try {
      document.querySelector("[data-stock-import]")?.click();
      await new Promise((resolve) => window.setTimeout(resolve, window.__USE_LIVE_STOCK__ ? 3000 : 80));
      const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
      const member = [...(plan.cast || [])].reverse().find((item) => item.stock && item.sourceUrl !== "https://www.admira.studio/media/aidirector-export.webm");
      const card = member
        ? document.querySelector(`[data-cast-index="${(plan.cast || []).indexOf(member)}"]`)
        : null;
      const castWindowRect = document.querySelector('[data-window="cast"]')?.getBoundingClientRect();
      const cardRect = card?.getBoundingClientRect();
      const mediaRect = card?.querySelector("img, video, .cast-member-kind")?.getBoundingClientRect();
      if (card) {
        const castIndex = String((plan.cast || []).indexOf(member));
        const stage = document.querySelector(".stage-canvas");
        const stageRect = stage?.getBoundingClientRect();
        const stageTransfer = new DataTransfer();
        stageTransfer.setData("text/plain", `cast:${castIndex}`);
        stageTransfer.setData("application/x-ainimation-cast-index", castIndex);
        card.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: stageTransfer }));
        stage?.dispatchEvent(new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          clientX: stageRect.left + stageRect.width * 0.42,
          clientY: stageRect.top + stageRect.height * 0.38,
          dataTransfer: stageTransfer,
        }));
        stage?.dispatchEvent(new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          clientX: stageRect.left + stageRect.width * 0.42,
          clientY: stageRect.top + stageRect.height * 0.38,
          dataTransfer: stageTransfer,
        }));
        card.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: stageTransfer }));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      const timelineCard = member
        ? document.querySelector(`[data-cast-index="${(plan.cast || []).indexOf(member)}"]`)
        : null;
      if (timelineCard) {
        const castIndex = String((plan.cast || []).indexOf(member));
        const track = document.querySelector(".score-track");
        const trackRect = track?.getBoundingClientRect();
        const timelineTransfer = new DataTransfer();
        timelineTransfer.setData("text/plain", `cast:${castIndex}`);
        timelineTransfer.setData("application/x-ainimation-cast-index", castIndex);
        timelineCard.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: timelineTransfer }));
        track?.dispatchEvent(new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          clientX: trackRect.left + trackRect.width * 0.5,
          clientY: trackRect.top + trackRect.height / 2,
          dataTransfer: timelineTransfer,
        }));
        track?.dispatchEvent(new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          clientX: trackRect.left + trackRect.width * 0.5,
          clientY: trackRect.top + trackRect.height / 2,
          dataTransfer: timelineTransfer,
        }));
        timelineCard.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: timelineTransfer }));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
      const stagedPlan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
      const stagedMember = [...(stagedPlan.cast || [])].reverse().find((item) => item.stock && item.sourceUrl !== "https://www.admira.studio/media/aidirector-export.webm");
      return {
        calls,
        imported: Boolean(member),
        visibleInCast: Boolean(card),
        cardDraggable: card?.getAttribute("draggable") === "false",
        cardWithinCast: Boolean(castWindowRect && cardRect && cardRect.width <= 130 && cardRect.height <= 90 && cardRect.right <= castWindowRect.right + 1),
        mediaWithinCard: Boolean(cardRect && mediaRect && mediaRect.width <= cardRect.width && mediaRect.height <= cardRect.height),
        name: member?.name || "",
        role: member?.role || "",
        source: member?.source || "",
        mediaType: member?.mediaType || "",
        durationFrames: member?.durationFrames,
        onStageAfterCastClick: stagedMember?.onStage,
        startFrameAfterTimelineDrop: stagedMember?.startFrame,
        stageCount: document.querySelectorAll(".stage-imported-member").length,
        timelineVisible: Boolean(document.querySelector(".score-sprite[data-cast-index]")),
      };
    } finally {
      window.fetch = originalFetch;
    }
  });

  const castCard = await page.$(".director-cast-window .cast-member[data-cast-index]");
  const castCardBox = await castCard?.boundingBox();
  const stageCanvas = await page.$(".stage-canvas");
  const stageCanvasBox = await stageCanvas?.boundingBox();
  if (castCardBox && stageCanvasBox) {
    await page.mouse.move(castCardBox.x + castCardBox.width / 2, castCardBox.y + castCardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(stageCanvasBox.x + stageCanvasBox.width * 0.56, stageCanvasBox.y + stageCanvasBox.height * 0.44, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(160);
  }
  const castCardForTimeline = await page.$(".director-cast-window .cast-member[data-cast-index]");
  const castCardBoxForTimeline = await castCardForTimeline?.boundingBox();
  const timelineTrack = await page.$(".score-track");
  const timelineTrackBox = await timelineTrack?.boundingBox();
  if (castCardBoxForTimeline && timelineTrackBox) {
    await page.mouse.move(castCardBoxForTimeline.x + castCardBoxForTimeline.width / 2, castCardBoxForTimeline.y + castCardBoxForTimeline.height / 2);
    await page.mouse.down();
    await page.mouse.move(timelineTrackBox.x + timelineTrackBox.width * 0.68, timelineTrackBox.y + timelineTrackBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(160);
  }
  result.pointerCastDrop = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const member = [...(plan.cast || [])].reverse().find((item) => item.stock && item.sourceUrl !== "https://www.admira.studio/media/aidirector-export.webm");
    return {
      onStage: Boolean(member?.onStage),
      startFrame: Number(member?.startFrame || 0),
      stageX: Number(member?.stageX || 0),
      stageY: Number(member?.stageY || 0),
      playheadFrame: Number(document.querySelector(".score-playhead")?.dataset.frame || 0),
      timelineVisible: Boolean(document.querySelector(".score-sprite[data-cast-index]")),
    };
  });

  const stageMember = await page.$(".stage-imported-member");
  const stageMemberBox = await stageMember?.boundingBox();
  if (stageMemberBox) {
    await page.mouse.move(stageMemberBox.x + stageMemberBox.width / 2, stageMemberBox.y + stageMemberBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(stageMemberBox.x + stageMemberBox.width / 2 + 90, stageMemberBox.y + stageMemberBox.height / 2 - 28);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  result.stageKeyframes = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const member = [...(plan.cast || [])].reverse().find((item) => item.stock && item.sourceUrl !== "https://www.admira.studio/media/aidirector-export.webm");
    const dots = [...document.querySelectorAll(".score-keyframe-dot")].map((dot) => ({
      frame: Number(dot.dataset.keyframeFrame || 0),
      castIndex: Number(dot.dataset.castIndex || -1),
      selected: dot.classList.contains("is-selected"),
    }));
    return {
      hasStageMember: Boolean(document.querySelector(".stage-imported-member")),
      keyframes: member?.keyframes || [],
      durationFrames: member?.durationFrames,
      dotFrames: dots.map((dot) => dot.frame),
      dotCount: dots.length,
      playheadFrame: Number(document.querySelector(".score-playhead")?.dataset.frame || 0),
    };
  });

  await page.evaluate(() => {
    const dots = document.querySelectorAll(".score-keyframe-dot");
    dots[dots.length - 1]?.click();
  });
  result.stageKeyframeClick = await page.evaluate(() => ({
    playheadFrame: Number(document.querySelector(".score-playhead")?.dataset.frame || 0),
    selectedFrame: Number(document.querySelector(".score-keyframe-dot.is-selected")?.dataset.keyframeFrame || 0),
  }));

  const selectedStageMember = await page.$(".stage-imported-member");
  const selectedStageMemberBox = await selectedStageMember?.boundingBox();
  if (selectedStageMemberBox) {
    await page.mouse.move(selectedStageMemberBox.x + selectedStageMemberBox.width / 2, selectedStageMemberBox.y + selectedStageMemberBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(selectedStageMemberBox.x + selectedStageMemberBox.width / 2 - 42, selectedStageMemberBox.y + selectedStageMemberBox.height / 2 + 34);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  result.stageKeyframeEdit = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const member = [...(plan.cast || [])].reverse().find((item) => item.stock && item.sourceUrl !== "https://www.admira.studio/media/aidirector-export.webm");
    return {
      keyframes: member?.keyframes || [],
      durationFrames: member?.durationFrames,
      dotCount: document.querySelectorAll(".score-keyframe-dot").length,
      selectedFrame: Number(document.querySelector(".score-keyframe-dot.is-selected")?.dataset.keyframeFrame || 0),
    };
  });

  await page.locator('[data-stage-tool="rect-fill"]').click();
  const stageBox = await page.locator(".stage-canvas").boundingBox();
  if (stageBox) {
    await page.mouse.move(stageBox.x + stageBox.width * 0.18, stageBox.y + stageBox.height * 0.18);
    await page.mouse.down();
    await page.mouse.move(stageBox.x + stageBox.width * 0.32, stageBox.y + stageBox.height * 0.32);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
  await page.locator('[data-stage-tool="hand"]').click();
  const shapeBox = await page.locator(".stage-shape-item").first().boundingBox();
  if (shapeBox) {
    await page.mouse.move(shapeBox.x + shapeBox.width / 2, shapeBox.y + shapeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(shapeBox.x + shapeBox.width / 2 + 90, shapeBox.y + shapeBox.height / 2 + 28);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => {
    const input = document.querySelector(".foreground-color-input");
    input.value = "#ff0000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(120);

  result.stageShapes = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const item = (plan.stageItems || []).find((stageItem) => stageItem.type === "rect-fill");
    return {
      available: true,
      created: Boolean(item),
      type: item?.type || "",
      durationFrames: item?.durationFrames,
      keyframes: item?.keyframes || [],
      dotCount: document.querySelectorAll(`.score-keyframe-dot[data-stage-item-id="${item?.id}"]`).length,
      selected: document.querySelector(".stage-shape-item")?.classList.contains("is-selected") || false,
      color: item?.color || "",
    };
  });

  await page.locator('[data-stage-tool="text"]').click();
  const textStageBox = await page.locator(".stage-canvas").boundingBox();
  if (textStageBox) {
    await page.mouse.click(textStageBox.x + textStageBox.width * 0.48, textStageBox.y + textStageBox.height * 0.42);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => {
    const input = document.querySelector(".foreground-color-input");
    input.value = "#00ff00";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(120);
  await page.locator('[data-text-align="center"]').click();
  await page.waitForTimeout(120);
  await page.locator('[data-stage-tool="hand"]').click();
  const textItem = await page.$(".stage-text-item");
  const textBox = await textItem?.boundingBox();
  if (textBox) {
    await page.mouse.move(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(textBox.x + textBox.width / 2 + 70, textBox.y + textBox.height / 2 + 36);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  result.stageText = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const item = (plan.stageItems || []).find((stageItem) => stageItem.type === "text");
    return {
      created: Boolean(item),
      durationFrames: item?.durationFrames,
      keyframes: item?.keyframes || [],
      dotCount: document.querySelectorAll(`.score-keyframe-dot[data-stage-item-id="${item?.id}"]`).length,
      color: item?.color || "",
      textAlign: item?.textAlign || "",
      selected: document.querySelector(".stage-text-item")?.classList.contains("is-selected") || false,
    };
  });

  await page.evaluate(() => document.querySelector('[data-score-bound="start"]')?.click());
  await page.waitForTimeout(80);
  await page.evaluate(() => document.querySelector('[data-score-step="next"]')?.click());
  await page.waitForTimeout(80);
  const nextKeyframeFrame = await page.evaluate(() => Number(document.querySelector(".score-playhead")?.dataset.frame || 0));
  await page.evaluate(() => document.querySelector('[data-score-step="prev"]')?.click());
  await page.waitForTimeout(80);
  const previousKeyframeFrame = await page.evaluate(() => Number(document.querySelector(".score-playhead")?.dataset.frame || 0));
  result.keyframeNavigation = {
    previousKeyframeFrame,
    nextKeyframeFrame,
    prevLabel: await page.locator('[data-score-step="prev"]').getAttribute("aria-label"),
    nextLabel: await page.locator('[data-score-step="next"]').getAttribute("aria-label"),
  };
  await page.evaluate(() => document.querySelector('[data-score-bound="start"]')?.click());
  await page.waitForTimeout(80);
  const startBoundFrame = await page.evaluate(() => Number(document.querySelector(".score-playhead")?.dataset.frame || 0));
  await page.evaluate(() => document.querySelector('[data-score-bound="end"]')?.click());
  await page.waitForTimeout(80);
  result.timelineBounds = {
    startFrame: startBoundFrame,
    endFrame: await page.evaluate(() => Number(document.querySelector(".score-playhead")?.dataset.frame || 0)),
    totalFrames: await page.evaluate(() => Number(document.querySelector(".score-playhead")?.getAttribute("aria-valuemax") || 0)),
    startLabel: await page.locator('[data-score-bound="start"]').getAttribute("aria-label"),
    endLabel: await page.locator('[data-score-bound="end"]').getAttribute("aria-label"),
  };
  result.timelineZoom = await page.evaluate(() => {
    const readout = document.querySelector("[data-score-zoom]");
    const sprite = document.querySelector(".score-sprite[data-cast-index]");
    const widthBefore = sprite ? parseFloat(sprite.style.width) : 0;
    document.querySelector('[data-score-zoom-step="up"]')?.click();
    document.querySelector('[data-score-zoom-step="up"]')?.click();
    const nextReadout = document.querySelector("[data-score-zoom]");
    const nextSprite = document.querySelector(".score-sprite[data-cast-index]");
    const playhead = document.querySelector(".score-playhead");
    return {
      initial: readout?.dataset.value || "",
      afterUp: nextReadout?.dataset.value || "",
      displayFrames: Number(playhead?.dataset.displayFrames || 0),
      totalFrames: Number(playhead?.getAttribute("aria-valuemax") || 0),
      widthBefore,
      widthAfter: nextSprite ? parseFloat(nextSprite.style.width) : 0,
    };
  });
  result.videoDurationFrames = await page.evaluate(async () => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const src = "mock-video-duration.webm";
    const castIndex = (plan.cast || []).length;
    plan.cast = [
      ...(plan.cast || []),
      {
        name: "Duration Probe Video",
        role: "Video",
        imported: true,
        mediaType: "video",
        src,
        startFrame: 1,
        durationFrames: 24,
        durationPending: true,
      },
    ];
    localStorage.setItem("ainimation-film-plan", JSON.stringify(plan));
    const createElement = document.createElement.bind(document);
    document.createElement = (tagName) => {
      if (String(tagName).toLowerCase() !== "video") return createElement(tagName);
      return {
        duration: 3.2,
        load() {},
        removeAttribute() {},
        addEventListener(type, callback) {
          if (type === "loadedmetadata") setTimeout(callback, 0);
        },
        set src(value) {
          this.currentSrc = value;
        },
      };
    };
    window.updateMemberDurationFromMetadata?.(castIndex, src, "video");
    await new Promise((resolve) => setTimeout(resolve, 80));
    document.createElement = createElement;
    const nextPlan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    return nextPlan.cast?.[castIndex]?.durationFrames || 0;
  });

  await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    plan.cast = [
      ...(plan.cast || []),
      {
        name: "Imported Audio",
        role: "Audio",
        imported: true,
        mediaType: "audio",
        src: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
        startFrame: 1,
        durationFrames: 24,
        keyframes: [{ frame: 1, x: 16, y: 54, w: 12, h: 10 }],
      },
    ];
    localStorage.setItem("ainimation-film-plan", JSON.stringify(plan));
    window.renderFilmPlan?.(plan);
  });
  await page.waitForTimeout(120);
  await page.evaluate(() => [...document.querySelectorAll("[data-audio-mute]")].at(-1)?.click());
  await page.waitForTimeout(120);
  await page.evaluate(() => [...document.querySelectorAll("[data-audio-mute]")].at(-1)?.click());
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const castIndex = [...document.querySelectorAll("[data-audio-mute]")].at(-1)?.dataset.castIndex;
    const label = document.querySelector(`.score-row-label span[data-cast-index="${castIndex}"]`);
    if (!label) return;
    label.textContent = "Narration Stem";
    label.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  });
  await page.waitForTimeout(120);
  result.audioTimeline = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const member = (plan.cast || []).find((item) => item.mediaType === "audio" && item.name === "Narration Stem");
    const muteButton = document.querySelector("[data-audio-mute]");
    return {
      hasMuteButton: Boolean(muteButton),
      mutePressed: muteButton?.getAttribute("aria-pressed") || "",
      savedName: member?.name || "",
      muted: Boolean(member?.muted),
      labelEditable: Boolean(document.querySelector(".score-row-label span[contenteditable='true']")),
    };
  });

  await browser.close();

  const expectedXLabels = Math.floor(result.rulerReference.stageWidth / 100) + 1 + (result.rulerReference.stageWidth % 100 ? 1 : 0);
  const expectedYLabels = Math.floor(result.rulerReference.stageHeight / 100) + 1 + (result.rulerReference.stageHeight % 100 ? 1 : 0);
  const missingLabels = result.labels.length !== expectedYLabels || result.xLabels.length !== expectedXLabels;
  const hasWrongRotation = result.labels.some((label) => label.transform === "matrix(0, 1, -1, 0, 0, 0)");

  if (!result.stylesheetHref.includes("aidirector-20260520-r21")) {
    throw new Error(`Expected aidirector-20260520-r21 stylesheet cache key, got ${result.stylesheetHref}`);
  }

  if (
    missingLabels ||
    hasWrongRotation ||
    result.labels[1]?.text !== "100" ||
    result.xLabels[1] !== "100" ||
    Number(result.rulerReference.xLast) !== result.rulerReference.stageWidth ||
    Number(result.rulerReference.yLast) !== result.rulerReference.stageHeight
  ) {
    throw new Error(`Unexpected stage ruler labels: ${JSON.stringify({ y: result.labels, x: result.xLabels, reference: result.rulerReference })}`);
  }

  if (result.exportHasGuides) {
    throw new Error("Stage video export should not draw ruler/grid guides");
  }

  if (
    !result.rulerToggle.hiddenAfterFirstClick ||
    result.rulerToggle.pressedAfterFirstClick !== "false" ||
    result.rulerToggle.hiddenAfterSecondClick
  ) {
    throw new Error(`Unexpected stage ruler toggle: ${JSON.stringify(result.rulerToggle)}`);
  }

  if (result.brand.text !== "AiDirector v.2026.05.20 r21" || result.brand.rightGap > 20) {
    throw new Error(`Unexpected menu brand placement: ${JSON.stringify(result.brand)}`);
  }

  if (
    !result.stageShapes.available ||
    !result.stageShapes.created ||
    result.stageShapes.type !== "rect-fill" ||
    result.stageShapes.durationFrames !== 72 ||
    result.stageShapes.keyframes.length !== 3 ||
    result.stageShapes.keyframes[1]?.frame !== result.stageShapes.keyframes[0]?.frame + 24 ||
    result.stageShapes.keyframes[2]?.frame !== result.stageShapes.keyframes[1]?.frame + 24 ||
    result.stageShapes.keyframes[2]?.color !== "#ff0000" ||
    result.stageShapes.dotCount !== 3 ||
    !result.stageShapes.selected ||
    result.stageShapes.color !== "#ff0000"
  ) {
    throw new Error(`Unexpected Stage shape editing: ${JSON.stringify(result.stageShapes)}`);
  }

  if (
    !result.stageText.created ||
    result.stageText.durationFrames < 72 ||
    result.stageText.keyframes.length < 3 ||
    result.stageText.keyframes[1]?.frame !== result.stageText.keyframes[0]?.frame + 24 ||
    result.stageText.keyframes[2]?.frame !== result.stageText.keyframes[1]?.frame + 24 ||
    result.stageText.keyframes[1]?.color !== "#00ff00" ||
    result.stageText.keyframes[2]?.textAlign !== "center" ||
    result.stageText.dotCount < 3 ||
    !result.stageText.selected ||
    result.stageText.color !== "#00ff00" ||
    result.stageText.textAlign !== "center"
  ) {
    throw new Error(`Unexpected Stage text keyframes: ${JSON.stringify(result.stageText)}`);
  }

  if (
    result.keyframeNavigation.nextKeyframeFrame !== result.stageKeyframes.keyframes[0]?.frame ||
    result.keyframeNavigation.previousKeyframeFrame > result.keyframeNavigation.nextKeyframeFrame ||
    result.keyframeNavigation.prevLabel !== "Previous keyframe" ||
    result.keyframeNavigation.nextLabel !== "Next keyframe"
  ) {
    throw new Error(`Unexpected keyframe navigation: ${JSON.stringify(result.keyframeNavigation)}`);
  }

  if (
    result.timelineBounds.startFrame !== 1 ||
    result.timelineBounds.endFrame !== result.timelineBounds.totalFrames ||
    result.timelineBounds.startLabel !== "Go to start" ||
    result.timelineBounds.endLabel !== "Go to end"
  ) {
    throw new Error(`Unexpected timeline bounds controls: ${JSON.stringify(result.timelineBounds)}`);
  }
  if (
    result.timelineZoom.initial !== "100" ||
    result.timelineZoom.afterUp !== "200" ||
    result.timelineZoom.displayFrames !== result.timelineZoom.totalFrames * 2 ||
    !(result.timelineZoom.widthAfter > 0 && result.timelineZoom.widthAfter < result.timelineZoom.widthBefore)
  ) {
    throw new Error(`Unexpected timeline zoom behavior: ${JSON.stringify(result.timelineZoom)}`);
  }
  if (result.videoDurationFrames !== 77) {
    throw new Error(`Video duration should map to timeline frames: ${result.videoDurationFrames}`);
  }

  if (
    !result.pointerCastDrop.onStage ||
    !result.pointerCastDrop.timelineVisible ||
    result.pointerCastDrop.playheadFrame <= 1
  ) {
    throw new Error(`Unexpected pointer Cast drop: ${JSON.stringify(result.pointerCastDrop)}`);
  }

  if (
    !result.audioTimeline.hasMuteButton ||
    result.audioTimeline.mutePressed !== "false" ||
    result.audioTimeline.savedName !== "Narration Stem" ||
    result.audioTimeline.muted ||
    !result.audioTimeline.labelEditable
  ) {
    throw new Error(`Unexpected audio timeline controls: ${JSON.stringify(result.audioTimeline)}`);
  }

  const expectedToolShortcuts = [
    ["Studio", "https://www.admira.studio/"],
    ["Publicity", "https://www.admira.app/"],
    ["Digital Twin", "https://www.xpaceos.com/"],
  ];
  if (
    result.toolShortcuts.length !== expectedToolShortcuts.length ||
    expectedToolShortcuts.some(([text, href], index) => (
      result.toolShortcuts[index]?.text !== text ||
      result.toolShortcuts[index]?.href !== href ||
      result.toolShortcuts[index]?.target !== "_blank" ||
      !result.toolShortcuts[index]?.rel.includes("noopener")
    ))
  ) {
    throw new Error(`Unexpected Tools shortcuts: ${JSON.stringify(result.toolShortcuts)}`);
  }

  if (
    result.fileMenu.text !== "Archivo" ||
    !["Nuevo", "Abrir", "Importar", "Exportar", "Descargar"].every((item) => result.fileMenu.items.includes(item)) ||
    result.fileMenu.items.includes("Importar archivo") ||
    !result.fileMenu.hasProjectOpen ||
    !result.fileMenu.hasStockImport ||
    !result.fileMenu.hasStockExport ||
    !result.fileMenu.hasStageDownload
  ) {
    throw new Error(`Unexpected Archivo menu: ${JSON.stringify(result.fileMenu)}`);
  }

  if (
    result.stockExport.calls[0]?.url !== "https://pixer-eleven.csilvasantin.workers.dev/stock/publish" ||
    result.stockExport.calls[0]?.method !== "POST" ||
    !result.stockExport.formEntries.some(([key, value]) => key === "type" && value === "video") ||
    !result.stockExport.formEntries.some(([key, value]) => key === "motor" && value === "ainimation") ||
    !result.stockExport.formEntries.some(([key, value]) => key === "mime" && value === "video/webm") ||
    !result.stockExport.formEntries.some(([key, value]) => key === "base64" && value.length > 0) ||
    result.stockExport.expectedFrames !== 121 ||
    result.stockExport.rafTicks < 2 ||
    result.stockExport.rafTicks >= 240 ||
    result.stockExport.recorderTracks.video !== 1 ||
    result.stockExport.recorderTracks.audio < 1 ||
    result.stockExport.castMember?.mediaType !== "animation" ||
    result.stockExport.castMember?.src !== "https://www.admira.studio/media/aidirector-export.webm" ||
    result.stockExport.castMember?.stock !== true ||
    result.stockExport.buttonDisabled
  ) {
    throw new Error(`Unexpected Stock export flow: ${JSON.stringify(result.stockExport)}`);
  }

  const expectedEditItems = [
    ["Deshacer", "Ctrl+Z", false, "undo"],
    ["Rehacer", "Ctrl+Y", false, "redo"],
    ["Cortar", "Ctrl+X", true, "cut"],
    ["Copiar", "Ctrl+C", true, "copy"],
    ["Pegar", "Ctrl+V", false, "paste"],
    ["Pegar sin formato", "Ctrl+Mayús+V", false, "pasteText"],
    ["Seleccionar todo", "Ctrl+A", false, "selectAll"],
    ["Eliminar", "", true, "delete"],
    ["Duplicar", "Ctrl+D", true, "duplicate"],
    ["Buscar y reemplazar", "Ctrl+H", false, "find"],
  ];
  if (
    result.editMenu.text !== "Editar" ||
    result.editMenu.separators !== 3 ||
    result.editMenu.items.length !== expectedEditItems.length ||
    expectedEditItems.some(([text, shortcut, disabled, command], index) => (
      result.editMenu.items[index]?.text !== text ||
      result.editMenu.items[index]?.shortcut !== shortcut ||
      result.editMenu.items[index]?.disabled !== disabled ||
      result.editMenu.items[index]?.command !== command
    ))
  ) {
    throw new Error(`Unexpected Editar menu: ${JSON.stringify(result.editMenu)}`);
  }

  if (
    !result.stockImport.calls[0]?.includes("pixer-eleven.csilvasantin.workers.dev/stock/list") ||
    !result.stockImport.imported ||
    !result.stockImport.visibleInCast ||
    !result.stockImport.cardDraggable ||
    !result.stockImport.cardWithinCast ||
    !result.stockImport.mediaWithinCard ||
    result.stockImport.role !== "Stock" ||
    result.stockImport.source !== "admira.studio Stock" ||
    result.stockImport.mediaType !== "image" ||
    result.stockImport.durationFrames !== 24 ||
    result.stockImport.onStageAfterCastClick !== true ||
    result.stockImport.stageCount < 1 ||
    result.stockImport.startFrameAfterTimelineDrop <= 1 ||
    !result.stockImport.timelineVisible
  ) {
    throw new Error(`Unexpected Stock import flow: ${JSON.stringify(result.stockImport)}`);
  }

  if (
    !result.stageKeyframes.hasStageMember ||
    result.stageKeyframes.durationFrames !== 48 ||
    result.stageKeyframes.keyframes.length !== 2 ||
    result.stageKeyframes.keyframes[1]?.frame <= result.stageKeyframes.keyframes[0]?.frame ||
    result.stageKeyframes.dotCount !== 2 ||
    !result.stageKeyframes.dotFrames.includes(result.stageKeyframes.keyframes[1]?.frame) ||
    result.stageKeyframes.playheadFrame !== result.stageKeyframes.keyframes[1]?.frame ||
    result.stageKeyframeClick.playheadFrame !== result.stageKeyframes.keyframes[1]?.frame ||
    result.stageKeyframeClick.selectedFrame !== result.stageKeyframes.keyframes[1]?.frame ||
    result.stageKeyframeEdit.durationFrames !== 48 ||
    result.stageKeyframeEdit.keyframes.length !== 2 ||
    result.stageKeyframeEdit.keyframes[1]?.frame !== result.stageKeyframes.keyframes[1]?.frame ||
    result.stageKeyframeEdit.dotCount !== 2 ||
    result.stageKeyframeEdit.selectedFrame !== result.stageKeyframes.keyframes[1]?.frame
  ) {
    throw new Error(`Unexpected Stage keyframe timeline dots: ${JSON.stringify({ drag: result.stageKeyframes, click: result.stageKeyframeClick, edit: result.stageKeyframeEdit })}`);
  }

  if (
    !result.initialWindows.collabHidden ||
    !result.initialWindows.collabOpensOnClick ||
    !result.initialWindows.promptHidden ||
    !result.initialWindows.scriptHidden
  ) {
    throw new Error(`Unexpected initial window state: ${JSON.stringify(result.initialWindows)}`);
  }

  if (
    result.initialWindows.stageBottomGapToTimeline === null ||
    result.initialWindows.stageBottomGapToTimeline < 0 ||
    result.initialWindows.stageBottomGapToTimeline > 20
  ) {
    throw new Error(`Stage should fill the workspace down to the timeline: ${JSON.stringify(result.initialWindows)}`);
  }

  if (
    !result.stageVideoExport.downloadedFile.endsWith("-stage.webm") ||
    result.stageVideoExport.downloadedFiles.length !== 2 ||
    result.stageVideoExport.buttonText !== "Descargar" ||
    result.stageVideoExport.buttonDisabled ||
    result.stageVideoExport.recorderCount !== 1 ||
    result.stageVideoExport.recorderTracks.video !== 1
  ) {
    throw new Error(`Unexpected stage video export: ${JSON.stringify(result.stageVideoExport)}`);
  }

  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
