// Generate Lottie (Bodymovin v5.7.6) JSON files for all step illustration types.
// Output: public/lottie/{type}.json
//
// Each animation is 120 frames (4s) @ 30fps on a 180×140 canvas, matching
// iOS `StepIllustrationView.swift`. Accent/secondary colors match `THEMES`
// in components/StepIllustration.tsx (and iOS `StepTheme`).
//
// Usage:  node scripts/gen-lottie.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "lottie");

const W = 180, H = 140, FR = 30, DUR = 120;
const CX = W / 2, CY = H / 2;

// ─── keyframe primitives ─────────────────────────────────────────────────────
function k(t, s, dims = 1) {
  const x = dims === 1 ? [0.5] : Array(dims).fill(0.5);
  const y1 = dims === 1 ? [1] : Array(dims).fill(1);
  const y0 = dims === 1 ? [0] : Array(dims).fill(0);
  return { i: { x, y: y1 }, o: { x, y: y0 }, t, s };
}
const anim = (kfs, ix) => ({ a: 1, k: kfs, ix });
const st = (v, ix) => ({ a: 0, k: v, ix });

const fadeLoop = (inStart, inEnd) =>
  anim([k(inStart, [0]), k(inEnd, [100]), k(DUR - 12, [100]), { t: DUR, s: [0] }], 11);
const staticFull = anim([k(0, [100])], 11); // always visible (uses one keyframe)
const opFixed = (v) => st(v, 11);

const popScale = (t0, t1, tEnd, peak = 130) =>
  anim([k(t0, [0, 0, 100], 3), k(t1, [peak, peak, 100], 3), { t: tEnd, s: [100, 100, 100] }], 6);

const growY = (t0, t1) =>
  anim([k(t0, [100, 0, 100], 3), { t: t1, s: [100, 100, 100] }], 6);
const growX = (t0, t1) =>
  anim([k(t0, [0, 100, 100], 3), { t: t1, s: [100, 100, 100] }], 6);

const scaleStatic = (xy = 100) => st([xy, xy, 100], 6);

const posStatic = (x, y) => st([x, y, 0], 2);
const rotStatic = (deg = 0) => st(deg, 10);
const anchorStatic = (x = 0, y = 0) => st([x, y, 0], 1);

const posSlide = (from, to, t0, t1) =>
  anim([
    { i: { x: 0.4, y: 1 }, o: { x: 0.5, y: 0 }, t: t0, s: [...from, 0], to: [0, 0, 0], ti: [0, 0, 0] },
    { t: t1, s: [...to, 0] },
  ], 2);

const rotAnim = (from, to, t0, t1) =>
  anim([k(t0, [from]), { t: t1, s: [to] }], 10);

const spin = (turns, t0 = 0, t1 = DUR) =>
  anim([k(t0, [0]), { t: t1, s: [360 * turns] }], 10);

// ─── shape primitives ────────────────────────────────────────────────────────
const rc = (w, h, r = 0, p = [0, 0]) => ({
  ty: "rc", d: 1, s: st([w, h], 2), p: st(p, 3), r: st(r, 4),
  nm: "rc", mn: "ADBE Vector Shape - Rect", hd: false,
});
const sh = (verts, closed = true) => {
  const n = verts.length;
  return {
    ty: "sh", d: 1,
    ks: st({ i: Array(n).fill([0, 0]), o: Array(n).fill([0, 0]), v: verts, c: closed }, 2),
    nm: "sh", mn: "ADBE Vector Shape - Group", hd: false,
  };
};
const el = (rx, ry, p = [0, 0]) => ({
  ty: "el", d: 1, s: st([rx * 2, ry * 2], 2), p: st(p, 3),
  nm: "el", mn: "ADBE Vector Shape - Ellipse", hd: false,
});
const fl = (rgba, o = 100) => ({
  ty: "fl", c: st(rgba, 4), o: st(o, 5), r: 1, bm: 0,
  nm: "fl", mn: "ADBE Vector Graphic - Fill", hd: false,
});
const stk = (rgba, o = 100, w = 1, dash) => {
  const out = {
    ty: "st", c: st(rgba, 3), o: st(o, 4), w: st(w, 5),
    lc: 2, lj: 2, ml: 4, bm: 0,
    nm: "st", mn: "ADBE Vector Graphic - Stroke", hd: false,
  };
  if (dash) out.d = dash.map((v, i) => ({ n: i === 0 ? "d" : "g", nm: "", v: st(v, 0) }));
  return out;
};
const tr = () => ({
  ty: "tr",
  p: st([0, 0], 2), a: st([0, 0], 1), s: st([100, 100], 3),
  r: st(0, 6), o: st(100, 7), sk: st(0, 4), sa: st(0, 5), nm: "Transform",
});
const grp = (items, nm = "g") => ({
  ty: "gr", it: [...items, tr()],
  nm, np: items.length, cix: 2, bm: 0, ix: 1,
  mn: "ADBE Vector Group", hd: false,
});

// ─── layer builder ───────────────────────────────────────────────────────────
let _ind = 0;
const resetInd = () => { _ind = 0; };
function layer(name, ks, shapes) {
  _ind += 1;
  return {
    ddd: 0, ind: _ind, ty: 4, nm: name, sr: 1, ks, ao: 0,
    shapes, ip: 0, op: DUR, st: 0, bm: 0,
  };
}

