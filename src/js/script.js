// import * as THREE from 'three';
// import { createRenderer } from './scene/Renderer.js';
// import Stats from 'three/examples/jsm/libs/stats.module.js';
// import { createCamera }   from './scene/Camera.js';
// import { createLighting } from './scene/Lighting.js';
// import { buildTileMap } from './world/TileMap.js';
// import { createInputManager } from './systems/InputManager.js';
// import { createPlayer } from './entities/Player.js';

// const { renderer, onResize } = createRenderer();
// const stats = new Stats();
// const { camera, followTarget } = createCamera(onResize);
// const scene = new THREE.Scene();
// const { setTimeOfDay } = createLighting(scene);
// const { getTile, worldToTile, tileToWorld } = buildTileMap(scene);
// const input = createInputManager();
// const player = createPlayer(scene, input, getTile, tileToWorld);

// const clock = new THREE.Clock;

// document.body.appendChild(stats.dom);

// function loop(timestamp) {
//     requestAnimationFrame(loop);
//     const { x, z } = input.getMovementVector();
//     const dt = clock.getDelta();      // THREE.Clock
//     player.update(dt);
//     followTarget(player.mesh.position);
//     renderer.render(scene, camera);
//     stats.update();
// }
// loop();

// ============================================================
// script.js — Main Entry Point
// NCE Isometric Game
//
// This file does exactly four things and nothing else:
//   1. Import and initialise every system
//   2. Start the render loop
//   3. Pass delta time to systems that need it
//   4. Handle the loading screen
//
// If you find yourself writing game logic here — stop.
// It belongs in one of the system/entity files instead.
// ============================================================

import * as THREE from 'three';
import { createRenderer }      from './scene/Renderer.js';
import { createCamera }        from './scene/Camera.js';
import { createLighting }      from './scene/Lighting.js';
import { buildTileMap }        from './world/TileMap.js';
import { createInputManager }  from './systems/InputManager.js';
import { createPlayer }        from './entities/Player.js';

// ── 1. Loading screen ─────────────────────────────────────
// Shown while Three.js initialises and the tile map builds.
// Fades out once the first frame renders.
const loadingScreen = createLoadingScreen();

// ── 2. Renderer ───────────────────────────────────────────
const { renderer, onResize } = createRenderer();

// ── 3. Scene ──────────────────────────────────────────────
// Scene is created here (not in any sub-module) because
// everything else needs a reference to it. Passing it in
// keeps modules decoupled from each other.
const scene = new THREE.Scene();

// ── 4. Camera ─────────────────────────────────────────────
// onResize is passed so Camera.js can update its frustum
// when the window resizes — no resize logic needed here.
const { camera, followTarget } = createCamera(onResize);

// ── 5. Lighting ───────────────────────────────────────────
const { setTimeOfDay } = createLighting(scene);

// Default to midday for Phase 3.
// Change to 'morning' / 'evening' / 'night' to test presets.
setTimeOfDay('midday');

// ── 6. World — tile map ───────────────────────────────────
// buildTileMap reads campusMap.js, creates InstancedMeshes,
// adds them to the scene, and returns helper functions.
const { getTile, worldToTile, tileToWorld } = buildTileMap(scene);

// ── 7. Input ──────────────────────────────────────────────
// Must be created before Player so player.update() can
// receive input on the very first frame.
const input = createInputManager();

// ── 8. Player ─────────────────────────────────────────────
// Spawns at the campus gate tile automatically.
const player = createPlayer(scene, input, getTile, tileToWorld);

// ── 9. Clock ──────────────────────────────────────────────
// THREE.Clock gives accurate delta time (seconds since last frame).
// Using dt instead of a fixed step keeps movement speed
// consistent regardless of frame rate — 30 FPS or 60 FPS,
// the player always moves at PLAYER_SPEED metres per second.
const clock = new THREE.Clock();

// ── 10. Render loop ───────────────────────────────────────
let firstFrame = true;

function loop() {
  requestAnimationFrame(loop);

  const dt = clock.getDelta();

  // Cap dt to 100ms — if the tab was backgrounded or the
  // device stalled, dt can spike to several seconds and
  // launch the player through walls on the next frame.
  const safeDt = Math.min(dt, 0.1);

  // Update systems
  player.update(safeDt);

  // Smooth camera follow — pass player's world position
  followTarget(player.mesh.position);

  // Render the frame
  renderer.render(scene, camera);

  // Remove loading screen on the very first rendered frame
  if (firstFrame) {
    firstFrame = false;
    loadingScreen.hide();
  }
}

loop();

// ── 11. Dev helpers (removed in production build) ─────────
if (import.meta.env?.DEV) {

  // Expose key objects on window for browser console debugging.
  // Lets you type e.g. `window.scene.children` in DevTools.
  Object.assign(window, {
    scene,
    camera,
    renderer,
    player,
    getTile,
    worldToTile,
    tileToWorld,
    setTimeOfDay,
    input,
    THREE,
  });

  console.log(
    '%c NCE Isometric — Dev Mode ',
    'background:#1a1a2e;color:#e0e0ff;padding:4px 8px;border-radius:4px;font-weight:bold',
  );
  console.log('Dev helpers on window: scene, camera, renderer, player, setTimeOfDay, THREE');
  console.log('Try: setTimeOfDay("evening")  or  setTimeOfDay("night")');
}

// ── Helpers ───────────────────────────────────────────────

/**
 * Creates a simple CSS loading screen that sits on top of the
 * canvas while the scene initialises.
 * @returns {{ hide: Function }}
 */
function createLoadingScreen() {
  const el = document.createElement('div');

  Object.assign(el.style, {
    position:        'fixed',
    inset:           '0',
    background:      '#0d1117',
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          '999',
    transition:      'opacity 0.5s ease',
    fontFamily:      'sans-serif',
    color:           '#e0e0ff',
    userSelect:      'none',
  });

  el.innerHTML = `
    <div style="font-size:1.4rem;font-weight:600;letter-spacing:0.08em;margin-bottom:12px;">
      NCE Campus
    </div>
    <div style="font-size:0.85rem;opacity:0.5;letter-spacing:0.05em;">
      National College of Engineering · Talchikhel
    </div>
    <div style="
      margin-top:32px;
      width:120px;height:3px;
      background:#ffffff18;
      border-radius:2px;
      overflow:hidden;
    ">
      <div style="
        width:40%;height:100%;
        background:#7c6fff;
        border-radius:2px;
        animation: load 1s ease-in-out infinite alternate;
      "></div>
    </div>
    <style>
      @keyframes load {
        from { transform: translateX(0); }
        to   { transform: translateX(200%); }
      }
    </style>
  `;

  document.body.appendChild(el);

  function hide() {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }

  return { hide };
}