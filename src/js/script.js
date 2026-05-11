import { createRenderer } from './scene/Renderer.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

const { renderer, onResize } = createRenderer();
const stats = new Stats();

document.body.appendChild(stats.dom);

function loop() {
    requestAnimationFrame(loop);
    stats.update();
}
loop();