const ks = ({ o, r, p, a, s: sc }) => ({
  o: o ?? opFixed(100),
  r: r ?? rotStatic(0),
  p: p ?? posStatic(CX, CY),
  a: a ?? anchorStatic(),
  s: sc ?? scaleStatic(),
});

// ─── output container ────────────────────────────────────────────────────────
function makeLottie(name, layers) {
  return {
    v: "5.7.6", fr: FR, ip: 0, op: DUR,
    w: W, h: H, nm: name, ddd: 0, assets: [],
    layers, markers: [],
  };
}

// ─── palette (from iOS StepTheme, normalized 0-1) ────────────────────────────
const PAL = {
  measure:    { a: [0.18, 0.47, 0.78, 1], s: [0.6, 0.78, 0.95, 1] },
  markLine:   { a: [0.4784, 0.251, 0.7804, 1], s: [0.78, 0.65, 0.95, 1] },
  cut:        { a: [0.85, 0.38, 0.063, 1], s: [0.98, 0.68, 0.4, 1] },
  sand:       { a: [0.78, 0.52, 0.078, 1], s: [0.95, 0.75, 0.38, 1] },
  drill:      { a: [0.22, 0.85, 0.75, 1], s: [0.15, 0.60, 0.55, 1] },
  foundation: { a: [0.40, 0.26, 0.13, 1], s: [0.65, 0.48, 0.30, 1] },
  levelCheck: { a: [0.22, 0.35, 0.68, 1], s: [0.55, 0.68, 0.90, 1] },
  topBoard:   { a: [0.55, 0.35, 0.12, 1], s: [0.80, 0.60, 0.35, 1] },
  frame:      { a: [0.72, 0.20, 0.18, 1], s: [0.92, 0.60, 0.55, 1] },
  wallMount:  { a: [0.18, 0.55, 0.32, 1], s: [0.50, 0.80, 0.60, 1] },
  waterproof: { a: [0.078, 0.52, 0.65, 1], s: [0.40, 0.78, 0.88, 1] },
  paint:      { a: [0.12, 0.62, 0.38, 1], s: [0.45, 0.82, 0.58, 1] },
  inspect:    { a: [0.45, 0.18, 0.72, 1], s: [0.72, 0.55, 0.92, 1] },
  screw:      { a: [0.28, 0.38, 0.55, 1], s: [0.55, 0.65, 0.80, 1] },
  complete:   { a: [0.65, 0.48, 0.05, 1], s: [0.90, 0.72, 0.20, 1] },
};

// ─── per-type scene builders (all 14) ────────────────────────────────────────
// Helpers to build common layers (board, etc.)
function boardLayer(accent, { y = 78, w = 126, h = 40, fillOp = 20, strokeOp = 50, t0 = 0, t1 = 10 } = {}) {
  return layer(
    "board",
    ks({
      o: fadeLoop(t0, t1),
      p: posStatic(CX, y),
      s: popScale(t0, t1, t1 + 6, 100),
    }),
    [grp([rc(w, h, 2), fl(accent, fillOp), stk(accent, strokeOp, 1.2)])]
  );
}

// ─── measure: 定規 + 板 + 寸法矢印 ────────────────────────────────────────────
function buildMeasure() {
  resetInd();
  const { a: A } = PAL.measure;
  const boardW = 130, boardH = 28;
  const bx = CX - boardW / 2;
  // layer 1 (top): label (drawn as shapes — skip, just caption via HTML)
  // dimension arrow
  const arrowY = CY + boardH / 2 + 14;
  const layers = [];
  // arrow line
  layers.push(layer(
    "arrowLine",
    ks({
      o: fadeLoop(28, 38),
      p: posStatic(CX, arrowY),
      s: growX(28, 40),
    }),
    [grp([rc(boardW, 2, 1), fl(A, 100)])]
  ));
  // left arrowhead
  layers.push(layer(
    "arrowL",
    ks({
      o: fadeLoop(28, 40),
      p: posStatic(bx, arrowY),
      s: popScale(28, 38, 44),
    }),
    [grp([sh([[0, 0], [8, -5], [8, 5]]), fl(A, 100)])]
  ));
  // right arrowhead
  layers.push(layer(
    "arrowR",
    ks({
      o: fadeLoop(28, 40),
      p: posStatic(bx + boardW, arrowY),
      s: popScale(28, 38, 44),
    }),
    [grp([sh([[0, 0], [-8, -5], [-8, 5]]), fl(A, 100)])]
  ));
  // ruler ticks
  for (let i = 0; i < 11; i++) {
    const tx = bx + (i / 10) * boardW;
    const th = i % 5 === 0 ? 8 : 4;
    layers.push(layer(
      `tick${i}`,
      ks({
        o: fadeLoop(6 + i, 14 + i),
        p: posStatic(tx, CY - boardH / 2 - 14 + th / 2),
        s: growY(6 + i, 14 + i),
      }),
      [grp([rc(0.8, th), fl(A, 80)])]
    ));
  }
  // ruler background
  layers.push(layer(
    "ruler",
    ks({
      o: fadeLoop(0, 10),
      p: posStatic(CX, CY - boardH / 2 - 14),
      s: popScale(0, 10, 16, 100),
    }),
    [grp([rc(boardW + 8, 14, 3), fl(PAL.measure.s, 55)])]
  ));
  // board
  layers.push(boardLayer(A, { y: CY - 4, w: boardW, h: boardH, fillOp: 25, strokeOp: 60, t0: 0, t1: 8 }));
  return layers;
}

