const TAU = Math.PI * 2;
const BUILD_END = 5.55;
const FOCAL = 3.05;
const DEPTH_LEVELS = 5;
const COLORS = ["64,153,255", "74,194,255", "129,220,255", "220,250,255", "255,207,134", "207,169,253", "255,157,193"];
const FIRST_CUT = 16;
const CUT_INTERVAL = 20;
const SLICE_RETURN = 8.15;
const CUT_DURATION = 12;
const CUT_ANGLE = -2.45;
const CUT_HALF_WIDTH = .50;
const CUT_EDGE = Math.cos(CUT_HALF_WIDTH);
const SLICE_CENTER = { x: .27 * Math.cos(CUT_ANGLE), y: .107, z: .27 * Math.sin(CUT_ANGLE) * .88 };
const HEARTS = [
  { x: -.156, y: -.261, size: .079, phase: 0 },
  { x: .115, y: -.265, size: .062, phase: 1.4 },
  { x: .227, y: -.120, size: .047, phase: 2.9 },
  { x: -.153, y: .204, size: .057, phase: 4 },
  { x: .123, y: .231, size: .071, phase: 5.3 }
];
const rand = (min, max) => min + Math.random() * (max - min);
const clamp01 = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const q = clamp01(value);
  return q * q * (3 - 2 * q);
};

function glowSprite(color) {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 32;
  const ctx = sprite.getContext("2d");
  const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  glow.addColorStop(0, "rgba(255,255,255,.95)");
  glow.addColorStop(.13, `rgba(${color},.8)`);
  glow.addColorStop(.4, `rgba(${color},.24)`);
  glow.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 32, 32);
  return sprite;
}

function createHeartSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 80;
  const ctx = sprite.getContext("2d");
  const outline = new Path2D();
  outline.moveTo(40, 26);
  outline.bezierCurveTo(27, 3, 7, 8, 6, 28);
  outline.bezierCurveTo(4, 47, 25, 63, 40, 75);
  outline.bezierCurveTo(55, 63, 76, 47, 74, 28);
  outline.bezierCurveTo(73, 8, 53, 3, 40, 26);
  outline.closePath();

  // Sample the contour more tightly so the dip and tip survive downscaling.
  const edges = [new Path2D(), new Path2D()];
  for (let y = 7; y < 77; y += 1.65) {
    for (let x = 4; x < 77; x += 1.65) {
      if (!ctx.isPointInPath(outline, x, y)) continue;
      const inside = ctx.isPointInPath(outline, x - 1.8, y) && ctx.isPointInPath(outline, x + 1.8, y)
        && ctx.isPointInPath(outline, x, y - 1.8) && ctx.isPointInPath(outline, x, y + 1.8);
      if (inside) continue;
      const radius = rand(.86, 1.22);
      const edge = edges[y < 35 && x < 43 ? 0 : 1];
      edge.moveTo(x + radius, y);
      edge.arc(x, y, radius, 0, TAU);
    }
  }
  ctx.fillStyle = "#f78590";
  ctx.fill(edges[0]);
  ctx.fillStyle = "#dd4a61";
  ctx.fill(edges[1]);

  const colors = ["#9e2c42", "#bd384f", "#dc5669", "#ec7482"];
  for (let y = 11; y < 74; y += 2.9) {
    for (let x = 8; x < 74; x += 2.9) {
      const px = x + rand(-.53, .53), py = y + rand(-.53, .53);
      if (!ctx.isPointInPath(outline, px, py)) continue;
      const shine = Math.exp(-(((px - 26) / 17) ** 2 + ((py - 24) / 16) ** 2));
      const tone = Math.min(3, Math.floor(rand(0, 2.5) + shine * 1.35));
      ctx.fillStyle = colors[tone];
      ctx.globalAlpha = rand(.74, .96);
      ctx.beginPath();
      ctx.arc(px, py, rand(1.03, 1.41), 0, TAU);
      ctx.fill();
    }
  }
  return sprite;
}

