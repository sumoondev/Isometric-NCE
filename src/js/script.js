import * as THREE from 'three';
import { createRenderer } from './scene/Renderer.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { createCamera }   from './scene/Camera.js';
import { createLighting } from './scene/Lighting.js';
import { buildTileMap } from './world/TileMap.js';
import { createInputManager } from './systems/InputManager.js';
import { createPlayer } from './entities/Player.js';

const { renderer, onResize } = createRenderer();
const stats = new Stats();
const { camera, followTarget } = createCamera(onResize);
const scene = new THREE.Scene();
const { setTimeOfDay } = createLighting(scene);
const { getTile, worldToTile, tileToWorld } = buildTileMap(scene);
const input = createInputManager();
const player = createPlayer(scene, input, getTile, tileToWorld);

const clock = new THREE.Clock;

document.body.appendChild(stats.dom);

function loop(timestamp) {
    requestAnimationFrame(loop);
    const { x, z } = input.getMovementVector();
    const dt = clock.getDelta();      // THREE.Clock
    player.update(dt);
    followTarget(player.mesh.position);
    renderer.render(scene, camera);
    stats.update();
}
loop();