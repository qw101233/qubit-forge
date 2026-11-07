import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');

const checks = [];
const metrics = {};
let passed = 0;

function assert(name, ok, detail) {
  checks.push({ name, pass: !!ok, detail: detail || '' });
  if (ok) passed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
const near = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol;

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.qubit && window.qubit.getState);
await page.waitForTimeout(120);

/* ---------- 0. boot ---------- */
const boot = await page.evaluate(() => ({
  version: qubit.version,
  gateTypes: Object.keys(qubit.gates).length,
  presets: qubit.presetNames.length,
  maxQubits: qubit.maxQubits,
  qubits: qubit.getQubits(),
  circuit: qubit.getCircuit().length
}));
assert('0.1 页面启动并暴露 window.qubit', boot.version === '1.0.0', 'version ' + boot.version);
assert('0.2 门类型数量 = 14', boot.gateTypes === 14, boot.gateTypes + ' 种');
assert('0.3 预设数量 = 7', boot.presets === 7, boot.presets + ' 个');
assert('0.4 最大量子比特 = 12', boot.maxQubits === 12, boot.maxQubits + ' qubits');
assert('0.5 初始载入 Bell 电路', boot.circuit === 2, boot.circuit + ' 门');
metrics.version = boot.version;
metrics.gateTypes = boot.gateTypes;
metrics.presetCount = boot.presets;
metrics.maxQubits = boot.maxQubits;

/* ---------- 0b. real UI clicks (not just API) ---------- */
await page.evaluate(() => { qubit.setQubits(1); qubit.clearCircuit(); });
await page.click('.gate-btn[data-gate="X"]');
await page.locator('#circuitSvg [data-cell][data-q="0"][data-col="0"]').click();
const clickOne = await page.evaluate(() => ({ n: qubit.getCircuit().length, type: qubit.getCircuit()[0] && qubit.getCircuit()[0].type }));
assert('0.6 UI 点击放置单比特门（选 X → 点格子）', clickOne.n === 1 && clickOne.type === 'X',
  `circuit=${clickOne.n} type=${clickOne.type}`);

await page.evaluate(() => { qubit.setQubits(2); qubit.clearCircuit(); });
await page.click('.gate-btn[data-gate="CNOT"]');
await page.locator('#circuitSvg [data-cell][data-q="0"][data-col="0"]').click();
await page.locator('#circuitSvg [data-cell][data-q="1"][data-col="0"]').click();
const clickTwo = await page.evaluate(() => {
  const c = qubit.getCircuit();
  return { n: c.length, type: c[0] && c[0].type, qubits: c[0] && c[0].qubits };
});
assert('0.7 UI 两次点击放置 CNOT（控制位 + 目标位）',
  clickTwo.n === 1 && clickTwo.type === 'CNOT' && clickTwo.qubits.join(',') === '0,1',
  `circuit=${clickTwo.n} qubits=${clickTwo.qubits}`);

/* ---------- 1. single-qubit gates ---------- */
const hState = await page.evaluate(() => {
  qubit.setQubits(1);
  qubit.setCircuit([{ type: 'H', qubits: [0], col: 0 }]);
  return qubit.getState();
});
assert('1.1 H|0⟩ 振幅 = 1/√2', near(hState.re[0], Math.SQRT1_2) && near(hState.re[1], Math.SQRT1_2),
  `re=[${hState.re[0].toFixed(6)}, ${hState.re[1].toFixed(6)}]`);

const xState = await page.evaluate(() => {
  qubit.setCircuit([{ type: 'X', qubits: [0], col: 0 }]);
  return qubit.getState();
});
assert('1.2 X|0⟩ = |1⟩', near(xState.re[1], 1) && near(xState.re[0], 0));

const yState = await page.evaluate(() => {
  qubit.setCircuit([{ type: 'Y', qubits: [0], col: 0 }]);
  return qubit.getState();
});
assert('1.3 Y|0⟩ = i|1⟩', near(yState.re[1], 0) && near(yState.im[1], 1));

const sState = await page.evaluate(() => {
  qubit.setCircuit([
    { type: 'X', qubits: [0], col: 0 },
    { type: 'S', qubits: [0], col: 1 },
    { type: 'S', qubits: [0], col: 2 }
  ]);
  return qubit.getState();
});
assert('1.4 S·S = Z（|1⟩ → -|1⟩）', near(sState.re[1], -1),
  `re[1]=${sState.re[1].toFixed(6)}`);

