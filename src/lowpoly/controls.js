const MOVEMENT_KEYS = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  Space: 'up', KeyC: 'down', ShiftLeft: 'boost', ShiftRight: 'boost', KeyQ: 'brake',
};

const ACTION_KEYS = {
  KeyE: 'onAction', KeyF: 'onFire', Tab: 'onTarget', KeyV: 'onView',
  Escape: 'onPause', KeyR: 'onReturn', KeyX: 'onDeploy',
  KeyG: 'onNavigate', KeyI: 'onInspect',
};

const MOVES = new Set(['left', 'right', 'forward', 'back', 'up', 'down', 'boost', 'brake']);

/** Input is in camera-local axes. Positive look deltas mean dragging right/down, in CSS pixels. */
export function createControls(canvas, handlers = {}) {
  const document = canvas.ownerDocument;
  const window = document.defaultView;
  const keys = new Set();
  const touches = new Map();
  const cleanup = [];
  let drag = null;
  let lookX = 0;
  let lookY = 0;
  let disposed = false;
  const previousTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = 'none';

  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    cleanup.push(() => target.removeEventListener(name, callback, options));
  }

  function isTyping(target) {
    return target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName);
  }

  function capture(element, pointerId) {
    // A canceled pointer or a synthetic accessibility event may have no active capture.
    try { element.setPointerCapture(pointerId); } catch { /* Window release listeners remain active. */ }
  }

  function release(element, pointerId) {
    try {
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    } catch { /* The browser may already have released a canceled pointer. */ }
  }

  function refreshButton(button) {
    const pressed = [...touches.values()].some(touch => touch.button === button);
    button.classList.toggle('is-pressed', pressed);
    button.setAttribute('aria-pressed', String(pressed));
  }

  function stopPointer(event) {
    const touch = touches.get(event.pointerId);
    if (touch) {
      touches.delete(event.pointerId);
      release(touch.button, event.pointerId);
      refreshButton(touch.button);
    }
    if (drag?.id === event.pointerId) {
      drag = null;
      release(canvas, event.pointerId);
    }
  }

  function clear() {
    keys.clear();
    lookX = 0;
    lookY = 0;
    for (const [id, touch] of [...touches]) {
      touches.delete(id);
      release(touch.button, id);
      refreshButton(touch.button);
    }
    if (drag) {
      const id = drag.id;
      drag = null;
      release(canvas, id);
    }
  }

  listen(window, 'keydown', event => {
    // A modal owns its keyboard: preserve native Tab traversal, Escape and button activation.
    if (document.querySelector('dialog[open]')) return;
    if (isTyping(event.target) || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    // Target cycling is a world shortcut; focused UI keeps normal keyboard navigation.
    if (event.code === 'Tab' && event.target !== canvas && event.target !== document.body) return;
    if (MOVEMENT_KEYS[event.code]) {
      event.preventDefault();
      keys.add(event.code);
    } else if (ACTION_KEYS[event.code]) {
      event.preventDefault();
      if (!event.repeat) handlers[ACTION_KEYS[event.code]]?.();
    }
  });
  listen(window, 'keyup', event => {
    // Always release: focus may move to a text field after movement began.
    keys.delete(event.code);
    if (MOVEMENT_KEYS[event.code] && !isTyping(event.target) && !document.querySelector('dialog[open]')) event.preventDefault();
  });
  listen(window, 'blur', clear);
  listen(document, 'visibilitychange', () => { if (document.hidden) clear(); });

  for (const button of document.querySelectorAll('[data-move]')) {
    if (!MOVES.has(button.dataset.move)) continue;
    listen(button, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      touches.set(event.pointerId, { move: button.dataset.move, button });
      capture(button, event.pointerId);
      refreshButton(button);
    });
    listen(button, 'lostpointercapture', stopPointer);
    listen(button, 'contextmenu', event => event.preventDefault());
  }

  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0 || drag) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    capture(canvas, event.pointerId);
  });
  listen(window, 'pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    lookX += event.clientX - drag.x;
    lookY += event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    event.preventDefault();
  }, { passive: false });
  listen(window, 'pointerup', stopPointer);
  listen(window, 'pointercancel', stopPointer);
  listen(canvas, 'lostpointercapture', stopPointer);
  listen(canvas, 'contextmenu', event => event.preventDefault());

  return {
    sample() {
      const pressed = new Set([...keys].map(code => MOVEMENT_KEYS[code]));
      for (const touch of touches.values()) pressed.add(touch.move);
      const sample = {
        x: Number(pressed.has('right')) - Number(pressed.has('left')),
        y: Number(pressed.has('up')) - Number(pressed.has('down')),
        z: Number(pressed.has('back')) - Number(pressed.has('forward')),
        boost: pressed.has('boost'),
        brake: pressed.has('brake'),
        lookX,
        lookY,
      };
      lookX = 0;
      lookY = 0;
      return sample;
    },
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      for (const remove of cleanup) remove();
      canvas.style.touchAction = previousTouchAction;
    },
  };
}
