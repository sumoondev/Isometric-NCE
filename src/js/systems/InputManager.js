// ============================================================
// InputManager.js — Keyboard & Touch Input
// NCE Isometric Game
//
// Responsibilities:
//   - Track keyboard key states (WASD + Arrow keys)
//   - Handle mobile touch via an on-screen virtual joystick
//   - Expose getMovementVector() → normalised {x, z} in
//     screen space (Player.js rotates it to world space)
//   - Expose isActionPressed() for interaction key (E / tap)
//   - Clean up all event listeners on destroy()
// ============================================================

// ── Constants ─────────────────────────────────────────────
// Deadzone: joystick deltas smaller than this are ignored.
// Prevents micro-drift on cheap phone screens.
const JOYSTICK_DEADZONE = 8;        // px

// Max radius the joystick knob can travel from centre.
const JOYSTICK_RADIUS   = 50;       // px

/**
 * Sets up all input handling for keyboard and touch.
 * Call once at startup from script.js.
 *
 * @returns {{
 *   getMovementVector : () => { x: number, z: number },
 *   isActionPressed   : () => boolean,
 *   destroy           : () => void,
 * }}
 */
export function createInputManager() {

  // ── 1. Keyboard state ────────────────────────────────────
  // A plain object used as a Set — key = key string, value = true.
  // Checking `keys['w']` is O(1) and safe even for unmapped keys.
  const keys = {};

  function onKeyDown(e) {
    // Prevent arrow keys from scrolling the page
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    keys[e.key.toLowerCase()] = true;
  }

  function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);

  // ── 2. Touch / virtual joystick state ───────────────────
  // joystick.active  → finger is currently down
  // joystick.originX/Y → where the finger first touched
  // joystick.dx/dz   → current normalised delta (-1 to 1)
  const joystick = {
    active:  false,
    touchId: null,    // track a specific finger (multi-touch safe)
    originX: 0,
    originY: 0,
    dx: 0,
    dz: 0,
  };

  // ── 3. Build virtual joystick UI ────────────────────────
  // Two DOM circles: a static ring (base) and a moving dot (knob).
  // Visible only on touch devices, hidden on desktop.
  // Positioned dynamically where the player first touches.
  const joystickBase = document.createElement('div');
  const joystickKnob = document.createElement('div');

  Object.assign(joystickBase.style, {
    position:     'fixed',
    width:        `${JOYSTICK_RADIUS * 2}px`,
    height:       `${JOYSTICK_RADIUS * 2}px`,
    borderRadius: '50%',
    border:       '3px solid rgba(255,255,255,0.4)',
    background:   'rgba(255,255,255,0.08)',
    display:      'none',           // hidden until touch starts
    pointerEvents:'none',           // never blocks game touches
    zIndex:       '100',
    transform:    'translate(-50%, -50%)',
    boxSizing:    'border-box',
  });

  Object.assign(joystickKnob.style, {
    position:     'absolute',
    width:        `${JOYSTICK_RADIUS}px`,
    height:       `${JOYSTICK_RADIUS}px`,
    borderRadius: '50%',
    background:   'rgba(255,255,255,0.5)',
    top:  '50%',
    left: '50%',
    transform:    'translate(-50%, -50%)',
    transition:   'transform 0.05s',  // tiny ease on knob movement
  });

  joystickBase.appendChild(joystickKnob);
  document.body.appendChild(joystickBase);

  // ── 4. Touch event handlers ──────────────────────────────
  function onTouchStart(e) {
    e.preventDefault();
    if (joystick.active) return; // already tracking a finger

    const touch       = e.changedTouches[0];
    joystick.active   = true;
    joystick.touchId  = touch.identifier;
    joystick.originX  = touch.clientX;
    joystick.originY  = touch.clientY;
    joystick.dx       = 0;
    joystick.dz       = 0;

    // Show joystick ring at touch origin
    joystickBase.style.display = 'block';
    joystickBase.style.left    = `${touch.clientX}px`;
    joystickBase.style.top     = `${touch.clientY}px`;
    setKnobPosition(0, 0);
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!joystick.active) return;

    // Find the touch we are tracking
    const touch = findTouch(e.changedTouches, joystick.touchId);
    if (!touch) return;

    let dx = touch.clientX - joystick.originX;
    let dy = touch.clientY - joystick.originY;  // screen Y → world Z

    // Apply deadzone — ignore tiny finger wobble
    if (Math.abs(dx) < JOYSTICK_DEADZONE) dx = 0;
    if (Math.abs(dy) < JOYSTICK_DEADZONE) dy = 0;

    // Clamp to joystick radius
    const dist    = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    const angle   = Math.atan2(dy, dx);

    const clampedDx = Math.cos(angle) * clamped;
    const clampedDy = Math.sin(angle) * clamped;

    // Normalise to -1 … 1 range for Player.js
    joystick.dx = clampedDx / JOYSTICK_RADIUS;
    joystick.dz = clampedDy / JOYSTICK_RADIUS;  // screen Y maps to world Z

    // Move the knob visually
    setKnobPosition(clampedDx, clampedDy);
  }

  function onTouchEnd(e) {
    e.preventDefault();
    const touch = findTouch(e.changedTouches, joystick.touchId);
    if (!touch) return;

    // Check for a quick tap → trigger action (same as E key)
    const dx = touch.clientX - joystick.originX;
    const dy = touch.clientY - joystick.originY;
    const moved = Math.sqrt(dx * dx + dy * dy);
    if (moved < JOYSTICK_DEADZONE) {
      triggerAction();
    }

    // Reset joystick
    joystick.active  = false;
    joystick.touchId = null;
    joystick.dx      = 0;
    joystick.dz      = 0;
    joystickBase.style.display = 'none';
    setKnobPosition(0, 0);
  }

  // Passive: false so we can call preventDefault (needed for mobile scroll lock)
  window.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove',  onTouchMove,  { passive: false });
  window.addEventListener('touchend',   onTouchEnd,   { passive: false });

  // ── 5. Action key (E key / tap) ──────────────────────────
  // Used in Phase 8 for interacting with buildings.
  // Stored as a flag that is read once then cleared, so a
  // single press triggers one interaction, not many per frame.
  let actionPressedFlag = false;

  function triggerAction() {
    actionPressedFlag = true;
  }

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'e') triggerAction();
  });

  // ── 6. Public API ─────────────────────────────────────────

  /**
   * Returns a normalised movement vector in screen space.
   * x: -1 = left,  +1 = right
   * z: -1 = up,    +1 = down   (screen Y → world Z in Player.js)
   *
   * Player.js rotates this 45° to get isometric world movement.
   * Vector is normalised so diagonal speed = straight speed.
   *
   * @returns {{ x: number, z: number }}
   */
  function getMovementVector() {
    let x = 0;
    let z = 0;

    // Keyboard input
    if (keys['w'] || keys['arrowup'])    z -= 1;
    if (keys['s'] || keys['arrowdown'])  z += 1;
    if (keys['a'] || keys['arrowleft'])  x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;

    // Touch input — overrides keyboard if joystick active
    if (joystick.active) {
      x = joystick.dx;
      z = joystick.dz;
    }

    // Normalise diagonal movement so moving diagonally is
    // not faster than moving in a straight line.
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  /**
   * Returns true once per press of the action key (E) or tap.
   * Automatically resets after being read — call once per frame.
   *
   * @returns {boolean}
   */
  function isActionPressed() {
    if (actionPressedFlag) {
      actionPressedFlag = false;  // consume the press
      return true;
    }
    return false;
  }

  /**
   * Remove all event listeners and DOM elements.
   * Call if you ever tear down and rebuild the scene.
   */
  function destroy() {
    window.removeEventListener('keydown',     onKeyDown);
    window.removeEventListener('keyup',       onKeyUp);
    window.removeEventListener('touchstart',  onTouchStart);
    window.removeEventListener('touchmove',   onTouchMove);
    window.removeEventListener('touchend',    onTouchEnd);
    document.body.removeChild(joystickBase);
  }

  // ── 7. Debug info ─────────────────────────────────────────
  if (import.meta.env?.DEV) {
    console.log('[InputManager] Initialised', {
      keyboard: 'WASD + Arrow keys',
      action:   'E key / tap',
      touch:    `Virtual joystick (radius: ${JOYSTICK_RADIUS}px, deadzone: ${JOYSTICK_DEADZONE}px)`,
    });
  }

  return { getMovementVector, isActionPressed, destroy };
}

// ── Private helpers ───────────────────────────────────────

/**
 * Finds a specific touch by identifier in a TouchList.
 * @param {TouchList} list
 * @param {number}    id
 * @returns {Touch | undefined}
 */
function findTouch(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].identifier === id) return list[i];
  }
}

/**
 * Moves the joystick knob relative to the base centre.
 * @param {number} dx - pixel offset on X
 * @param {number} dy - pixel offset on Y
 */
function setKnobPosition(dx, dy) {
  const knob = document.querySelector('div > div'); // joystickKnob
  if (knob) {
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}