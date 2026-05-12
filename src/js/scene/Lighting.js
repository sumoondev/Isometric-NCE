// ============================================================
// Lighting.js — Scene Lighting & Shadows
// NCE Isometric Game
//
// Responsibilities:
//   - Create directional sun light with calibrated shadows
//   - Create fill light for soft shadow side colour
//   - Create ambient light for base scene brightness
//   - Expose a setTimeOfDay() for future day/night cycle
//   - Add all lights to the scene
// ============================================================

import * as THREE from 'three';

// ── Time of day presets ───────────────────────────────────
// Each preset defines sun colour, intensity, and sky colour.
// Used by setTimeOfDay() — call it from script.js whenever
// you want to switch the atmosphere.
export const TIME_PRESETS = {
  morning: {
    sunColor:     0xffcc88,   // warm orange-yellow
    sunIntensity: 1.2,
    fillColor:    0x88aacc,   // cool blue fill opposite the sun
    fillIntensity: 0.3,
    ambientColor: 0x334455,
    ambientIntensity: 0.5,
    skyColor:     0xffd4a0,   // pale orange sky
    fogColor:     0xffd4a0,
    fogNear:      60,
    fogFar:       160,
  },
  midday: {
    sunColor:     0xfffde8,   // near-white, slightly warm
    sunIntensity: 1.6,
    fillColor:    0x8899bb,   // cool blue fill
    fillIntensity: 0.4,
    ambientColor: 0x446688,
    ambientIntensity: 0.5,
    skyColor:     0x87ceeb,   // classic sky blue
    fogColor:     0x87ceeb,
    fogNear:      80,
    fogFar:       200,
  },
  evening: {
    sunColor:     0xff8844,   // deep golden orange
    sunIntensity: 1.0,
    fillColor:    0x553366,   // purple fill (sky opposite the sun)
    fillIntensity: 0.35,
    ambientColor: 0x221133,
    ambientIntensity: 0.45,
    skyColor:     0xff7744,   // burnt orange sky
    fogColor:     0xee6633,
    fogNear:      40,
    fogFar:       120,
  },
  night: {
    sunColor:     0x223366,   // dim cool blue moonlight
    sunIntensity: 0.25,
    fillColor:    0x111122,
    fillIntensity: 0.15,
    ambientColor: 0x0a0a1a,
    ambientIntensity: 0.3,
    skyColor:     0x05050f,   // near-black sky
    fogColor:     0x05050f,
    fogNear:      30,
    fogFar:       90,
  },
};

/**
 * Sets up all scene lighting and fog.
 * Call once at startup from script.js.
 *
 * @param {THREE.Scene} scene
 * @returns {{ setTimeOfDay: Function }}
 */
