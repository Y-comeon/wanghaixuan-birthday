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
  let stars = [], dust = [], fireworks = [], meteors = [], cakeDots = [], cakeDecor = [], textDots = [], ringDots = [];
  const blessings = ["岁岁欢愉", "平安喜乐", "喜乐长安", "常乐常安", "温柔常伴", "清欢自在", "笑靥如花", "明媚如初", "可爱如初", "熠熠生辉", "光芒万丈", "万事胜意", "岁月静好", "芳华自在", "眉眼如初", "星河长明", "得偿所愿", "人间值得", "一生被爱", "岁岁平安", "喜乐无忧", "顺遂无虞"];
  let activeBlessings = [], lastBlessing = "", nextBlessingAt = 0, nextMeteorAt = 0;
  const palette = ["#dff8ff", "#86e7ff", "#4ac7ff", "#7e8dff", "#b89bff", "#ffffff"];
  const fireworkPalette = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#5e5ce6", "#bf5af2"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
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
    cakeDots = []; cakeDecor = []; textDots = []; ringDots = [];
    const cx = w / 2, base = Math.min(w * .73, 430), bottom = h * .69;
    const tiers = [
      { width: base * .92, height: base * .18, y: bottom - base * .06 },
      { width: base * .72, height: base * .17, y: bottom - base * .25 },
      { width: base * .52, height: base * .16, y: bottom - base * .42 }
    ];
    tiers.forEach((tier, layer) => {
      const count = reduced ? 42 : 72;
      for (let i = 0; i < count; i++) {
        const x = cx - tier.width / 2 + (i / (count - 1)) * tier.width;
        const y = tier.y - tier.height / 2 + Math.sin(i * 1.7) * 2;
        cakeDots.push({ x: cx + rand(-base * .04, base * .04), y: tier.y, tx: x, ty: y, delay: layer * .13 + i / count * .16, c: palette[(i + layer) % palette.length] });
      }
      for (let i = 0; i < (reduced ? 16 : 28); i++) {
        const x = cx - tier.width / 2 + (i / 27) * tier.width;
        cakeDots.push({ x: cx, y: tier.y, tx: x, ty: tier.y - tier.height * .56 - Math.sin(i * 1.1) * 4, delay: .22 + layer * .12 + i / 170, c: i % 2 ? "#a9efff" : "#ffffff" });
      }
      const sprinkles = reduced ? 8 : 15;
      for (let i = 0; i < sprinkles; i++) cakeDecor.push({ type: "sprinkle", layer, x: cx - tier.width * .4 + rand(0, tier.width * .8), y: tier.y + rand(-tier.height * .2, tier.height * .32), angle: rand(-.7, .7), color: ["#ffffff", "#7de5ff", "#e7a8ff", "#ffe6a3"][i % 4] });
      const drips = reduced ? 4 : 7;
      for (let i = 0; i < drips; i++) cakeDecor.push({ type: "drip", layer, x: cx - tier.width * .42 + rand(0, tier.width * .84), y: tier.y - tier.height * .38, length: rand(7, 18), width: rand(3, 7) });
      const candies = reduced ? 5 : 10;
      for (let i = 0; i < candies; i++) cakeDecor.push({ type: i % 3 === 0 ? "star" : "pearl", layer, x: cx - tier.width * .38 + rand(0, tier.width * .76), y: tier.y + rand(-tier.height * .08, tier.height * .22), radius: rand(2.5, 4.5), color: ["#fff1bd", "#f4d7ff", "#d9fbff"][i % 3], phase: rand(0, TAU) });
    });
    const plateWidth = base * 1.02;
    for (let i = 0; i < (reduced ? 30 : 55); i++) {
      const a = i / (reduced ? 30 : 55) * TAU;
      cakeDots.push({ x: cx, y: bottom + 3, tx: cx + Math.cos(a) * plateWidth / 2, ty: bottom + Math.sin(a) * plateWidth * .08 + 5, delay: .05 + i / 300, c: "#dff8ff" });
    }
    nextBlessingAt = 0; nextMeteorAt = 0; activeBlessings = []; lastBlessing = ""; meteors = [];
    const ringR = base * .33;
    for (let i = 0; i < (reduced ? 28 : 52); i++) ringDots.push({ a: i / 52 * TAU, r: ringR * rand(.93, 1.07), speed: rand(.2, .55), p: rand(0, TAU) });
  }
  function launchFirework(x = rand(w * .1, w * .9), y = rand(h * .16, h * .48)) {
    const count = reduced ? 18 : 34, hue = fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)];
    fireworks.push({ x, y, age: 0, life: rand(1.2, 2.1), hue, particles: Array.from({ length: count }, (_, i) => ({ a: i / count * TAU + rand(-.04, .04), speed: rand(35, 125), r: rand(.6, 2.2) })) });
  }
  function drawBackground(t) {
    const g = ctx.createRadialGradient(w * .5, h * .45, 0, w * .5, h * .45, Math.max(w, h) * .7);
    g.addColorStop(0, "#122e78"); g.addColorStop(.48, "#07153f"); g.addColorStop(1, "#02051b"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (const s of stars) { const a = s.a * (.65 + Math.sin(t * s.s + s.p) * .35); ctx.globalAlpha = a; ctx.fillStyle = "#d8f7ff"; ctx.shadowBlur = 8; ctx.shadowColor = "#68dfff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
    for (const p of dust) { p.y += p.vy; p.x += p.vx; if (p.y > h + 4) p.y = -4; ctx.globalAlpha = p.a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
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
    const speed = rand(Math.max(w, h) * .4, Math.max(w, h) * .7);
    meteors.push({ x: startX, y: startY, dx, dy, age: 0, life: distance / speed, length: rand(150, 260), width: rand(2.5, 4.2), color: Math.random() < .76 ? "#e7fbff" : "#d3c7ff", sparks: Array.from({ length: reduced ? 2 : 6 }, () => ({ offset: rand(.18, .88), side: rand(-9, 9), radius: rand(1, 2.8) })) });
    nextMeteorAt = now + rand(reduced ? 7 : 1.4, reduced ? 12 : 4.2) * 1000;
  }
  function drawMeteors(dt, now) {
    scheduleMeteor(now);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.age += dt; const q = m.age / m.life;
      if (q >= 1) { meteors.splice(i, 1); continue; }
      const x = m.x + m.dx * q, y = m.y + m.dy * q;
      const mag = Math.hypot(m.dx, m.dy) || 1, ux = m.dx / mag, uy = m.dy / mag;
      const fade = Math.min(1, q * 5, (1 - q) * 4 + .12);
      const tailX = x - ux * m.length, tailY = y - uy * m.length;
      const tail = ctx.createLinearGradient(tailX, tailY, x, y);
      tail.addColorStop(0, "rgba(112,178,255,0)"); tail.addColorStop(.55, m.color + "88"); tail.addColorStop(1, "#ffffff");
      ctx.globalAlpha = fade * .9; ctx.strokeStyle = tail; ctx.lineWidth = m.width; ctx.shadowBlur = 28; ctx.shadowColor = m.color; ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = fade; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = Math.max(1, m.width * .34); ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(x - ux * m.length * .78, y - uy * m.length * .78); ctx.lineTo(x, y); ctx.stroke();
      for (const spark of m.sparks) { const sx = x - ux * m.length * spark.offset - uy * spark.side, sy = y - uy * m.length * spark.offset + ux * spark.side; ctx.globalAlpha = fade * (1 - spark.offset) * .8; ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(sx, sy, spark.radius, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = fade; ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 36; ctx.shadowColor = "#bfeeff"; ctx.beginPath(); ctx.arc(x, y, reduced ? 3 : 5, 0, TAU); ctx.fill(); ctx.fillStyle = m.color; ctx.shadowBlur = 48; ctx.beginPath(); ctx.arc(x, y, reduced ? 1.7 : 2.7, 0, TAU); ctx.fill();
    }
    ctx.restore();
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
  function drawCake(t, progress) {
    const cx = w / 2, base = Math.min(w * .73, 430), bottom = h * .69;
    const cakeIn = ease(clamp((progress - .1) / .55, 0, 1));
    const tiers = [
      { width: base * .92, height: base * .18, y: bottom - base * .06 },
      { width: base * .72, height: base * .17, y: bottom - base * .25 },
      { width: base * .52, height: base * .16, y: bottom - base * .42 }
    ];
    ctx.save(); ctx.lineCap = "round";
    for (const p of cakeDots) { const q = ease(clamp((cakeIn - p.delay) / .5, 0, 1)); const x = p.x + (p.tx - p.x) * q, y = p.y + (p.ty - p.y) * q; ctx.globalAlpha = q * (.52 + .38 * Math.sin(t * 3 + x)); ctx.fillStyle = p.c; ctx.shadowBlur = 12; ctx.shadowColor = p.c; ctx.beginPath(); ctx.arc(x, y, reduced ? 1.2 : 1.7, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = cakeIn * .92; ctx.shadowBlur = 0;
    tiers.forEach((tier, layer) => {
      const x = cx - tier.width / 2, y = tier.y - tier.height / 2;
      ctx.save();
      ctx.shadowBlur = 25; ctx.shadowColor = "rgba(26,143,255,.55)";
      const face = ctx.createLinearGradient(0, y, 0, y + tier.height); face.addColorStop(0, layer === 2 ? "#c8f8ff" : "#7ed7f7"); face.addColorStop(.2, layer === 2 ? "#78cfff" : "#438fc7"); face.addColorStop(.58, layer === 2 ? "#468fd0" : "#2c67a4"); face.addColorStop(1, "#102b62"); ctx.fillStyle = face; ctx.strokeStyle = "#b9f4ff"; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.roundRect(x, y, tier.width, tier.height, tier.height * .16); ctx.fill(); ctx.stroke();
      const side = ctx.createLinearGradient(x, y, x, y + tier.height); side.addColorStop(0, "rgba(8,44,103,.05)"); side.addColorStop(.5, "rgba(7,30,75,.28)"); side.addColorStop(1, "rgba(2,10,39,.82)"); ctx.fillStyle = side; ctx.beginPath(); ctx.moveTo(x, y + tier.height * .12); ctx.lineTo(x + tier.width, y + tier.height * .12); ctx.lineTo(x + tier.width, y + tier.height); ctx.lineTo(x, y + tier.height); ctx.closePath(); ctx.fill();
      const top = ctx.createLinearGradient(0, y - tier.height * .18, 0, y + tier.height * .3); top.addColorStop(0, "#ffffff"); top.addColorStop(.38, layer === 2 ? "#f4ffff" : "#d6f8ff"); top.addColorStop(1, "#81cce9"); ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, y + tier.height * .12, tier.width * .5, tier.height * .3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, tier.width, tier.height, tier.height * .16); ctx.clip();
      const glaze = ctx.createLinearGradient(0, y, 0, y + tier.height * .4); glaze.addColorStop(0, "rgba(255,255,255,.42)"); glaze.addColorStop(1, "rgba(174,238,255,0)"); ctx.fillStyle = glaze; ctx.fillRect(x, y + tier.height * .12, tier.width, tier.height * .27);
      ctx.strokeStyle = "rgba(235,252,255,.34)"; ctx.lineWidth = 1; for (let stripe = 0; stripe < 4; stripe++) { const sy = y + tier.height * (.38 + stripe * .13); ctx.beginPath(); ctx.moveTo(x + tier.width * .08, sy); ctx.bezierCurveTo(cx - tier.width * .18, sy - 3, cx + tier.width * .18, sy + 4, x + tier.width * .92, sy - 2); ctx.stroke(); }
      ctx.restore();
      ctx.restore();
    });
    for (const d of cakeDecor) { const alpha = cakeIn * (.76 + Math.sin(t * 2 + d.x) * .12); ctx.globalAlpha = alpha; if (d.type === "drip") { ctx.fillStyle = "#f5ffff"; ctx.shadowBlur = 13; ctx.shadowColor = "#75dcff"; ctx.beginPath(); ctx.moveTo(d.x - d.width, d.y); ctx.quadraticCurveTo(d.x, d.y - 4, d.x + d.width, d.y + 1); ctx.lineTo(d.x + d.width * .75, d.y + d.length * .72); ctx.quadraticCurveTo(d.x, d.y + d.length + Math.sin(t * 1.4 + d.x) * 1.5, d.x - d.width * .75, d.y + d.length * .72); ctx.closePath(); ctx.fill(); } else if (d.type === "sprinkle") { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle); ctx.fillStyle = d.color; ctx.shadowBlur = 8; ctx.shadowColor = d.color; ctx.fillRect(-1.3, -5, 2.6, 10); ctx.restore(); } else { const pulse = .8 + .2 * Math.sin(t * 3 + d.phase); ctx.fillStyle = d.color; ctx.shadowBlur = d.type === "star" ? 12 : 8; ctx.shadowColor = d.color; if (d.type === "star") { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(t * .12 + d.phase); ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = d.radius * (k % 2 ? .45 : 1) * pulse; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); } else { ctx.beginPath(); ctx.arc(d.x, d.y, d.radius * pulse, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(d.x - 1, d.y - 1, d.radius * .28, 0, TAU); ctx.fill(); } } }
    ctx.globalAlpha = cakeIn * .7; ctx.fillStyle = "rgba(1,12,50,.75)"; ctx.shadowBlur = 28; ctx.shadowColor = "#0b6fc5"; ctx.beginPath(); ctx.ellipse(cx, bottom + 13, base * .57, base * .075, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(105,207,255,.32)"; ctx.shadowBlur = 25; ctx.beginPath(); ctx.ellipse(cx, bottom + 6, base * .55, base * .07, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(229,250,255,.22)"; ctx.beginPath(); ctx.ellipse(cx, bottom + 1, base * .52, base * .06, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#d1f8ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, bottom + 4, base * .53, base * .055, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, bottom + 2, base * .48, base * .04, 0, 0, TAU); ctx.stroke();
    const candleIn = ease(clamp((progress - .6) / .24, 0, 1)); const candleY = bottom - base * .59; const candleXs = [-.18, -.06, .06, .18].map(v => cx + base * v);
    ctx.globalAlpha = candleIn; candleXs.forEach((x, i) => { const height = base * (.12 + (i % 2) * .025); ctx.fillStyle = i % 2 ? "#ecffff" : "#69cfff"; ctx.shadowBlur = 16; ctx.shadowColor = "#81eaff"; ctx.fillRect(x - 5, candleY - height, 10, height); ctx.strokeStyle = "#dffaff"; ctx.lineWidth = 1; for (let y = candleY - height + 7; y < candleY; y += 10) { ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y + 4); ctx.stroke(); } ctx.fillStyle = "#6dbce9"; ctx.beginPath(); ctx.ellipse(x, candleY, 5, 2.5, 0, 0, TAU); ctx.fill(); const fy = candleY - height - 8 + Math.sin(t * 6 + i) * 2; ctx.fillStyle = "#ffd98a"; ctx.shadowBlur = 23; ctx.shadowColor = "#ffad55"; ctx.beginPath(); ctx.ellipse(x, fy, 5, 9 + Math.sin(t * 7 + i) * 2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(x, fy + 2, 2, 5, 0, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function drawText(t, progress) {
    const cx = w / 2, base = Math.min(w * .73, 430), bottom = h * .69;
    const numIn = ease(clamp((progress - .62) / .3, 0, 1));
    const float = Math.sin(t * .9) * 5, size = clamp(base * .22, 62, 112);
    ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.globalCompositeOperation = "lighter";
    ctx.font = `700 ${size}px Cinzel, Georgia, serif`; ctx.globalAlpha = numIn; ctx.shadowBlur = 34; ctx.shadowColor = "#8fdfff"; const grad = ctx.createLinearGradient(cx - size, 0, cx + size, 0); grad.addColorStop(0, "#84dfff"); grad.addColorStop(.5, "#ffffff"); grad.addColorStop(1, "#9aa5ff"); ctx.fillStyle = grad; ctx.fillText("21", cx, h * .19 + float);
    for (const p of ringDots) { const a = p.a + t * p.speed, x = cx + Math.cos(a) * p.r, y = h * .19 + float + Math.sin(a) * p.r * .34; ctx.globalAlpha = numIn * .65; ctx.fillStyle = p.a % 2 ? "#7de8ff" : "#ffffff"; ctx.beginPath(); ctx.arc(x, y, 1.4 + Math.sin(t * 3 + p.p), 0, TAU); ctx.fill(); }
    const copyIn = ease(clamp((progress - .72) / .27, 0, 1)), shine = (t * 38) % (w * .9) - w * .45;
    const copyY = bottom + base * .19 + Math.sin(t * 1.1) * 2; const englishSize = clamp(base * .105, 26, 43); const nameSize = clamp(base * .085, 23, 36);
    ctx.globalAlpha = copyIn; ctx.shadowBlur = 22; ctx.shadowColor = "#4ccfff"; ctx.font = `${englishSize}px "Great Vibes", "Segoe Script", cursive`; const eg = ctx.createLinearGradient(cx - base * .4, 0, cx + base * .4, 0); eg.addColorStop(0, "#77dcff"); eg.addColorStop(.5, "#ffffff"); eg.addColorStop(1, "#b5a7ff"); ctx.fillStyle = eg; ctx.strokeStyle = "rgba(225,251,255,.8)"; ctx.lineWidth = 1; ctx.strokeText("Happy Birthday for", cx, copyY); ctx.fillText("Happy Birthday for", cx, copyY);
    ctx.globalAlpha = copyIn * .96; ctx.font = `700 ${nameSize}px "STKaiti", "KaiTi", "Noto Serif SC", serif`; ctx.shadowBlur = 18; ctx.fillText("王海璇", cx, copyY + nameSize * .92);
    ctx.globalAlpha = copyIn * .6; ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - base * .43 + shine, copyY - 19, 25, 3); ctx.restore();
  }
  function draw(now) {
    const t = now / 1000, dt = Math.min(.04, (now - last) / 1000 || .016); last = now;
    const elapsed = (now - introStart) / 1000, progress = intro ? clamp(elapsed / 7.8, 0, 1) : 1;
    if (intro && progress >= 1) { intro = false; stage.classList.remove("playing"); }
    drawBackground(t); drawFireworks(dt); drawMeteors(dt, now); drawCake(t, progress); drawText(t, progress); drawBlessing(now);
    raf = requestAnimationFrame(draw);
  }
  function replayIntro() { intro = true; introStart = performance.now(); stage.classList.add("playing"); fireworks = []; launchFirework(w * .22, h * .3); launchFirework(w * .78, h * .26); }
  replay.addEventListener("click", e => { e.stopPropagation(); replayIntro(); });
  stage.addEventListener("click", () => replayIntro());
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = performance.now(); } });
  resize(); replayIntro(); raf = requestAnimationFrame(draw);
})();