export function createCake(compact) {
  const particles = [];
  const count = amount => Math.round(amount * (compact ? .44 : .77));
  let cuttable = false;
  const add = (angle, radius, y, color, start, end, size, side = false) => {
    particles.push({
      angle, radius, x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius * .88,
      cut: cuttable && Math.cos(angle - CUT_ANGLE) > CUT_EDGE,
      color, start, end, size, side, drift: rand(0, TAU), scatter: rand(.35, .64)
    });
  };

  for (let i = 0; i < count(1250); i++) {
    const radius = i % 3 ? rand(.465, .56) : rand(.548, .564);
    const rim = radius > .535;
    const start = rand(.18, .63);
    add(rand(0, TAU), radius, rand(-.019, .017), rim ? 2 : 1, start, start + rand(.7, 1.16),
      rim ? rand(.72, 1.55) : rand(.43, 1.12));
  }

  const tiers = [
    { radius: .47, top: .19, bottom: .024, start: .65, drips: 14, beads: 20, density: 1 },
    { radius: .357, top: .376, bottom: .193, start: 1.83, drips: 12, beads: 16, density: .87 },
    { radius: .241, top: .548, bottom: .379, start: 2.96, drips: 9, beads: 12, density: .65 }
  ];
  for (const [layer, tier] of tiers.entries()) {
    cuttable = layer === 0;
    const { radius, top, bottom, start, drips, beads, density } = tier;
    const height = top - bottom;
    const innerRadius = tiers[layer + 1]?.radius ?? 0;
    for (let i = 0; i < count(2180 * density); i++) {
      const angle = rand(0, TAU);
      const level = rand(0, 1);
      const y = bottom + height * level;
      const brightBand = Math.abs(level - .28) < .085 || level < .12;
      const tone = brightBand ? 1 : (Math.random() < .72 ? 0 : 1);
      const arrival = start + level * .4 + rand(0, .32);
      add(angle, radius + rand(-.013, .009), y, tone, arrival, arrival + rand(.73, 1.25),
        rand(.68, 1.48), true);
    }
    for (let i = 0; i < count(1120 * density); i++) {
      const angle = rand(0, TAU);
      const r = Math.sqrt(rand(innerRadius ** 2, radius ** 2));
      const arrival = start + rand(.27, .73);
      add(angle, r, top + rand(-.006, .006), Math.random() < .58 ? 1 : 2, arrival,
        arrival + rand(.65, 1.09), rand(.62, 1.49));
    }
    for (let i = 0; i < count(960 * density); i++) {
      const angle = rand(0, TAU);
      const drip = Math.max(0, Math.sin(angle * drips + layer * 1.8)) ** 4;
      const y = top - rand(.002, .012) - drip * rand(.032, .072);
      const arrival = start + rand(.51, .88);
      add(angle, radius + rand(.001, .013), y, Math.random() < .24 ? 3 : 2,
        arrival, arrival + rand(.63, 1.06), rand(.54, 1.45), true);
    }
    for (let i = 0; i < beads; i++) {
      const angle = i / beads * TAU + layer * .23;
      const y = bottom + height * .35 + Math.sin(angle * 3 + layer) * .015;
      for (let j = 0; j < count(i % 5 === layer ? 32 : 15); j++) {
        const arrival = start + rand(.72, .95);
        add(angle + rand(-.026, .026), radius + rand(.007, .014), y + rand(-.01, .01),
          i % 5 === layer ? 4 : 3, arrival, arrival + rand(.64, 1.08), rand(.55, 1.30), true);
      }
    }
  }
  const cutFaces = createCutFaces(tiers[0], tiers[1].radius, compact);

  const candleLayout = [
    { x: -.11, z: .045, height: .111 },
    { x: .015, z: -.068, height: .146 },
    { x: .112, z: .066, height: .098 }
  ];
  const flames = [];
  for (const [index, { x, z, height }] of candleLayout.entries()) {
    const top = tiers[2].top + height;
    for (let i = 0; i < count(235); i++) {
      const a = rand(0, TAU);
      const level = rand(0, 1);
      const px = x + Math.cos(a) * .012;
      const pz = z + Math.sin(a) * .012;
      const stripe = Math.sin(level * 21 - a) > .05;
      const arrival = 3.92 + index * .09 + level * .33;
      add(Math.atan2(pz / .88, px), Math.hypot(px, pz / .88), top - height + level * height,
        stripe ? 3 : 1, arrival, arrival + .65, rand(.58, 1.27));
    }
    flames.push({
      x, y: top, z, start: 4.73 + index * .14,
      sparks: Array.from({ length: count(69) }, () => ({
        height: rand(.015, .105), side: rand(-1, 1), phase: rand(0, TAU), size: rand(.5, 1.4)
      }))
    });
  }

  return {
    particles, flames, cutFaces, heart: createHeartSprite(),
    groups: Array.from({ length: COLORS.length * DEPTH_LEVELS }, () => []),
    glows: [glowSprite("75,194,255"), glowSprite("255,198,101")],
    dust: Array.from({ length: count(930) }, () => ({
      angle: rand(0, TAU), radius: rand(.55, 1.01), y: rand(-.08, .18), size: rand(.32, 1.18),
      speed: rand(.11, .35), phase: rand(0, TAU)
    })),
    ribbon: Array.from({ length: count(1100) }, (_, i) => ({
      progress: i / count(1100), spread: rand(-.036, .036), lift: rand(-.045, .045),
      size: rand(.65, 1.96), phase: rand(0, TAU)
    }))
  };
}