const tState = await page.evaluate(() => {
  qubit.setCircuit([
    { type: 'X', qubits: [0], col: 0 },
    { type: 'T', qubits: [0], col: 1 },
    { type: 'T', qubits: [0], col: 2 }
  ]);
  return qubit.getState();
});
assert('1.5 T·T = S（|1⟩ → i|1⟩）', near(tState.im[1], 1) && near(tState.re[1], 0));

const rotAng = 1.234;
const rxState = await page.evaluate((a) => {
  qubit.setCircuit([{ type: 'RX', qubits: [0], angle: a, col: 0 }]);
  return qubit.getState();
}, rotAng);
assert('1.6 RX(θ)|0⟩ 对照 cos/sin 解析式',
  near(rxState.re[0], Math.cos(rotAng / 2)) && near(rxState.im[1], -Math.sin(rotAng / 2)),
  `re0=${rxState.re[0].toFixed(6)} im1=${rxState.im[1].toFixed(6)}`);

const ryState = await page.evaluate((a) => {
  qubit.setCircuit([{ type: 'RY', qubits: [0], angle: a, col: 0 }]);
  return qubit.getState();
}, rotAng);
assert('1.7 RY(θ)|0⟩ = cos|0⟩ + sin|1⟩',
  near(ryState.re[0], Math.cos(rotAng / 2)) && near(ryState.re[1], Math.sin(rotAng / 2)));

const rzState = await page.evaluate((a) => {
  qubit.setCircuit([
    { type: 'X', qubits: [0], col: 0 },
    { type: 'RZ', qubits: [0], angle: a, col: 1 }
  ]);
  return qubit.getState();
}, rotAng);
assert('1.8 RZ(θ)|1⟩ 相位 = e^{iθ/2}',
  near(rzState.re[1], Math.cos(rotAng / 2)) && near(rzState.im[1], Math.sin(rotAng / 2)));

/* ---------- 2. multi-qubit gates ---------- */
const cnot = await page.evaluate(() => {
  qubit.setQubits(2);
  qubit.setCircuit([
    { type: 'X', qubits: [0], col: 0 },
    { type: 'CNOT', qubits: [0, 1], col: 1 }
  ]);
  return qubit.getProbs();
});
assert('2.1 CNOT：控制位为 1 时翻转目标位', near(cnot[3], 1), `P(|11⟩)=${cnot[3]}`);

const cz = await page.evaluate(() => {
  qubit.setCircuit([
    { type: 'H', qubits: [0], col: 0 },
    { type: 'H', qubits: [1], col: 0 },
    { type: 'CZ', qubits: [0, 1], col: 1 }
  ]);
  return qubit.getState();
});
assert('2.2 CZ：仅 |11⟩ 获得 -1 相位',
  near(cz.re[0], 0.5) && near(cz.re[1], 0.5) && near(cz.re[2], 0.5) && near(cz.re[3], -0.5));

const swap = await page.evaluate(() => {
  qubit.setCircuit([
    { type: 'X', qubits: [0], col: 0 },
    { type: 'SWAP', qubits: [0, 1], col: 1 }
  ]);
  return qubit.getProbs();
});
assert('2.3 SWAP：|10⟩ → |01⟩', near(swap[1], 1), `P(|01⟩)=${swap[1]}`);

const toffoli = await page.evaluate(() => {
  qubit.setQubits(3);
  qubit.setCircuit([
    { type: 'X', qubits: [0], col: 0 },
    { type: 'X', qubits: [1], col: 1 },
    { type: 'TOFFOLI', qubits: [0, 1, 2], col: 2 }
  ]);
  return qubit.getProbs();
});
assert('2.4 Toffoli：双控制位为 1 时翻转目标位', near(toffoli[7], 1), `P(|111⟩)=${toffoli[7]}`);

/* ---------- 3. preset circuits / entanglement ---------- */
const bell = await page.evaluate(() => {
  qubit.loadPreset('bell');
  const p = qubit.getProbs();
  const b0 = qubit.getBloch(0), b1 = qubit.getBloch(1);
  return { p, b0, b1, stats: qubit.getStats(), circuit: qubit.getCircuit() };
});
assert('3.1 Bell 态：仅 |00⟩ 与 |11⟩，各 50%',
  near(bell.p[0], 0.5) && near(bell.p[3], 0.5) && bell.p[1] < 1e-12 && bell.p[2] < 1e-12);
