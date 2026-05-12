// ============================================================
// Player.js — Player Character Controller
// NCE Isometric Game
//
// Responsibilities:
//   - Create the player mesh (capsule + shadow disc)
//   - Convert InputManager screen-space vector → isometric
//     world-space movement each frame
//   - Tile-based collision — check blocked tiles before moving
//   - Wall sliding — if blocked on X, try Z only (and vice versa)
//   - Rotate mesh smoothly to face movement direction
//   - Spawn the player at the campus gate
//   - Export update(dt) for the render loop
//   - Export mesh for Camera.js followTarget()
// ============================================================

import * as THREE from 'three';
import { CAMPUS_MAP, MAP_ROWS, MAP_COLS, TILE_SIZE, WALKABLE, OUTSIDE } from '../data/campusMap.js';

// ── Constants ─────────────────────────────────────────────
const PLAYER_SPEED      = 6;      // units per second (≈ 6 m/s, brisk walk)
const PLAYER_RADIUS     = 0.35;   // collision radius in world units
const ROTATION_SPEED    = 12;     // how fast the mesh turns to face movement (rad/s)

// Isometric scale factor — input arrives normalised but the
// iso-rotation always produces vectors of magnitude √2.
// Dividing by √2 keeps movement speed consistent in all directions.
const ISO_SCALE = 1 / Math.SQRT2;

// Map centering offset — must match TileMap.js exactly
const OFFSET_X = -(MAP_COLS * TILE_SIZE) / 2;
const OFFSET_Z = -(MAP_ROWS * TILE_SIZE) / 2;

/**
 * Creates the player character and adds it to the scene.
 *
 * @param {THREE.Scene}  scene
 * @param {object}       input      - from createInputManager()
 * @param {Function}     getTile    - from buildTileMap()
 * @param {Function}     tileToWorld - from buildTileMap()
 * @returns {{ mesh: THREE.Group, update: Function }}
 */