function createCutFaces({ radius, top, bottom }, coveredRadius, compact) {
  const walls = [], interior = [], toppings = [];
  const add = (points, angle, radial, y, color) => {
    points.push({
      x: radial * Math.cos(angle), y, z: radial * Math.sin(angle) * .88,
      color, size: rand(.69, 1.45), drift: rand(0, TAU), radius: radial
    });
  };
  for (const edge of [-1, 1]) {
    const seam = CUT_ANGLE + edge * CUT_HALF_WIDTH;
    const height = top - bottom;
    for (let i = 0; i < (compact ? 150 : 260); i++) {
      const level = rand(0, 1);
      const color = level > .90 ? 3 : i % 15 === 0 ? 4 : i % 3 ? 2 : 1;
      add(walls, seam + rand(-.014, .014), rand(.012, radius), bottom + height * level, color);
    }
    for (const [index, level] of [.32, .65, .94].entries()) {
      for (let i = 0; i < (compact ? 60 : 104); i++) {
        const r = rand(.01, radius);
        const wave = Math.sin(r * 37 + edge) * .020;
        const y = bottom + height * (level + wave + rand(-.042, .042));
        add(walls, seam + rand(-.013, .013), r, y, [5, 6, 3][index]);
      }
    }
  }
  for (let i = 0; i < (compact ? 145 : 240); i++) {
    const angle = CUT_ANGLE + rand(-CUT_HALF_WIDTH, CUT_HALF_WIDTH);
    const onTop = i % 4 !== 0;
    const r = Math.sqrt(rand(0, (onTop ? coveredRadius : radius) ** 2));
    add(interior, angle, r, (onTop ? top : bottom) + rand(-.004, .004), onTop ? 2 : 1);
  }
  // Small ridges of piped icing and sugar pearls sit on the enlarged top surface.
  for (let i = 0; i < (compact ? 116 : 200); i++) {
    const angle = CUT_ANGLE + rand(-.45, .45);
    const ridge = .017 * Math.cos((angle - CUT_ANGLE) * 23);
    add(toppings, angle, radius - .042 + ridge + rand(-.011, .011),
      top + rand(.004, .018), i % 4 ? 3 : 5);
  }
  for (const [index, offset] of [-.34, -.16, .02, .19, .35].entries()) {
    const r = radius - (index % 2 ? .120 : .085);
    for (let i = 0; i < (compact ? 13 : 23); i++) {
      const angle = CUT_ANGLE + offset + rand(-.025, .025);
      add(toppings, angle, r + rand(-.008, .008), top + rand(.008, .027), index % 2 ? 6 : 4);
    }
  }
  return { walls, interior, toppings };
}

