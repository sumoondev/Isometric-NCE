import { setupScene }    from './scene/Renderer.js';
import { buildWorld }    from './world/TileMap.js';
import { createPlayer }  from './entities/Player.js';

const { scene, camera, renderer } = setupScene();
buildWorld(scene);
const player = createPlayer(scene);

function loop() {
    requestAnimationFrame(loop);
    player.update();
    renderer.render(scene, camera);
}
loop();