// ─── cut: 板 + 切断ライン + のこぎり ──────────────────────────────────────────
function buildCut() {
  resetInd();
  const { a: A, s: S } = PAL.cut;
  const boardW = 122, boardH = 34;
  const cutX = CX - boardW / 2 + boardW * 0.42;
  const layers = [];
  // sawdust particles
  const dusts = [[-10, 5], [4, 9], [14, 4], [-18, 7]];
  dusts.forEach(([dx, dy], i) => {
    layers.push(layer(
      `dust${i}`,
      ks({
        o: anim([k(40 + i * 2, [0]), k(50 + i * 2, [85]), k(DUR - 12, [85]), { t: DUR, s: [0] }], 11),
        p: posStatic(cutX + dx, CY + boardH / 2 + dy),
        s: popScale(40 + i * 2, 50 + i * 2, 56 + i * 2),
      }),
      [grp([el(3, 1.5), fl(S, 85)])]
    ));
  });
  // saw — moves back and forth
  const sawTop = CY - 34;
  layers.push(layer(
    "saw",
    ks({
      o: fadeLoop(28, 38),
      p: anim([
        k(28, [cutX - 8, sawTop, 0], 3),
        k(56, [cutX + 6, sawTop + 4, 0], 3),
        k(84, [cutX - 8, sawTop + 4, 0], 3),
        { t: DUR - 16, s: [cutX + 2, sawTop, 0] },
      ], 2),
    }),
    [
      grp([rc(36, 8, 0, [0, 4]), fl([0.70, 0.72, 0.76, 1], 100)], "blade"),
      grp([rc(6, 16, 0, [0, -8]), fl([0.40, 0.28, 0.18, 1], 100)], "handle"),
      // teeth
      ...Array.from({ length: 6 }, (_, i) =>
        grp([sh([[-20 + i * 6, 8], [-17 + i * 6, 14], [-14 + i * 6, 8]]), fl([0.60, 0.62, 0.65, 1], 100)], `tooth${i}`)
      ),
    ]
  ));
  // cut line (dashed, pulses)
  layers.push(layer(
    "cutLine",
    ks({
      o: anim([k(14, [0]), k(22, [100]), k(28, [60]), k(36, [100]), k(DUR - 12, [100]), { t: DUR, s: [0] }], 11),
      p: posStatic(cutX, CY + 4),
    }),
    [grp([rc(2.5, boardH + 20, 0), fl(A, 100)])]
  ));
  // board
  layers.push(boardLayer(A, { y: CY + boardH / 2 - 2, w: boardW, h: boardH, fillOp: 25, strokeOp: 50, t0: 0, t1: 10 }));
  return layers;
}

// ─── sand: 半分研磨済み板 + サンディングブロック(往復) ────────────────────────
function buildSand() {
  resetInd();
  const { a: A, s: S } = PAL.sand;
  const boardW = 126, boardH = 24;
  const boardY = CY + 10;
  const bx = CX - boardW / 2;
  const layers = [];
  // dust arrows (pulse)
  for (let i = 0; i < 3; i++) {
    const ax = bx + 10 + i * (boardW * 0.18);
    layers.push(layer(
      `arrow${i}`,
      ks({
        o: anim([k(24 + i * 3, [0]), k(34 + i * 3, [70]), k(DUR - 12, [70]), { t: DUR, s: [0] }], 11),
        p: posStatic(ax, boardY - boardH / 2 - 8),
        s: growX(24 + i * 3, 34 + i * 3),
      }),
      [
        grp([rc(14, 1.5), fl(A, 70)], "arrowLine"),
        grp([sh([[8, -4], [8, 4], [14, 0]]), fl(A, 70)], "arrowHead"),
      ]
    ));
  }
  // sanding block — slides left-right over board
  const sbW = 40, sbH = 22;
  layers.push(layer(
    "sandBlock",
    ks({
      o: fadeLoop(12, 22),
      p: anim([
        k(12, [bx + boardW * 0.7, boardY - 18, 0], 3),
        k(48, [bx + boardW * 0.25, boardY - 16, 0], 3),
        k(84, [bx + boardW * 0.7, boardY - 18, 0], 3),
        { t: DUR - 16, s: [bx + boardW * 0.45, boardY - 18, 0] },
      ], 2),
    }),
    [
      grp([rc(sbW, sbH * 0.45, 0, [0, -sbH * 0.275]), fl([0.62, 0.34, 0.18, 1], 100)], "handle"),
      grp([rc(sbW, sbH * 0.55, 0, [0, sbH * 0.225]), fl(A, 55)], "paper"),
    ]
  ));
  // sanded half — secondary color overlay on left half
  layers.push(layer(
    "sanded",
    ks({
      o: fadeLoop(14, 44),
      p: posStatic(bx + (boardW * 0.55) / 2, boardY),
      s: growX(14, 44),
    }),
    [grp([rc(boardW * 0.55, boardH, 0), fl(S, 50)])]
  ));
  // board
  layers.push(boardLayer(A, { y: boardY, w: boardW, h: boardH, fillOp: 25, strokeOp: 55, t0: 0, t1: 10 }));
  return layers;
}