function cameraAt(elapsed, calm) {
  const opening = ease(elapsed / BUILD_END);
  const idle = Math.max(0, elapsed - BUILD_END);
  const steadyTime = idle - (1 - Math.exp(-idle));
  const orbit = (elapsed - FIRST_CUT - CUT_DURATION / 2) * TAU / CUT_INTERVAL;
  const cutView = Math.PI / 2 - CUT_ANGLE - .32;
  const idleYaw = cutView + (calm ? .22 * Math.sin(orbit) : orbit - .62 * Math.sin(orbit));
  const transition = ease(idle / 4.5);
  // A slower arc during the close-up keeps the opening in the lower tier visible.
  return {
    yaw: (1.04 - .91 * opening) * (1 - transition) + idleYaw * transition,
    pitch: (calm ? .50 : .72) - (calm ? .18 : .42) * opening
      + (calm ? .05 : .17) * Math.sin(steadyTime * (calm ? .37 : .84))
  };
}

function sliceAt(elapsed) {
  if (elapsed < FIRST_CUT) return null;
  const phase = (elapsed - FIRST_CUT) % CUT_INTERVAL;
  if (phase >= CUT_DURATION) return null;
  return {
    phase,
    focus: ease((phase - .35) / 2.45) * (1 - ease((phase - SLICE_RETURN) / (CUT_DURATION - SLICE_RETURN)))
  };
}

function springPull(phase, start) {
  const age = phase - start;
  if (age <= 0 || age >= 1.8) return 0;
  if (age < .44) return ease(age / .44);
  const release = age - .44;
  return Math.exp(-release * 3.7) * Math.cos(release * 16) * (1 - ease((age - 1.3) / .5));
}

function drawHearts(ctx, sprite, phase, centerX, centerY, scale, viewportWidth, calm) {
  const fade = 1 - ease((phase - SLICE_RETURN + .2) / 1.25);
  if (fade <= 0 || phase < 2.65) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const sway = calm ? .38 : 1;
  for (const heart of HEARTS) {
    const angle = phase * 2.5 + heart.phase;
    const reveal = ease((phase - 2.65 - heart.phase * .115) / .67);
    if (reveal <= 0) continue;
    const size = Math.max(12, heart.size * scale) * (.53 + .47 * reveal) * (1 + .05 * Math.sin(angle));
    const margin = size * .64 + 4;
    const x = Math.max(margin, Math.min(viewportWidth - margin, centerX + scale * (heart.x + .016 * sway * Math.sin(angle))));
    const y = centerY + scale * (heart.y + .024 * sway * Math.cos(angle * .8) + (1 - reveal) * .044 - (1 - fade) * .045);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(angle) * .21 * sway);
    ctx.globalAlpha = .96 * reveal * fade;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  ctx.restore();
}

