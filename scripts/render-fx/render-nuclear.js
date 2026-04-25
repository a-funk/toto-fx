/**
 * Nuclear render — death/explode + huge dotgrid nuclear impact.
 *
 * Renders 1280x720 at 60fps for 2.5s. Seed 42.
 */

import playwright from '/Users/funk/.claude/skills/gstack/node_modules/playwright/index.js';
const { chromium } = playwright;

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', '..', 'dist');
const RENDER_DIR = __dirname;
const OUT_DIR = join(__dirname, 'out-nuclear');

const durationMs = 2500;
const fps = 60;
const seed = 42;
const dtMs = 1000 / fps;
const totalFrames = Math.round((durationMs / 1000) * fps);

async function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // Copy all needed bundles into the render dir (flat layout; browser
  // loads them via relative file:// paths from the HTML).
  const bundles = [
    ['toto-fx.min.js', 'toto-fx.min.js'],
    ['dotgrid.min.js', 'dotgrid.min.js'],
    ['dotgrid-plugins/nuclear.min.js', 'nuclear.min.js'],
    ['dotgrid-plugins/crater.min.js', 'crater.min.js'],
    ['dotgrid-plugins/ripple.min.js', 'ripple.min.js'],
    ['plugins/thud.min.js', 'thud.min.js'],
    ['plugins/death.min.js', 'death.min.js'],
  ];
  for (const [src, dst] of bundles) {
    cpSync(join(DIST_DIR, src), join(RENDER_DIR, dst));
  }

  console.log(`[nuclear] launching Chromium 1280x720...`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error(`[page error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.error(`[page crash]`, err.message));

  await page.goto('file://' + join(RENDER_DIR, 'render-nuclear.html'));
  await page.waitForFunction(() => window.__ready === true, { timeout: 5000 });

  // Give dotgrid a moment to finish its initial build + let the idle
  // ambient pattern settle visibly before we start the render.
  await page.waitForTimeout(200);

  // Flip to render mode, hold for a couple ticks (ambient dotgrid idle),
  // then trigger the explosion + nuclear dotgrid impact together.
  await page.evaluate(({ seed }) => {
    const engine = window.__engine;
    engine.setRenderMode(true, { seed });
  }, { seed });

  console.log(`[nuclear] ${totalFrames} frames @ ${fps}fps, seed=${seed}`);

  // Timeline:
  //   frames 0..14     (0–250ms)  ambient dotgrid only
  //   frame  15        (250ms)    trigger explosion + nuclear impact
  //   frames 16..149   (rest)     explosion + dotgrid fluid sim
  const TRIGGER_FRAME = 15;

  const t0 = Date.now();
  for (let i = 0; i < totalFrames; i++) {
    if (i === TRIGGER_FRAME) {
      await page.evaluate(() => {
        const engine = window.__engine;
        const target = document.querySelector('#target');
        const rect = target.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // Fire dotgrid nuclear first (so the ring wave is visible when
        // the explode particles scatter on top of it)
        engine.dotgridEffect('nuclear', { cx, cy });
        // Trigger death/explode on the hero element
        engine.play('action', target, {
          params: { style: 'destroy', variant: 'explode' },
          intensity: 10,
        });
      });
    }
    await page.evaluate((dt) => window.__engine.tick(dt), dtMs);
    const framePath = join(OUT_DIR, `frame-${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, omitBackground: false });
  }
  const renderMs = Date.now() - t0;
  console.log(`[nuclear] captured ${totalFrames} frames in ${renderMs}ms (${(totalFrames * 1000 / renderMs).toFixed(1)} real fps)`);

  await browser.close();

  const webmOut = join(OUT_DIR, `nuclear-explosion-seed${seed}-${fps}fps.webm`);
  console.log(`[nuclear] ffmpeg → ${webmOut}`);
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y',
      '-framerate', String(fps),
      '-i', join(OUT_DIR, 'frame-%05d.png'),
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuv420p',
      '-b:v', '4M',
      '-crf', '28',
      webmOut,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let errOut = '';
    ff.stderr.on('data', (d) => { errOut += d.toString(); });
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else { console.error(errOut.split('\n').slice(-8).join('\n')); reject(new Error(`ffmpeg exit ${code}`)); }
    });
  });

  console.log(`[nuclear] done → ${webmOut}`);
}

main().catch((err) => {
  console.error('[nuclear] failed:', err);
  process.exit(1);
});
