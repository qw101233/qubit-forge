import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const slidesDir = path.join(root, 'slides');
const outDir = path.join(root, 'deliverables');

const verification = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'verification.json'), 'utf8'));
if (verification.status !== 'PASS') {
  console.error('verification.json 不是 PASS，拒绝生成图文。');
  process.exit(1);
}
const m = verification.metrics;
const passed = verification.passed;
const total = verification.total;

const BASE_CSS = `
:root{
  --bg:#05080f;--panel:rgba(15,23,40,.88);--line:rgba(120,180,255,.22);
  --text:#eaf2ff;--muted:#93a8c8;--cyan:#38e1ff;--violet:#a98bff;
  --magenta:#ff5cc8;--amber:#ffc857;--green:#52e0a4;
  --mono:"Cascadia Code","JetBrains Mono",Consolas,"Courier New",monospace;
  --sans:"Segoe UI","Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:var(--bg)}
body{font-family:var(--sans);color:var(--text);-webkit-font-smoothing:antialiased}
.slide{
  position:relative;width:1080px;height:1920px;padding:68px 72px 48px;overflow:hidden;
  display:flex;flex-direction:column;justify-content:space-between;
  background:
    radial-gradient(720px 640px at 105% -6%, rgba(169,139,255,.20), transparent 64%),
    radial-gradient(760px 700px at -10% 34%, rgba(56,225,255,.13), transparent 66%),
    radial-gradient(900px 620px at 50% 112%, rgba(255,92,200,.09), transparent 68%),
    #05080f;
}
.slide::before{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(120,170,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(120,170,255,.045) 1px,transparent 1px);
  background-size:64px 64px;
  mask-image:linear-gradient(180deg,transparent,#000 12%,#000 88%,transparent);
}
.eyebrow{
  font-family:var(--mono);font-size:17px;letter-spacing:.32em;color:var(--cyan);
  text-transform:uppercase;display:flex;align-items:center;gap:16px;
}
.eyebrow::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(56,225,255,.5),transparent)}
h1{font-size:104px;line-height:1.02;letter-spacing:-.02em;margin-top:34px;font-weight:750;
  background:linear-gradient(100deg,#ffffff 10%,#9fe9ff 40%,#b79dff 78%,#ff8ad8);
  -webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:70px;line-height:1.1;margin-top:22px;letter-spacing:-.01em;font-weight:750}
h2 .accent{color:var(--cyan)}
.sub{font-size:30px;color:#bfd3ee;margin-top:18px;font-weight:500;letter-spacing:.02em}
.lead{font-size:24px;line-height:1.72;color:var(--muted);margin-top:24px;max-width:900px}
.hero{
  margin-top:34px;border-radius:26px;overflow:hidden;border:1px solid rgba(56,225,255,.30);
  box-shadow:0 34px 90px rgba(0,0,0,.55),0 0 70px rgba(56,225,255,.10);
  background:#080d18;
}
.hero img{display:block;width:100%;height:100%;object-fit:cover}
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}
.stat-card{
  background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:22px 24px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
}
.stat-card .num{font-family:var(--mono);font-size:46px;font-weight:700;color:var(--cyan);line-height:1}
.stat-card .unit{font-family:var(--mono);font-size:15px;color:var(--muted);margin-left:8px;letter-spacing:.12em}
.stat-card .k{display:block;font-size:16px;color:var(--muted);margin-top:12px}
.signal-row{display:flex;justify-content:space-between;gap:18px;margin-top:26px;
  padding:22px 26px;border:1px dashed rgba(120,180,255,.26);border-radius:18px;background:rgba(10,16,29,.55)}
.signal-row div{display:flex;flex-direction:column;gap:6px}
.signal-row b{font-family:var(--mono);font-size:26px;color:#dff4ff}
.signal-row span{font-size:14px;color:var(--muted);letter-spacing:.04em}
.feature{
  display:grid;grid-template-columns:0.92fr 1.08fr;gap:26px;align-items:center;
  background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:22px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
}
.feature .tag{font-family:var(--mono);font-size:14px;letter-spacing:.22em;color:var(--violet)}
.feature h3{font-size:31px;margin-top:10px;font-weight:700;letter-spacing:.01em}
.feature p{font-size:19px;line-height:1.68;color:var(--muted);margin-top:12px}
.feature .mini{display:flex;gap:18px;margin-top:16px;font-size:15px;color:#cfe0f7}
.feature .mini b{font-family:var(--mono);color:var(--cyan);font-size:19px}
.fimg{height:300px;border-radius:16px;overflow:hidden;border:1px solid rgba(120,180,255,.20);background:#080d18}
.fimg img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
.verify-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.vcard{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px 24px}
.vcard .v{font-family:var(--mono);font-size:40px;font-weight:700;color:var(--green);line-height:1.1}
.vcard .v.small{font-size:29px}
.vcard .k{font-size:16px;color:var(--muted);margin-top:8px}
.vcard .s{font-family:var(--mono);font-size:12px;color:rgba(147,168,200,.75);margin-top:6px}
footer{
  padding-top:22px;border-top:1px solid rgba(120,180,255,.18);
  display:flex;align-items:center;justify-content:space-between;gap:20px;
  font-size:15px;color:var(--muted);
}
footer .repo{font-family:var(--mono);color:var(--cyan);font-size:15px}
footer .page{font-family:var(--mono);color:rgba(147,168,200,.8)}
.note{font-size:15px;color:var(--muted);margin-top:16px;line-height:1.6}
.tech-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:28px}
.tech{background:rgba(10,18,32,.62);border:1px solid rgba(120,180,255,.16);border-left:2px solid rgba(56,225,255,.6);
  border-radius:14px;padding:18px 18px 20px}
.tech .tno{font-family:var(--mono);font-size:12px;color:var(--violet);letter-spacing:.18em}
.tech b{display:block;font-size:20px;margin-top:8px;font-weight:650}
.tech p{font-size:14px;line-height:1.6;color:var(--muted);margin-top:7px}
.pipeline{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1fr;align-items:center;gap:10px;
  background:rgba(10,18,32,.7);border:1px solid rgba(120,180,255,.18);border-radius:16px;padding:16px 18px;margin-top:26px}
.pnode{text-align:center;padding:6px 4px}
.pnode b{display:block;font-size:18px;font-weight:650}
.pnode span{display:block;font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:5px}
.parrow{color:var(--cyan);font-family:var(--mono);font-size:20px}
.method-row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:22px}
.method{background:rgba(10,18,32,.62);border:1px solid rgba(120,180,255,.16);border-radius:14px;padding:18px 18px 20px}
.method b{display:block;font-size:19px;color:#dff2ff;font-weight:650}
.method span{display:block;font-size:13px;line-height:1.6;color:var(--muted);margin-top:7px}
`;