export function drawCake(ctx, cake, elapsed, layout, calm, lowDetail) {
  const { centerX: normalX, cakeY, cakeSize: normalSize, viewportWidth } = layout;
  const slice = sliceAt(elapsed);
  const focus = slice?.focus ?? 0;
  const displayCakeSize = Math.min(normalSize, viewportWidth * .46);
  const slideLeft = Math.max(0, displayCakeSize * .82 - viewportWidth * .135);
  const displayCakeX = Math.min(normalX, Math.max(displayCakeSize * .69 + 9, normalX - slideLeft));
  const centerX = normalX + (displayCakeX - normalX) * focus;
  const cakeSize = normalSize + (displayCakeSize - normalSize) * focus;
  const { yaw, pitch } = cameraAt(elapsed, calm);
  const sinYaw = Math.sin(yaw), cosYaw = Math.cos(yaw);
  const sinPitch = Math.sin(pitch), cosPitch = Math.cos(pitch);
  const pointSize = Math.max(.85, Math.min(1.36, cakeSize / 270)) * (lowDetail ? 1.14 : 1);
  const stride = lowDetail ? 2 : 1;
  let x, y, scale, depth;
  const project = (px, py, pz) => {
    const toward = px * sinYaw + pz * cosYaw;
    depth = toward * cosPitch + py * sinPitch;
    scale = FOCAL / (FOCAL - depth);
    x = centerX + (px * cosYaw - pz * sinYaw) * cakeSize * scale;
    y = cakeY + (toward * sinPitch - py * cosPitch) * cakeSize * scale;
  };
  const detailX = normalX + Math.min(viewportWidth * .25, normalSize * .77);
  const detailY = cakeY - normalSize * .24;
  const detailSize = Math.min(normalSize * 1.72, viewportWidth * .73);
  const phase = slice?.phase ?? 0;
  const detailYaw = Math.PI / 2 - CUT_ANGLE + .70 + (calm ? .17 : .74) * Math.sin(phase * .96);
  const detailPitch = .42 + (calm ? .06 : .18) * Math.sin(phase * 1.06);
  const sinDetailYaw = Math.sin(detailYaw), cosDetailYaw = Math.cos(detailYaw);
  const sinDetailPitch = Math.sin(detailPitch), cosDetailPitch = Math.cos(detailPitch);
  const motion = calm ? .40 : 1;
  const pullAcross = springPull(phase, 5.4) * motion;
  const pullUp = springPull(phase, 3.53) * motion;
  const widthScale = 1 + pullAcross * .38 - pullUp * .19;
  const heightScale = 1 + pullUp * .49 - pullAcross * .23;
  const travelFor = p => {
    const delay = (1 - clamp01(p.radius / .47)) * .31 + p.drift / TAU * .24;
    return ease((phase - .72 - delay) / 2.4) * (1 - ease((phase - SLICE_RETURN - delay) / 3.2));
  };
  const separate = (p, travel) => {
    const dx = p.x - SLICE_CENTER.x, dy = (p.y - SLICE_CENTER.y) * heightScale, dz = p.z - SLICE_CENTER.z;
    const toward = dx * sinDetailYaw + dz * cosDetailYaw;
    const detailDepth = toward * cosDetailPitch + dy * sinDetailPitch;
    const detailScale = FOCAL / (FOCAL - detailDepth);
    const showcaseX = detailX + ((dx * cosDetailYaw - dz * sinDetailYaw) * widthScale + pullAcross * .023) * detailSize * detailScale;
    const showcaseY = detailY + (toward * sinDetailPitch - dy * cosDetailPitch - pullUp * .022) * detailSize * detailScale;
    const flight = Math.sin(Math.PI * travel) * (calm ? .4 : 1);
    x += (showcaseX - x) * travel + flight * normalSize * .04 * Math.cos(p.drift);
    y += (showcaseY - y) * travel - flight * normalSize * (.08 + .045 * Math.sin(p.drift));
    scale += (detailScale * 1.22 - scale) * travel;
  };
  const glow = (sprite, radius, opacity) => {
    ctx.globalAlpha = opacity;
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  };

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const dustReveal = ease((elapsed - .22) / 1.8);
  const drift = elapsed * (calm ? .32 : 1);
  ctx.fillStyle = "#72c7ff";
  for (let i = 0; i < cake.dust.length; i += stride) {
    const dot = cake.dust[i];
    const angle = dot.angle + drift * dot.speed;
    const radius = dot.radius + Math.sin(drift * .48 + dot.phase) * .022;
    project(Math.cos(angle) * radius, dot.y + Math.sin(drift + dot.phase) * .023, Math.sin(angle) * radius * .88);
    const size = dot.size * pointSize * scale;
    ctx.globalAlpha = dustReveal * (.10 + .44 * (Math.sin(dot.phase + drift * 1.9) * .5 + .5));
    ctx.fillRect(x, y, size, size);
  }

  const { groups } = cake;
  for (const group of groups) group.length = 0;
  const plot = (color, light, size) => {
    const level = Math.min(DEPTH_LEVELS - 1, Math.floor(clamp01(light) * DEPTH_LEVELS));
    groups[color * DEPTH_LEVELS + level].push(x, y, size);
  };
  for (let i = 0; i < cake.particles.length; i += stride) {
    const p = cake.particles[i];
    if (elapsed <= p.start) continue;
    const progress = ease((elapsed - p.start) / (p.end - p.start));
    const scatter = 1 - progress;
    let px = p.x, py = p.y, pz = p.z;
    if (scatter > 0) {
      const angle = p.angle - scatter * (calm ? 2.25 : 6.1);
      const radius = p.radius + scatter * p.scatter;
      px = Math.cos(angle) * radius;
      pz = Math.sin(angle) * radius * .88;
      py += scatter * (.14 + Math.sin(p.drift) * .23);
    }
    project(px, py, pz);
    // Angle-based lighting separates the near wall from the back of each tier.
    let facing = p.side ? clamp01(.44 + (p.x * sinYaw + p.z * cosYaw) / p.radius * .71) : .78;
    if (slice && p.cut) {
      const travel = travelFor(p);
      if (travel > 0) {
        separate(p, travel);
        const detailFacing = p.side ? clamp01(.57 + (p.x * sinDetailYaw + p.z * cosDetailYaw) / p.radius * .56) : .86;
        facing += (detailFacing - facing) * travel;
      }
    }
    const twinkle = .9 + .10 * Math.sin(drift * 2.1 + p.drift);
    const light = (.14 + facing * .82 + depth * .16) * twinkle * ease((elapsed - p.start) * 4.2);
    const size = p.size * pointSize * scale * (.9 + Math.max(-.13, depth * .31));
    plot(p.color, light, size);
  }
  if (focus > .015) {
    const { walls, interior, toppings } = cake.cutFaces;
    const reveal = ease(focus * 2.2);
    for (let i = 0; i < walls.length; i += stride) {
      const p = walls[i];
      project(p.x, p.y, p.z);
      plot(p.color, reveal * .53, p.size * pointSize * scale * reveal);
    }
    for (const points of [walls, interior, toppings]) {
      for (let i = 0; i < points.length; i += stride) {
        const p = points[i];
        const travel = travelFor(p);
        if (travel <= .02) continue;
        project(p.x, p.y, p.z);
        separate(p, travel);
        const fade = points === toppings ? ease((travel - .38) / .58) : ease(travel * 2.8);
        const frosting = p.color === 3 || p.color >= 5;
        const light = fade * ((frosting ? .93 : .66) + .14 * Math.sin(p.drift + drift * 2.4));
        plot(p.color, light, p.size * pointSize * scale * fade * (frosting ? 1.20 : 1));
      }
    }
  }
  for (const [index, group] of groups.entries()) {
    if (!group.length) continue;
    const level = index % DEPTH_LEVELS;
    ctx.fillStyle = `rgb(${COLORS[Math.floor(index / DEPTH_LEVELS)]})`;
    ctx.globalAlpha = .08 + level * .203;
    ctx.beginPath();
    for (let i = 0; i < group.length; i += 3) {
      const size = group[i + 2];
      ctx.rect(group[i] - size / 2, group[i + 1] - size / 2, size, size);
    }
    ctx.fill();
  }

  if (slice && phase < 1.68) {
    const cutHead = ease(phase / 1.22);
    ctx.fillStyle = "#deefff";
    for (const edge of [-1, 1]) {
      const angle = CUT_ANGLE + edge * CUT_HALF_WIDTH;
      for (let i = 0; i < 48; i++) {
        const tail = i / 48;
        const radial = (.47 - cutHead * .42) + tail * .15;
        if (radial > .47) continue;
        const height = .196 - cutHead * .16 + Math.sin(i * 1.67) * .014;
        project(Math.cos(angle) * radial, height, Math.sin(angle) * radial * .88);
        ctx.globalAlpha = (1 - tail) * ease(phase / .28) * (1 - ease((phase - 1.18) / .5));
        const size = (1.7 - tail) * pointSize;
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  const ribbonReveal = ease(elapsed / .42);
  const ribbonTail = 1 - ease((elapsed - 4.72) / 1.46);
  if (ribbonTail > 0) {
    const rise = ease((elapsed - .15) / 4.75);
    const rotation = elapsed * (calm ? 1.3 : 2.75);
    ctx.fillStyle = "#79d9ff";
    for (const p of cake.ribbon) {
      const q = p.progress;
      const angle = rotation - q * TAU * (calm ? 1.15 : 2.15);
      const radius = .36 + q * .47 - rise * .16 + p.spread;
      const height = rise * .61 - q * (.14 + rise * .38) + p.lift;
      project(Math.cos(angle) * radius, height, Math.sin(angle) * radius * .88);
      const size = p.size * scale * pointSize;
      ctx.globalAlpha = ribbonReveal * ribbonTail * (1 - q * .88) ** 1.3 * (.43 + .57 * Math.sin(p.phase) ** 2);
      ctx.fillRect(x, y, size, size);
    }
    // Keep a brighter spine visible through the loose spray.
    ctx.fillStyle = "#b6ecff";
    for (let i = 179; i >= 0; i--) {
      const q = i / 225;
      const angle = rotation - q * TAU * (calm ? 1.15 : 2.15);
      const radius = .36 + q * .47 - rise * .16;
      const height = rise * .61 - q * (.14 + rise * .38) + Math.sin(i * 2.7) * .013;
      project(Math.cos(angle) * radius, height, Math.sin(angle) * radius * .88);
      const size = pointSize * scale * (1.9 - q);
      ctx.globalAlpha = ribbonReveal * ribbonTail * (1 - q) * .72;
      ctx.fillRect(x, y, size, size);
    }
    project(Math.cos(rotation) * (.36 - rise * .16), rise * .61, Math.sin(rotation) * (.36 - rise * .16) * .88);
    glow(cake.glows[0], 20 * pointSize * scale, ribbonReveal * ribbonTail * .75);
  }

  const orbitGlow = ease((elapsed - 4.9) / 1.55);
  if (orbitGlow > 0) {
    ctx.fillStyle = "#b4e9ff";
    for (let streak = 0; streak < 3; streak++) {
      const head = drift * (.72 + streak * .16) + streak * TAU / 3;
      const radius = .58 + streak * .052;
      for (let i = 43; i >= 0; i--) {
        const trail = i / 44;
        const angle = head - trail * .72;
        const lift = .006 + Math.sin(angle * 1.5 + streak) * .055;
        project(Math.cos(angle) * radius, lift, Math.sin(angle) * radius * .88);
        if (i === 0) {
          glow(cake.glows[0], 10 * pointSize * scale, orbitGlow * (.53 + depth * .31));
        } else {
          const size = (1.18 - trail * .74) * pointSize * scale;
          ctx.globalAlpha = orbitGlow * (1 - trail) * (.41 + depth * .24);
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  for (const flame of cake.flames) {
    const opacity = ease((elapsed - flame.start) / .52);
    if (!opacity) continue;
    const flicker = Math.sin(drift * 7 + flame.x * 26);
    project(flame.x + flicker * .006, flame.y + .052, flame.z);
    glow(cake.glows[1], 15 * scale * pointSize, opacity * (.59 + flicker * .12));
    for (const spark of flame.sparks) {
      const taper = Math.sin(spark.height / .113 * Math.PI) * .021;
      project(flame.x + spark.side * taper + flicker * spark.height * .16,
        flame.y + spark.height * (1 + flicker * .08), flame.z + Math.cos(spark.phase) * taper * .52);
      const size = spark.size * pointSize * scale;
      ctx.fillStyle = spark.height < .058 ? "#fff2bb" : "#ffbd70";
      ctx.globalAlpha = opacity * (.53 + Math.sin(spark.phase + drift * 12) * .24);
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.restore();
  if (slice) drawHearts(ctx, cake.heart, phase, detailX, detailY, detailSize, viewportWidth, calm);
  return focus;
}