export function createLighting(scene) {

  // ── 1. Sun (primary directional light) ──────────────────
  // Positioned upper-left relative to the isometric view.
  // This means shadows fall toward the lower-right, which
  // is the most readable direction for isometric games.
  // Position (50, 80, 30) — high Y for short midday shadows,
  // strong X bias for clear shadow direction.
  const sun = new THREE.DirectionalLight(0xfffde8, 1.6);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;

  // Shadow map resolution — 1024 is the performance sweet spot.
  // Doubling to 2048 costs 4× GPU memory for marginal gain
  // at isometric view distances.
  sun.shadow.mapSize.set(1024, 1024);

  // Near/far clipping for the shadow camera.
  // Must tightly wrap the campus — loose values waste shadow
  // map resolution on empty space.
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far  = 300;

  // Shadow camera frustum sized to cover the full campus.
  // Campus is ~106m × 88m (53×44 tiles at 2 units each).
  // Set to half of max campus dimension + small margin.
  sun.shadow.camera.left   = -120;
  sun.shadow.camera.right  =  120;
  sun.shadow.camera.top    =  120;
  sun.shadow.camera.bottom = -120;

  // Shadow bias prevents "shadow acne" (dark banding artefacts
  // on flat surfaces). Negative bias pushes shadows slightly
  // into the caster. Tune if you see acne or "peter-panning".
  sun.shadow.bias = -0.001;

  scene.add(sun);

  // ── 2. Sun target ────────────────────────────────────────
  // By default DirectionalLight targets (0,0,0). Since our
  // campus is centred near its tile midpoint, we keep this
  // at origin. Update if you offset the whole map later.
  scene.add(sun.target);

  // ── 3. Fill light ────────────────────────────────────────
  // A dimmer, cooler directional light from the opposite side.
  // It softens the harsh shadow side of buildings so they
  // don't go completely black — like light bouncing off the sky.
  // No shadows — too expensive and not needed for a fill.
  const fill = new THREE.DirectionalLight(0x8899bb, 0.4);
  fill.position.set(-30, 40, -20);
  fill.castShadow = false;
  scene.add(fill);

  // ── 4. Ambient light ─────────────────────────────────────
  // Flat base illumination applied to every surface equally.
  // Prevents anything from being pure black even in shadow.
  // Keep intensity low — let the sun and fill do the work.
  const ambient = new THREE.AmbientLight(0x446688, 0.5);
  scene.add(ambient);

  // ── 5. Hemisphere light ──────────────────────────────────
  // Sky colour from above, ground colour from below.
  // Adds subtle colour variation to vertical surfaces —
  // tops of buildings catch the sky tint, undersides catch
  // the ground bounce. Very cheap to compute.
  const hemi = new THREE.HemisphereLight(
    0x87ceeb,   // sky colour (top)
    0x5a8a3c,   // ground colour (bottom — grass bounce)
    0.3,        // low intensity, it's just a tint
  );
  scene.add(hemi);

  // ── 6. Fog ───────────────────────────────────────────────
  // Linear fog hides the hard map edge cleanly.
  // Starts at 80 units (well past visible buildings)
  // and fully opaque at 200 (map is ~106 units across).
  scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

  // ── 7. Sky background ────────────────────────────────────
  scene.background = new THREE.Color(0x87ceeb);

  // ── 8. Time of day switcher ──────────────────────────────
  // Transitions all lights and fog to a preset.
  // Called with a preset name: 'morning', 'midday', 'evening', 'night'
  //
  // Usage in script.js:
  //   setTimeOfDay('evening');
  //
  // For a smooth animated transition, call it inside a lerp
  // loop rather than snapping directly.

  /**
   * Instantly apply a time-of-day preset to all lights and fog.
   * @param {keyof typeof TIME_PRESETS} name
   */
  function setTimeOfDay(name) {
    const preset = TIME_PRESETS[name];
    if (!preset) {
      console.warn(`[Lighting] Unknown preset: "${name}". Use: ${Object.keys(TIME_PRESETS).join(', ')}`);
      return;
    }

    sun.color.set(preset.sunColor);
    sun.intensity        = preset.sunIntensity;

    fill.color.set(preset.fillColor);
    fill.intensity       = preset.fillIntensity;

    ambient.color.set(preset.ambientColor);
    ambient.intensity    = preset.ambientIntensity;

    scene.background.set(preset.skyColor);
    scene.fog.color.set(preset.fogColor);
    scene.fog.near       = preset.fogNear;
    scene.fog.far        = preset.fogFar;

    if (import.meta.env?.DEV) {
      console.log(`[Lighting] Time of day → ${name}`);
    }
  }

  // ── 9. Debug shadow camera helper ────────────────────────
  // Uncomment this block during development to visualise
  // exactly what the shadow camera can see. Remove before
  // deploying — it adds draw calls.
  //
  // import { CameraHelper } from 'three';
  // const shadowHelper = new CameraHelper(sun.shadow.camera);
  // scene.add(shadowHelper);

  // ── 10. Debug info ───────────────────────────────────────
  if (import.meta.env?.DEV) {
    console.log('[Lighting] Initialised', {
      sun:     { position: sun.position, intensity: sun.intensity },
      fill:    { position: fill.position, intensity: fill.intensity },
      ambient: { intensity: ambient.intensity },
      hemi:    { intensity: hemi.intensity },
      fog:     { near: scene.fog.near, far: scene.fog.far },
    });
  }

  return { setTimeOfDay };
}