// ─── drill: ドリル下降 + 回転 + 板 ───────────────────────────────────────────
function buildDrill() {
  resetInd();
  const { a: A } = PAL.drill;
  const boardW = 122, boardH = 28;
  const boardY = CY + 20;
  const layers = [];
  // chips popping out at impact
  const chips = [[-12, -5], [8, -8], [-6, -2], [14, -3]];
  chips.forEach(([dx, dy], i) => {
    layers.push(layer(
      `chip${i}`,
      ks({
        o: anim([k(48 + i, [0]), k(56 + i, [90]), k(80, [90]), { t: DUR - 12, s: [0] }], 11),
        p: anim([
          k(48 + i, [CX, boardY, 0], 3),
          { t: 80, s: [CX + dx, boardY + dy, 0] },
        ], 2),
        s: popScale(48 + i, 56 + i, 62 + i),
      }),
      [grp([el(2.5, 1), fl(A, 85)])]
    ));
  });
  // hole
  layers.push(layer(
    "hole",
    ks({
      o: fadeLoop(46, 54),
      p: posStatic(CX, boardY + 3),
      s: popScale(46, 54, 60, 130),
    }),
    [grp([el(4, 2.5), fl([0, 0, 0, 1], 70)])]
  ));
  // drill (shaft + tip) — descends and spins
  layers.push(layer(
    "drill",
    ks({
      o: fadeLoop(14, 24),
      p: anim([
        k(24, [CX, boardY - 54, 0], 3),
        { t: 50, s: [CX, boardY - 10, 0] },
      ], 2),
    }),
    [
      grp([rc(6, 38, 0, [0, -25]), fl(A, 90)], "shaft"),
      grp([sh([[-5, -6], [5, -6], [0, 4]]), fl(A, 100)], "tip"),
      // flutes
      ...Array.from({ length: 4 }, (_, i) =>
        grp([rc(6, 0.8, 0, [0, -10 - i * 7])], `flute${i}`)
      ),
    ]
  ));
  // board (darker for drill theme)
  layers.push(layer(
    "board",
    ks({
      o: fadeLoop(0, 10),
      p: posStatic(CX, boardY),
      s: popScale(0, 10, 16, 100),
    }),
    [grp([rc(boardW, boardH, 2), fl([0.58, 0.42, 0.24, 1], 80), stk(A, 60, 1.2)])]
  ));
  // glow
  layers.push(layer(
    "glow",
    ks({
      o: anim([k(0, [0]), k(10, [30]), k(40, [15]), k(DUR - 12, [15]), { t: DUR, s: [0] }], 11),
      p: posStatic(CX, boardY - 20),
      s: popScale(0, 10, 16, 100),
    }),
    [grp([el(26, 26), fl(A, 100)])]
  ));
  return layers;
}

// ─── foundation: 地面 + 砕石 + 束石 + 柱 ────────────────────────────────────
function buildFoundation() {
  resetInd();
  const { a: A } = PAL.foundation;
  const groundY = CY + 12;
  const stoneY = CY + 26;
  const layers = [];
  // post grows up from 束石
  layers.push(layer(
    "post",
    ks({
      o: fadeLoop(32, 42),
      p: posStatic(CX, (CY - 24 + stoneY) / 2 - 4),
      a: anchorStatic(0, (stoneY - (CY - 24)) / 2),
      s: growY(32, 52),
    }),
    [grp([rc(16, stoneY - CY + 24, 0), fl(A, 75), stk(A, 100, 1.2)])]
  ));
  // 束石 drops in
  layers.push(layer(
    "stone",
    ks({
      o: fadeLoop(16, 24),
      p: anim([
        k(16, [CX, stoneY - 20, 0], 3),
        { t: 30, s: [CX, stoneY, 0] },
      ], 2),
    }),
    [grp([rc(40, 18, 1, [0, 9]), fl([0.68, 0.64, 0.60, 1], 100), stk([0, 0, 0, 1], 30, 1)])]
  ));
  // gravel stones
  const gravel = [[-28, 4], [-14, 7], [0, 3], [16, 6], [28, 4], [-8, 9], [8, 8]];
  gravel.forEach(([gx, gy], i) => {
    layers.push(layer(
      `gravel${i}`,
      ks({
        o: fadeLoop(4 + i * 2, 14 + i * 2),
        p: posStatic(CX + gx, groundY + gy),
        s: popScale(4 + i * 2, 14 + i * 2, 20 + i * 2),
      }),
      [grp([el(5, 3), fl([0.78, 0.72, 0.65, 1], 80)])]
    ));
  });
  // crushed stone band (surface)
  layers.push(layer(
    "crushed",
    ks({
      o: fadeLoop(0, 10),
      p: posStatic(CX, groundY + 7),
      s: growX(0, 16),
    }),
    [grp([rc(W - 16, 14), fl([0.62, 0.55, 0.48, 1], 70)])]
  ));
  // ground fill
  layers.push(layer(
    "ground",
    ks({
      o: fadeLoop(0, 8),
      p: posStatic(CX, (groundY + H - 8) / 2),
    }),
    [grp([rc(W - 16, H - groundY - 8), fl([0.45, 0.32, 0.18, 1], 60)])]
  ));
  return layers;
}

