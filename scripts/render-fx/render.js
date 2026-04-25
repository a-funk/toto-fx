/**
 * toto-fx deterministic render harness (P3 MVP).
 *
 * Loads render.html in headless Chromium, drives engine.tick() in a loop,
 * screenshots each frame as PNG, then stitches to webm via ffmpeg.
 *
 * Usage:
 *   node scripts/render-fx/render.js [variant] [durationMs] [fps] [seed]
 *
 * Example:
 *   node scripts/render-fx/render.js thud 2000 60 42
 *     → renders 2s of thud/anime-slam at 60fps with seed 42 → out.webm
 */

import playwright from '/Users/funk/.claude/skills/gstack/node_modules/playwright/index.js';
const { chromium } = playwright;
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', '..', 'dist');
const RENDER_DIR = __dirname;
const OUT_DIR = join(__dirname, 'out');

// Args
const variant = process.argv[2] || 'thud';
const durationMs = parseInt(process.argv[3] || '2000', 10);
const fps = parseInt(process.argv[4] || '60', 10);
const seed = parseInt(process.argv[5] || '42', 10);

const totalFrames = Math.round((durationMs / 1000) * fps);
const dtMs = 1000 / fps;

// Scenario registry — each one is code that runs in the browser to trigger
// an animation on the #target element.
const SCENARIOS = {
  thud: {
    label: 'thud/anime-slam',
    play: `engine.play('action', document.querySelector('#target'),
             { params: { style: 'thud', variant: 'anime-slam' } })`,
  },
  slam: {
    label: 'creation/dramatic/slam-down',
    play: `engine.play('enter', document.querySelector('#target'),
             { params: { style: 'dramatic', variant: 'slam-down' } })`,
  },
  fade: {
    label: 'creation/subtle/fade-in',
    play: `engine.play('enter', document.querySelector('#target'),
             { params: { style: 'subtle', variant: 'fade-in' } })`,
  },
};

const scenario = SCENARIOS[variant];
if (!scenario) {
  console.error(`Unknown variant "${variant}". Available: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(1);
}

async function main() {
  // Prep output dir + copy dist bundles next to render.html so the
  // browser can load them via relative file:// paths.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const bundles = [
    'toto-fx.min.js',
    'plugins/thud.min.js',
    'plugins/creation.min.js',
  ];
  for (const b of bundles) {
    const src = join(DIST_DIR, b);
    const dst = join(RENDER_DIR, b.split('/').pop());  // flatten
    cpSync(src, dst);
  }

  console.log(`[render-fx] launching Chromium...`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // Route console messages from the page to stdout for debugging
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(`[page error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.error(`[page crash]`, err.message));

  const htmlUrl = 'file://' + join(RENDER_DIR, 'render.html');
  await page.goto(htmlUrl);
  await page.waitForFunction(() => window.__ready === true, { timeout: 5000 });

  // Flip engine to render mode with our seed, then trigger the animation.
  await page.evaluate(({ seed, playCode }) => {
    const engine = window.__engine;
    engine.setRenderMode(true, { seed });
    // eval the play expression
    new Function('engine', playCode)(engine);
  }, { seed, playCode: scenario.play });

  console.log(`[render-fx] scenario "${scenario.label}"`);
  console.log(`[render-fx] rendering ${totalFrames} frames @ ${fps}fps (dt=${dtMs.toFixed(3)}ms, total=${durationMs}ms)`);
  console.log(`[render-fx] seed=${seed}`);

  const t0 = Date.now();
  for (let i = 0; i < totalFrames; i++) {
    await page.evaluate((dt) => window.__engine.tick(dt), dtMs);
    const framePath = join(OUT_DIR, `frame-${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, omitBackground: false });
  }
  const renderMs = Date.now() - t0;
  console.log(`[render-fx] captured ${totalFrames} frames in ${renderMs}ms (${(totalFrames * 1000 / renderMs).toFixed(1)} real fps)`);

  await browser.close();

  // ffmpeg — stitch to webm (VP9)
  const webmOut = join(OUT_DIR, `${variant}-seed${seed}-${fps}fps.webm`);
  console.log(`[render-fx] ffmpeg → ${webmOut}`);

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', join(OUT_DIR, 'frame-%05d.png'),
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuv420p',
      '-b:v', '2M',
      '-crf', '30',
      webmOut,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errOut = '';
    ff.stderr.on('data', (d) => { errOut += d.toString(); });
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else { console.error(errOut.split('\n').slice(-5).join('\n')); reject(new Error(`ffmpeg exit ${code}`)); }
    });
  });

  console.log(`[render-fx] done → ${webmOut}`);
}

main().catch((err) => {
  console.error('[render-fx] failed:', err);
  process.exit(1);
});