assert('3.2 Bell 态：单比特约化态最大混合（r≈0，S=1 bit）',
  bell.b0.r < 1e-9 && bell.b1.r < 1e-9 && near(bell.b0.entropy, 1, 1e-9),
  `r=${bell.b0.r.toExponential(2)}, S=${bell.b0.entropy.toFixed(6)}`);
metrics.bell = { p00: bell.p[0], p11: bell.p[3], entropy: bell.b0.entropy, r: bell.b0.r };

const ghz = await page.evaluate(() => {
  qubit.loadPreset('ghz');
  const p = qubit.getProbs();
  const e = [0, 1, 2].map((q) => qubit.getBloch(q).entropy);
  return { p, e, stats: qubit.getStats() };
});
assert('3.3 GHZ-3：|000⟩ 与 |111⟩ 各 50%',
  near(ghz.p[0], 0.5) && near(ghz.p[7], 0.5) && ghz.p.reduce((a, b, i) => a + (i === 0 || i === 7 ? 0 : b), 0) < 1e-12,
  `P000=${ghz.p[0]}, P111=${ghz.p[7]}`);
assert('3.4 GHZ-3：每个比特边缘熵 = 1 bit',
  ghz.e.every((x) => near(x, 1, 1e-9)), 'S=' + ghz.e.map((x) => x.toFixed(4)).join(','));
metrics.ghz = { p000: ghz.p[0], p111: ghz.p[7], entropy: ghz.e[0] };

const qftUniform = await page.evaluate(() => {
  qubit.loadPreset('qft');
  const s = qubit.getState();
  const p = qubit.getProbs();
  return { s, p, maxDev: Math.max(...p.map((x) => Math.abs(x - 0.125))) };
});
assert('3.5 QFT-3 作用于 |000⟩：8 个基态等幅 1/8，相位为 0',
  qftUniform.maxDev < 1e-12 &&
  qftUniform.s.im.every((x) => Math.abs(x) < 1e-12),
  `max|p-1/8|=${qftUniform.maxDev.toExponential(2)}`);

const qftRef = await page.evaluate(() => {
  const gates = [
    { type: 'X', qubits: [2], col: 0 },
    { type: 'H', qubits: [0], col: 1 },
    { type: 'CP', qubits: [1, 0], angle: Math.PI / 2, col: 2 },
    { type: 'CP', qubits: [2, 0], angle: Math.PI / 4, col: 3 },
    { type: 'H', qubits: [1], col: 4 },
    { type: 'CP', qubits: [2, 1], angle: Math.PI / 2, col: 5 },
    { type: 'H', qubits: [2], col: 6 },
    { type: 'SWAP', qubits: [0, 2], col: 7 }
  ];
  qubit.setQubits(3);
  qubit.setCircuit(gates);
  return { s: qubit.getState(), stats: qubit.getStats() };
});
const N8 = 8, xIn = 1;
let maxQftErr = 0;
for (let k = 0; k < N8; k++) {
  const arg = 2 * Math.PI * xIn * k / N8;
  const refRe = Math.cos(arg) / Math.sqrt(N8);
  const refIm = Math.sin(arg) / Math.sqrt(N8);
  maxQftErr = Math.max(maxQftErr, Math.abs(qftRef.s.re[k] - refRe), Math.abs(qftRef.s.im[k] - refIm));
}
assert('3.6 QFT-3 作用于 |001⟩：振幅与独立 DFT 参考逐点一致',
  maxQftErr < 1e-12, `max deviation=${maxQftErr.toExponential(2)}`);
metrics.qft = { maxDeviation: maxQftErr, uniformMaxDev: qftUniform.maxDev };

const grover = await page.evaluate(() => {
  qubit.loadPreset('grover');
  const p = qubit.getProbs();
  const stats = qubit.getStats();
  return { p, stats };
});
assert('3.7 Grover 一次迭代：标记态 |11⟩ 命中率 = 100%',
  near(grover.p[3], 1, 1e-12), `P(|11⟩)=${grover.p[3]}`);
metrics.grover = { p11: grover.p[3], gateCount: grover.stats.gateCount, depth: grover.stats.depth };

