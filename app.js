(() => {
  "use strict";
  const canvas = document.getElementById("birthdayCanvas");
  const ctx = canvas.getContext("2d");
  const stage = document.querySelector(".stage");
  const replay = document.getElementById("replay");
  const TAU = Math.PI * 2;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0, dpr = 1, last = 0, raf = 0, introStart = 0;
  let intro = true, reduced = false;
  let stars = [], dust = [], fireworks = [], meteors = [], cakePaths = [], numberStrokes = [], textRuns = [], ringDots = [];
  const blessings = ["岁岁欢愉", "平安喜乐", "喜乐长安", "常乐常安", "温柔常伴", "清欢自在", "笑靥如花", "明媚如初", "可爱如初", "熠熠生辉", "光芒万丈", "万事胜意", "岁月静好", "芳华自在", "眉眼如初", "星河长明", "得偿所愿", "人间值得", "一生被爱", "岁岁平安", "喜乐无忧", "顺遂无虞"];
  let activeBlessings = [], lastBlessing = "", nextBlessingAt = 0, nextMeteorAt = 0;
  const palette = ["#dff8ff", "#86e7ff", "#4ac7ff", "#7e8dff", "#b89bff", "#ffffff"];
  const fireworkPalette = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6", "#bf5af2"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function cakeBaseForViewport(viewWidth, viewHeight) {
    const widthLimit = Math.min(viewWidth * .73, 430);
    const numberSize = Math.min(clamp(widthLimit * .34, 64, 145), viewHeight * .18);
    const numberBottom = viewHeight * .12 + numberSize * .54 + 7;
    const cakeTopBudget = viewHeight * .69 - numberBottom - 24;
    let base = Math.min(widthLimit, viewHeight * .62, cakeTopBudget / .92);
    for (let i = 0; i < 3; i++) {
      const { englishSize, nameSize } = textSizes(base, viewHeight);
      const textBudget = (viewHeight * .96 - viewHeight * .69 - englishSize * 1.4 - nameSize * .3 - 10) / .19;
      base = Math.min(base, textBudget);
    }
    return Math.max(1, base);
  }
  function textSizes(base, viewportHeight) {
    return {
      englishSize: clamp(Math.min(base * .15, viewportHeight * .09), 28, 56),
      nameSize: clamp(Math.min(base * .12, viewportHeight * .075), 24, 45)
    };
  }
  function numberCenterY(viewHeight) {
    return viewHeight * .12;
  }
  const bottomYForText = (base, viewportHeight) => viewportHeight * .69 + base * .19;
  function sampleLine(x1, y1, z1, x2, y2, z2, steps = 24) {
    return Array.from({ length: steps + 1 }, (_, i) => { const q = i / steps; return { x: x1 + (x2 - x1) * q, y: y1 + (y2 - y1) * q, z: z1 + (z2 - z1) * q }; });
  }
  function sampleCubic(a, b, c, d, steps = 32) {
    return Array.from({ length: steps + 1 }, (_, i) => { const q = i / steps, m = 1 - q; return { x: m ** 3 * a.x + 3 * m * m * q * b.x + 3 * m * q * q * c.x + q ** 3 * d.x, y: m ** 3 * a.y + 3 * m * m * q * b.y + 3 * m * q * q * c.y + q ** 3 * d.y, z: m ** 3 * a.z + 3 * m * m * q * b.z + 3 * m * q * q * c.z + q ** 3 * d.z }; });
  }
  function sampleEllipse(rx, ry, y, steps = 112) {
    return Array.from({ length: steps + 1 }, (_, i) => { const a = i / steps * TAU; return { x: Math.cos(a) * rx, y, z: Math.sin(a) * ry }; });
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
  function addCakePath(points, color, width, start, duration, phase = rand(0, TAU)) {
    const validPoints = points.filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
    cakePaths.push({ points: resamplePath(validPoints, reduced ? 7 : 4.5), color, width, start, duration, phase });
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
  function createNameRun(text, size, y, start, duration) {
    return { text, characters: [...text], fontSize: size, start, duration, y, phase: rand(0, TAU) };
  }
  function createTextRuns(base, height) {
    const { englishSize, nameSize } = textSizes(base, height), y = bottomYForText(base, height);
    return [
      createLatinRun("Happy Birthday for", englishSize, y, 7.7, 1.85),
      createNameRun("王海璇", nameSize, y + englishSize * 1.4, 9.65, 2.05)
    ];
  }
  function resize() {
    dpr = DPR(); w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    reduced = w * h < 420000 || matchMedia("(prefers-reduced-motion: reduce)").matches;
    buildScene();
  }
  function buildScene() {
    const n = reduced ? 90 : Math.min(240, Math.round(w * h / 6500));
    stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rand(.35, 1.7), a: rand(.2, .8), p: rand(0, TAU), s: rand(.4, 1.4) }));
    dust = Array.from({ length: reduced ? 30 : 80 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rand(.5, 1.8), vx: rand(-.08, .08), vy: rand(.06, .2), a: rand(.12, .55), c: palette[Math.floor(rand(0, palette.length))] }));
    cakePaths = []; numberStrokes = []; textRuns = []; ringDots = [];
    const base = cakeBaseForViewport(w, h);
    addCakePath(sampleEllipse(base * .54, base * .085, 12), "#7bdcff", 1.5, .35, .65);
    addCakePath(sampleEllipse(base * .51, base * .072, 7), "#f1fdff", 1.3, .5, .72);
    const tiers = [
      { rx: base * .43, rz: base * .105, top: -base * .2, floor: -base * .035, start: .82 },
      { rx: base * .33, rz: base * .088, top: -base * .385, floor: -base * .225, start: 2.05 },
      { rx: base * .235, rz: base * .069, top: -base * .555, floor: -base * .405, start: 3.18 }
    ];
    tiers.forEach((tier, layer) => {
      const duration = .8;
      addCakePath(sampleEllipse(tier.rx, tier.rz, tier.top), layer === 2 ? "#f5ffff" : "#a9efff", 1.6, tier.start, duration, layer * .8);
      const front = [];
      const steps = reduced ? 64 : 100;
      for (let i = 0; i <= steps; i++) { const a = Math.PI * i / steps; front.push({ x: Math.cos(a) * tier.rx, y: tier.floor, z: Math.sin(a) * tier.rz }); }
      addCakePath(front, ["#75cfff", "#9deeff", "#d8fbff"][layer], 1.8, tier.start + .3, duration, layer + .4);
      for (const side of [-1, 1]) addCakePath(sampleLine(side * tier.rx, tier.top, 0, side * tier.rx, tier.floor, 0, 28), "#d8f9ff", 1.3, tier.start + .42, duration * .72, side + layer);
      const icing = [];
      for (let i = 0; i <= steps; i++) { const a = Math.PI * i / steps, x = Math.cos(a) * tier.rx, dip = Math.pow(Math.max(0, Math.sin(a * (layer + 3) * 1.45 + layer)), 9) * base * (.035 + layer * .004); icing.push({ x, y: tier.top + base * .035 + dip, z: Math.sin(a) * tier.rz * 1.01 }); }
      addCakePath(icing, "#ffffff", 2.1, tier.start + .52, duration * 1.1, layer + 1.4);
      for (let stripe = 1; stripe <= 2; stripe++) {
        const line = [];
        for (let i = 0; i <= 48; i++) { const x = (i / 24 - 1) * tier.rx * .9, curve = Math.sqrt(Math.max(0, 1 - (x / tier.rx) ** 2)); line.push({ x, y: tier.top + (tier.floor - tier.top) * (stripe / 3), z: tier.rz * curve * .9 }); }
        addCakePath(line, stripe === 1 ? "#65d5ff" : "#d9faff", .9, tier.start + .66 + stripe * .07, duration * .95, stripe + layer);
      }
      for (let i = 0; i < (reduced ? 3 : 5); i++) {
        const a = Math.PI * (.18 + .64 * (i / Math.max(1, (reduced ? 3 : 5) - 1))), x = Math.cos(a) * tier.rx * .78, z = Math.sin(a) * tier.rz * .92;
        const star = Array.from({ length: 11 }, (_, k) => { const theta = k / 10 * TAU, r = base * (k % 2 ? .009 : .021); return { x: x + Math.cos(theta) * r, y: tier.top + base * .075 + Math.sin(theta) * r, z }; });
        addCakePath(star, ["#ffe6a3", "#e8bcff", "#8ce7ff"][i % 3], 1.1, tier.start + .7 + i * .05, .48, i);
      }
    });
    for (const y of [10, 15]) addCakePath(sampleEllipse(base * (y === 10 ? .54 : .49), base * (y === 10 ? .085 : .071), y), y === 10 ? "#ecfcff" : "#65cfff", 1.4, .72, .75, y);
    const upperTop = -base * .555, candleY = upperTop - base * .025;
    [-.145, -.05, .05, .145].forEach((offset, index) => {
      const x = base * offset, height = base * (.105 + (index % 2) * .018), z = base * .025;
      const shaft = sampleLine(x, candleY, z, x, candleY - height, z, 32);
      for (let i = 1; i < shaft.length - 1; i++) shaft[i].x += Math.sin(i * .48 + index) * base * .009;
      addCakePath(shaft, index % 2 ? "#efffff" : "#72d9ff", 2, 4.18 + index * .11, .82, index);
      const flameBase = candleY - height - 2, flameX = x + base * .012;
      const flame = joinPoints(
        sampleCubic({ x: flameX, y: flameBase, z }, { x: flameX - base * .045, y: flameBase - base * .04, z }, { x: flameX - base * .018, y: flameBase - base * .09, z }, { x: flameX, y: flameBase - base * .115, z }, 18),
        sampleCubic({ x: flameX, y: flameBase - base * .115, z }, { x: flameX + base * .047, y: flameBase - base * .07, z }, { x: flameX + base * .04, y: flameBase - base * .025, z }, { x: flameX, y: flameBase, z }, 18)
      );
      addCakePath(flame, "#ffe5a3", 1.8, 4.66 + index * .1, .62, index + 2);
      addCakePath(sampleLine(flameX, flameBase - base * .015, z + 1, flameX, flameBase - base * .065, z + 1, 12), "#ffffff", 1.1, 4.85 + index * .1, .5, index + 3);
    });
    const flourish = (points) => resamplePath(points, reduced ? 6 : 3.8);
    numberStrokes = [
      { points: flourish(joinPoints(sampleCubic({ x: -35, y: -13, z: 0 }, { x: -18, y: -39, z: 0 }, { x: 23, y: -42, z: 0 }, { x: 29, y: -18, z: 0 }, 42), sampleCubic({ x: 29, y: -18, z: 0 }, { x: 35, y: 2, z: 0 }, { x: 4, y: 17, z: 0 }, { x: -30, y: 43, z: 0 }, 42), sampleCubic({ x: -30, y: 43, z: 0 }, { x: -2, y: 40, z: 0 }, { x: 23, y: 43, z: 0 }, { x: 37, y: 38, z: 0 }, 26))), color: "#9deeff", delay: 0, offsetX: -36 },
      { points: flourish(joinPoints(sampleCubic({ x: 5, y: -14, z: 1 }, { x: 13, y: -21, z: 1 }, { x: 20, y: -31, z: 1 }, { x: 24, y: -35, z: 1 }, 22), sampleCubic({ x: 24, y: -35, z: 1 }, { x: 21, y: -10, z: 1 }, { x: 21, y: 18, z: 1 }, { x: 21, y: 45, z: 1 }, 44), sampleCubic({ x: 21, y: 45, z: 1 }, { x: 20, y: 50, z: 1 }, { x: 32, y: 48, z: 1 }, { x: 39, y: 45, z: 1 }, 18))), color: "#d6c4ff", delay: .43, offsetX: 38 }
    ];
    numberStrokes.size = clamp(base * .34, 102, 145);
    textRuns = createTextRuns(base, h);
    nextBlessingAt = 0; nextMeteorAt = 0; activeBlessings = []; lastBlessing = ""; meteors = [];
    const ringR = base * .56;
    for (let i = 0; i < (reduced ? 10 : 18); i++) ringDots.push({ a: i / (reduced ? 10 : 18) * TAU, r: ringR * rand(.94, 1.04), speed: rand(.16, .35), p: rand(0, TAU) });
    const sceneWidth = w, sceneHeight = h;
    document.fonts?.ready?.then(() => {
      if (Math.abs(window.innerWidth - sceneWidth) < 2 && Math.abs(window.innerHeight - sceneHeight) < 2) textRuns = createTextRuns(base, h);
    });
  }
  function launchFirework(x = (Math.random() < .5 ? rand(w * .08, w * .27) : rand(w * .73, w * .92)), y = rand(h * .14, h * .45)) {
    const count = reduced ? 18 : 34, hue = fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)];
    fireworks.push({ x, y, age: 0, life: rand(1.2, 2.1), hue, particles: Array.from({ length: count }, (_, i) => ({ a: i / count * TAU + rand(-.04, .04), speed: rand(35, 125), r: rand(.6, 2.2) })) });
  }
  function drawBackground(t, elapsed) {
    const g = ctx.createRadialGradient(w * .5, h * .45, 0, w * .5, h * .45, Math.max(w, h) * .7);
    g.addColorStop(0, "#122e78"); g.addColorStop(.48, "#07153f"); g.addColorStop(1, "#02051b"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const writingNumber = intro && elapsed >= 5.35 && elapsed <= 7.85, numberX = w / 2, numberY = numberCenterY(h), exclusionX = Math.min(w * .36, 155), exclusionY = Math.min(h * .12, 100);
    for (const s of stars) { const overlapsNumber = writingNumber && Math.abs(s.x - numberX) < exclusionX && Math.abs(s.y - numberY) < exclusionY; if (overlapsNumber) continue; const a = s.a * (.65 + Math.sin(t * s.s + s.p) * .35); ctx.globalAlpha = a; ctx.fillStyle = "#d8f7ff"; ctx.shadowBlur = 8; ctx.shadowColor = "#68dfff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    for (const p of dust) { p.y += p.vy; p.x += p.vx; if (p.y > h + 4) p.y = -4; const overlapsNumber = writingNumber && Math.abs(p.x - numberX) < exclusionX && Math.abs(p.y - numberY) < exclusionY; if (overlapsNumber) continue; ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  function drawFireworks(dt) {
    if (!intro && Math.random() < dt * (reduced ? .45 : .85)) launchFirework();
    for (let i = fireworks.length - 1; i >= 0; i--) { const f = fireworks[i]; f.age += dt; const q = f.age / f.life; if (q >= 1) { fireworks.splice(i, 1); continue; } ctx.save(); ctx.translate(f.x, f.y); ctx.globalCompositeOperation = "lighter"; for (const p of f.particles) { const dist = p.speed * ease(clamp(q * 1.25, 0, 1)); const x = Math.cos(p.a) * dist, y = Math.sin(p.a) * dist + 42 * q * q; ctx.globalAlpha = (1 - q) * .85; ctx.strokeStyle = f.hue; ctx.lineWidth = p.r; ctx.shadowBlur = 14; ctx.shadowColor = f.hue; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(p.a) * 14, y - Math.sin(p.a) * 14); ctx.stroke(); } ctx.restore(); }
  }
  function scheduleMeteor(now) {
    const limit = reduced ? 1 : 4;
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
    meteors.push({ x: startX, y: startY, dx, dy, age: 0, life: distance / speed, length: rand(150, 260), width: rand(2.5, 4.2), color: fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)], trail: [], sparks: Array.from({ length: reduced ? 2 : 6 }, () => ({ offset: rand(.18, .88), side: rand(-9, 9), radius: rand(1, 2.8) })) });
    nextMeteorAt = now + rand(reduced ? 7 : 1.4, reduced ? 12 : 4.2) * 1000;
  }
  function drawMeteors(dt, now) {
    scheduleMeteor(now);
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.age += dt; const q = Math.min(1, m.age / m.life);
      const x = m.x + m.dx * q, y = m.y + m.dy * q;
      const mag = Math.hypot(m.dx, m.dy) || 1, ux = m.dx / mag, uy = m.dy / mag;
      if (m.age < m.life && (!m.trail.length || Math.hypot(x - m.trail[m.trail.length - 1].x, y - m.trail[m.trail.length - 1].y) > 2.5)) m.trail.push({ x, y, age: 0 });
      for (const point of m.trail) point.age += dt;
      m.trail = m.trail.filter(point => point.age < 1.4);
      if (m.age >= m.life && m.trail.length === 0) { meteors.splice(i, 1); continue; }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (let j = 0; j < m.trail.length; j++) {
        const point = m.trail[j], fade = Math.pow(Math.max(0, 1 - point.age / 1.4), 1.5), radius = m.width * (.85 * fade + .12);
        if (j > 0) {
          const previous = m.trail[j - 1], segmentFade = Math.min(fade, Math.pow(Math.max(0, 1 - previous.age / 1.4), 1.5));
          ctx.globalAlpha = segmentFade * .66; ctx.strokeStyle = m.color; ctx.lineWidth = Math.max(.45, m.width * segmentFade); ctx.shadowBlur = 10 * segmentFade; ctx.shadowColor = m.color; ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(point.x, point.y); ctx.stroke();
        }
        ctx.globalAlpha = fade * .75; ctx.fillStyle = m.color; ctx.shadowBlur = 15 * fade; ctx.shadowColor = m.color; ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, TAU); ctx.fill();
      }
      if (q >= 1) { ctx.restore(); continue; }
      const fade = Math.min(1, q * 5, (1 - q) * 4 + .12);
      const tailX = x - ux * m.length, tailY = y - uy * m.length;
      const tail = ctx.createLinearGradient(tailX, tailY, x, y);
      tail.addColorStop(0, "rgba(112,178,255,0)"); tail.addColorStop(.55, m.color + "99"); tail.addColorStop(1, "#ffffff");
      ctx.globalAlpha = fade * .9; ctx.strokeStyle = tail; ctx.lineWidth = m.width; ctx.shadowBlur = 28; ctx.shadowColor = m.color; ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = fade; ctx.strokeStyle = m.color; ctx.lineWidth = Math.max(1, m.width * .42); ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(x - ux * m.length * .78, y - uy * m.length * .78); ctx.lineTo(x, y); ctx.stroke();
      for (const spark of m.sparks) { const sx = x - ux * m.length * spark.offset - uy * spark.side, sy = y - uy * m.length * spark.offset + ux * spark.side; ctx.globalAlpha = fade * (1 - spark.offset) * .82; ctx.fillStyle = m.color; ctx.shadowBlur = 14; ctx.shadowColor = m.color; ctx.beginPath(); ctx.arc(sx, sy, spark.radius, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = fade; ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 36; ctx.shadowColor = m.color; ctx.beginPath(); ctx.arc(x, y, reduced ? 3 : 5, 0, TAU); ctx.fill(); ctx.fillStyle = m.color; ctx.shadowBlur = 48; ctx.beginPath(); ctx.arc(x, y, reduced ? 1.7 : 2.7, 0, TAU); ctx.fill(); ctx.restore();
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
    ctx.font = `600 ${fontSize}px "Ma Shan Zheng", "Zhi Mang Xing", "STKaiti", "KaiTi", serif`;
    const safeX = side === "left" ? [w * .06, w * .4] : [w * .6, w * .94];
    const zoneWidth = safeX[1] - safeX[0];
    fontSize *= Math.min(1, zoneWidth / (ctx.measureText(text).width + 16));
    ctx.font = `600 ${fontSize}px "Ma Shan Zheng", "Zhi Mang Xing", "STKaiti", "KaiTi", serif`;
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
  function drawBlessing(now) {
    scheduleBlessing(now);
    for (const b of activeBlessings) {
      if (now < b.start) continue;
      const q = (now - b.start) / b.life;
    const fade = Math.min(ease(clamp(q / .2, 0, 1)), ease(clamp((1 - q) / .24, 0, 1)));
    const bob = Math.sin(now / 650 + b.phase) * 4;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `600 ${b.size}px "Ma Shan Zheng", "Zhi Mang Xing", "STKaiti", "KaiTi", serif`;
    const width = ctx.measureText(b.text).width; const gradient = ctx.createLinearGradient(b.x - width / 2, 0, b.x + width / 2, 0);
    gradient.addColorStop(0, "#a4eaff"); gradient.addColorStop(.5, "#ffffff"); gradient.addColorStop(1, "#d2bcff");
    ctx.shadowBlur = 19; ctx.shadowColor = "#76cfff"; ctx.fillStyle = gradient; ctx.strokeStyle = "rgba(230,250,255,.7)"; ctx.lineWidth = .8;
    ctx.strokeText(b.text, b.x, b.y + bob); ctx.fillText(b.text, b.x, b.y + bob);
    ctx.restore();
    }
  }
  function drawParticlePath(points, progress, mapPoint, color, width, t, phase = 0, persistent = true, glowScale = 1, opacity = .76) {
    if (!points.length || progress <= 0) return;
    const last = Math.max(0, Math.floor((points.length - 1) * progress));
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = (10 + width * 4) * glowScale;
    ctx.beginPath();
    for (let i = 0; i <= last; i++) {
      const point = points[i]; if (!point) continue;
      const p = mapPoint(point), pulse = .82 + .18 * Math.sin(t * 3.2 + i * .23 + phase), radius = width * pulse;
      ctx.moveTo(p.x + radius, p.y); ctx.arc(p.x, p.y, radius, 0, TAU);
    }
    ctx.globalAlpha = opacity; ctx.fill();
    if (last > 0 && (progress < 1 || persistent)) {
      const head = mapPoint(points[last]);
      ctx.globalAlpha = progress < 1 ? .98 : .48; ctx.shadowBlur = 26 * glowScale; ctx.beginPath(); ctx.arc(head.x, head.y, width * (progress < 1 ? 2.6 : 1.7), 0, TAU); ctx.fill();
      if (progress >= 1 && persistent) {
        const runnerIndex = ((Math.floor((t * 8 + phase * 19) % points.length) % points.length) + points.length) % points.length, runner = mapPoint(points[runnerIndex]);
        ctx.globalAlpha = .9; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(runner.x, runner.y, width * 1.9, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawCake(t, elapsed) {
    const cx = w / 2, base = cakeBaseForViewport(w, h), anchorY = h * .69;
    const build = clamp((elapsed - .15) / 5.55, 0, 1), orbit = Math.sin(build * Math.PI);
    const yaw = .62 * (1 - ease(build)), pitch = .52 * (1 - ease(build)), focal = base * 3.3;
    const project = p => {
      if (!p) return { x: cx, y: anchorY, depth: 0 };
      const x = p.x * Math.cos(yaw) + p.z * Math.sin(yaw), z = -p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
      const y = p.y * Math.cos(pitch) - z * Math.sin(pitch), depth = p.y * Math.sin(pitch) + z * Math.cos(pitch);
      const perspective = focal / (focal + depth);
      return { x: cx + x * perspective, y: anchorY + y * perspective, depth };
    };
    for (const path of cakePaths) {
      const q = ease(clamp((elapsed - path.start) / path.duration, 0, 1));
      drawParticlePath(path.points, q, project, path.color, path.width, t, path.phase);
    }
    if (build > .82) {
      const sparkleQ = ease((build - .82) / .18);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.shadowBlur = 14; ctx.shadowColor = "#a9eaff";
      for (let i = 0; i < 9; i++) {
        const a = t * (.28 + i * .012) + i * TAU / 9, rx = base * (.47 + i % 3 * .025), ry = base * .16;
        ctx.globalAlpha = sparkleQ * (.3 + .55 * (.5 + .5 * Math.sin(t * 2.4 + i)));
        ctx.fillStyle = i % 3 ? "#dffaff" : "#ffffff"; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rx, anchorY - base * .34 + Math.sin(a) * ry, i % 3 ? 1.7 : 2.8, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawText(t, elapsed) {
    const cx = w / 2, base = cakeBaseForViewport(w, h), float = Math.sin(t * .85) * 2.5;
    const numberProgress = clamp((elapsed - 5.55) / 2.05, 0, 1), numberScale = Math.min(clamp(base * .34, 64, 145), h * .18) / 100, numberY = numberCenterY(h);
    numberStrokes.forEach(stroke => {
      const q = ease(clamp((numberProgress - stroke.delay) / (1 - stroke.delay), 0, 1));
      const numberMap = p => ({ x: cx + (p.x + stroke.offsetX) * numberScale, y: numberY + p.y * numberScale + float, depth: 0 });
      drawParticlePath(stroke.points, q, numberMap, stroke.color, reduced ? 2.05 : 2.4, t, stroke.delay * 7);
    });
    const numberReveal = ease(numberProgress);
    for (const p of ringDots) {
      const a = p.a + t * p.speed, x = cx + Math.cos(a) * p.r, y = numberY + float + Math.sin(a) * p.r * .36;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = numberReveal * (.24 + .25 * Math.sin(t * 2.2 + p.p)); ctx.fillStyle = p.a % 2 ? "#7de8ff" : "#ffffff"; ctx.shadowBlur = 8; ctx.shadowColor = "#8fdfff"; ctx.beginPath(); ctx.arc(x, y, 1 + Math.sin(t * 3 + p.p) * .35, 0, TAU); ctx.fill(); ctx.restore();
    }
    for (let index = 0; index < textRuns.length; index++) {
      const run = textRuns[index], q = clamp((elapsed - run.start) / run.duration, 0, 1);
      if (q <= 0) continue;
      const y = run.y + float + Math.sin(t * .9 + run.phase) * 1.2;
      if (run.characters) {
        ctx.save(); ctx.globalCompositeOperation = "source-over";
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        ctx.font = `600 ${run.fontSize}px "STKaiti", "KaiTi", "楷体", "Noto Serif SC", serif`;
        ctx.fillStyle = "#eee7ff"; ctx.shadowBlur = 6; ctx.shadowColor = "rgba(190, 176, 255, .42)";
        const spacing = run.fontSize * .08;
        const widths = run.characters.map(char => ctx.measureText(char).width);
        let x = cx - (widths.reduce((sum, width) => sum + width, 0) + spacing * (widths.length - 1)) / 2;
        const characterInterval = run.duration / run.characters.length;
        run.characters.forEach((char, charIndex) => {
          const progress = (elapsed - run.start - charIndex * characterInterval) / .34;
          const opacity = ease(clamp(progress, 0, 1));
          if (opacity > 0) {
            ctx.globalAlpha = opacity;
            ctx.fillText(char, x, y);
          }
          x += widths[charIndex] + spacing;
        });
        ctx.restore();
        continue;
      }
      if (!run.strokes.length) continue;
      const mapPoint = p => ({ x: cx + p.x, y: y + p.y, depth: 0 });
      run.strokes.forEach((stroke, strokeIndex) => {
        const strokeProgress = ease(clamp((q - stroke.from) / Math.max(.0001, stroke.to - stroke.from), 0, 1));
        drawParticlePath(stroke.points, strokeProgress, mapPoint, stroke.color, index === 0 ? (reduced ? 1.2 : 1.35) : (reduced ? 1.35 : 1.5), t, run.phase + strokeIndex * .73, false, .24, .78);
      });
    }
  }
  function draw(now) {
    const t = now / 1000, dt = Math.min(.04, (now - last) / 1000 || .016); last = now;
    const elapsed = (now - introStart) / 1000;
    if (intro && elapsed >= 12.2) { intro = false; stage.classList.remove("playing"); }
    drawBackground(t, elapsed); drawFireworks(dt); drawMeteors(dt, now); drawCake(t, elapsed); drawText(t, elapsed); drawBlessing(now);
    raf = requestAnimationFrame(draw);
  }
  function replayIntro() { intro = true; introStart = performance.now(); stage.classList.add("playing"); fireworks = []; meteors = []; activeBlessings = []; nextMeteorAt = 0; nextBlessingAt = 0; launchFirework(w * .22, h * .3); launchFirework(w * .78, h * .3); }
  replay.addEventListener("click", e => { e.stopPropagation(); replayIntro(); });
  stage.addEventListener("click", () => replayIntro());
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); } });
  resize(); replayIntro(); raf = requestAnimationFrame(draw);
})();
