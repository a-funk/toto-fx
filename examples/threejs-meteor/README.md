# threejs-meteor

Blueprint demo showing **TotoFX layered on top of a Three.js WebGL scene**. A meteor falls from the sky, and on impact the 3D world and the TotoFX 2D FX layer respond in sync — shockwave ring and debris in WebGL, dotgrid ripple, speed lines, impact flash, screen shake, and particles via `FX.*` helpers.

Single HTML file, no build step. The compositor stacking that makes this work is used by every other demo in this folder.

```bash
# from the repo root
npx serve .
# then open http://localhost:3000/examples/threejs-meteor/
```

## Compositor layout

```
z:0   <canvas id="three-canvas">  — Three.js WebGL, opaque
z:1   <div id="bg">               — TotoFX dotgrid canvas, transparent, pointer-events: none
z:10  .hud / .fps                 — controls + readouts
body  .shaking / .shaking-heavy   — CSS shake animation on body shakes both canvases together
```

## The integration points

- **World → screen**: `vec.project(camera)` + NDC → pixels to feed the 3D impact point to `FX.doDotgridRipple`, `FX.startSpeedLines`, `FX.spawnParticles`.
- **Dotgrid wiring**: call both `FX.setDotgrid(grid)` (so FX helpers fire) and `engine.setDotgrid(grid)` (so `engine.clearAll()` resets the fluid sim).
- **Unified shake**: `FX.doScreenShake(heavy)` applies `.shaking` / `.shaking-heavy` to `document.body`. The demo defines the keyframes (TotoFX applies the classes but does not ship the CSS).