// ─── levelCheck: 板 + 水平器 + 気泡 ─────────────────────────────────────────
function buildLevelCheck() {
  resetInd();
  const { a: A } = PAL.levelCheck;
  const boardW = 126, boardH = 20;
  const boardY = CY + 14;
  const levW = boardW * 0.80, levH = 18;
  const levY = boardY - boardH / 2 - levH / 2 - 4;
  const layers = [];
  // checkmark
  layers.push(layer(
    "check",
    ks({
      o: fadeLoop(70, 80),
      p: posStatic(CX + 38, boardY + boardH / 2 + 14),
      s: popScale(70, 80, 88, 130),
    }),
    [grp([sh([[-5, 0], [-1, 4], [6, -6]], false), stk(A, 100, 2.5)])]
  ));
  // bubble — slides to center
  layers.push(layer(
    "bubble",
    ks({
      o: fadeLoop(32, 40),
      p: anim([
        k(40, [CX - 10, levY + 1, 0], 3),
        { t: 64, s: [CX, levY + 1, 0] },
      ], 2),
    }),
    [grp([el(5, 3), fl([0.62, 0.88, 0.42, 1], 90)])]
  ));
  // bubble vial window
  layers.push(layer(
    "vial",
    ks({
      o: fadeLoop(22, 30),
      p: posStatic(CX, levY + 1),
      s: growX(22, 34),
    }),
    [grp([rc(36, 10), fl([1, 1, 1, 1], 35), stk([1, 1, 1, 1], 70, 0.8)])]
  ));
  // level tool
  layers.push(layer(
    "level",
    ks({
      o: fadeLoop(14, 22),
      p: anim([
        k(14, [CX, levY - 20, 0], 3),
        { t: 30, s: [CX, levY, 0] },
      ], 2),
    }),
    [grp([rc(levW, levH, 1), fl([0.25, 0.50, 0.80, 1], 88), stk([1, 1, 1, 1], 50, 0.8)])]
  ));
  // board
  layers.push(boardLayer(A, { y: boardY, w: boardW, h: boardH, fillOp: 25, strokeOp: 55, t0: 0, t1: 10 }));
  return layers;
}

// ─── topBoard: フレーム + 4枚デッキ板 + 降下矢印 ─────────────────────────────
function buildTopBoard() {
  resetInd();
  const { a: A } = PAL.topBoard;
  const fW = 120, fH = 30;
  const fx = CX - fW / 2, fy = CY + 6;
  const slats = 4;
  const slatW = (fW - 8) / slats - 3;
  const slatStep = slatW + 3;
  const lastX = fx + 6 + (slats - 1) * slatStep + slatW / 2;
  const layers = [];
  // down arrow over last slat
  layers.push(layer(
    "arrow",
    ks({
      o: fadeLoop(56, 66),
      p: posStatic(lastX, fy - 28),
      s: popScale(56, 66, 72),
    }),
    [
      grp([rc(2, 14, 0, [0, -6]), fl(A, 100)], "arrowLine"),
      grp([sh([[-6, 2], [6, 2], [0, 10]]), fl(A, 100)], "arrowHead"),
    ]
  ));
  // slats (last one drops last, from up high)
  for (let i = slats - 1; i >= 0; i--) {
    const sx = fx + 6 + i * slatStep + slatW / 2;
    const last = i === slats - 1;
    const startFrame = 22 + i * 10;
    layers.push(layer(
      `slat${i}`,
      ks({
        o: fadeLoop(startFrame, startFrame + 8),
        p: last
          ? anim([
              k(startFrame, [sx, fy - 40, 0], 3),
              { t: 74, s: [sx, fy - 10, 0] },
            ], 2)
          : posStatic(sx, fy - 10),
        s: last ? scaleStatic() : popScale(startFrame, startFrame + 8, startFrame + 14, 100),
      }),
      [grp([rc(slatW, fH + 4, 0), fl(A, last ? 50 : 85), stk(A, 100, 0.8)])]
    ));
  }
  // frame sides
  layers.push(layer(
    "frameR",
    ks({ o: fadeLoop(0, 10), p: posStatic(fx + fW - 6, fy + fH / 2) }),
    [grp([rc(12, fH, 0), fl(A, 55)])]
  ));
  layers.push(layer(
    "frameL",
    ks({ o: fadeLoop(0, 10), p: posStatic(fx + 6, fy + fH / 2) }),
    [grp([rc(12, fH, 0), fl(A, 55)])]
  ));
  return layers;
}

