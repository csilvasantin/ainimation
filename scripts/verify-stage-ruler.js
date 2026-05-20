const { chromium } = require("playwright");

const targetUrl = process.env.STUDIO_URL || "http://127.0.0.1:8097/studio.html";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => {
    const stylesheetHref = document.querySelector('link[rel="stylesheet"]')?.href || "";
    const brand = document.querySelector(".director-brand-link");
    const menu = document.querySelector(".director-menubar");
    const stageWindow = document.querySelector('[data-window="stage"]');
    const timelineWindow = document.querySelector('[data-window="score"]');
    const collabBar = document.querySelector(".studio-collab-bar");
    const promptWindow = document.querySelector('[data-window="prompt"]');
    const scriptWindow = document.querySelector('[data-window="script"]');
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

  await page.locator('[data-stage-tool="text"]').click();
  await page.locator(".stage-canvas").click({ position: { x: 240, y: 180 } });
  await page.locator('[data-text-style="italic"]').click();
  await page.locator('[data-text-align="center"]').click();
  await page.evaluate(() => {
    const input = document.querySelector(".foreground-color-input");
    input.value = "#ff0000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  result.stageText = await page.evaluate(() => {
    const item = document.querySelector(".stage-text-item");
    const content = item?.querySelector(".stage-text-content");
    const removeButton = item?.querySelector(".stage-text-remove");
    const contentStyle = content ? getComputedStyle(content) : null;
    const itemStyle = item ? getComputedStyle(item) : null;

    return {
      itemCountAfterCreate: document.querySelectorAll(".stage-text-item").length,
      text: content?.textContent.trim() || "",
      color: itemStyle?.color || "",
      fontStyle: contentStyle?.fontStyle || "",
      fontWeight: contentStyle?.fontWeight || "",
      textAlign: contentStyle?.textAlign || "",
      removeLabel: removeButton?.getAttribute("aria-label") || "",
      timelineSprite: (() => {
        const sprite = document.querySelector(".score-sprite[data-stage-item-id]");
        return {
          exists: Boolean(sprite),
          startFrame: sprite?.dataset.startFrame || "",
          durationFrames: sprite?.dataset.durationFrames || "",
          range: sprite?.querySelector("small")?.textContent.trim() || "",
        };
      })(),
    };
  });

  await page.locator(".stage-text-remove").click();

  result.stageText.itemCountAfterRemove = await page.locator(".stage-text-item").count();

  await browser.close();

  const missingLabels = result.labels.length !== 12 || result.xLabels.length !== 21;
  const hasWrongRotation = result.labels.some((label) => label.transform === "matrix(0, 1, -1, 0, 0, 0)");

  if (!result.stylesheetHref.includes("aidirector-20260520-r4")) {
    throw new Error(`Expected aidirector-20260520-r4 stylesheet cache key, got ${result.stylesheetHref}`);
  }

  if (missingLabels || hasWrongRotation || result.labels[1]?.text !== "100" || result.xLabels[1] !== "100") {
    throw new Error(`Unexpected stage ruler labels: ${JSON.stringify({ y: result.labels, x: result.xLabels })}`);
  }

  if (result.brand.text !== "AiDirector v.2026.05.20 r4" || result.brand.rightGap > 20) {
    throw new Error(`Unexpected menu brand placement: ${JSON.stringify(result.brand)}`);
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
    result.stageText.itemCountAfterCreate !== 1 ||
    result.stageText.text !== "Text" ||
    result.stageText.color !== "rgb(255, 0, 0)" ||
    result.stageText.fontStyle !== "italic" ||
    Number(result.stageText.fontWeight) < 700 ||
    result.stageText.textAlign !== "center" ||
    result.stageText.removeLabel !== "Remove stage text" ||
    !result.stageText.timelineSprite.exists ||
    result.stageText.timelineSprite.durationFrames !== "24" ||
    result.stageText.timelineSprite.range !== "1-24" ||
    result.stageText.itemCountAfterRemove !== 0
  ) {
    throw new Error(`Unexpected stage text controls: ${JSON.stringify(result.stageText)}`);
  }

  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