const esc = (s) => String(s);

function slide1() {
  const maxDim = 1 << m.maxQubits;
  const perfMs = m.perfMedianMs.toFixed(1);
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>Qubit Forge · 项目简介</title>
<style>${BASE_CSS}
.hero{height:566px}
.lead{max-width:940px}
</style></head><body>
<div class="slide">
  <div class="eyebrow" data-qc>QUANTUM CIRCUIT WORKBENCH · STATEVECTOR LAB</div>
  <h1 data-qc>Qubit Forge</h1>
  <div class="sub" data-qc>量子电路工坊 —— 把量子态变成可触摸的画布</div>
  <p class="lead" data-qc>在浏览器里点选量子门、搭建电路，实时求解 2<sup>n</sup> 维复振幅态矢量；振幅、相位、纠缠熵与测量采样在同一页面同步呈现。</p>
  <div class="hero" data-qc><img src="../screenshots/demo-ui.png" alt="Qubit Forge 主界面"></div>
  <div class="stats-row">
    <div class="stat-card" data-qc><span class="num">${m.maxQubits}</span><span class="unit">QUBITS</span><span class="k">最大态矢量维度 ${maxDim}</span></div>
    <div class="stat-card" data-qc><span class="num">${m.gateTypes}</span><span class="unit">GATES</span><span class="k">旋转 / 受控 / Toffoli 全支持</span></div>
    <div class="stat-card" data-qc><span class="num">${passed}</span><span class="unit">CHECKS</span><span class="k">Playwright 断言全部通过</span></div>
  </div>
  <div class="tech-row">
    <div class="tech" data-qc><span class="tno">01 / STATE</span><b>复振幅态矢量</b><p>Float64Array 实部/虚部双数组，${maxDim} 维毫秒级求解</p></div>
    <div class="tech" data-qc><span class="tno">02 / RENDER</span><b>单文件零依赖</b><p>SVG 电路图 + Canvas 2D 面板，双击 index.html 即用</p></div>
    <div class="tech" data-qc><span class="tno">03 / PROOF</span><b>可证伪实现</b><p>${passed} 项断言对照解析解与独立 DFT 参考</p></div>
  </div>
  <div class="signal-row">
    <div data-qc><b>${maxDim}</b><span>维复振幅态矢量</span></div>
    <div data-qc><b>${m.sampling.shots}</b><span>shots / 可复现采样</span></div>
    <div data-qc><b>${perfMs} ms</b><span>12 qubits 模拟中位耗时</span></div>
  </div>
  <footer data-qc><span>零依赖 · 双击 index.html 即运行</span><span class="repo">github.com/qw101233/qubit-forge</span><span class="page">01 / 03</span></footer>
</div>
</body></html>`;
}

function slide2() {
  const perf = m.perfMedianMs.toFixed(1);
  const qftDev = m.qft.maxDeviation.toExponential(2);
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>Qubit Forge · 核心功能</title>
<style>${BASE_CSS}
.slide{padding-top:60px}
.feature h3{margin-top:8px}
.features{display:flex;flex-direction:column;gap:20px;margin-top:34px}
.verify-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}
.vs{background:rgba(10,18,32,.72);border:1px solid rgba(120,180,255,.18);border-radius:14px;padding:14px 16px}
.vs b{display:block;font-family:var(--mono);font-size:22px;color:var(--cyan)}
.vs span{display:block;font-size:13px;color:var(--muted);margin-top:5px}
</style></head><body>
<div class="slide">
  <div class="eyebrow" data-qc>02 · CORE FEATURES · 实测运行截图</div>
  <h2 data-qc>核心<span class="accent">功能</span></h2>
  <div class="sub" data-qc>门级编排 → 态矢量求解 → 可视化与采样，全链路单页闭环</div>

  <div class="features">
    <div class="feature" data-qc>
      <div>
        <div class="tag">01 / CIRCUIT</div>
        <h3>点选式电路编排</h3>
        <p>${m.gateTypes} 种量子门、${m.presetCount} 个预设电路。单比特门一点即放；CNOT / CZ / SWAP / Toffoli 依次点击控制位与目标位，同列冲突实时拦截，点门即可删除。</p>
        <div class="mini"><span><b>${m.gateTypes}</b> 门类型</span><span><b>${m.presetCount}</b> 预设</span><span><b>≤${m.maxQubits}</b> qubits</span></div>
      </div>
      <div class="fimg"><img src="../screenshots/demo-stage.png" alt="电路编辑器与振幅分布"></div>
    </div>

    <div class="feature" data-qc>
      <div>
        <div class="tag">02 / AMPLITUDE</div>
        <h3>振幅与相位直方图</h3>
        <p>实时渲染每个基态的 |振幅|²；颜色编码复数相位，青色到洋红对应 0 → 2π。QFT 的输出相位可直接在图上读出。</p>
        <div class="mini"><span><b>${1 << m.maxQubits}</b> states</span><span><b>${qftDev}</b> QFT 最大偏差</span></div>
      </div>
      <div class="fimg"><img src="../screenshots/demo-qft.png" alt="QFT 振幅分布"></div>
    </div>

    <div class="feature" data-qc>
      <div>
        <div class="tag">03 / ENTANGLEMENT</div>
        <h3>布洛赫球 · 纠缠熵 · 测量</h3>
        <p>由约化密度矩阵求布洛赫向量与边缘熵；Bell / GHZ 会显示 r = 0、S = 1 bit。测量面板用固定种子跑 ${m.sampling.shots} shots，结果可逐位复现。</p>
        <div class="mini"><span><b>${m.sampling.shots}</b> shots</span><span><b>${m.sampling.count00}</b>/<b>${m.sampling.count11}</b> Bell 计数</span></div>
      </div>
      <div class="fimg"><img src="../screenshots/demo-bell.png" alt="Bell 态布洛赫球与测量采样"></div>
    </div>
  </div>

  <div class="pipeline" data-qc>
    <div class="pnode"><b>点选电路</b><span>${m.gateTypes} gates</span></div>
    <div class="parrow">→</div>
    <div class="pnode"><b>态矢量演化</b><span>Float64 × 2</span></div>
    <div class="parrow">→</div>
    <div class="pnode"><b>振幅 / 布洛赫</b><span>SVG + Canvas</span></div>
    <div class="parrow">→</div>
    <div class="pnode"><b>采样与验证</b><span>${m.sampling.shots} shots</span></div>
  </div>

  <div class="verify-strip">
    <div class="vs" data-qc><b>${passed}/${total}</b><span>自动化断言</span></div>
    <div class="vs" data-qc><b>${(m.grover.p11 * 100).toFixed(2)}%</b><span>Grover 一次迭代命中</span></div>
    <div class="vs" data-qc><b>${qftDev}</b><span>QFT vs 独立 DFT</span></div>
    <div class="vs" data-qc><b>${perf} ms</b><span>12 qubits 中位耗时</span></div>
  </div>

  <footer data-qc><span>数字来源 · tools/verification.json</span><span class="repo">github.com/qw101233/qubit-forge</span><span class="page">02 / 03</span></footer>
</div>
</body></html>`;
}

