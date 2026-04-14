import esbuild from 'esbuild';
import fs from 'fs';

const watch = process.argv.includes('--watch');

const commonOpts = {
  bundle: true,
  sourcemap: true,
  target: ['es2020'],
};

// Plugin entry points
const plugins = [
  { name: 'thud', entry: 'src/plugins/thud.js', global: 'TotoFXThud' },
  { name: 'death', entry: 'src/plugins/death.js', global: 'TotoFXDeath' },
  { name: 'cute', entry: 'src/plugins/cute.js', global: 'TotoFXCute' },
  { name: 'creation', entry: 'src/plugins/creation.js', global: 'TotoFXCreation' },
  { name: 'in-progress', entry: 'src/plugins/in-progress.js', global: 'TotoFXInProgress' },
];

// Dotgrid effect plugin entry points
const dotgridPlugins = [
  { name: 'ripple',  entry: 'src/dotgrid-plugins/ripple.js',  global: 'TotoFXDotgridRipple' },
  { name: 'vortex',  entry: 'src/dotgrid-plugins/vortex.js',  global: 'TotoFXDotgridVortex' },
  { name: 'crater',  entry: 'src/dotgrid-plugins/crater.js',  global: 'TotoFXDotgridCrater' },
  { name: 'nuclear', entry: 'src/dotgrid-plugins/nuclear.js', global: 'TotoFXDotgridNuclear' },
  { name: 'scorch',  entry: 'src/dotgrid-plugins/scorch.js',  global: 'TotoFXDotgridScorch' },
  { name: 'heart',   entry: 'src/dotgrid-plugins/heart.js',   global: 'TotoFXDotgridHeart' },
];

// Sub-module entry points
const modules = [
  { name: 'fx', entry: 'src/fx.js', global: 'TotoFXUtils' },
  { name: 'dotgrid', entry: 'src/dotgrid.js', global: 'TotoFXDotgrid' },
];

async function build() {
  const builds = [];

  // ── Main bundles ──────────────────────────────────────────
  builds.push(esbuild.build({
    ...commonOpts,
    entryPoints: ['src/index.js'],
    outfile: 'dist/toto-fx.esm.js',
    format: 'esm',
    minify: true,
  }));

  builds.push(esbuild.build({
    ...commonOpts,
    entryPoints: ['src/index.js'],
    outfile: 'dist/toto-fx.min.js',
    format: 'iife',
    globalName: 'TotoFX',
    minify: true,
  }));

  // ── Core-only bundle ──────────────────────────────────────
  builds.push(esbuild.build({
    ...commonOpts,
    entryPoints: ['src/engine.js'],
    outfile: 'dist/core.esm.js',
    format: 'esm',
    minify: true,
  }));

  // ── Sub-module bundles (ESM + IIFE) ───────────────────────
  for (const mod of modules) {
    builds.push(esbuild.build({
      ...commonOpts,
      entryPoints: [mod.entry],
      outfile: `dist/${mod.name}.esm.js`,
      format: 'esm',
      minify: true,
    }));
    builds.push(esbuild.build({
      ...commonOpts,
      entryPoints: [mod.entry],
      outfile: `dist/${mod.name}.min.js`,
      format: 'iife',
      globalName: mod.global,
      minify: true,
    }));
  }

  // ── Plugin bundles (ESM + IIFE) ───────────────────────────
  for (const plugin of plugins) {
    builds.push(esbuild.build({
      ...commonOpts,
      entryPoints: [plugin.entry],
      outfile: `dist/plugins/${plugin.name}.esm.js`,
      format: 'esm',
      minify: true,
    }));
    builds.push(esbuild.build({
      ...commonOpts,
      entryPoints: [plugin.entry],
      outfile: `dist/plugins/${plugin.name}.min.js`,
      format: 'iife',
      globalName: plugin.global,
      minify: true,
    }));
  }

  // ── Dotgrid effect plugin bundles (ESM + IIFE) ───────────
  for (const dp of dotgridPlugins) {
    builds.push(esbuild.build({
      ...commonOpts,
      entryPoints: [dp.entry],
      outfile: `dist/dotgrid-plugins/${dp.name}.esm.js`,
      format: 'esm',
      minify: true,
    }));
    builds.push(esbuild.build({
      ...commonOpts,
      entryPoints: [dp.entry],
      outfile: `dist/dotgrid-plugins/${dp.name}.min.js`,
      format: 'iife',
      globalName: dp.global,
      minify: true,
    }));
  }

  await Promise.all(builds);

  // Report sizes
  const mainSize = fs.statSync('dist/toto-fx.esm.js').size;
  const iifeSize = fs.statSync('dist/toto-fx.min.js').size;
  const coreSize = fs.statSync('dist/core.esm.js').size;
  console.log(`Built:`);
  console.log(`  dist/toto-fx.esm.js       ${(mainSize / 1024).toFixed(1)}KB (full ESM)`);
  console.log(`  dist/toto-fx.min.js       ${(iifeSize / 1024).toFixed(1)}KB (full IIFE)`);
  console.log(`  dist/core.esm.js          ${(coreSize / 1024).toFixed(1)}KB (engine only)`);
  for (const mod of modules) {
    const s = fs.statSync(`dist/${mod.name}.min.js`).size;
    console.log(`  dist/${mod.name}.min.js  ${(s / 1024).toFixed(1)}KB (${mod.global})`);
  }
  for (const plugin of plugins) {
    const s = fs.statSync(`dist/plugins/${plugin.name}.min.js`).size;
    console.log(`  dist/plugins/${plugin.name}.min.js  ${(s / 1024).toFixed(1)}KB (${plugin.global})`);
  }
  for (const dp of dotgridPlugins) {
    const s = fs.statSync(`dist/dotgrid-plugins/${dp.name}.min.js`).size;
    console.log(`  dist/dotgrid-plugins/${dp.name}.min.js  ${(s / 1024).toFixed(1)}KB (${dp.global})`);
  }
}

async function watchBuild() {
  const esmCtx = await esbuild.context({
    ...commonOpts,
    entryPoints: ['src/index.js'],
    outfile: 'dist/toto-fx.esm.js',
    format: 'esm',
    minify: false,
  });

  const iifeCtx = await esbuild.context({
    ...commonOpts,
    entryPoints: ['src/index.js'],
    outfile: 'dist/toto-fx.min.js',
    format: 'iife',
    globalName: 'TotoFX',
    minify: false,
  });

  await esmCtx.watch();
  await iifeCtx.watch();
  console.log('Watching for changes...');
}

if (watch) {
  watchBuild().catch((e) => { console.error(e); process.exit(1); });
} else {
  build().catch((e) => { console.error(e); process.exit(1); });
}
