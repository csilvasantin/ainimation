const { chromium } = require("playwright");

const targetUrl = process.env.STUDIO_URL || "http://127.0.0.1:8097/studio.html";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

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
        hasStageDownload: Boolean(document.querySelector("[data-download-stage-video]")),
      },
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

  await browser.close();

  const expectedXLabels = Math.floor(result.rulerReference.stageWidth / 100) + 1 + (result.rulerReference.stageWidth % 100 ? 1 : 0);
  const expectedYLabels = Math.floor(result.rulerReference.stageHeight / 100) + 1 + (result.rulerReference.stageHeight % 100 ? 1 : 0);
  const missingLabels = result.labels.length !== expectedYLabels || result.xLabels.length !== expectedXLabels;
  const hasWrongRotation = result.labels.some((label) => label.transform === "matrix(0, 1, -1, 0, 0, 0)");

  if (!result.stylesheetHref.includes("aidirector-20260520-r6")) {
    throw new Error(`Expected aidirector-20260520-r6 stylesheet cache key, got ${result.stylesheetHref}`);
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

  if (result.brand.text !== "AiDirector v.2026.05.20 r6" || result.brand.rightGap > 20) {
    throw new Error(`Unexpected menu brand placement: ${JSON.stringify(result.brand)}`);
  }

  if (
    result.fileMenu.text !== "Archivo" ||
    !["Nuevo", "Abrir", "Importar", "Descargar"].every((item) => result.fileMenu.items.includes(item)) ||
    !result.fileMenu.hasProjectOpen ||
    !result.fileMenu.hasStageDownload
  ) {
    throw new Error(`Unexpected Archivo menu: ${JSON.stringify(result.fileMenu)}`);
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
