import {
  STREAM_COLORS, buildHeadSize, buildTrailHeads, createCake, drawBuildHead,
  drawCake, randomRainbowColor, recolorCandles
} from "./cake.js?v=15";

(() => {
  "use strict";
  const canvas = document.getElementById("birthdayCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stage = document.querySelector(".stage");
  const replay = document.getElementById("replay");
  const invitation = document.getElementById("invitation");
  const invitationLights = document.getElementById("invitationLights");
  const invitationCtx = invitationLights.getContext("2d");
  const envelope = document.getElementById("envelope");
  const openInvitation = document.getElementById("openInvitation");
  const cakeHint = document.getElementById("cakeHint");
  const audio = document.getElementById("birthdayAudio");
  const audioToggle = document.getElementById("audioToggle");
  const volume = document.getElementById("volume");
  const volumeValue = document.getElementById("volumeValue");
  const audioStatus = document.getElementById("audioStatus");
  const TAU = Math.PI * 2;
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let scene = "invitation", opening = null, envelopeOrbit, invitationStart = 0;
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
  const nameBursts = [];
  const juiceParticles = [];
  let juiceCycle = -1;
  let juiceBursts = [false, false];
  let clickCount = 0;
  let secretCelebration = null;
  let nameCelebration = null;
  let celebrationCycle = -1;
  let stars = [], dust = [], fireworks = [], meteors = [], numberStrokes = [], ringDots = [];
  let audioUnavailable = false;
  const blessings = ["岁岁欢愉", "平安喜乐", "喜乐长安", "常乐常安", "温柔常伴", "清欢自在", "笑靥如花", "明媚如初", "可爱如初", "熠熠生辉", "光芒万丈", "万事胜意", "岁月静好", "芳华自在", "眉眼如初", "星河长明", "得偿所愿", "人间值得", "一生被爱", "岁岁平安", "喜乐无忧", "顺遂无虞"];
  let activeBlessings = [], lastBlessing = "", nextBlessingAt = 0, nextMeteorAt = 0;
  const palette = ["#dff8ff", "#86e7ff", "#4ac7ff", "#7e8dff", "#b89bff", "#ffffff"];
  const fireworkPalette = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6", "#bf5af2"];
  const secretBlessings = ["愿你一直可爱，也一直被爱", "愿你生活有惊喜，快乐有回音", "愿你的每一天都闪闪发光"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const invitationDust = Array.from({ length: 72 }, () => ({
    phase: rand(0, TAU), speed: rand(.1, .33), radius: rand(.76, 1.48),
    size: rand(.6, 2.1), color: Math.floor(rand(0, STREAM_COLORS.length))
  }));
  const passageDust = Array.from({ length: 100 }, (_, index) => ({
    angle: index * 2.39996, depth: rand(0, 1), speed: rand(.52, 1),
    size: rand(.6, 2), color: index % 4
  }));
  const invitationColors = [...STREAM_COLORS, "255,185,126"];

  function measureEnvelope() {
    const width = envelope.offsetWidth, height = envelope.offsetHeight;
    envelopeOrbit = {
      x: envelope.offsetLeft + width / 2, y: envelope.offsetTop + height / 2,
      rx: Math.min(w / 2 - 15, width * .69), ry: height * .82, width, height
    };
  }

  function orbitPoint(time, stream) {
    time -= invitationStart;
    const angle = time * (motionPreference.matches ? .23 : .88) + stream * TAU / 3;
    const { x, y, rx, ry } = envelopeOrbit;
    const tilt = .15 * Math.sin(time * .28 + stream * 2);
    return {
      x: x + Math.cos(angle) * rx * (.92 + .08 * Math.sin(angle - stream)),
      y: y + Math.sin(angle) * ry + Math.cos(angle) * rx * tilt
    };
  }

  function openingCurves() {
    const calm = motionPreference.matches;
    const ends = buildTrailHeads(0, layout, calm, lowDetail);
    const next = buildTrailHeads(.02, layout, calm, lowDetail);
    const flightTime = opening.time + opening.delay;
    const tangent = (opening.duration - opening.delay) / (.02 * 3);
    return ends.map((end, stream) => {
      const start = orbitPoint(flightTime, stream);
      const ahead = orbitPoint(flightTime + .02, stream);
      return [
        start,
        { x: start.x + (ahead.x - start.x) * tangent, y: start.y + (ahead.y - start.y) * tangent },
        { x: end.x - (next[stream].x - end.x) * tangent, y: end.y - (next[stream].y - end.y) * tangent },
        end
      ];
    });
  }

  function invitationPoint(time, stream) {
    if (!opening || time <= opening.time + opening.delay) return orbitPoint(time, stream);
    const [a, b, c, d] = opening.curves[stream];
    const q = clamp((time - opening.time - opening.delay) / (opening.duration - opening.delay), 0, 1);
    const m = 1 - q;
    const curl = opening.calm ? 0 : Math.sin(Math.PI * q) ** 2;
    const angle = q * TAU + stream * TAU / 3;
    return {
      x: m ** 3 * a.x + 3 * m * m * q * b.x + 3 * m * q * q * c.x + q ** 3 * d.x + curl * envelopeOrbit.rx * .26 * Math.cos(angle),
      y: m ** 3 * a.y + 3 * m * m * q * b.y + 3 * m * q * q * c.y + q ** 3 * d.y + curl * envelopeOrbit.ry * .35 * Math.sin(angle)
    };
  }

  function moveLetter(progress) {
    const flap = ease(progress / .3);
    const lift = ease((progress - .21) / .30);
    const push = ease((progress - .46) / .49);
    const calm = opening.calm;
    const { y, width, height } = envelopeOrbit;
    const scale = calm ? 1.12 : Math.max(w / (width * .88), h / (height * .87)) * 1.2;
    const rise = -(calm ? .15 : .54) * height * lift;
    const letterY = rise * (1 - push) + (h / 2 - y) * push;
    const style = invitation.style;
    style.setProperty("--flap-angle", `${-168 * flap}deg`);
    style.setProperty("--button-opacity", 1 - ease(progress / .11));
    style.setProperty("--flap-layer", flap < .54 ? 1 : "auto");
    style.setProperty("--letter-y", `${letterY}px`);
    style.setProperty("--letter-scale", 1 + (scale - 1) * push);
    style.setProperty("--letter-layer", push > .16 ? 1 : 0);
    style.setProperty("--pocket-y", `${push * 48}%`);
    style.setProperty("--shell-opacity", 1 - ease((progress - .59) / .22));
    style.setProperty("--title-opacity", 1 - ease((progress - .52) / .23));
    style.setProperty("--letter-opacity", 1 - ease((progress - .80) / .18));
    const ink = ease((progress - .62) / .27);
    style.setProperty("--ink-scale", ink * 1.8);
    style.setProperty("--ink-opacity", ease(ink * 2));
    return { x: w / 2, y: y + letterY, push };
  }

  function drawPassage(ctx, progress, center) {
    const light = ease((progress - .24) / .2) * (1 - ease((progress - .79) / .21));
    if (light <= 0) return;
    const a = opening.calm ? .32 : 1;
    const radius = Math.min(w, h) * (.13 + center.push * .64);
    const glow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
    glow.addColorStop(0, "rgba(174,202,255,.24)");
    glow.addColorStop(.42, "rgba(135,100,235,.16)");
    glow.addColorStop(1, "rgba(99,85,220,0)");
    ctx.globalAlpha = light * a;
    ctx.fillStyle = glow;
    ctx.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);

    const arcLight = light * ease((progress - .48) / .23) * a;
    if (arcLight > 0) {
      for (let i = 0; i < 4; i++) {
        const arcRadius = radius * (.23 + i * .23);
        const angle = i * 1.77 + center.push * 1.4;
        ctx.beginPath();
        ctx.ellipse(center.x, center.y, arcRadius, arcRadius * .72, -.24, angle, angle + 1.65);
        ctx.strokeStyle = `rgb(${invitationColors[i]})`;
        ctx.lineWidth = 4;
        ctx.globalAlpha = arcLight * .09;
        ctx.stroke();
        ctx.lineWidth = .8;
        ctx.globalAlpha = arcLight * .45;
        ctx.stroke();
      }
    }

    const count = reduced || lowDetail ? 50 : passageDust.length;
    for (let i = 0; i < count; i++) {
      const p = passageDust[i];
      const depth = (p.depth + center.push * p.speed * (opening.calm ? .28 : .91)) % 1;
      const distance = (.12 + depth ** 2.6 * 1.6) * radius;
      const angle = p.angle + center.push * .76 * a;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const x = center.x + dx * distance, y = center.y + dy * distance;
      const tail = depth ** 2 * radius * .15 * center.push * a;
      ctx.globalAlpha = light * a * ease(depth / .13) * (1 - ease((depth - .78) / .22));
      ctx.fillStyle = ctx.strokeStyle = `rgb(${invitationColors[p.color]})`;
      ctx.lineWidth = .7 + p.size * depth * .7;
      ctx.beginPath();
      ctx.moveTo(x - dx * tail, y - dy * tail);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillRect(x, y, p.size, p.size);
    }
  }

  function drawInvitationTrail(ctx, t, stream, fade, duration) {
    const steps = reduced || lowDetail ? 24 : 44;
    const points = Array.from({ length: steps + 1 }, (_, i) => invitationPoint(t - duration * i / steps, stream));
    const color = `rgb(${STREAM_COLORS[stream]})`;
    const age = t - invitationStart;
    for (let i = steps; i > 0; i--) {
      const p = points[i], next = points[i - 1], strength = (1 - i / (steps + 1)) ** 1.5;
      const tangent = Math.atan2(next.y - p.y, next.x - p.x);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(next.x, next.y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = strength * fade * .12;
      ctx.lineWidth = 4 + strength * 6;
      ctx.stroke();
      ctx.globalAlpha = strength * fade * .66;
      ctx.lineWidth = .55 + strength;
      ctx.stroke();
      if (i % 2 !== 0) continue;
      const ripple = Math.sin(age * 5 - i * .7) * (2 + i * .11);
      ctx.fillStyle = i % 4 === 0 ? "#ffe7b8" : color;
      ctx.globalAlpha = strength * fade * (.55 + .4 * Math.sin(i + age * 4) ** 2);
      ctx.fillRect(p.x - Math.sin(tangent) * ripple, p.y + Math.cos(tangent) * ripple, 1.4, 1.4);
    }
    return points[0];
  }

  function drawOrbitingSpecks(ctx, head, stream, time, fade, calm) {
    const count = reduced || lowDetail ? 5 : 8;
    const spin = time * (calm ? .9 : 3.2) + stream * 2.1;
    const tilt = stream * Math.PI / 3 + .26 * Math.sin(spin * .2);
    const cosTilt = Math.cos(tilt), sinTilt = Math.sin(tilt);
    const radius = reduced ? 14 : 20;
    for (let i = 0; i < count; i++) {
      const inner = i % 2 === 0;
      const angle = i / count * TAU + spin * (inner ? 1.28 : -.78);
      const orbit = radius * (inner ? .55 : 1);
      ctx.fillStyle = i % 3 === 0 ? "#ffdbac" : `rgb(${STREAM_COLORS[(stream + i % 2) % STREAM_COLORS.length]})`;
      for (let tail = 2; tail >= 0; tail--) {
        const phase = angle - tail * (inner ? .18 : -.18);
        const u = Math.cos(phase) * orbit, v = Math.sin(phase) * orbit * .48;
        const x = head.x + u * cosTilt - v * sinTilt;
        const y = head.y + u * sinTilt + v * cosTilt;
        const light = .55 + .45 * Math.sin(phase);
        const size = (.65 + light * .95) * (1 - tail * .18);
        ctx.globalAlpha = fade * (.38 + light * .62) * (1 - tail / 3);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
        if (tail === 0 && light > .75) {
          ctx.globalAlpha *= .36;
          ctx.fillRect(x - size * 2, y - .35, size * 4, .7);
          ctx.fillRect(x - .35, y - size * 2, .7, size * 4);
        }
      }
    }
  }

  function drawInvitation(t) {
    ctx.drawImage(background, 0, 0, w, h);
    const lights = invitationCtx;
    lights.clearRect(0, 0, w, h);
    const calm = motionPreference.matches;
    const progress = opening ? clamp((t - opening.time) / opening.duration, 0, 1) : 0;
    const fade = 1 - ease((progress - .29) / .71);
    const age = t - invitationStart;
    const { x, y, rx, ry } = envelopeOrbit;
    lights.save();
    lights.globalCompositeOperation = "lighter";
    if (opening) drawPassage(lights, progress, moveLetter(progress));
    const dustCount = reduced || lowDetail ? 32 : invitationDust.length;
    for (let i = 0; i < dustCount; i++) {
      const p = invitationDust[i];
      const angle = p.phase + age * p.speed * (calm ? .18 : 1);
      const px = x + Math.cos(angle) * Math.min(w * .48, rx * p.radius);
      const py = y + Math.sin(angle) * ry * p.radius;
      const pulse = .5 + .5 * Math.sin(age * 1.9 + p.phase * 3);
      lights.fillStyle = `rgb(${STREAM_COLORS[p.color]})`;
      lights.globalAlpha = fade * (.16 + pulse * .58);
      lights.fillRect(px, py, p.size, p.size);
      if (i % 11 === 0) {
        lights.fillRect(px - p.size, py + p.size * .35, p.size * 3, .7);
        lights.fillRect(px + p.size * .35, py - p.size, .7, p.size * 3);
      }
    }
    const size = buildHeadSize(layout, calm, lowDetail);
    const tailDuration = calm ? .34 : reduced ? .84 : 1.08;
    lights.lineCap = "round";
    for (let stream = 0; stream < STREAM_COLORS.length; stream++) {
      const head = drawInvitationTrail(lights, t, stream, fade, tailDuration);
      drawBuildHead(lights, cake, stream, head.x, head.y, size, 1);
      drawOrbitingSpecks(lights, head, stream, age, fade, calm);
    }
    lights.restore();
  }

  function showInvitation() {
    scene = "invitation";
    opening = null;
    invitationStart = performance.now() / 1000;
    invitation.removeAttribute("style");
    invitation.hidden = false;
    invitationLights.hidden = false;
    invitation.classList.remove("opening");
    openInvitation.disabled = false;
    replay.hidden = true;
    cakeHint.hidden = true;
    stage.classList.remove("playing");
    intro = true;
    introStart = 0;
    samples = slowSamples = 0;
    if (lowDetail) {
      lowDetail = false;
      resizeCanvas();
    }
    floatingHearts.length = 0;
    nameBursts.length = 0;
    juiceParticles.length = 0;
    juiceCycle = -1;
    juiceBursts = [false, false];
    secretCelebration = nameCelebration = null;
    clickCount = 0;
    celebrationCycle = -1;
    fireworks = [];
    meteors = [];
    activeBlessings = [];
    nextMeteorAt = nextBlessingAt = 0;
    measureEnvelope();
  }

  function beginOpening() {
    if (scene !== "invitation") return;
    scene = "opening";
    const calm = motionPreference.matches;
    opening = { time: performance.now() / 1000, duration: calm ? .85 : 3.1, delay: calm ? .12 : .75, calm };
    opening.curves = openingCurves();
    moveLetter(0);
    invitation.classList.add("opening");
    openInvitation.disabled = true;
  }

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

  function addNameBurst() {
    const now = performance.now();
    if (nameCelebration) { nameCelebration.end += 1000; return; }
    const particles = [], count = reduced ? 55 : 100;
    for (let i = 0; i < count; i++) {
      const angle = i / count * TAU + rand(-.12, .12), heartT = angle;
      const hx = 16 * Math.sin(heartT) ** 3, hy = -(13 * Math.cos(heartT) - 5 * Math.cos(2 * heartT) - 2 * Math.cos(3 * heartT) - Math.cos(4 * heartT));
      particles.push({ sx: layout.centerX + rand(-layout.nameSize * 1.7, layout.nameSize * 1.7), sy: layout.nameY + rand(-layout.nameSize * .45, layout.nameSize * .45), tx: layout.centerX + hx * layout.nameSize * .058, ty: layout.nameY + hy * layout.nameSize * .058, color: randomRainbowColor(), size: rand(1.4, 3.4), phase: rand(0, TAU) });
    }
    nameCelebration = { start: now, end: now + 3000, particles };
  }

  function drawNameBursts(now) {
    for (let i = nameBursts.length - 1; i >= 0; i--) {
      const p = nameBursts[i], q = (now - p.start) / p.life;
      if (q >= 1) { nameBursts.splice(i, 1); continue; }
      const x = p.x + p.vx * q, y = p.y + p.vy * q + 18 * q * q;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - q) * .9; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size); ctx.restore();
    }
    if (!nameCelebration) return;
    if (now > nameCelebration.end) { nameCelebration = null; return; }
    const elapsed = now - nameCelebration.start, q = elapsed / (nameCelebration.end - nameCelebration.start), form = ease(clamp((q - .08) / .28, 0, 1)), fade = 1 - ease((q - .82) / .18);
    for (const p of nameCelebration.particles) {
      const scatter = 1 - form, x = p.sx * scatter + p.tx * form + Math.cos(p.phase + elapsed * .004) * scatter * 18, y = p.sy * scatter + p.ty * form + Math.sin(p.phase + elapsed * .004) * scatter * 15;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fade * (.66 + .34 * Math.sin(elapsed * .008 + p.phase)); ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 12; ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size); ctx.restore();
    }
  }

  function burstJuice(now, burstIndex) {
    const colors = ["#ffffff", "#8ddcff", "#ffb15c"], count = reduced ? 18 : 34;
    const sliceX = layout.centerX + Math.min(w * .25, layout.cakeSize * .77);
    const sliceY = layout.cakeY - layout.cakeSize * .24;
    const sliceRadius = Math.min(layout.cakeSize * 1.72, w * .73) * .22;
    for (let i = 0; i < count; i++) {
      const angle = rand(0, TAU), radius = layout.cakeSize * rand(.34, .53);
      const x = sliceX + Math.cos(angle) * sliceRadius, y = sliceY + Math.sin(angle) * sliceRadius * .58;
      const speed = rand(55, 170) * (burstIndex ? 1.08 : 1);
      juiceParticles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - rand(2, 30), start: now, life: rand(620, 1080), color: colors[Math.floor(Math.random() * colors.length)], size: rand(1.2, 3.4) });
    }
  }

  function drawJuiceSpray(now, elapsed, focus) {
    const relative = elapsed - 16, cycle = relative >= 0 ? Math.floor(relative / 20) : -1, phase = relative >= 0 ? relative % 20 : -1;
    if (cycle !== juiceCycle) { juiceCycle = cycle; juiceBursts = [false, false]; }
    const burstTimes = [3.53, 5.4];
    if (cycle >= 0 && focus > .08) {
      burstTimes.forEach((time, index) => {
        if (!juiceBursts[index] && phase >= time && phase < time + .32) { juiceBursts[index] = true; burstJuice(now, index); }
      });
    }
    for (let i = juiceParticles.length - 1; i >= 0; i--) {
      const p = juiceParticles[i], q = (now - p.start) / p.life;
      if (q >= 1) { juiceParticles.splice(i, 1); continue; }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - q) * .85; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      const x = p.x + p.vx * q, y = p.y + p.vy * q + 48 * q * q;
      ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      ctx.globalAlpha *= .35; ctx.fillRect(x - p.vx * .035, y - p.vy * .035, p.size * .7, p.size * .7); ctx.restore();
    }
  }

  function launchFullHeartCelebration(now) {
    const hearts = [];
    for (let i = 0; i < (reduced ? 24 : 42); i++) {
      const color = randomRainbowColor();
      if (!heartSprites.has(color)) {
        const sprite = document.createElement("canvas"); sprite.width = cake.heart.width; sprite.height = cake.heart.height;
        const target = sprite.getContext("2d"); target.drawImage(cake.heart, 0, 0); target.globalCompositeOperation = "source-in"; target.fillStyle = color; target.fillRect(0, 0, sprite.width, sprite.height); heartSprites.set(color, sprite);
      }
      hearts.push({ x: rand(18, w - 18), y: h + rand(10, h * .45), color, sprite: heartSprites.get(color), size: rand(18, 48), start: now + rand(0, 900), duration: rand(3300, 5100), sway: rand(10, 34), rise: rand(h * .55, h * .95), phase: rand(0, TAU) });
    }
    secretCelebration = { hearts, text: secretBlessings[Math.floor(Math.random() * secretBlessings.length)], start: now, end: now + 6200 };
  }

  function drawSecretCelebration(now) {
    if (!secretCelebration) return;
    if (now > secretCelebration.end) { secretCelebration = null; return; }
    const q = 1 - (secretCelebration.end - now) / 6200;
    for (const heart of secretCelebration.hearts) {
      if (now < heart.start) continue;
      const age = now - heart.start, progress = Math.min(1, age / heart.duration), angle = heart.phase + progress * TAU * 1.5;
      const x = clamp(heart.x + Math.sin(angle) * heart.sway, heart.size / 2, w - heart.size / 2);
      const y = heart.y - heart.rise * progress;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - progress) * (1 - ease((q - .8) / .2)); ctx.translate(x, y); ctx.rotate(Math.sin(angle) * .18); ctx.drawImage(heart.sprite, -heart.size / 2, -heart.size / 2, heart.size, heart.size); ctx.restore();
    }
    const textY = layout.numberY + layout.numberSize * .72 + (layout.cakeY - layout.numberY) * .18;
    const textSize = clamp(Math.min(w, h) * .065, 22, 36);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, ease(q * 4)) * (1 - ease((q - .78) / .22)); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `400 ${textSize}px "Birthday Name", "YouYuan", sans-serif`; const textGradient = ctx.createLinearGradient(layout.centerX - textSize * 5, textY, layout.centerX + textSize * 5, textY); textGradient.addColorStop(0, "#8edcff"); textGradient.addColorStop(.5, "#ffffff"); textGradient.addColorStop(1, "#b9d7ff"); ctx.fillStyle = textGradient; ctx.shadowColor = "#86dfff"; ctx.shadowBlur = 20; ctx.fillText(secretCelebration.text, layout.centerX, textY + Math.sin(q * TAU * 2) * 2); ctx.restore();
  }

  function drawFinalCelebration(now, elapsed) {
    if (intro || elapsed < 25) return;
    const cycle = Math.floor((elapsed - 25) / 36);
    if (cycle !== celebrationCycle) { celebrationCycle = cycle; launchFirework(w * .2, h * .3); launchFirework(w * .8, h * .3); }
    const phase = (elapsed - 25) % 36;
    if (phase > 7) return;
    const alpha = Math.sin(Math.PI * phase / 7) * .72;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = alpha;
    const gradient = ctx.createRadialGradient(layout.centerX, layout.cakeY, 0, layout.centerX, layout.cakeY, layout.cakeSize * .9); gradient.addColorStop(0, "rgba(255,220,130,.24)"); gradient.addColorStop(1, "rgba(255,80,190,0)"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    const ringY = layout.cakeY - layout.cakeSize * .46, ringRadius = layout.cakeSize * .32;
    ctx.strokeStyle = "rgba(255,215,126,.86)"; ctx.lineWidth = Math.max(1.5, layout.cakeSize * .009); ctx.shadowColor = "#ff7bd5"; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(layout.centerX, ringY, ringRadius * (1 + .08 * Math.sin(phase * 2)), 0, TAU); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `700 ${Math.max(11, layout.cakeSize * .052)}px "Birthday Name", sans-serif`; ctx.fillStyle = "#fff1bf"; ctx.fillText("Happy Birthday", layout.centerX, ringY);
    for (let i = 0; i < 28; i++) {
      const angle = i / 28 * TAU + phase * .7, radius = ringRadius * (1.16 + .14 * Math.sin(i * 2.7 + phase));
      const x = layout.centerX + Math.cos(angle) * radius, y = ringY + Math.sin(angle) * radius * .38;
      ctx.fillStyle = ["#ff5d8f", "#ffd45e", "#67e8ff", "#bf8cff"][i % 4]; ctx.globalAlpha = alpha * (.45 + .45 * Math.sin(phase * 3 + i)); ctx.fillRect(x, y, 2.2, 2.2);
    }
    ctx.restore();
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
    const invitationRatio = Math.min(pixelRatio, 1.1);
    invitationLights.width = Math.max(1, Math.round(w * invitationRatio));
    invitationLights.height = Math.max(1, Math.round(h * invitationRatio));
    invitationCtx.setTransform(invitationLights.width / w, 0, 0, invitationLights.height / h, 0, 0);
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
    if (scene !== "cake") {
      measureEnvelope();
      if (opening) opening.curves = openingCurves();
    }
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
      audioStatus.textContent = "自动播放受限，请点播放音乐";
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
    if (scene === "opening" && t >= opening.time + opening.duration) {
      startCake((opening.time + opening.duration) * 1000);
    }
    if (scene !== "cake") {
      drawInvitation(t);
      requestAnimationFrame(draw);
      return;
    }
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
    drawJuiceSpray(now, elapsed, sliceFocus);
    drawText(t, elapsed); drawNameBursts(now); drawBlessing(now, 1 - sliceFocus);
    drawFloatingHearts(now);
    drawSecretCelebration(now);
    drawFinalCelebration(now, elapsed);
    requestAnimationFrame(draw);
  }
  function startCake(start) {
    scene = "cake";
    opening = null;
    invitation.hidden = true;
    invitationLights.hidden = true;
    replay.hidden = false;
    cakeHint.hidden = false;
    recolorCandles(cake);
    const digitColor = randomRainbowColor();
    digitColors = [digitColor, digitColor];
    intro = true;
    introStart = start;
    stage.classList.add("playing");
    launchFirework(w * .22, h * .3);
    launchFirework(w * .78, h * .3);
  }
  openInvitation.addEventListener("click", beginOpening);
  replay.addEventListener("click", event => {
    event.stopPropagation();
    showInvitation();
    if (event.detail === 0) openInvitation.focus({ preventScroll: true });
  });
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
  startMusic();
  stage.addEventListener("click", event => {
    if (scene === "cake" && !event.target.closest(".audio-controls, .invitation") && event.target !== replay) {
      const bounds = stage.getBoundingClientRect();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      clickCount++;
      if (Math.abs(x - layout.centerX) < layout.nameSize * 1.9 && Math.abs(y - layout.nameY) < layout.nameSize * .75) addNameBurst();
      if (clickCount >= 21) { launchFullHeartCelebration(performance.now()); clickCount = 0; }
      addFloatingHeart(event);
    }
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
  resize();
  showInvitation();
  requestAnimationFrame(draw);
})();
