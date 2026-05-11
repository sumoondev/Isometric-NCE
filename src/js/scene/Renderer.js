import * as THREE from 'three';
import { OrbitControls, ThreeMFLoader } from 'three/examples/jsm/Addons.js';

export function createRenderer() {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);    // cap pixel ratio to 2x
    
    const useAntialias = pixelRatio < 2;    // returns true for low DPI screens

    const renderer = new THREE.WebGLRenderer({  // setup renderer
        antialias: useAntialias,
        powerPreference: 'high-performance',
        depth: true,
        stencil: false
    });

    // renderer size mapping
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);

    // renderer shadow mapping
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // renderer color mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.sortObjects = true;

    renderer.domElement.style.display = 'block';
    document.body.appendChild(renderer.domElement);


    // handle window resizing
    const resizeCallbacks = [];
    function handleResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
    
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
        // Notify camera and any other listeners
        resizeCallbacks.forEach(cb => cb(w, h));
    }
    
    window.addEventListener('resize', handleResize);

    function onResize(cb) {
        resizeCallbacks.push(cb);
    }

    // debugging purpose
    if (import.meta.env?.DEV) {
        console.log('[Renderer] Initialised', {
        antialias:  useAntialias,
        pixelRatio,
        shadowMap:  'PCFSoft 1024px',
        toneMapping: 'ACESFilmic',
        });
    }

    return { renderer, onResize };
}