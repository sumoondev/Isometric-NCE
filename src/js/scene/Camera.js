import * as THREE from 'three';

const FRUSTUM_SIZE = 40;

const ISO_OFFSET = new THREE.Vector3(30, 30, 30);

const FOLLOW_LERP = 0.08; // 0.08 for smooth and slightly laggy and 0.15 for fast movement

export function createCamera(onResize) {

    const aspect = window.innerWidth / window.innerHeight;
    const { left, right, top, bottom } = frustumBounds(FRUSTUM_SIZE, aspect);

    const camera = new THREE.OrthographicCamera(
        left,
        right,
        top,
        bottom,
        0.1,
        500,
    );

    camera.position.copy(ISO_OFFSET);
    camera.lookAt(0, 0, 0);

    onResize((w, h) => {
        const newAspect = w / h;
        const bounds = frustumBounds(FRUSTUM_SIZE, newAspect);

        camera.left   = bounds.left;
        camera.right  = bounds.right;
        camera.top    = bounds.top;
        camera.bottom = bounds.bottom;

        // Always call this after changing camera projection values
        camera.updateProjectionMatrix();
    });

    function followTarget(targetPosition) {
        const desiredPosition = new THREE.Vector3(
        targetPosition.x + ISO_OFFSET.x,
        targetPosition.y + ISO_OFFSET.y,
        targetPosition.z + ISO_OFFSET.z,
        );

        camera.position.lerp(desiredPosition, FOLLOW_LERP);

        camera.lookAt(targetPosition);
    }

    let currentZoom = FRUSTUM_SIZE;
    const MIN_ZOOM  = 15; 
    const MAX_ZOOM  = 80; 

    window.addEventListener('wheel', (e) => {
        currentZoom += e.deltaY * 0.05;
        currentZoom  = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom));

        const aspect = window.innerWidth / window.innerHeight;
        const bounds = frustumBounds(currentZoom, aspect);

        camera.left   = bounds.left;
        camera.right  = bounds.right;
        camera.top    = bounds.top;
        camera.bottom = bounds.bottom;

        camera.updateProjectionMatrix();
    });

    // debugging
    if (import.meta.env?.DEV) {
        console.log('[Camera] Initialised', {
        type:        'OrthographicCamera',
        frustumSize: FRUSTUM_SIZE,
        isoOffset:   ISO_OFFSET,
        followLerp:  FOLLOW_LERP,
        near: 0.1, far: 500,
        });
    }

    return { camera, followTarget };
}

function frustumBounds(size, aspect) {
    return {
        left:   -(size * aspect) / 2,
        right:   (size * aspect) / 2,
        top:      size / 2,
        bottom:  -size / 2,
    };
}