function slide3() {
  const s = m.sampling;
  const bellTotal = s.count00 + s.count11;
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>Qubit Forge · 最终效果</title>
<style>${BASE_CSS}
.slide{padding-top:60px}
.hero{height:560px}
.verify-grid{margin-top:26px}
.quote{font-size:17px;line-height:1.7;color:var(--muted);margin-top:20px}
.quote b{color:#d6e9ff}
</style></head><body>
<div class="slide">
  <div class="eyebrow" data-qc>03 · VERIFICATION · 实测结果</div>
  <h2 data-qc>最终<span class="accent">效果</span></h2>
  <div class="sub" data-qc>${passed}/${total} 项断言全部通过 —— 数字由无头浏览器真实运行采集</div>

  <div class="hero" data-qc><img src="../screenshots/demo-grover.png" alt="Grover 搜索电路与 100% 命中"></div>

  <div class="verify-grid">
    <div class="vcard" data-qc><div class="v">${passed}/${total}</div><div class="k">Playwright 断言通过</div><div class="s">UI 点击 / 解析解 / 采样 / 幺正性</div></div>
    <div class="vcard" data-qc><div class="v">${(m.grover.p11 * 100).toFixed(2)}%</div><div class="k">Grover 一次迭代命中 |11⟩</div><div class="s">概率 ${m.grover.p11.toFixed(6)} · 11 门 · 深度 ${m.grover.depth}</div></div>
    <div class="vcard" data-qc><div class="v small">${s.count00} / ${s.count11}</div><div class="k">Bell 态 ${s.shots} shots 计数</div><div class="s">seed ${s.seed} · 仅 00/11 · 合计 ${bellTotal}</div></div>
    <div class="vcard" data-qc><div class="v small">${m.qft.maxDeviation.toExponential(2)}</div><div class="k">QFT-3 与独立 DFT 参考最大偏差</div><div class="s">8 个基态逐点复振幅比对</div></div>
    <div class="vcard" data-qc><div class="v small">${m.perfMedianMs.toFixed(1)} ms</div><div class="k">12 qubits · ${m.perf.gateCount} 门模拟中位耗时</div><div class="s">维度 ${m.perf.dim} · 单线程 JS</div></div>
    <div class="vcard" data-qc><div class="v small">${m.randomNorm.toFixed(14)}</div><div class="k">40 门随机电路总概率</div><div class="s">幺正性保持 · 无 pageerror</div></div>
  </div>

  <p class="quote" data-qc>从 |00⟩ 到最大纠缠，从 QFT 相位到隐形传态保真度 —— 每一条结论都有<b>可复跑的断言</b>与<b>独立参考实现</b>兜底。</p>

  <div class="method-row">
    <div class="method" data-qc><b>解析解对照</b><span>H / X / Y / Z / S / T / RX / RY / RZ 与闭式解逐项比较</span></div>
    <div class="method" data-qc><b>独立参考实现</b><span>Node 端 DFT 与 QFT-3 复振幅逐点比对，偏差 ${m.qft.maxDeviation.toExponential(2)}</span></div>
    <div class="method" data-qc><b>种子可复现</b><span>mulberry32：同 seed 的 ${m.sampling.shots} shots 逐位一致</span></div>
  </div>

  <footer data-qc><span>零依赖 · 双击 index.html 即运行</span><span class="repo">github.com/qw101233/qubit-forge</span><span class="page">03 / 03</span></footer>
</div>
</body></html>`;
}

const pages = [
  { file: 'slide1.html', html: slide1(), png: 'slide1.png', name: '项目简介' },
  { file: 'slide2.html', html: slide2(), png: 'slide2.png', name: '核心功能演示' },
  { file: 'slide3.html', html: slide3(), png: 'slide3.png', name: '最终效果展示' }
];

for (const p of pages) {
  fs.writeFileSync(path.join(slidesDir, p.file), p.html, 'utf8');
  console.log('written slides/' + p.file);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (x) => { if (x.type() === 'error') errors.push(x.text()); });

const qcReport = [];
let qcFail = 0;

for (const p of pages) {
  const url = 'file:///' + path.join(slidesDir, p.file).replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0));
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(outDir, p.png), fullPage: false });

  const qc = await page.evaluate(() => {
    const W = 1080, H = 1920;
    const nodes = Array.from(document.querySelectorAll('[data-qc]'));
    const rects = nodes.map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        i, cls: (el.className || el.tagName).toString().slice(0, 32),
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36),
        x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom
      };
    });
    const issues = [];
    rects.forEach((q) => {
      if (q.x < -0.5 || q.y < -0.5 || q.right > W + 0.5 || q.bottom > H + 0.5) {
        issues.push(`OUT_OF_CANVAS: ${q.cls} "${q.text}" → (${q.x.toFixed(1)},${q.y.toFixed(1)})-(${q.right.toFixed(1)},${q.bottom.toFixed(1)})`);
      }
      if (q.w < 20 || q.h < 12) issues.push(`DEGENERATE: ${q.cls} "${q.text}" ${q.w.toFixed(1)}x${q.h.toFixed(1)}`);
    });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (ox > 1 && oy > 1) {
          issues.push(`OVERLAP: "${a.text}" ↔ "${b.text}" (${ox.toFixed(1)}×${oy.toFixed(1)})`);
        }
      }
    }
    const textOverflow = [];
    document.querySelectorAll('[data-qc-text]').forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
        textOverflow.push((el.textContent || '').slice(0, 30));
      }
    });
    if (textOverflow.length) issues.push('TEXT_OVERFLOW: ' + textOverflow.join(' | '));
    return {
      width: document.body.scrollWidth, height: document.body.scrollHeight,
      blocks: rects.length, issues
    };
  });

  console.log(`\n[${p.name}] ${p.png}  blocks=${qc.blocks}  page=${qc.width}x${qc.height}  issues=${qc.issues.length}`);
  if (qc.issues.length) { qcFail++; qc.issues.forEach((i) => console.log('  ! ' + i)); }
  else console.log('  QC PASS：无越界、无重叠、无退化块');
  if (qc.width !== 1080 || qc.height !== 1920) {
    console.log('  ! canvas size mismatch');
    qcFail++;
  }
  qcReport.push({ slide: p.file, png: p.png, ...qc });
}

if (errors.length) {
  console.error('PAGE ERRORS:', errors.join(' | '));
  qcFail++;
}

fs.writeFileSync(path.join(root, 'tools', 'slide-qc.json'), JSON.stringify({
  status: qcFail === 0 ? 'PASS' : 'FAIL',
  checkedAt: new Date().toISOString(),
  report: qcReport,
  pageErrors: errors
}, null, 2));

await browser.close();
console.log(`\nSLIDE QC ${qcFail === 0 ? 'PASS' : 'FAIL'}`);
process.exit(qcFail === 0 ? 0 : 1);
