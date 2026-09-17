const MOVEMENT_KEYS = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  Space: 'up', KeyC: 'down', ShiftLeft: 'boost', ShiftRight: 'boost', KeyQ: 'brake',
};

const ACTION_KEYS = {
  KeyE: 'onAction', KeyF: 'onFire', Tab: 'onTarget', KeyV: 'onView',
  Escape: 'onPause', KeyR: 'onReturn', KeyX: 'onDeploy',
  KeyM: 'onBike', KeyG: 'onNavigate', KeyI: 'onInspect', KeyB: 'onCabin',
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
  const stickElement=document.querySelector('[data-joystick]');
  const stickThumb=stickElement?.querySelector('[data-joystick-thumb]');
  let stick=null, stickX=0, stickZ=0;
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
    if(stick?.id===event.pointerId) {
      const id=stick.id; stick=null; stickX=stickZ=0;
      if(stickThumb) stickThumb.style.transform='translate(0px,0px)';
      stickElement.classList.toggle('is-pressed',false);
      release(stickElement,id);
    }
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

  function reconcileEndedTouches(event) {
    // Native touch cancellation can outlive the PointerEvent stream on mobile.
    // Compare original targets: Touch.identifier and pointerId are unrelated.
    const activeTargets = Array.from(event.touches, touch => touch.target);
    const stillTouched = element => activeTargets.some(target => element.contains(target));
    for (const [id, touch] of [...touches]) {
      if (touch.pointerType === 'touch' && !stillTouched(touch.button)) stopPointer({ pointerId: id });
    }
    if (drag?.pointerType === 'touch' && !stillTouched(canvas)) stopPointer({ pointerId: drag.id });
    if (stick?.pointerType === 'touch' && !stillTouched(stickElement)) stopPointer({ pointerId: stick.id });
  }

  function clear() {
    keys.clear();
    lookX = 0;
    lookY = 0;
    if(stick) stopPointer({pointerId:stick.id});
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
  listen(window, 'pagehide', clear);
  listen(document, 'visibilitychange', () => { if (document.hidden) clear(); });
  listen(window, 'touchend', reconcileEndedTouches, { capture: true, passive: true });
  listen(window, 'touchcancel', reconcileEndedTouches, { capture: true, passive: true });

  for (const button of document.querySelectorAll('[data-move]')) {
    if (!MOVES.has(button.dataset.move)) continue;
    listen(button, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      touches.set(event.pointerId, { move: button.dataset.move, button, pointerType: event.pointerType });
      capture(button, event.pointerId);
      refreshButton(button);
    });
    listen(button, 'lostpointercapture', stopPointer);
    listen(button, 'contextmenu', event => event.preventDefault());
  }

  function moveStick(event) {
    const dx=(event.clientX-stick.x)/stick.radius, dz=(event.clientY-stick.y)/stick.radius;
    const length=Math.hypot(dx,dz), amount=Math.max(0,(Math.min(1,length)-.08)/.92);
    stickX=length>0?dx/length*amount:0; stickZ=length>0?dz/length*amount:0;
    if(stickThumb) stickThumb.style.transform=`translate(${stickX*stick.radius}px,${stickZ*stick.radius}px)`;
    event.preventDefault();
  }
  if(stickElement) {
    listen(stickElement,'pointerdown',event=>{
      if(event.button!==0 || stick) return;
      const rect=stickElement.getBoundingClientRect();
      stick={id:event.pointerId,pointerType:event.pointerType,x:rect.left+rect.width/2,y:rect.top+rect.height/2,radius:Math.max(1,rect.width*.38)};
      capture(stickElement,event.pointerId); stickElement.classList.toggle('is-pressed',true); moveStick(event);
    });
    listen(stickElement,'lostpointercapture',stopPointer);
    listen(stickElement,'contextmenu',event=>event.preventDefault());
  }

  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0 || drag) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, pointerType: event.pointerType };
    capture(canvas, event.pointerId);
  });
  listen(window, 'pointermove', event => {
    if(stick?.id===event.pointerId) { moveStick(event); return; }
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
        x: Math.max(-1,Math.min(1,Number(pressed.has('right')) - Number(pressed.has('left'))+stickX)),
        y: Number(pressed.has('up')) - Number(pressed.has('down')),
        z: Math.max(-1,Math.min(1,Number(pressed.has('back')) - Number(pressed.has('forward'))+stickZ)),
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