// ─── frame: L字接合 + 4つのビス + 90° ──────────────────────────────────────
function buildFrame() {
  resetInd();
  const { a: A } = PAL.frame;
  const thick = 14;
  const layers = [];
  // 4 screws pop in
  const screws = [[-28, -37], [28, -37], [-7, -22], [7, -22]];
  screws.forEach(([dx, dy], i) => {
    const t0 = 24 + i * 6;
    layers.push(layer(
      `screw${i}`,
      ks({
        o: fadeLoop(t0, t0 + 8),
        p: posStatic(CX + dx, CY + dy),
        s: popScale(t0, t0 + 8, t0 + 14, 140),
      }),
      [
        grp([el(4, 4), fl([0.62, 0.65, 0.70, 1], 100)], "head"),
        grp([rc(5, 1.2, 0, [0, 0]), fl([1, 1, 1, 1], 85)], "slot-h"),
        grp([rc(1.2, 5, 0, [0, 0]), fl([1, 1, 1, 1], 85)], "slot-v"),
      ]
    ));
  });
  // vertical arm
  layers.push(layer(
    "armV",
    ks({
      o: fadeLoop(0, 10),
      p: posStatic(CX, CY - 9),
      a: anchorStatic(0, -35),
      s: growY(0, 18),
    }),
    [grp([rc(thick, 70), fl(A, 60), stk(A, 100, 1.2)])]
  ));
  // horizontal arm
  layers.push(layer(
    "armH",
    ks({
      o: fadeLoop(8, 18),
      p: posStatic(CX, CY - 37),
      a: anchorStatic(-44, 0),
      s: growX(8, 22),
    }),
    [grp([rc(88, thick), fl(A, 60), stk(A, 100, 1.2)])]
  ));
  return layers;
}

// ─── wallMount: 壁 + 下地 + 板 + L-bracket + アンカー ──────────────────────
function buildWallMount() {
  resetInd();
  const { a: A } = PAL.wallMount;
  const layers = [];
  const bW = 94, bH = 56;
  const bX = 28 + bW / 2, bY = CY;
  // anchors (small circles) pop in
  [bY - 20, bY + 16].forEach((ay, i) => {
    layers.push(layer(
      `anchor${i}`,
      ks({
        o: fadeLoop(32 + i * 4, 40 + i * 4),
        p: posStatic(16, ay),
        s: popScale(32 + i * 4, 40 + i * 4, 48 + i * 4, 150),
      }),
      [grp([el(4, 4), fl([0.75, 0.75, 0.80, 1], 100), stk(A, 100, 0.8)])]
    ));
  });
  // L-bracket
  layers.push(layer(
    "bracketArm",
    ks({
      o: fadeLoop(24, 32),
      p: posStatic(25, bY - 16),
      s: growX(24, 34),
    }),
    [grp([rc(14, 6, 0), fl([0.55, 0.57, 0.62, 1], 100)])]
  ));
  layers.push(layer(
    "bracketLeg",
    ks({
      o: fadeLoop(24, 32),
      p: posStatic(21, bY + 6),
      s: growY(24, 34),
    }),
    [grp([rc(6, 28, 0), fl([0.55, 0.57, 0.62, 1], 100)])]
  ));
  // board slides from right to wall
  layers.push(layer(
    "board",
    ks({
      o: fadeLoop(10, 18),
      p: anim([
        k(18, [bX + 40, bY, 0], 3),
        { t: 36, s: [bX, bY, 0] },
      ], 2),
    }),
    [grp([rc(bW, bH, 2), fl(A, 35), stk(A, 100, 1.5)])]
  ));
  // stud (highlighted vertical)
  layers.push(layer(
    "stud",
    ks({
      o: fadeLoop(4, 14),
      p: posStatic(16, CY),
      s: growY(4, 18),
    }),
    [grp([rc(12, H - 40), fl([0.80, 0.62, 0.40, 1], 70)])]
  ));
  // wall
  layers.push(layer(
    "wall",
    ks({ o: fadeLoop(0, 8), p: posStatic(16, CY) }),
    [grp([rc(20, H - 12), fl([0.90, 0.88, 0.84, 1], 90), stk([0.60, 0.60, 0.60, 1], 40, 0.8)])]
  ));
  return layers;
}

// ─── waterproof: 板(半分塗布) + 刷毛(横スライド) + しずく ────────────────
function buildWaterproof() {
  resetInd();
  const { a: A } = PAL.waterproof;
  const boardW = 122, boardH = 32;
  const boardY = CY + 8;
  const bx = CX - boardW / 2;
  const layers = [];
  // drops
  [[0.3, 4], [0.55, 8]].forEach(([rx, dy], i) => {
    layers.push(layer(
      `drop${i}`,
      ks({
        o: anim([k(60 + i * 3, [0]), k(70 + i * 3, [60]), k(DUR - 14, [60]), { t: DUR, s: [0] }], 11),
        p: posStatic(bx + boardW * rx, boardY + boardH / 2 + dy + 6),
        s: popScale(60 + i * 3, 70 + i * 3, 76 + i * 3),
      }),
      [grp([el(3, 4), fl(A, 60)])]
    ));
  });
  // brush — sweeps left to right over board
  layers.push(layer(
    "brush",
    ks({
      o: fadeLoop(18, 26),
      r: rotAnim(25, 25, 0, DUR),
      p: anim([
        k(26, [bx + 10, boardY - 20, 0], 3),
        { t: 64, s: [bx + boardW * 0.60, boardY - 20, 0] },
      ], 2),
    }),
    [
      grp([rc(10, 30, 0, [0, -15]), fl([0.50, 0.36, 0.20, 1], 100)], "handle"),
      grp([rc(14, 12, 0, [0, 6]), fl([0.30, 0.22, 0.15, 1], 100)], "ferrule"),
      // bristles
      ...Array.from({ length: 5 }, (_, i) =>
        grp([rc(1.5, 9, 0, [-6 + i * 3, 16])], `bristle${i}`)
      ),
    ]
  ));
  // coated portion (grows with brush)
  layers.push(layer(
    "coated",
    ks({
      o: fadeLoop(20, 30),
      p: posStatic(bx + (boardW * 0.55) / 2, boardY),
      s: growX(20, 60),
    }),
    [grp([rc(boardW * 0.55, boardH), fl(A, 60)])]
  ));
  // board
  layers.push(boardLayer(A, { y: boardY, w: boardW, h: boardH, fillOp: 30, strokeOp: 70, t0: 0, t1: 10 }));
  return layers;
}

