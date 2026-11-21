import { createCake, drawCake, randomRainbowColor, recolorCandles } from "./cake.js?v=14";

(() => {
  "use strict";
  const canvas = document.getElementById("birthdayCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stage = document.querySelector(".stage");
  const replay = document.getElementById("replay");
  const audio = document.getElementById("birthdayAudio");
  const audioToggle = document.getElementById("audioToggle");
  const volume = document.getElementById("volume");
  const volumeValue = document.getElementById("volumeValue");
  const audioStatus = document.getElementById("audioStatus");
  const TAU = Math.PI * 2;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const birthdayName = "王海璇";
  const nameLettering = [
    { tilt: -.095, offset: .04 },
    { tilt: .055, offset: -.04 },
    { tilt: -.045, offset: .025 }
  ];
  const crystalColors = ["#80d6ff", "#a6d4ff", "#c0baff", "#d7c7ff", "#f6f7ff"];
  let w = 0, h = 0, last = 0, introStart = 0;
  let intro = true, reduced = false;
  let lowDetail = false, samples = 0, slowSamples = 0;
  let cake, layout, nameGlyphs, compactCake, background, englishRun;
  let pixelRatio, nameImage, englishImage;
  let digitColors;
  const floatingHearts = [];
  const heartSprites = new Map();
  let stars = [], dust = [], fireworks = [], meteors = [], numberStrokes = [], ringDots = [];
  let audioUnavailable = false;
  const blessings = ["岁岁欢愉", "平安喜乐", "喜乐长安", "常乐常安", "温柔常伴", "清欢自在", "笑靥如花", "明媚如初", "可爱如初", "熠熠生辉", "光芒万丈", "万事胜意", "岁月静好", "芳华自在", "眉眼如初", "星河长明", "得偿所愿", "人间值得", "一生被爱", "岁岁平安", "喜乐无忧", "顺遂无虞"];
  let activeBlessings = [], lastBlessing = "", nextBlessingAt = 0, nextMeteorAt = 0;
  const palette = ["#dff8ff", "#86e7ff", "#4ac7ff", "#7e8dff", "#b89bff", "#ffffff"];
  const fireworkPalette = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6", "#bf5af2"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function createLayout(width, height) {
    const numberY = height * .113;
    const numberSize = Math.min(width * .26, height * .17, 126);
    const englishSize = Math.min(width * .114, height * .069, 46);
    const nameSize = Math.min(width * .133, height * .088, 54);
    const nameY = Math.min(height * .9, height - 38 - nameSize * .5);
    const englishY = nameY - nameSize * .55 - clamp(height * .023, 7, 18);
    const cakeTop = numberY + numberSize * .52 + Math.max(16, height * .027);
    const cakeBottom = englishY - englishSize * .84 - Math.max(12, height * .019);
    // Reserve the projected candle tips and the tray's nearest edge throughout the orbit.
    const cakeSize = Math.max(1, Math.min(width * .82, 540, (cakeBottom - cakeTop) / 1.26));
    const cakeY = (cakeTop + cakeBottom) / 2 + cakeSize * .28;
    return { viewportWidth: width, centerX: width / 2, numberY, numberSize, englishY, englishSize, nameY, nameSize, cakeY, cakeSize };
  }
  function sampleLine(x1, y1, z1, x2, y2, z2, steps = 24) {
    return Array.from({ length: steps + 1 }, (_, i) => { const q = i / steps; return { x: x1 + (x2 - x1) * q, y: y1 + (y2 - y1) * q, z: z1 + (z2 - z1) * q }; });
  }
  function sampleCubic(a, b, c, d, steps = 32) {
    return Array.from({ length: steps + 1 }, (_, i) => { const q = i / steps, m = 1 - q; return { x: m ** 3 * a.x + 3 * m * m * q * b.x + 3 * m * q * q * c.x + q ** 3 * d.x, y: m ** 3 * a.y + 3 * m * m * q * b.y + 3 * m * q * q * c.y + q ** 3 * d.y, z: m ** 3 * a.z + 3 * m * m * q * b.z + 3 * m * q * q * c.z + q ** 3 * d.z }; });
  }
  function joinPoints(...segments) {
    const result = [];
    for (const segment of segments) result.push(...(result.length ? segment.slice(1) : segment));
    return result;
  }
  function resamplePath(points, spacing) {
    if (points.length < 2) return points;
    const distances = [0];
    for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y, points[i].z - points[i - 1].z));
    const total = distances[distances.length - 1], result = [];
    for (let d = 0; d <= total; d += spacing) {
      let i = 1; while (i < distances.length - 1 && distances[i] < d) i++;
      const span = distances[i] - distances[i - 1] || 1, q = (d - distances[i - 1]) / span;
      result.push({ x: points[i - 1].x + (points[i].x - points[i - 1].x) * q, y: points[i - 1].y + (points[i].y - points[i - 1].y) * q, z: points[i - 1].z + (points[i].z - points[i - 1].z) * q });
    }
    result.push(points[points.length - 1]);
    return result;
  }
  const latinGlyphs = {
    H: { advance: 78, entry: [12, 0], exit: [68, -37], strokes: [[['M', 12, 0], ['L', 12, -76]], [['M', 68, 0], ['L', 68, -76]], [['M', 13, -37], ['C', 28, -34, 52, -40, 68, -37]]] },
    B: { advance: 73, entry: [12, 0], exit: [13, 0], strokes: [[['M', 12, 0], ['L', 12, -76]], [['M', 13, -74], ['C', 70, -82, 69, -48, 15, -39]], [['M', 15, -39], ['C', 76, -47, 78, -4, 13, 0]]] },
    a: { advance: 62, entry: [47, -47], exit: [59, -4], strokes: [[['M', 47, -47], ['C', 20, -62, 4, -40, 13, -19], ['C', 22, 1, 51, -9, 55, -31], ['C', 59, -51, 36, -59, 20, -43], ['C', 7, -28, 22, -13, 43, -17], ['C', 54, -19, 59, -31, 59, -50], ['L', 59, -4]]] },
    p: { advance: 63, entry: [9, 22], exit: [10, -32], strokes: [[['M', 10, 24], ['L', 10, -50], ['C', 22, -54, 31, -54, 43, -50], ['C', 66, -42, 59, -15, 39, -15], ['C', 25, -14, 14, -23, 10, -32]]] },
    y: { advance: 62, entry: [7, -48], exit: [10, 22], strokes: [[['M', 7, -48], ['C', 15, -16, 28, -7, 40, -21], ['C', 48, -31, 53, -43, 56, -49]], [['M', 40, -22], ['C', 34, -1, 29, 14, 18, 27], ['C', 10, 36, 4, 31, 10, 22]]] },
    i: { advance: 37, entry: [18, 0], exit: [18, 0], strokes: [[['M', 18, 0], ['L', 18, -49]], [['M', 18, -72], ['C', 18, -73, 19, -73, 19, -72]]] },
    r: { advance: 48, entry: [9, 0], exit: [46, -48], strokes: [[['M', 9, 0], ['L', 9, -49], ['C', 19, -53, 27, -51, 31, -43], ['C', 36, -34, 39, -43, 46, -48]]] },
    t: { advance: 45, entry: [25, 0], exit: [42, -48], strokes: [[['M', 25, 0], ['C', 21, -20, 24, -49, 27, -73]], [['M', 10, -47], ['C', 18, -44, 31, -48, 42, -48]]] },
    h: { advance: 61, entry: [10, 0], exit: [54, 0], strokes: [[['M', 10, 0], ['L', 10, -77]], [['M', 11, -32], ['C', 24, -52, 42, -56, 51, -43], ['C', 57, -34, 54, -16, 54, 0]]] },
    d: { advance: 64, entry: [48, -47], exit: [58, -76], strokes: [[['M', 48, -47], ['C', 20, -63, 3, -40, 13, -19], ['C', 23, 1, 50, -9, 55, -31], ['C', 60, -51, 36, -59, 20, -43], ['C', 7, -28, 22, -13, 43, -17], ['C', 54, -19, 58, -31, 58, -50], ['L', 58, -76]]] },
    f: { advance: 46, entry: [8, 0], exit: [42, -47], strokes: [[['M', 8, 0], ['C', 15, -24, 17, -56, 24, -73], ['C', 32, -91, 49, -74, 35, -63], ['C', 23, -54, 19, -43, 20, -29], ['L', 22, -3]], [['M', 7, -43], ['C', 18, -40, 31, -43, 42, -47]]] },
    o: { advance: 61, entry: [45, -45], exit: [29, -13], strokes: [[['M', 45, -45], ['C', 24, -60, 7, -46, 9, -27], ['C', 11, -7, 35, -8, 49, -21], ['C', 65, -37, 51, -58, 32, -49], ['C', 15, -42, 13, -18, 29, -13]]] }
  };
  function vectorizeStroke(commands, originX, scale) {
    const points = []; let current = null;
    const map = point => ({ x: originX + point.x * scale, y: point.y * scale, z: 0 });
    for (const command of commands) {
      if (command[0] === "M") { current = { x: command[1], y: command[2], z: 0 }; points.push(map(current)); continue; }
      if (command[0] === "L" && current) {
        const target = { x: command[1], y: command[2], z: 0 }, steps = Math.max(4, Math.ceil(Math.hypot(target.x - current.x, target.y - current.y) / 3));
        points.push(...sampleLine(current.x, current.y, 0, target.x, target.y, 0, steps).slice(1).map(map)); current = target; continue;
      }
      if (command[0] === "C" && current) {
        const c1 = { x: command[1], y: command[2], z: 0 }, c2 = { x: command[3], y: command[4], z: 0 }, target = { x: command[5], y: command[6], z: 0 };
        points.push(...sampleCubic(current, c1, c2, target, 20).slice(1).map(map)); current = target;
      }
    }
    return resamplePath(points, reduced ? 3.2 : 2.35);
  }
  function createTimedStrokeRun(text, strokePoints, start, duration, y, color) {
    const strokes = strokePoints.filter(points => points.length > 1).map((points, index) => ({ points, color: index % 5 === 0 ? "#ffffff" : color, weight: Math.max(5, points.length) }));
    const totalWeight = strokes.reduce((sum, stroke) => sum + stroke.weight, 0);
    let cursor = 0;
    for (const stroke of strokes) { stroke.from = cursor / totalWeight; cursor += stroke.weight; stroke.to = cursor / totalWeight; }
    return { text, strokes, start, duration, y, phase: rand(0, TAU) };
  }
  function createLatinRun(text, size, y, start, duration) {
    const units = [...text].reduce((sum, char) => sum + (char === " " ? 38 : (latinGlyphs[char]?.advance || 56)), 0), scale = Math.min(size / 100, w * .86 / units);
    const originX = -units * scale / 2, strokePoints = []; let cursor = 0, previousExit = null;
    for (const char of text) {
      if (char === " ") { cursor += 38; previousExit = null; continue; }
      const glyph = latinGlyphs[char]; if (!glyph) { cursor += 52; previousExit = null; continue; }
      const entry = { x: originX + (cursor + glyph.entry[0]) * scale, y: glyph.entry[1] * scale, z: 0 };
      if (previousExit) {
        const dx = entry.x - previousExit.x;
        const connector = sampleCubic(previousExit, { x: previousExit.x + dx * .34, y: previousExit.y + scale * 3, z: 0 }, { x: entry.x - dx * .32, y: entry.y - scale * 3, z: 0 }, entry, 18);
        strokePoints.push(resamplePath(connector, reduced ? 3.2 : 2.35));
      }
      for (const commands of glyph.strokes) strokePoints.push(vectorizeStroke(commands, originX + cursor * scale, scale));
      previousExit = { x: originX + (cursor + glyph.exit[0]) * scale, y: glyph.exit[1] * scale, z: 0 };
      cursor += glyph.advance;
    }
    return createTimedStrokeRun(text, strokePoints, start, duration, y, "#b8efff");
  }
  function createNameGlyphs(font) {
    const bitmap = document.createElement("canvas");
    const extent = 112, center = extent / 2, em = 92;
    bitmap.width = bitmap.height = extent;
    const mask = bitmap.getContext("2d", { willReadFrequently: true });
    mask.font = `400 ${em}px ${font}`;
    mask.textAlign = "center";
    mask.textBaseline = "alphabetic";
    return [...birthdayName].map((character, index) => {
      mask.clearRect(0, 0, extent, extent);
      const bounds = mask.measureText(character);
      const baseline = (bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2;
      const { tilt, offset } = nameLettering[index];
      mask.save();
      mask.translate(center, center + em * offset);
      mask.rotate(tilt);
      mask.fillText(character, 0, baseline);
      mask.restore();
      const { data } = mask.getImageData(0, 0, extent, extent);
      const alpha = (x, y) => data[(y * extent + x) * 4 + 3];
      const particles = [];
      for (let y = 2; y < extent - 2; y += 2) {
        for (let x = 2; x < extent - 2; x += 2) {
          if (alpha(x, y) < 90) continue;
          const edge = Math.min(alpha(x - 2, y), alpha(x + 2, y), alpha(x, y - 2), alpha(x, y + 2)) < 90;
          const tone = edge && Math.random() < .30 ? 4 : clamp(Math.floor((x + y - 35) / 42), 0, 3);
          particles.push({
            x: (x - center + rand(-.66, .66)) / em, y: (y - center + rand(-.66, .66)) / em,
            tone, size: rand(.93, 1.99), phase: rand(0, TAU), offset: rand(0, .35)
          });
        }
      }
      return particles;
    });
  }

  function drawName(t, elapsed, float) {
    if (elapsed < 9.65) return;
    const { centerX, nameY, nameSize } = layout;
    if (elapsed >= 11.5) {
      const width = nameSize * 3.6, height = nameSize * 1.16;
      nameImage ??= paintLayer(width, height, target => {
        paintName(target, 0, 12, width / 2, height / 2);
      });
      ctx.drawImage(nameImage, centerX - width / 2, nameY + float - height / 2, width, height);
      return;
    }
    paintName(ctx, t, elapsed, centerX, nameY + float);
  }

  function paintName(target, t, elapsed, centerX, nameY) {
    const { nameSize } = layout;
    target.save();
    nameGlyphs.forEach((particles, index) => {
      const progress = (elapsed - 9.65 - index * .58) / .69;
      if (progress <= 0) return;
      const center = centerX + (index - 1) * nameSize * 1.12;
      for (let i = 0; i < particles.length; i += reduced ? 2 : 1) {
        const p = particles[i];
        const gather = ease((progress - p.offset) / (1 - p.offset));
        if (gather <= 0) continue;
        const scatter = (1 - gather) * nameSize * (motionPreference.matches ? .14 : .68);
        const angle = p.phase - (1 - gather) * 2;
        const x = center + p.x * nameSize + Math.cos(angle) * scatter;
        const y = nameY + p.y * nameSize + Math.sin(angle) * scatter;
        const shimmer = .5 + .5 * Math.sin(p.phase + t * 2.1);
        const size = p.size * Math.max(.65, nameSize / 49) * (p.tone === 4 ? 1 + shimmer * .24 : 1);
        target.globalAlpha = gather * (.67 + shimmer * .33);
        target.fillStyle = crystalColors[p.tone];
        target.fillRect(x - size / 2, y - size / 2, size, size);
      }
    });
    target.restore();
  }

  function paintLayer(width, height, paint) {
    const image = document.createElement("canvas");
    image.width = Math.max(1, Math.round(width * pixelRatio));
    image.height = Math.max(1, Math.round(height * pixelRatio));
    const target = image.getContext("2d");
    target.setTransform(image.width / width, 0, 0, image.height / height, 0, 0);
    paint(target);
    return image;
  }

  function resizeCanvas() {
    const budget = lowDetail ? 760000 : 1420000;
    pixelRatio = Math.min(window.devicePixelRatio || 1, lowDetail ? 1 : 1.38, Math.sqrt(budget / (w * h)));
    canvas.width = Math.max(1, Math.round(w * pixelRatio));
    canvas.height = Math.max(1, Math.round(h * pixelRatio));
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    nameImage = englishImage = null;
    buildBackground();
  }

  function resize() {
    w = Math.max(1, window.innerWidth); h = Math.max(1, window.innerHeight);
    layout = createLayout(w, h);
    reduced = w * h < 420000 || motionPreference.matches;
    if (!cake || compactCake !== reduced) {
      compactCake = reduced;
      cake = createCake(compactCake, cake?.candles);
    }
    buildScene();
    resizeCanvas();
  }
  function buildScene() {
    const n = reduced ? 90 : Math.min(240, Math.round(w * h / 6500));
    stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rand(.35, 1.7), a: rand(.2, .8) }));
    dust = Array.from({ length: reduced ? 30 : 80 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rand(.5, 1.8), vx: rand(-.08, .08), vy: rand(.06, .2), a: rand(.12, .55), c: palette[Math.floor(rand(0, palette.length))] }));
    const flourish = (points) => resamplePath(points, reduced ? 6 : 3.8);
    numberStrokes = [
      { points: flourish(joinPoints(sampleCubic({ x: -35, y: -13, z: 0 }, { x: -18, y: -39, z: 0 }, { x: 23, y: -42, z: 0 }, { x: 29, y: -18, z: 0 }, 42), sampleCubic({ x: 29, y: -18, z: 0 }, { x: 35, y: 2, z: 0 }, { x: 4, y: 17, z: 0 }, { x: -30, y: 43, z: 0 }, 42), sampleCubic({ x: -30, y: 43, z: 0 }, { x: -2, y: 40, z: 0 }, { x: 23, y: 43, z: 0 }, { x: 37, y: 38, z: 0 }, 26))), delay: 0, offsetX: -36 },
      { points: flourish(joinPoints(sampleCubic({ x: 5, y: -14, z: 1 }, { x: 13, y: -21, z: 1 }, { x: 20, y: -31, z: 1 }, { x: 24, y: -35, z: 1 }, 22), sampleCubic({ x: 24, y: -35, z: 1 }, { x: 21, y: -10, z: 1 }, { x: 21, y: 18, z: 1 }, { x: 21, y: 45, z: 1 }, 44), sampleCubic({ x: 21, y: 45, z: 1 }, { x: 20, y: 50, z: 1 }, { x: 32, y: 48, z: 1 }, { x: 39, y: 45, z: 1 }, 18))), delay: .43, offsetX: 38 }
    ];
    englishRun = createLatinRun("Happy Birthday for", layout.englishSize, layout.englishY, 7.7, 1.85);
    nextBlessingAt = 0; nextMeteorAt = 0; activeBlessings = []; lastBlessing = ""; meteors = [];
    const ringCount = reduced ? 10 : 18;
    ringDots = Array.from({ length: ringCount }, (_, i) => ({
      a: i / ringCount * TAU, r: layout.numberSize * rand(1.25, 1.38), speed: rand(.16, .35), p: rand(0, TAU)
    }));
  }
  function launchFirework(x = (Math.random() < .5 ? rand(w * .08, w * .27) : rand(w * .73, w * .92)), y = rand(h * .14, h * .45)) {
    const count = reduced ? 18 : 34, hue = fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)];
    fireworks.push({ x, y, age: 0, life: rand(1.2, 2.1), hue, particles: Array.from({ length: count }, (_, i) => ({ a: i / count * TAU + rand(-.04, .04), speed: rand(35, 125) })) });
  }
  function buildBackground() {
    background = paintLayer(w, h, target => {
      const gradient = target.createRadialGradient(w * .5, h * .49, 0, w * .5, h * .49, Math.min(w * .62, h * .87));
      gradient.addColorStop(0, "#0a1a39");
      gradient.addColorStop(.50, "#050d22");
      gradient.addColorStop(1, "#020410");
      target.fillStyle = gradient;
      target.fillRect(0, 0, w, h);
      target.fillStyle = "#d8f7ff";
      target.shadowBlur = 7;
      target.shadowColor = "#68dfff";
      for (const star of stars) {
        target.globalAlpha = star.a * .72;
        target.beginPath();
        target.arc(star.x, star.y, star.r, 0, TAU);
        target.fill();
      }
    });
  }

  function drawBackground(elapsed) {
    ctx.drawImage(background, 0, 0, w, h);
    const writingNumber = intro && elapsed >= 5.35 && elapsed <= 7.85;
    const { centerX: numberX, numberY } = layout;
    const exclusionX = Math.min(w * .36, 155), exclusionY = Math.min(h * .12, 100);
    for (const p of dust) { p.y += p.vy; p.x += p.vx; if (p.y > h + 4) p.y = -4; const overlapsNumber = writingNumber && Math.abs(p.x - numberX) < exclusionX && Math.abs(p.y - numberY) < exclusionY; if (overlapsNumber) continue; ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  function drawFireworks(dt) {
    if (!intro && Math.random() < dt * (reduced ? .45 : .85)) launchFirework();
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const firework = fireworks[i];
      firework.age += dt;
      const progress = firework.age / firework.life;
      if (progress >= 1) {
        fireworks.splice(i, 1);
        continue;
      }
      const expansion = ease(progress * 1.25);
      ctx.save();
      ctx.translate(firework.x, firework.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = firework.hue;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const particle of firework.particles) {
        const dx = Math.cos(particle.a), dy = Math.sin(particle.a);
        const distance = particle.speed * expansion;
        const x = dx * distance, y = dy * distance + 42 * progress * progress;
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx * 14, y - dy * 14);
      }
      ctx.globalAlpha = (1 - progress) * .18;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.globalAlpha = (1 - progress) * .78;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }
  }
  function scheduleMeteor(now) {
    const limit = reduced || lowDetail ? 1 : 3;
    if (intro || now < nextMeteorAt || meteors.length >= limit) return;
    const margin = Math.max(90, Math.min(w, h) * .18);
    const startFromTop = Math.random() < .58;
    const startX = startFromTop ? rand(-w * .12, w * .28) : -margin;
    const startY = startFromTop ? -margin : rand(-h * .12, h * .28);
    const angle = rand(Math.PI / 6, Math.PI / 3);
    const vx = Math.cos(angle), vy = Math.sin(angle);
    const exitRight = (w + margin - startX) / vx;
    const exitBottom = (h + margin - startY) / vy;
    const distance = Math.min(exitRight, exitBottom);
    const dx = vx * distance, dy = vy * distance;
    const speed = rand(Math.max(w, h) * .22, Math.max(w, h) * .38);
    meteors.push({ x: startX, y: startY, dx, dy, age: 0, life: distance / speed, length: rand(150, 260), width: rand(2.5, 4.2), color: fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)], sparks: Array.from({ length: reduced ? 2 : 6 }, () => ({ offset: rand(.18, .88), side: rand(-9, 9), radius: rand(1, 2.8) })) });
    nextMeteorAt = now + rand(reduced ? 7 : 1.4, reduced ? 12 : 4.2) * 1000;
  }
  function drawMeteors(dt, now) {
    scheduleMeteor(now);
    for (let i = meteors.length - 1; i >= 0; i--) {
      const meteor = meteors[i];
      meteor.age += dt;
      const progress = Math.min(1, meteor.age / meteor.life);
      const linger = 1 - clamp((meteor.age - meteor.life) / .6, 0, 1);
      if (linger <= 0) {
        meteors.splice(i, 1);
        continue;
      }
      const x = meteor.x + meteor.dx * progress, y = meteor.y + meteor.dy * progress;
      const distance = Math.hypot(meteor.dx, meteor.dy) || 1;
      const ux = meteor.dx / distance, uy = meteor.dy / distance;
      const length = Math.min(meteor.length, distance * progress) * linger;
      if (length <= 0) continue;
      const tailX = x - ux * length, tailY = y - uy * length;
      const fade = Math.min(1, progress * 5) * linger;
      const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(.6, meteor.color + "88");
      gradient.addColorStop(1, "#ffffff");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = gradient;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.globalAlpha = fade * .25;
      ctx.lineWidth = meteor.width * 3;
      ctx.stroke();
      ctx.globalAlpha = fade * .9;
      ctx.lineWidth = meteor.width;
      ctx.stroke();
      ctx.fillStyle = meteor.color;
      for (const spark of meteor.sparks) {
        const along = length * spark.offset;
        const sx = x - ux * along - uy * spark.side, sy = y - uy * along + ux * spark.side;
        ctx.globalAlpha = fade * (1 - spark.offset) * .82;
        ctx.fillRect(sx, sy, spark.radius, spark.radius);
      }
      ctx.restore();
    }
  }
  function scheduleBlessing(now) {
    if (intro) return;
    activeBlessings = activeBlessings.filter(blessing => now < blessing.end);
    const limit = reduced ? 2 : 5;
    if (now < nextBlessingAt || activeBlessings.length >= limit) return;
    const choices = blessings.filter(text => text !== lastBlessing);
    const text = choices[Math.floor(Math.random() * choices.length)]; lastBlessing = text;
    const side = Math.random() < .5 ? "left" : "right";
    let fontSize = clamp(Math.min(w, h) * .045, 17, 25);
    ctx.font = `600 ${fontSize}px "STKaiti", "KaiTi", "PingFang SC", "Microsoft YaHei", serif`;
    const safeX = side === "left" ? [w * .06, w * .4] : [w * .6, w * .94];
    const zoneWidth = safeX[1] - safeX[0];
    fontSize *= Math.min(1, zoneWidth / (ctx.measureText(text).width + 16));
    ctx.font = `600 ${fontSize}px "STKaiti", "KaiTi", "PingFang SC", "Microsoft YaHei", serif`;
    const textHalfWidth = ctx.measureText(text).width / 2;
    const positions = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = rand(safeX[0] + textHalfWidth, safeX[1] - textHalfWidth);
      const y = rand(h * .31, h * .47);
      const box = { left: x - textHalfWidth - 10, right: x + textHalfWidth + 10, top: y - fontSize * .8, bottom: y + fontSize * .8 };
      const collides = activeBlessings.some(other => box.left < other.box.right && box.right > other.box.left && box.top < other.box.bottom && box.bottom > other.box.top);
      if (!collides) { positions.push({ x, y, box }); break; }
    }
    if (positions.length) {
      const { x, y, box } = positions[0];
      const start = now + rand(0, 700); const life = rand(4.8, 7.2) * 1000;
      activeBlessings.push({ text, x, y, side, size: fontSize, start, end: start + life, life, phase: rand(0, TAU), box });
    }
    nextBlessingAt = now + rand(reduced ? 4 : 1.4, reduced ? 7 : 3.8) * 1000;
  }
  function drawBlessing(now, visibility) {
    if (visibility <= 0) return;
    scheduleBlessing(now);
    for (const b of activeBlessings) {
      if (now < b.start) continue;
      const q = (now - b.start) / b.life;
    const fade = Math.min(ease(clamp(q / .2, 0, 1)), ease(clamp((1 - q) / .24, 0, 1)));
    const bob = Math.sin(now / 650 + b.phase) * 4;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade * visibility;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `600 ${b.size}px "STKaiti", "KaiTi", "PingFang SC", "Microsoft YaHei", serif`;
    const width = ctx.measureText(b.text).width; const gradient = ctx.createLinearGradient(b.x - width / 2, 0, b.x + width / 2, 0);
    gradient.addColorStop(0, "#a4eaff"); gradient.addColorStop(.5, "#ffffff"); gradient.addColorStop(1, "#d2bcff");
    ctx.shadowBlur = 19; ctx.shadowColor = "#76cfff"; ctx.fillStyle = gradient; ctx.strokeStyle = "rgba(230,250,255,.7)"; ctx.lineWidth = .8;
    ctx.strokeText(b.text, b.x, b.y + bob); ctx.fillText(b.text, b.x, b.y + bob);
    ctx.restore();
    }
  }
  function drawParticlePath(points, progress, mapPoint, color, width, t, phase = 0, persistent = true, glowScale = 1, opacity = .76, target = ctx) {
    if (!points.length || progress <= 0) return;
    const last = Math.max(0, Math.floor((points.length - 1) * progress));
    target.save(); target.globalCompositeOperation = "lighter"; target.fillStyle = color; target.shadowColor = color; target.shadowBlur = (10 + width * 4) * glowScale;
    target.beginPath();
    for (let i = 0; i <= last; i++) {
      const point = points[i]; if (!point) continue;
      const p = mapPoint(point), pulse = .82 + .18 * Math.sin(t * 3.2 + i * .23 + phase), radius = width * pulse;
      target.moveTo(p.x + radius, p.y); target.arc(p.x, p.y, radius, 0, TAU);
    }
    target.globalAlpha = opacity; target.fill();
    if (last > 0 && (progress < 1 || persistent)) {
      const head = mapPoint(points[last]);
      target.globalAlpha = progress < 1 ? .98 : .48; target.shadowBlur = 26 * glowScale; target.beginPath(); target.arc(head.x, head.y, width * (progress < 1 ? 2.6 : 1.7), 0, TAU); target.fill();
      if (progress >= 1 && persistent) {
        const runnerIndex = ((Math.floor((t * 8 + phase * 19) % points.length) % points.length) + points.length) % points.length, runner = mapPoint(points[runnerIndex]);
        target.globalAlpha = .9; target.shadowBlur = 24; target.beginPath(); target.arc(runner.x, runner.y, width * 1.9, 0, TAU); target.fill();
      }
    }
    target.restore();
  }

  function paintEnglish(target, progress, t, center, baseline) {
    const run = englishRun;
    const mapPoint = p => ({ x: center + p.x, y: baseline + p.y });
    run.strokes.forEach((stroke, index) => {
      const q = ease((progress - stroke.from) / Math.max(.0001, stroke.to - stroke.from));
      drawParticlePath(stroke.points, q, mapPoint, stroke.color, reduced ? 1.2 : 1.35,
        t, run.phase + index * .73, false, .24, .78, target);
    });
  }
  function drawText(t, elapsed) {
    const { centerX: cx, numberY, numberSize } = layout;
    const float = Math.sin(t * .85) * (motionPreference.matches ? .8 : 2.5);
    const numberProgress = clamp((elapsed - 5.55) / 2.05, 0, 1), numberScale = numberSize / 100;
    numberStrokes.forEach((stroke, index) => {
      const q = ease(clamp((numberProgress - stroke.delay) / (1 - stroke.delay), 0, 1));
      const numberMap = p => ({ x: cx + (p.x + stroke.offsetX) * numberScale, y: numberY + p.y * numberScale + float, depth: 0 });
      drawParticlePath(stroke.points, q, numberMap, digitColors[index], reduced ? 2.05 : 2.4, t, stroke.delay * 7);
    });
    const numberReveal = ease(numberProgress);
    for (const p of ringDots) {
      const a = p.a + t * p.speed, x = cx + Math.cos(a) * p.r, y = numberY + float + Math.sin(a) * p.r * .36;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = numberReveal * (.26 + .24 * Math.sin(t * 2.2 + p.p)); ctx.fillStyle = "#a8e7ff"; ctx.beginPath(); ctx.arc(x, y, 1 + Math.sin(t * 3 + p.p) * .35, 0, TAU); ctx.fill(); ctx.restore();
    }
    const run = englishRun;
    const q = clamp((elapsed - run.start) / run.duration, 0, 1);
    if (q > 0) {
      const y = run.y + float + Math.sin(t * .9 + run.phase) * 1.2;
      if (q < 1) {
        paintEnglish(ctx, q, t, cx, y);
      } else {
        const width = w * .9;
        const above = layout.englishSize * .86 + 8;
        const height = above + layout.englishSize * .3 + 8;
        englishImage ??= paintLayer(width, height, target => paintEnglish(target, 1, 0, width / 2, above));
        ctx.drawImage(englishImage, cx - width / 2, y - above, width, height);
      }
    }
    drawName(t, elapsed, float);
  }

  function addFloatingHeart(event) {
    const bounds = stage.getBoundingClientRect();
    const color = randomRainbowColor();
    if (!heartSprites.has(color)) {
      const sprite = document.createElement("canvas");
      sprite.width = cake.heart.width;
      sprite.height = cake.heart.height;
      const target = sprite.getContext("2d");
      target.drawImage(cake.heart, 0, 0);
      target.globalCompositeOperation = "source-in";
      target.fillStyle = color;
      target.fillRect(0, 0, sprite.width, sprite.height);
      heartSprites.set(color, sprite);
    }
    if (floatingHearts.length >= 20) floatingHearts.shift();
    floatingHearts.push({
      x: event.clientX - bounds.left, y: event.clientY - bounds.top,
      color, sprite: heartSprites.get(color), size: rand(16, 33),
      start: performance.now(), duration: rand(2200, 3100),
      sway: rand(7, 17), rise: rand(65, 112), phase: rand(0, TAU)
    });
  }

  function updateAudioButton() {
    const playing = !audio.paused && !audio.ended;
    audioToggle.textContent = playing ? "Ⅱ 暂停音乐" : "♫ 播放音乐";
    audioToggle.setAttribute("aria-label", playing ? "暂停音乐" : "播放音乐");
  }

  function startMusic() {
    if (audioUnavailable || !audio) return;
    audio.volume = Number(volume.value);
    audio.play().then(() => {
      audioStatus.textContent = "";
      updateAudioButton();
    }).catch(() => {
      audioStatus.textContent = "轻触播放音乐";
      updateAudioButton();
    });
  }

  function toggleMusic(event) {
    event.stopPropagation();
    if (audioUnavailable) return;
    if (audio.paused) startMusic();
    else audio.pause();
    updateAudioButton();
  }

  function drawFloatingHearts(now) {
    const motion = motionPreference.matches ? .35 : 1;
    for (let i = floatingHearts.length - 1; i >= 0; i--) {
      const heart = floatingHearts[i];
      const age = Math.max(0, now - heart.start);
      const progress = age / heart.duration;
      if (progress >= 1) {
        floatingHearts.splice(i, 1);
        continue;
      }
      const angle = heart.phase + progress * TAU * 1.25;
      const size = heart.size * (.70 + .30 * ease(age / 180));
      const opacity = .94 * (.62 + .38 * ease(age / 150)) * (1 - ease((progress - .19) / .81));
      const x = clamp(heart.x + (Math.sin(angle) - Math.sin(heart.phase)) * heart.sway * motion, size / 2, w - size / 2);
      const startY = clamp(heart.y, size / 2 + 6, h - size / 2);
      const y = startY - Math.min(heart.rise * motion, startY - size / 2) * progress;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(angle) * .23 * motion);
      ctx.globalAlpha = opacity;
      ctx.drawImage(heart.sprite, -size / 2, -size / 2, size, size);
      ctx.restore();

      const scatter = ease((progress - .32) / .68);
      if (!scatter) continue;
      ctx.save();
      ctx.globalAlpha = opacity * scatter;
      ctx.fillStyle = heart.color;
      for (let point = 0; point < 6; point++) {
        const bearing = heart.phase + point * TAU / 6;
        const distance = size * (.26 + scatter * .72 * motion);
        const dotSize = 1.45 - scatter * .7;
        ctx.fillRect(x + Math.cos(bearing) * distance, y + Math.sin(bearing) * distance, dotSize, dotSize);
      }
      ctx.restore();
    }
  }

  function draw(now) {
    const interval = now - last;
    const t = now / 1000, dt = Math.min(.06, interval / 1000 || .016);
    last = now;
    const elapsed = (now - introStart) / 1000;
    if (intro && elapsed >= 12.2) { intro = false; stage.classList.remove("playing"); }
    if (!lowDetail && elapsed > 1 && interval > 0 && interval < 250 && !document.hidden) {
      samples++;
      if (interval > 22) slowSamples++;
      if (samples === 60) {
        lowDetail = slowSamples >= 32;
        samples = slowSamples = 0;
        if (lowDetail) resizeCanvas();
      }
    }
    drawBackground(elapsed); drawFireworks(dt); drawMeteors(dt, now);
    const sliceFocus = drawCake(ctx, cake, elapsed, layout, motionPreference.matches, lowDetail);
    drawText(t, elapsed); drawBlessing(now, 1 - sliceFocus);
    drawFloatingHearts(now);
    requestAnimationFrame(draw);
  }
  function replayIntro() {
    recolorCandles(cake);
    digitColors = [randomRainbowColor(), randomRainbowColor()];
    intro = true;
    introStart = performance.now();
    stage.classList.add("playing");
    floatingHearts.length = 0;
    fireworks = []; meteors = []; activeBlessings = [];
    nextMeteorAt = 0; nextBlessingAt = 0;
    launchFirework(w * .22, h * .3);
    launchFirework(w * .78, h * .3);
  }
  replay.addEventListener("click", e => { e.stopPropagation(); replayIntro(); });
  audioToggle.addEventListener("click", toggleMusic);
  function updateVolume() {
    const level = Number(volume.value);
    audio.volume = level;
    volumeValue.value = `${Math.round(level * 100)}%`;
    volumeValue.textContent = volumeValue.value;
  }
  volume.addEventListener("input", event => { event.stopPropagation(); updateVolume(); });
  volume.addEventListener("click", event => event.stopPropagation());
  document.querySelector(".audio-controls").addEventListener("click", event => event.stopPropagation());
  audio.addEventListener("play", updateAudioButton);
  audio.addEventListener("pause", updateAudioButton);
  audio.addEventListener("error", () => {
    audioUnavailable = true;
    audioStatus.textContent = "音频格式不受浏览器支持";
    audioToggle.disabled = true;
    updateAudioButton();
  });
  updateVolume();
  audio.addEventListener("canplay", startMusic, { once: true });
  startMusic();
  stage.addEventListener("click", event => {
    startMusic();
    if (!event.target.closest(".audio-controls") && event.target !== replay) addFloatingHeart(event);
  });
  window.addEventListener("resize", resize, { passive: true });
  motionPreference.addEventListener?.("change", resize);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); } });
  const fallbackNameFont = '"YouYuan", "PingFang SC", "Microsoft YaHei", sans-serif';
  nameGlyphs = createNameGlyphs(fallbackNameFont);
  document.fonts?.load('400 92px "Birthday Name"', birthdayName).then(
    ([face]) => {
      if (face) {
        nameGlyphs = createNameGlyphs('"Birthday Name"');
        nameImage = null;
      }
    },
    () => { /* Keep the system glyphs if the bundled face cannot load. */ }
  );
  resize(); replayIntro(); requestAnimationFrame(draw);
})();
