// ============================================================
// TileMap.js — Campus World Builder
// NCE Isometric Game
//
// Responsibilities:
//   - Read CAMPUS_MAP array from campusMap.js
//   - Place a 3D tile for every non-outside cell
//   - Group tiles by type → one InstancedMesh per type
//     (1 draw call per tile type instead of 1 per tile)
//   - Skip '__' tiles entirely (outside campus)
//   - Centre the entire map at world origin
//   - Export tile lookup for collision and interaction later
// ============================================================

import * as THREE from 'three';
import {
  CAMPUS_MAP,
  MAP_ROWS,
  MAP_COLS,
  TILE_SIZE,
  WALKABLE,
  BLOCKED,
  OUTSIDE,
} from '../data/campusMap.js';

// ── Tile visual config ────────────────────────────────────
// Every tile type gets a colour and a height.
// Ground tiles are flat (height 0.2).
// Walls and buildings have varying heights.
// These are GREY-BOX values — replaced by .glb models in Phase 6.
//
// height here is the full box height in Three.js units (metres).
// The box is positioned so its base sits on y=0, top at y=height.
const TILE_CONFIG = {
  //  code   colour      height   label
  '##': { color: 0xf0ede4, height: 0.2  },  // empty walkable ground
  RD:   { color: 0xaaaaaa, height: 0.2  },  // road / path
  PK:   { color: 0xbbbbcc, height: 0.2  },  // parking
  GR:   { color: 0x7ec850, height: 0.2  },  // grass
  GD:   { color: 0xffb6c1, height: 0.2  },  // garden
  BK:   { color: 0xe05a2b, height: 0.2  },  // basketball court
  BD:   { color: 0x5ba3d9, height: 0.2  },  // badminton court
  IS:   { color: 0xc2a36b, height: 0.4  },  // stairs (slightly raised)

  WW:   { color: 0x444444, height: 2.5  },  // outer wall
  IW:   { color: 0x777777, height: 2.0  },  // inner wall
  GT:   { color: 0xff8c00, height: 2.0  },  // gate

  AB:   { color: 0xd2b48c, height: 8.0  },  // academic block (4 floors)
  FA:   { color: 0xc8a882, height: 6.0  },  // faculty block A (3 floors)
  FB:   { color: 0xb8957a, height: 6.0  },  // faculty block B (3 floors)
  WH:   { color: 0xeeeeee, height: 5.0  },  // white house (2 floors)
  WS:   { color: 0x607b8b, height: 5.0  },  // workshop (2 floors)
  AR:   { color: 0x9370db, height: 6.0  },  // AIR research lab (3 floors)
  LB:   { color: 0x4a7c59, height: 5.0  },  // lab (2 floors)
  NH:   { color: 0x1c4587, height: 7.0  },  // NCE hall (large)
  CN:   { color: 0xffd700, height: 3.5  },  // canteen (1 floor)
  ST:   { color: 0x8b6347, height: 3.0  },  // storage (low)
  GN:   { color: 0x4c1130, height: 2.5  },  // generator (small shed)
  GP:   { color: 0x674ea7, height: 3.0  },  // guard post
  TP:   { color: 0xcc0000, height: 4.0  },  // temple
};

// ── Map offset ───────────────────────────────────────────
// Centre the map at world origin so the camera's lookAt(0,0,0)
// starts pointing at the middle of campus.
const OFFSET_X = -(MAP_COLS * TILE_SIZE) / 2;
const OFFSET_Z = -(MAP_ROWS * TILE_SIZE) / 2;

/**
 * Builds the entire campus tile world and adds it to the scene.
 * Call once at startup from script.js.
 *
 * @param {THREE.Scene} scene
 * @returns {{ getTile: Function, worldToTile: Function, tileToWorld: Function }}
 */