// ─── paint: 縞状に塗られた板 + 刷毛 ─────────────────────────────────────────
function buildPaint() {
  resetInd();
  const { a: A } = PAL.paint;
  const boardW = 122, boardH = 30;
  const boardY = CY + 10;
  const bx = CX - boardW / 2;
  const layers = [];
  // brush sweeps
  layers.push(layer(
    "brush",
    ks({
      o: fadeLoop(16, 24),
      r: rotAnim(-30, -30, 0, DUR),
      p: anim([
        k(24, [bx + 8, boardY - 20, 0], 3),
        k(72, [bx + boardW - 8, boardY - 20, 0], 3),
        k(96, [bx + boardW - 8, boardY - 20, 0], 3),
        { t: DUR - 16, s: [bx + boardW * 0.5, boardY - 20, 0] },
      ], 2),
    }),
    [
      grp([rc(10, 32, 0, [0, -16]), fl([0.45, 0.30, 0.16, 1], 100)], "handle"),
      grp([rc(14, 10, 0, [0, 5]), fl([0.60, 0.60, 0.60, 1], 70)], "ferrule"),
      ...Array.from({ length: 6 }, (_, i) =>
        grp([rc(2.4, 9, 0, [-6 + i * 2.4, 14])], `bristle${i}`)
      ),
    ]
  ));
  // stripes appear sequentially
  const stripeAlphas = [0.85, 0.70, 0.90, 0.75];
  stripeAlphas.forEach((a, i) => {
    const sw = boardW * 0.22;
    const cx = bx + i * (boardW * 0.24) + sw / 2;
    const t0 = 24 + i * 12;
    layers.push(layer(
      `stripe${i}`,
      ks({
        o: anim([k(t0, [0]), k(t0 + 8, [100 * a]), k(DUR - 12, [100 * a]), { t: DUR, s: [0] }], 11),
        p: posStatic(cx, boardY),
        s: growX(t0, t0 + 8),
      }),
      [grp([rc(sw, boardH - 6)], fl(A, 100))]
    ));
  });
  // base board (wood tone)
  layers.push(layer(
    "board",
    ks({ o: fadeLoop(0, 10), p: posStatic(CX, boardY), s: popScale(0, 10, 16, 100) }),
    [grp([rc(boardW, boardH, 2), fl([0.78, 0.58, 0.30, 1], 60), stk(A, 55, 1)])]
  ));
  return layers;
}

// ─── inspect: 棚 + 大きなチェック ──────────────────────────────────────────
function buildInspect() {
  resetInd();
  const { a: A } = PAL.inspect;
  const layers = [];
  // big checkmark (draws in)
  layers.push(layer(
    "check",
    ks({
      o: fadeLoop(40, 50),
      p: posStatic(CX, CY),
      s: popScale(40, 50, 62, 140),
    }),
    [grp([sh([[-14, 2], [-4, 14], [18, -14]], false), stk(A, 100, 5)])]
  ));
  // shelf horizontal shelves
  const shelves = [-28, -4, 20];
  shelves.forEach((sy, i) => {
    const t0 = 0 + i * 6;
    layers.push(layer(
      `shelf${i}`,
      ks({
        o: fadeLoop(t0, t0 + 10),
        p: posStatic(CX, CY + sy + 4),
        s: growX(t0, t0 + 14),
      }),
      [grp([rc(60, 8)], fl(A, 45))]
    ));
  });
  // vertical sides
  [-30, 26].forEach((sx, i) => {
    const t0 = 14 + i * 4;
    layers.push(layer(
      `side${i}`,
      ks({
        o: fadeLoop(t0, t0 + 10),
        p: posStatic(CX + sx, CY),
        a: anchorStatic(0, -28),
        s: growY(t0, t0 + 14),
      }),
      [grp([rc(8, 56)], fl(A, 45))]
    ));
  });
  return layers;
}

