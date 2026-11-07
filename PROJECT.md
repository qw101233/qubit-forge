# PROJECT.md — qubit-forge（量子电路工坊）

> **本文件供 AI 助手读取**。接手前先读完本文档，判断是否为重复项目、是否延续既有决策。

## 项目名称

**qubit-forge（量子电路工坊）** — 纯前端 statevector 量子电路模拟器

GitHub: https://github.com/qw101233/qubit-forge （2026-11-07 创建）

## 一句话需求

在浏览器中点击搭建量子电路，实时求解 2^n 维复振幅态矢量，可视化振幅/相位/布洛赫球/纠缠熵，
并用可复现的随机种子做测量采样；同时用解析解与独立参考实现做自动化验证。

## 核心功能（均已实现并通过验证）

1. **statevector 引擎**（复数 Float64 双数组，n ≤ 12，维度 4096）：
   14 种门 —— H / X / Y / Z / S / T / RX / RY / RZ / CNOT / CZ / CP / SWAP / Toffoli。
2. **电路编辑器**：点选门 → 点格子放置；双/三比特门依次点控制位与目标位；点已有门删除；
   Esc 取消待放置；同列比特冲突检测；列号自动扩展。
3. **7 个预设**：Bell、GHZ-3、QFT-3、Grover（标记 |11⟩）、Deutsch–Jozsa（平衡）、
   量子隐形传态、5 比特均匀叠加。
4. **可视化**：
   - 振幅直方图（相位 → 青→洋红色相；n ≤ 16 标注全部基态，更大维度自动分 bin）
   - 每比特布洛赫球（由约化密度矩阵求 x/y/z，r 与边缘熵）
   - 测量采样（2000 shots，mulberry32 种子复现，显示 top 4 结果）
   - 态诊断（维度、非零振幅、总概率、峰值概率、香农熵、实测模拟耗时）
   - 当前门矩阵预览（1 比特门实时显示复数矩阵 4 项）
5. **window.qubit 调试 API**（自动化验证/演示的依赖）：
   `setQubits / addGate / setCircuit / clearCircuit / loadPreset / randomCircuit / run /
   getState / getProbs / getBloch / getEntropy / getStats / getCircuit / sample / getBits`
6. **自动化验证**：`tools/verify.mjs`，39 项断言，真实 Playwright 浏览器执行。

## 技术选型

| 项 | 选择 | 理由 |
|---|---|---|
| 运行形态 | 单文件 `index.html`，classic script，零依赖 | 双击即开；避开 file:// 的 ESM/CORS 限制（沿用工作区惯例） |
| 数值表示 | `Float64Array` 实部/虚部双数组 | 4096 维仍毫秒级；比对象数组快一个量级，且无需 half-float 精度损失 |
| 比特序 | qubit 0 = 最高位（MSB） | 与标准 QFT 教材电路、`bitstring` 显示顺序一致 |
| 渲染 | SVG 电路图 + Canvas 2D 直方图/布洛赫球 | 矢量电路图文字清晰；Canvas 适合逐帧重绘；不依赖 WebGL（规避 swiftshader 坑） |
| 采样 | mulberry32 PRNG + 累积分布反解 | 种子可复现，便于断言（同 seed 逐位一致） |
| 验证 | Node + Playwright（无头 Chromium，swiftshader） | 无头可复现；API 驱动比模拟鼠标稳定 |

## 目录结构

```
qubit-forge/
├── index.html              # 全部实现（HTML+CSS+JS，单文件零依赖）
├── PROJECT.md              # 本文件（AI 判重/接手用）
├── README.md               # 面向人的完整说明（GitHub 首页）
├── .gitignore
├── screenshots/            # 演示截图（1440×900 @2x）
│   ├── demo-ui.png / demo-bell.png / demo-qft.png / demo-grover.png / demo-teleport.png
│   ├── demo-stage.png      # 电路 + 振幅特写
│   └── demo-panels.png     # 布洛赫球 + 采样 + 诊断特写
├── slides/                 # 9:16 图文 HTML 源（1080×1920，脚本注入实测数据）
│   ├── slide1.html / slide2.html / slide3.html
├── deliverables/           # 9:16 渲染成品 PNG（1080×1920）
│   ├── slide1.png / slide2.png / slide3.png
└── tools/
    ├── verify.mjs          # 39 项行为验证 → tools/verification.json
    ├── shots.mjs           # 演示截图生成 → screenshots/
    └── make-slides.mjs     # 读 verification.json 生成 HTML → 渲染 PNG → 溢出/重叠 QC
```

## 运行方式

- **使用**：直接双击 `index.html`（Chrome / Edge / Firefox 现代版本）。
- **验证**：
  ```bash
  NODE_PATH=<playwright 所在 node_modules> node tools/verify.mjs
  ```
  输出 `PASS: 39/39 checks passed` 即健康；结果同时写入 `tools/verification.json`。
- **重生成截图**：`node tools/shots.mjs`
- **重生成 9:16 图文**：`node tools/make-slides.mjs`（会先校验 data 来源，渲染后做 QC）

## 当前进度（2026-11-07）

- ✅ statevector 引擎 + 14 门 + 7 预设 + 三块可视化 + 点选式电路编辑器
- ✅ Playwright 验证 **39/39 通过**（UI 点击路径、单/多比特门解析解、Bell/GHZ 纠缠熵、
  QFT 与独立 DFT 参考逐点比对、Grover 100% 命中、Deutsch–Jozsa 确定性、隐形传态保真度、
  采样统计与确定性、40 门随机电路幺正性、12 qubits 4096 维性能、零 pageerror）
- ✅ 7 张演示截图
- ✅ 3 张 1080×1920 图文（HTML 源 + PNG，含溢出/重叠 QC）
- ⏳ GitHub 公开仓库推送（最后一步）

## 关键实现决策（历史，勿推翻）

- **比特掩码**：qubit q 对应 `1 << (n-1-q)`；SWAP 必须 `j = i ^ cb ^ tb`（先 XOR 两个掩码再交换），
  曾误写 `j = i | tb` 导致 |10⟩ 被换成 |11⟩（2026-11-07 实测抓到）。
- **QFT 相位符号**：以本项目的 CP 约定（|11⟩ → e^{+iθ}）与 qubit0=MSB 的电路顺序，
  正向 DFT `e^{+2πi xy/N}` 可直接对上（含末端 SWAP）；改动任一侧需重跑 3.6 断言。
- **Bloch 向量**：`ρ01 = (x - iy)/2` → `x = 2Re(ρ01)`、`y = -2Im(ρ01)`；r 用于边缘熵
  `S = -Σ((1±r)/2)log2((1±r)/2)`。
- **样本数字全部脚本实测采集**：`verification.json` 是唯一数据源，slides 模板不得手写数字。
- **UI 渲染与模拟分离**：`refresh()` = runSim + 各面板 render；API 每次调用也会同步刷新，
  便于截图/自动化。

## 判重提示

若新任务出现以下关键词组合：**量子电路 / quantum circuit / qubit / statevector / 振幅 /
布洛赫球 / QFT / Grover / 纠缠熵 / 量子门** —— 先确认是不是要动本项目或重建同类，
避免重复造轮子。

相邻项目（领域不同，勿混淆）：photon-lab（光学/波动）、acoustic-lab（声场 FDTD）、
gravity-theater（N 体引力）、fluid-canvas（流体）、pattern-lab（反应扩散）、
element-sandbox（元素沙盒）、idiom-wordle（成语游戏）。
本项目是**离散量子信息模拟**，不求解连续场方程，也不做渲染型视觉玩具。
