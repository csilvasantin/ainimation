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
  await page.waitForTimeout(1200);
  await page.waitForFunction(() => {
    const rect = document.querySelector(".stage-canvas")?.getBoundingClientRect();
    return rect && rect.width > 400 && rect.height > 300;
  }, { timeout: 10000 });
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
        hasStageDownload: Boolean(document.querySelector("[data-download-stage-video]")),
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
    const originalSetInterval = window.setInterval;
    const originalClearInterval = window.clearInterval;
    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;
    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    let downloadedFile = "";

    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported() {
        return true;
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
      HTMLCanvasElement.prototype.captureStream = () => ({});
      window.setInterval = (callback) => {
        for (let index = 0; index < 260; index += 1) callback();
        return 1;
      };
      window.clearInterval = () => {};
      URL.createObjectURL = () => "blob:stage-test";
      URL.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = function click() {
        downloadedFile = this.download;
      };
      button.click();
      await Promise.resolve();
      return {
        downloadedFile,
        buttonText: button.textContent.trim(),
        buttonDisabled: button.disabled,
      };
    } finally {
      window.MediaRecorder = originalMediaRecorder;
      HTMLCanvasElement.prototype.captureStream = originalCaptureStream;
      window.setInterval = originalSetInterval;
      window.clearInterval = originalClearInterval;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
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
      const member = (plan.cast || []).find((item) => item.stock);
      const card = member
        ? document.querySelector(`[data-cast-index="${(plan.cast || []).indexOf(member)}"]`)
        : null;
      card?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 40));
      const stagedPlan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
      const stagedMember = (stagedPlan.cast || []).find((item) => item.stock);
      return {
        calls,
        imported: Boolean(member),
        visibleInCast: Boolean(card),
        name: member?.name || "",
        role: member?.role || "",
        source: member?.source || "",
        mediaType: member?.mediaType || "",
        durationFrames: member?.durationFrames,
        onStageAfterCastClick: stagedMember?.onStage,
        timelineVisible: Boolean(document.querySelector(".score-sprite[data-cast-index]")),
      };
    } finally {
      window.fetch = originalFetch;
    }
  });

  const stageMemberBox = await page.locator(".stage-imported-member").first().boundingBox();
  if (stageMemberBox) {
    await page.mouse.move(stageMemberBox.x + stageMemberBox.width / 2, stageMemberBox.y + stageMemberBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(stageMemberBox.x + stageMemberBox.width / 2 + 90, stageMemberBox.y + stageMemberBox.height / 2 - 28);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  result.stageKeyframes = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const member = (plan.cast || []).find((item) => item.stock);
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

  const selectedStageMemberBox = await page.locator(".stage-imported-member").first().boundingBox();
  if (selectedStageMemberBox) {
    await page.mouse.move(selectedStageMemberBox.x + selectedStageMemberBox.width / 2, selectedStageMemberBox.y + selectedStageMemberBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(selectedStageMemberBox.x + selectedStageMemberBox.width / 2 - 42, selectedStageMemberBox.y + selectedStageMemberBox.height / 2 + 34);
    await page.mouse.up();
    await page.waitForTimeout(120);
  }

  result.stageKeyframeEdit = await page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem("ainimation-film-plan") || "{}");
    const member = (plan.cast || []).find((item) => item.stock);
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

  await browser.close();

  const expectedXLabels = Math.floor(result.rulerReference.stageWidth / 100) + 1 + (result.rulerReference.stageWidth % 100 ? 1 : 0);
  const expectedYLabels = Math.floor(result.rulerReference.stageHeight / 100) + 1 + (result.rulerReference.stageHeight % 100 ? 1 : 0);
  const missingLabels = result.labels.length !== expectedYLabels || result.xLabels.length !== expectedXLabels;
  const hasWrongRotation = result.labels.some((label) => label.transform === "matrix(0, 1, -1, 0, 0, 0)");

  if (!result.stylesheetHref.includes("aidirector-20260520-r11")) {
    throw new Error(`Expected aidirector-20260520-r11 stylesheet cache key, got ${result.stylesheetHref}`);
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

  if (result.brand.text !== "AiDirector v.2026.05.20 r11" || result.brand.rightGap > 20) {
    throw new Error(`Unexpected menu brand placement: ${JSON.stringify(result.brand)}`);
  }

  if (
    !result.stageShapes.available ||
    !result.stageShapes.created ||
    result.stageShapes.type !== "rect-fill" ||
    result.stageShapes.durationFrames !== 72 ||
    result.stageShapes.keyframes.length !== 3 ||
    result.stageShapes.keyframes[0]?.frame !== 25 ||
    result.stageShapes.keyframes[1]?.frame !== 49 ||
    result.stageShapes.keyframes[2]?.frame !== 73 ||
    result.stageShapes.keyframes[2]?.color !== "#ff0000" ||
    result.stageShapes.dotCount !== 3 ||
    !result.stageShapes.selected ||
    result.stageShapes.color !== "#ff0000"
  ) {
    throw new Error(`Unexpected Stage shape editing: ${JSON.stringify(result.stageShapes)}`);
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
    !["Nuevo", "Abrir", "Importar", "Importar archivo", "Descargar"].every((item) => result.fileMenu.items.includes(item)) ||
    !result.fileMenu.hasProjectOpen ||
    !result.fileMenu.hasStockImport ||
    !result.fileMenu.hasStageDownload
  ) {
    throw new Error(`Unexpected Archivo menu: ${JSON.stringify(result.fileMenu)}`);
  }

  if (
    !result.stockImport.calls[0]?.includes("pixer-eleven.csilvasantin.workers.dev/stock/list") ||
    !result.stockImport.imported ||
    !result.stockImport.visibleInCast ||
    result.stockImport.role !== "Stock" ||
    result.stockImport.source !== "admira.studio Stock" ||
    result.stockImport.mediaType !== "image" ||
    result.stockImport.durationFrames !== 24 ||
    result.stockImport.onStageAfterCastClick !== true ||
    !result.stockImport.timelineVisible
  ) {
    throw new Error(`Unexpected Stock import flow: ${JSON.stringify(result.stockImport)}`);
  }

  if (
    !result.stageKeyframes.hasStageMember ||
    result.stageKeyframes.durationFrames !== 48 ||
    result.stageKeyframes.keyframes.length !== 2 ||
    result.stageKeyframes.keyframes[0]?.frame !== 1 ||
    result.stageKeyframes.keyframes[1]?.frame !== 25 ||
    result.stageKeyframes.dotCount !== 2 ||
    !result.stageKeyframes.dotFrames.includes(25) ||
    result.stageKeyframes.playheadFrame !== 25 ||
    result.stageKeyframeClick.playheadFrame !== 25 ||
    result.stageKeyframeClick.selectedFrame !== 25 ||
    result.stageKeyframeEdit.durationFrames !== 48 ||
    result.stageKeyframeEdit.keyframes.length !== 2 ||
    result.stageKeyframeEdit.keyframes[1]?.frame !== 25 ||
    result.stageKeyframeEdit.dotCount !== 2 ||
    result.stageKeyframeEdit.selectedFrame !== 25
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
    result.stageVideoExport.buttonText !== "Descargar" ||
    result.stageVideoExport.buttonDisabled
  ) {
    throw new Error(`Unexpected stage video export: ${JSON.stringify(result.stageVideoExport)}`);
  }

  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