// ─── screw: 2材接合 + ビス回転降下 + ドライバー矢印 ─────────────────────────
function buildScrew() {
  resetInd();
  const { a: A } = PAL.screw;
  const b1W = 100, b1H = 22;
  const b1Y = CY + 6;
  const b2W = b1H + 4, b2H = 50;
  const b2Y = b1Y - b2H / 2 - b1H / 2 + 2;
  const screwX = CX;
  const screwEndY = b2Y - b2H / 2 + 10;
  const layers = [];
  // driver arrow
  layers.push(layer(
    "driver",
    ks({
      o: fadeLoop(56, 66),
      p: anim([
        k(66, [screwX + 30, screwEndY - 30, 0], 3),
        { t: 84, s: [screwX + 14, screwEndY - 14, 0] },
      ], 2),
      s: popScale(56, 66, 72),
    }),
    [
      grp([rc(16, 2.5, 0, [-6, 0]), fl(A, 100)], "shaft"),
      grp([sh([[2, 0], [10, -6], [10, 6]]), fl(A, 100)], "head"),
    ]
  ));
  // screw (head + shaft dashed) — rotates + descends
  layers.push(layer(
    "screw",
    ks({
      o: fadeLoop(28, 36),
      r: anim([k(36, [0]), { t: 72, s: [540] }], 10),
      p: anim([
        k(36, [screwX, b2Y - b2H / 2 - 20, 0], 3),
        { t: 64, s: [screwX, screwEndY, 0] },
      ], 2),
    }),
    [
      grp([el(6, 6), fl([0.65, 0.68, 0.72, 1], 100)], "head"),
      grp([rc(4, 1.2, 0, [0, 0]), fl([1, 1, 1, 1], 90)], "slot-h"),
      grp([rc(1.2, 4, 0, [0, 0]), fl([1, 1, 1, 1], 90)], "slot-v"),
    ]
  ));
  // top board (vertical)
  layers.push(layer(
    "topBoard",
    ks({
      o: fadeLoop(10, 20),
      p: posStatic(screwX, b2Y),
      a: anchorStatic(0, b2H / 2),
      s: growY(10, 24),
    }),
    [grp([rc(b2W, b2H, 0), fl(A, 45), stk(A, 100, 1.2)])]
  ));
  // bottom board (horizontal)
  layers.push(layer(
    "bottomBoard",
    ks({ o: fadeLoop(0, 10), p: posStatic(screwX, b1Y) }),
    [grp([rc(b1W, b1H, 0), fl(A, 35), stk(A, 100, 1.2)])]
  ));
  return layers;
}

// ─── complete: 放射線(回転) + 円 + 大チェック + 紙吹雪 ──────────────────────
function buildComplete() {
  resetInd();
  const { a: A, s: S } = PAL.complete;
  const layers = [];
  // confetti
  const conf = [[-38, -22, 5], [30, -30, 4], [38, 10, 6], [-34, 18, 4], [14, 34, 5], [-14, 36, 3]];
  conf.forEach(([cx, cy, r], i) => {
    layers.push(layer(
      `conf${i}`,
      ks({
        o: anim([k(50 + i * 2, [0]), k(60 + i * 2, [85]), k(DUR - 12, [85]), { t: DUR, s: [0] }], 11),
        p: anim([
          k(50 + i * 2, [CX, CY, 0], 3),
          { t: 70 + i * 2, s: [CX + cx, CY + cy, 0] },
        ], 2),
        s: popScale(50 + i * 2, 60 + i * 2, 68 + i * 2, 130),
      }),
      [grp([el(r, r)], fl(S, 100))]
    ));
  });
  // big checkmark (pops in)
  layers.push(layer(
    "check",
    ks({
      o: fadeLoop(34, 44),
      p: posStatic(CX, CY),
      s: popScale(34, 44, 56, 150),
    }),
    [grp([sh([[-14, 2], [-3, 14], [16, -14]], false), stk(A, 100, 4.5)])]
  ));
  // circle
  layers.push(layer(
    "circle",
    ks({
      o: fadeLoop(20, 30),
      p: posStatic(CX, CY),
      s: popScale(20, 30, 40, 125),
    }),
    [grp([el(28, 28), fl(A, 20), stk(A, 100, 2.5)])]
  ));
  // rays (rotating group)
  const rays = [];
  for (let i = 0; i < 8; i++) {
    const rad = (i * 360) / 8;
    const rd = (rad * Math.PI) / 180;
    const r1 = 20, r2 = 38;
    rays.push(grp([sh([
      [r1 * Math.cos(rd), r1 * Math.sin(rd)],
      [r2 * Math.cos(rd), r2 * Math.sin(rd)],
    ], false), stk(A, 50, 2.5)], `ray${i}`));
  }
  layers.push(layer(
    "rays",
    ks({
      o: fadeLoop(0, 14),
      p: posStatic(CX, CY),
      r: spin(1, 0, DUR),
    }),
    rays
  ));
  return layers;
}

// ─── register + write ────────────────────────────────────────────────────────
const BUILDERS = {
  measure: buildMeasure,
  cut: buildCut,
  sand: buildSand,
  drill: buildDrill,
  foundation: buildFoundation,
  levelCheck: buildLevelCheck,
  topBoard: buildTopBoard,
  frame: buildFrame,
  wallMount: buildWallMount,
  waterproof: buildWaterproof,
  paint: buildPaint,
  inspect: buildInspect,
  screw: buildScrew,
  complete: buildComplete,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
let n = 0;
for (const [name, builder] of Object.entries(BUILDERS)) {
  const data = makeLottie(name, builder());
  const outPath = path.join(OUT_DIR, `${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data));
  console.log(`wrote ${outPath} (${data.layers.length} layers)`);
  n++;
}
console.log(`\ndone — ${n} files`);
