# ToDo List

### Phase 0 
- **Reference Gathering**
- [x] Sketch a rough top-down layout of the campus
- [x] Label all zones: Main Gate, Academic Block, Labs, Canteen, Field, Parking, Admin, Garden

### Phase 1 
- **Map planning on paper**
- [x] Draw the full campus grid on graph paper with proper scaling
- [x] Assign tile types using this legend
- [x] campusMap.js - Translate paper grid into a 2D JavaScript array

### Phase 2 
- **Get a walkable flat world before any visuals or models**
- [x] Renderer.js — set up WebGLRenderer, size, pixel ratio capped at 2x, shadow map enabled
- [ ] Camera.js — orthographic camera, position at (20, 20, 20), looking at origin
- [ ] TileMap.js — read campusMap.js array, place flat BoxGeometry tiles with color per type
- [ ] InputManager.js — capture WASD and Arrow key state
- [ ] Player.js — capsule mesh, isometric WASD movement
- [ ] Camera follows player with smooth lerp
- [ ] Lighting.js — basic directional sun + ambient light

### Phase 3
- **Grey-box building**
- [ ] Fill buildings.js with data: id, label, gridX, gridZ, width, depth, height, color
- [ ] Place box meshes for buildings
- [ ] Handle shadows
- [ ] Collision with buildings (AABB collision)

### Phase 4
- **Lighting & Atmosphere**
- [ ] Sun + fill + ambient lights
- [ ] Fog + sky color
- [ ] Shadow map optimized

### Phase 5
- **Blender Models**
- [ ] Model walls, gate, props, canteen, labs, admin, academic block
- [ ] Keep poly count low, textures baked
- [ ] Export .glb with DRACO
- [ ] Replace grey-box with models<br>
*Try to keep assets below 15MB*

### Phase 6
- **Props and polish**
- [ ] Trees (InstancedMesh)
- [ ] Benches, lamps, signboards
- [ ] Ground textures
- [ ] Skybox + ambient sounds

### Phase 7
- **Interaction**
- [ ] Raycast clicks → info popup
- [ ] “Press E” near buildings
- [ ] Mini-map overlay
- [ ] Mobile touch controls

### Phase 8
- **Optimisation**
- [ ] Pixel ratio capped
- [ ] InstancedMesh for repeats
- [ ] LOD for buildings
- [ ] Asset budget check (<30MB total)
- [ ] Test on low-end devices (≥30 FPS)

<!-- - [ ] Terrain - Flat plane
- [ ] Trees
- [ ] Rock
- [ ] Bushes
- [ ] Gate
- [ ] Parking
- [ ] Playground
    - [ ] Basketball court
    - [ ] Badminton court
    - [ ] Futsal
    - [ ] Cricket playground
- [ ] Building
    - [ ] Canteen
    - [ ] Administation
    - [ ] Blocks
    - [ ] Faculty
- [ ] Interior of buildings
- [ ] Player Character
    - [ ] Draw character on the screen
    - [ ] Point and click controls
    - [ ] Navigation (ignore obstacles)
        - [ ] A* algorithm
    - [ ] Improve Navigation (obstacle avoidance)

- [ ] NPCs
    - [ ] Interact with npc -->