const djConstant = await page.evaluate(() => {
  qubit.setQubits(3);
  qubit.setCircuit([
    { type: 'X', qubits: [2], col: 0 },
    { type: 'H', qubits: [0], col: 1 },
    { type: 'H', qubits: [1], col: 1 },
    { type: 'H', qubits: [2], col: 1 },
    { type: 'H', qubits: [0], col: 2 },
    { type: 'H', qubits: [1], col: 2 }
  ]);
  const p = qubit.getProbs();
  const inputZero = p[0] + p[1]; // q0=q1=0, ancilla(q2)=0/1
  return { inputZero };
});
assert('3.8 Deutsch–Jozsa 常函数：输入寄存器必为 00',
  near(djConstant.inputZero, 1, 1e-12), `P(input=00)=${djConstant.inputZero}`);

const djBalanced = await page.evaluate(() => {
  qubit.setCircuit([
    { type: 'X', qubits: [2], col: 0 },
    { type: 'H', qubits: [0], col: 1 },
    { type: 'H', qubits: [1], col: 1 },
    { type: 'H', qubits: [2], col: 1 },
    { type: 'CNOT', qubits: [0, 2], col: 2 },
    { type: 'H', qubits: [0], col: 3 },
    { type: 'H', qubits: [1], col: 3 }
  ]);
  const p = qubit.getProbs();
  let inputZero = 0, inputOne = 0;
  for (let i = 0; i < 8; i++) {
    const q0 = (i >> 2) & 1, q1 = (i >> 1) & 1;
    if (q0 === 0 && q1 === 0) inputZero += p[i];
    if (q0 === 1 && q1 === 0) inputOne += p[i];
  }
  return { inputZero, inputOne };
});
assert('3.9 Deutsch–Jozsa 平衡函数：输入寄存器必不为 00（本例为 10）',
  djBalanced.inputZero < 1e-12 && near(djBalanced.inputOne, 1, 1e-12),
  `P(00)=${djBalanced.inputZero.toExponential(2)}, P(10)=${djBalanced.inputOne}`);

const teleport = await page.evaluate(() => {
  qubit.loadPreset('teleport');
  const b = qubit.getBloch(2);
  const b0 = qubit.getBloch(0);
  return { b, b0 };
});
const theta = 0.927;
assert('3.10 量子隐形传态：q2 约化态复原 RY(θ)|0⟩（布洛赫向量一致）',
  near(teleport.b.z, Math.cos(theta), 1e-9) && near(teleport.b.x, Math.sin(theta), 1e-9) &&
  near(teleport.b.r, 1, 1e-9),
  `q2: x=${teleport.b.x.toFixed(6)} z=${teleport.b.z.toFixed(6)} r=${teleport.b.r.toFixed(6)}`);
metrics.teleport = { fidelity: teleport.b.r, x: teleport.b.x, z: teleport.b.z };

/* ---------- 4. sampling ---------- */
const sampling = await page.evaluate(() => {
  qubit.loadPreset('bell');
  const a = qubit.sample(2000, 42);
  const b = qubit.sample(2000, 42);
  const c = qubit.sample(2000, 7);
  return { a, b, c, same: JSON.stringify(a) === JSON.stringify(b), diff: JSON.stringify(a) !== JSON.stringify(c) };
});
const counts = Object.fromEntries(sampling.a.entries.map((e) => [e.bits, e.count]));
assert('4.1 Bell 采样 2000 shots：只出现 00/11，总数为 2000',
  Object.keys(counts).every((k) => k === '00' || k === '11') &&
  (counts['00'] || 0) + (counts['11'] || 0) === 2000,
  `00=${counts['00']}, 11=${counts['11']}`);
assert('4.2 Bell 采样在 4σ 内（各 1000±90）',
  Math.abs((counts['00'] || 0) - 1000) < 90 && Math.abs((counts['11'] || 0) - 1000) < 90,
  `偏差 ${Math.abs((counts['00'] || 0) - 1000).toFixed(0)}`);
assert('4.3 采样确定性：同 seed 结果完全一致，不同 seed 不同', sampling.same && sampling.diff,
  'seed 42 vs 42 一致 / 42 vs 7 不同');
metrics.sampling = { shots: 2000, seed: 42, count00: counts['00'], count11: counts['11'] };

