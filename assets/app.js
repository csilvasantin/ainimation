const canvas = document.querySelector("#hero-canvas");
const context = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let pixelRatio = 1;
let frame = 0;

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function roundedRect(x, y, w, h, radius) {
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

resizeCanvas();
draw();

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
