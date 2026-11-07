import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/');
const outDir = path.join(root, 'screenshots');

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.qubit && window.qubit.getState);
await page.waitForTimeout(200);

const shots = [
  { preset: 'ghz', file: 'demo-ui.png', full: true },
  { preset: 'bell', file: 'demo-bell.png', full: true },
  { preset: 'qft', file: 'demo-qft.png', full: true },
  { preset: 'grover', file: 'demo-grover.png', full: true },
  { preset: 'teleport', file: 'demo-teleport.png', full: true }
];

for (const s of shots) {
  await page.evaluate((name) => { qubit.loadPreset(name); }, s.preset);
  await page.waitForTimeout(140);
  await page.screenshot({ path: path.join(outDir, s.file), fullPage: false });
  console.log('shot', s.file);
}

// 右侧面板特写（布洛赫球 + 采样 + 诊断）
await page.evaluate(() => { qubit.loadPreset('ghz'); });
await page.waitForTimeout(120);
const side = await page.$('.side');
await side.screenshot({ path: path.join(outDir, 'demo-panels.png') });
console.log('shot demo-panels.png');

// 电路 + 振幅特写
const stage = await page.$('.stage');
await stage.screenshot({ path: path.join(outDir, 'demo-stage.png') });
console.log('shot demo-stage.png');

const stats = await page.evaluate(() => qubit.getStats());
fs.writeFileSync(path.join(root, 'tools', 'shots-meta.json'), JSON.stringify({
  viewport: { width: 1440, height: 900, dsf: 2 },
  shots: shots.map((s) => s.file),
  stats
}, null, 2));

if (errors.length) {
  console.error('PAGE ERRORS:', errors.join(' | '));
  await browser.close();
  process.exit(1);
}
await browser.close();
console.log('all screenshots done, errors=0');