export function buildTileMap(scene) {

  // ── 1. Bucket tiles by type ──────────────────────────────
  // Instead of creating one mesh per tile (thousands of draw calls),
  // we group all tiles of the same type together.
  // Each group becomes one InstancedMesh — one draw call for all
  // tiles of that type regardless of count.
  //
  // buckets = { 'GR': [{row, col}, ...], 'RD': [...], ... }
  const buckets = {};

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const code = CAMPUS_MAP[row][col];

      // Skip outside tiles — don't create any geometry for them
      if (OUTSIDE.includes(code)) continue;

      // Skip any tile code with no config (safety net)
      if (!TILE_CONFIG[code]) continue;

      if (!buckets[code]) buckets[code] = [];
      buckets[code].push({ row, col });
    }
  }

  // ── 2. Build one InstancedMesh per tile type ─────────────
  const dummy     = new THREE.Object3D(); // reusable transform helper
  const meshIndex = {};                   // code → InstancedMesh (for raycasting later)

  for (const [code, tiles] of Object.entries(buckets)) {
    const cfg    = TILE_CONFIG[code];
    const count  = tiles.length;

    // Geometry — box sized to tile footprint × tile height
    // Width/Depth = TILE_SIZE (2 units), Height = cfg.height
    const geometry = new THREE.BoxGeometry(TILE_SIZE, cfg.height, TILE_SIZE);

    // Material — MeshLambertMaterial is cheaper than MeshStandardMaterial
    // and looks fine for grey-box phase. Swap to MeshStandardMaterial
    // in Phase 7 when you add PBR textures.
    const material = new THREE.MeshLambertMaterial({ color: cfg.color });

    // InstancedMesh — one mesh, `count` instances, 1 draw call
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    mesh.name          = `tile_${code}`;

    // ── 3. Position each instance ────────────────────────
    // Three.js BoxGeometry is centred at origin by default.
    // We want the BASE of the box at y=0, so we shift y up
    // by half the height: position.y = cfg.height / 2
    tiles.forEach(({ row, col }, i) => {
      dummy.position.set(
        col * TILE_SIZE + OFFSET_X + TILE_SIZE / 2,  // centre of tile on X
        cfg.height / 2,                               // base sits at y=0
        row * TILE_SIZE + OFFSET_Z + TILE_SIZE / 2,  // centre of tile on Z
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    // Commit instance matrices to GPU
    mesh.instanceMatrix.needsUpdate = true;

    scene.add(mesh);
    meshIndex[code] = mesh;
  }

  // ── 4. Flat lookup table for collision & interaction ─────
  // A 2D array mirroring CAMPUS_MAP but giving fast access
  // to tile properties at any grid position.
  // Used by CollisionSystem.js and InputManager.js later.
  //
  // tileGrid[row][col] = { code, walkable, blocked, config }
  const tileGrid = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    tileGrid[row] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      const code = CAMPUS_MAP[row][col];
      tileGrid[row][col] = {
        code,
        walkable: WALKABLE.includes(code),
        blocked:  BLOCKED.includes(code),
        outside:  OUTSIDE.includes(code),
        config:   TILE_CONFIG[code] ?? null,
      };
    }
  }

  // ── 5. Helper: world position → tile grid coords ─────────
  /**
   * Converts a Three.js world position to a tile grid [row, col].
   * Returns null if the position is outside the map bounds.
   *
   * @param   {THREE.Vector3} worldPos
   * @returns {{ row: number, col: number } | null}
   */
  function worldToTile(worldPos) {
    const col = Math.floor((worldPos.x - OFFSET_X) / TILE_SIZE);
    const row = Math.floor((worldPos.z - OFFSET_Z) / TILE_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null;
    return { row, col };
  }

  // ── 6. Helper: tile grid coords → world centre position ──
  /**
   * Converts a [row, col] grid position to its Three.js world centre.
   * Useful for placing objects exactly on a tile.
   *
   * @param   {number} row
   * @param   {number} col
   * @returns {THREE.Vector3}
   */
  function tileToWorld(row, col) {
    return new THREE.Vector3(
      col * TILE_SIZE + OFFSET_X + TILE_SIZE / 2,
      0,
      row * TILE_SIZE + OFFSET_Z + TILE_SIZE / 2,
    );
  }

  // ── 7. Helper: get tile data at a grid position ──────────
  /**
   * Returns tile data at [row, col], or null if out of bounds.
   *
   * @param   {number} row
   * @param   {number} col
   * @returns {{ code, walkable, blocked, outside, config } | null}
   */
  function getTile(row, col) {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return null;
    return tileGrid[row][col];
  }

  // ── 8. Debug info ─────────────────────────────────────────
  if (import.meta.env?.DEV) {
    const totalTiles = Object.values(buckets).reduce((sum, t) => sum + t.length, 0);
    const drawCalls  = Object.keys(buckets).length;
    console.log('[TileMap] Built', {
      totalTiles,
      drawCalls,
      mapSize: `${MAP_COLS} × ${MAP_ROWS} (${MAP_COLS * TILE_SIZE}m × ${MAP_ROWS * TILE_SIZE}m)`,
      tileTypes: Object.keys(buckets),
    });
  }

  return { getTile, worldToTile, tileToWorld };
}