/* ---------- 5. unitarity / scaling / benchmark ---------- */
const rand = prng(20261107);
const randTypes = ['H', 'X', 'Y', 'Z', 'S', 'T', 'RX', 'RY', 'RZ'];
const randCircuit = [];
for (let i = 0; i < 40; i++) {
  let q = Math.floor(rand() * 6);
  if (rand() < 0.35) {
    let t = (q + 1 + Math.floor(rand() * 5)) % 6;
    randCircuit.push({ type: 'CNOT', qubits: [q, t], col: i });
  } else {
    randCircuit.push({ type: randTypes[Math.floor(rand() * randTypes.length)], qubits: [q], angle: rand() * 6.283, col: i });
  }
}
const unit = await page.evaluate((list) => {
  qubit.setQubits(6);
  qubit.setCircuit(list);
  const stats = qubit.getStats();
  return { norm: stats.norm, dim: stats.dim, n: stats.n, gateCount: stats.gateCount };
}, randCircuit);
assert('5.1 40 门随机电路后总概率保持 1（幺正性）',
  near(unit.norm, 1, 1e-12), `norm=${unit.norm.toFixed(14)}`);
assert('5.2 6 qubits 维度 = 64', unit.dim === 64);

const perf = await page.evaluate(() => {
  qubit.setQubits(12);
  const list = [];
  let col = 0;
  for (let q = 0; q < 12; q++) list.push({ type: 'H', qubits: [q], col: col });
  col++;
  for (let q = 0; q < 11; q++) { list.push({ type: 'CNOT', qubits: [q, q + 1], col: col }); col++; }
  for (let q = 0; q < 12; q += 2) list.push({ type: 'RY', qubits: [q], angle: 0.7, col: col });
  col++;
  qubit.setCircuit(list);
  const runs = [];
  let st;
  for (let i = 0; i < 5; i++) {
    qubit.run();
    st = qubit.getStats();
    runs.push(st.simMs);
  }
  runs.sort((a, b) => a - b);
  return { dim: st.dim, gateCount: st.gateCount, medianMs: runs[2], minMs: runs[0], maxMs: runs[4], norm: st.norm };
});
assert('5.3 12 qubits（4096 维）25 门电路可运行',
  perf.dim === 4096 && perf.norm > 0.999999 && perf.norm < 1.000001,
  `dim=${perf.dim}, gates=${perf.gateCount}`);
assert('5.4 12 qubits 模拟中位耗时 < 50 ms',
  perf.medianMs < 50, `median ${perf.medianMs.toFixed(3)} ms (min ${perf.minMs.toFixed(3)} / max ${perf.maxMs.toFixed(3)})`);
metrics.perf = perf;

const clear = await page.evaluate(() => {
  qubit.clearCircuit();
  const p = qubit.getProbs();
  return { p0: p[0], stats: qubit.getStats() };
});
assert('5.5 清空电路回到 |0…0⟩', near(clear.p0, 1) && clear.stats.gateCount === 0,
  `P(|0…0⟩)=${clear.p0}, gates=${clear.stats.gateCount}`);

const roundtrip = await page.evaluate(() => {
  const list = [
    { type: 'H', qubits: [0], col: 0 },
    { type: 'CP', qubits: [1, 0], angle: 0.5, col: 1 }
  ];
  qubit.setQubits(2);
  qubit.setCircuit(list);
  const back = qubit.getCircuit();
  return { len: back.length, type1: back[1].type, angle1: back[1].angle, qubits1: back[1].qubits };
});
assert('5.6 电路 API 往返一致（类型/角度/比特）',
  roundtrip.len === 2 && roundtrip.type1 === 'CP' && near(roundtrip.angle1, 0.5) &&
  roundtrip.qubits1.join(',') === '1,0');

assert('5.7 全流程无 pageerror / console error', errors.length === 0,
  errors.length ? errors.join(' | ') : '0 errors');

/* ---------- summary ---------- */
const total = checks.length;
const status = passed === total ? 'PASS' : 'FAIL';
metrics.bellSampling = metrics.sampling;
metrics.perfMedianMs = perf.medianMs;
metrics.perfMinMs = perf.minMs;
metrics.randomNorm = unit.norm;

const out = {
  status, passed, total, timestamp: new Date().toISOString(),
  metrics, checks
};
fs.writeFileSync(path.join(root, 'tools', 'verification.json'), JSON.stringify(out, null, 2), 'utf8');
console.log(`\n${status}: ${passed}/${total} checks passed`);
console.log('verification.json written.');

await browser.close();
process.exit(status === 'PASS' ? 0 : 1);