export function createPlayer(scene, input, getTile, tileToWorld) {

  // ── 1. Build player mesh group ───────────────────────────
  // Using a Group so we can add the shadow disc as a child
  // without it affecting the capsule's transform.
  const group = new THREE.Group();

  // Body — capsule geometry (radius, length of cylinder part)
  // Total height = radius*2 + length = 0.35*2 + 0.8 = 1.5 units
  const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 4, 8);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xff6644 });
  const body    = new THREE.Mesh(bodyGeo, bodyMat);

  // CapsuleGeometry is centred at origin — shift up so feet
  // sit exactly on y=0 (ground level)
  body.position.y = 0.35 + 0.4;   // radius + half cylinder length
  body.castShadow = true;

  // Direction indicator — a small flat cone on top of the
  // capsule showing which way the player is facing.
  // Helpful during development to confirm rotation is correct.
  const noseGeo = new THREE.ConeGeometry(0.15, 0.4, 6);
  const noseMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
  const nose    = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, 1.6, 0.35);         // top-front of capsule
  nose.rotation.x = -Math.PI / 2;          // point it forward (-Z)
  nose.castShadow = false;

  // Shadow blob — a dark semi-transparent disc on the ground.
  // Cheap visual anchor so the player doesn't look like it's
  // floating, especially when viewed at isometric angle.
  const shadowGeo = new THREE.CircleGeometry(0.4, 12);
  const shadowMat = new THREE.MeshBasicMaterial({
    color:       0x000000,
    transparent: true,
    opacity:     0.25,
    depthWrite:  false,   // don't write to depth buffer — avoids Z-fighting
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;    // lay flat on XZ plane
  shadowDisc.position.y = 0.01;            // tiny lift to avoid Z-fighting with ground

  group.add(body);
  group.add(nose);
  group.add(shadowDisc);

  // ── 2. Find spawn position ───────────────────────────────
  // Scan the map for a GT (gate) tile and spawn just inside it.
  // Falls back to map centre if no gate tile is found.
  const spawnPos = findSpawnPosition(tileToWorld);
  group.position.copy(spawnPos);

  scene.add(group);

  // ── 3. Internal state ────────────────────────────────────
  // targetAngle — the Y rotation we're lerping toward each frame.
  // Initialised to 0 (facing -Z, "into" the isometric view).
  let targetAngle = 0;

  // ── 4. Update — called every frame from script.js ────────
  /**
   * Move the player based on input, check collision, rotate mesh.
   * @param {number} dt - delta time in seconds from the render loop
   */
  function update(dt) {
    const { x: ix, z: iz } = input.getMovementVector();

    // Skip all logic if no input this frame
    if (ix === 0 && iz === 0) return;

    // ── 4a. Isometric direction transform ──────────────────
    // InputManager gives screen-space direction.
    // We rotate it 45° around Y to align with the isometric
    // camera (positioned at equal X/Y/Z from origin).
    //
    //   worldX =  (ix + iz) × ISO_SCALE
    //   worldZ =  (iz - ix) × ISO_SCALE
    //
    // Derivation: rotating screen vector (ix, iz) by -45° in XZ:
    //   cos(-45°) = sin(-45°) = 1/√2 = ISO_SCALE
    //
    // Verified per direction:
    //   W (0,-1) → (-ISO, -ISO) → NW diagonal ✓
    //   D (+1,0) → (+ISO, -ISO) → NE diagonal ✓
    //   S (0,+1) → (+ISO, +ISO) → SE diagonal ✓
    //   A (-1,0) → (-ISO, +ISO) → SW diagonal ✓
    const worldDX = (ix + iz) * ISO_SCALE;
    const worldDZ = (iz - ix) * ISO_SCALE;

    const moveX = worldDX * PLAYER_SPEED * dt;
    const moveZ = worldDZ * PLAYER_SPEED * dt;

    // ── 4b. Collision — try X and Z separately ─────────────
    // Trying axes independently gives "wall sliding":
    // walking into a wall at an angle slides along it
    // instead of stopping dead.
    const currentPos = group.position;

    const canMoveX = isWalkable(currentPos.x + moveX, currentPos.z);
    const canMoveZ = isWalkable(currentPos.x, currentPos.z + moveZ);

    if (canMoveX) group.position.x += moveX;
    if (canMoveZ) group.position.z += moveZ;

    // ── 4c. Rotate to face movement direction ───────────────
    // atan2 gives the angle of the movement vector in XZ.
    // We only update targetAngle when actually moving to avoid
    // snapping to 0 when the player stops.
    if (Math.abs(worldDX) > 0.01 || Math.abs(worldDZ) > 0.01) {
      targetAngle = Math.atan2(worldDX, worldDZ);
    }

    // Smoothly interpolate current rotation toward targetAngle.
    // lerpAngle handles the 0/2π wraparound so the mesh never
    // spins the wrong way around.
    group.rotation.y = lerpAngle(group.rotation.y, targetAngle, ROTATION_SPEED * dt);
  }

  // ── 5. Collision helper ───────────────────────────────────
  /**
   * Returns true if the world position (wx, wz) is on a walkable tile.
   * Checks a small radius around the position so the player
   * can't clip through thin walls.
   *
   * @param {number} wx - world X
   * @param {number} wz - world Z
   * @returns {boolean}
   */
  function isWalkable(wx, wz) {
    // Check four points around the player radius, not just centre.
    // This prevents clipping through wall corners.
    const offsets = [
      [ PLAYER_RADIUS,  0            ],
      [-PLAYER_RADIUS,  0            ],
      [ 0,              PLAYER_RADIUS],
      [ 0,             -PLAYER_RADIUS],
    ];

    for (const [ox, oz] of offsets) {
      const tile = worldPosToTile(wx + ox, wz + oz);
      if (!tile) return false;                    // out of map bounds
      if (OUTSIDE.includes(tile.code)) return false;
      if (!WALKABLE.includes(tile.code)) return false;
    }

    return true;
  }

  /**
   * Converts a world XZ position to tile data.
   * Returns null if out of map bounds.
   *
   * @param {number} wx
   * @param {number} wz
   * @returns {{ code: string } | null}
   */
  function worldPosToTile(wx, wz) {
    const col = Math.floor((wx - OFFSET_X) / TILE_SIZE);
    const row = Math.floor((wz - OFFSET_Z) / TILE_SIZE);
    return getTile(row, col);   // getTile returns null if out of bounds
  }

  // ── 6. Debug info ─────────────────────────────────────────
  if (import.meta.env?.DEV) {
    console.log('[Player] Spawned', {
      position:    group.position,
      speed:       PLAYER_SPEED,
      radius:      PLAYER_RADIUS,
      rotationSpd: ROTATION_SPEED,
    });
  }

  return { mesh: group, update };
}

// ── Private helpers ───────────────────────────────────────

/**
 * Scan CAMPUS_MAP for a GT (gate) tile and return the world
 * position one row below it (just inside the campus entrance).
 * Falls back to map centre if no gate is found.
 *
 * @param {Function} tileToWorld
 * @returns {THREE.Vector3}
 */
function findSpawnPosition(tileToWorld) {
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (CAMPUS_MAP[row][col] === 'GT') {
        // Spawn one tile below the gate (inside campus)
        const spawnRow = Math.min(row + 2, MAP_ROWS - 1);
        const pos = tileToWorld(spawnRow, col);
        pos.y = 0;
        return pos;
      }
    }
  }

  // Fallback — map centre
  console.warn('[Player] No GT tile found — spawning at map centre');
  return tileToWorld(Math.floor(MAP_ROWS / 2), Math.floor(MAP_COLS / 2));
}

/**
 * Interpolates between two angles (in radians) taking the
 * shortest path around the circle. Prevents the mesh from
 * spinning 350° the wrong way when crossing the ±π boundary.
 *
 * @param {number} current  - current angle in radians
 * @param {number} target   - target  angle in radians
 * @param {number} speed    - lerp speed (radians per second × dt already applied)
 * @returns {number}        - new angle
 */
function lerpAngle(current, target, speed) {
  let diff = target - current;

  // Wrap diff into [-π, +π] range
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  // Clamp step so we never overshoot
  const step = Math.sign(diff) * Math.min(Math.abs(diff), speed);
  return current + step;
}