import test from 'node:test';
import assert from 'node:assert/strict';
import { createControls } from '../src/lowpoly/controls.js';

// A small event surface keeps the lifecycle tests independent of a browser runtime.
class Element extends EventTarget {
  constructor(tagName = 'BUTTON') {
    super(); this.tagName = tagName; this.dataset = {}; this.style = {};
    this.attributes = new Map(); this.captured = new Set(); this.parentElement = null;
    const classes = new Set();
    this.classList = { toggle: (name, active) => active ? classes.add(name) : classes.delete(name) };
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  contains(node) { return node === this || !!node?.parentElement && this.contains(node.parentElement); }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}
const emit = (target, type, fields = {}) => {
  const event = new Event(type, { cancelable: true });
  for (const [name, value] of Object.entries(fields)) Object.defineProperty(event, name, { value });
  target.dispatchEvent(event);
};
function fixture() {
  const window = new EventTarget(), document = new EventTarget();
  const canvas = new Element('CANVAS'), right = new Element(), up = new Element();
  right.dataset.move = 'right'; up.dataset.move = 'up';
  document.defaultView = window; document.hidden = false;
  document.querySelectorAll = () => [right, up]; document.querySelector = () => null;
  for (const element of [canvas, right, up]) element.ownerDocument = document;
  const controls = createControls(canvas);
  return { window, document, canvas, right, up, controls };
}
const press = (button, id, pointerType = 'touch') => emit(button, 'pointerdown', { pointerId: id, pointerType, button: 0 });

test('native touch cancellation releases only the canceled control if pointercancel was lost', () => {
  const f = fixture();
  press(f.right, 17); press(f.up, 33);
  assert.deepEqual([f.controls.sample().x, f.controls.sample().y], [1, 1]);
  // Touch identifiers do not have to match PointerEvent pointerIds.
  emit(f.window, 'touchcancel', { touches: [{ identifier: 2, target: f.up }] });
  const sample = f.controls.sample();
  assert.deepEqual([sample.x, sample.y], [0, 1]);
  assert.equal(f.right.attributes.get('aria-pressed'), 'false');
  assert.equal(f.up.attributes.get('aria-pressed'), 'true');
  f.controls.dispose();
});

test('native touchend clears a missed pointerup even when touch started on a button label', () => {
  const f = fixture(); const label = new Element('SPAN'); label.parentElement = f.right;
  press(f.right, 55); press(f.up, 66);
  emit(f.window, 'touchend', { touches: [{ identifier: 8, target: label }] });
  assert.deepEqual([f.controls.sample().x, f.controls.sample().y], [1, 0]);
  emit(f.window, 'touchend', { touches: [] });
  assert.equal(f.controls.sample().x, 0);
  assert.equal(f.right.attributes.get('aria-pressed'), 'false');
  f.controls.dispose();
});

test('native touch cleanup preserves keyboard and mouse controls', () => {
  const f = fixture();
  emit(f.window, 'keydown', { code: 'KeyW' }); press(f.right, 1, 'mouse'); press(f.up, 72);
  emit(f.window, 'touchcancel', { touches: [] });
  const sample = f.controls.sample();
  assert.deepEqual([sample.x, sample.y, sample.z], [1, 0, -1]);
  f.controls.dispose();
});

test('a held second finger is not timed out or reset by another touch ending', () => {
  const f = fixture(); press(f.right, 11); press(f.up, 22);
  emit(f.window, 'touchend', { touches: [{ identifier: 9, target: f.up }] });
  for (let i = 0; i < 1000; i++) assert.equal(f.controls.sample().y, 1);
  emit(f.window, 'pointerup', { pointerId: 22 });
  assert.equal(f.controls.sample().y, 0);
  f.controls.dispose();
});

test('pagehide releases keys, held buttons and camera drag before a page is cached', () => {
  const f = fixture();
  emit(f.window, 'keydown', { code: 'KeyW' }); press(f.right, 5);
  emit(f.canvas, 'pointerdown', { pointerId: 9, pointerType: 'touch', button: 0, clientX: 10, clientY: 10 });
  emit(f.window, 'pagehide');
  emit(f.window, 'pointermove', { pointerId: 9, clientX: 40, clientY: 60 });
  const sample = f.controls.sample();
  assert.deepEqual([sample.x, sample.z, sample.lookX, sample.lookY], [0, 0, 0, 0]);
  assert.equal(f.right.attributes.get('aria-pressed'), 'false');
  f.controls.dispose();
});

test('touch cancellation also releases a camera drag without canceling a remaining button', () => {
  const f = fixture(); press(f.up, 22);
  emit(f.canvas, 'pointerdown', { pointerId: 9, pointerType: 'touch', button: 0, clientX: 10, clientY: 10 });
  emit(f.window, 'touchcancel', { touches: [{ identifier: 9, target: f.up }] });
  emit(f.window, 'pointermove', { pointerId: 9, clientX: 40, clientY: 60 });
  const sample = f.controls.sample();
  assert.deepEqual([sample.y, sample.lookX, sample.lookY], [1, 0, 0]);
  f.controls.dispose();
});

test('ordinary pointer release and lifecycle cancellation remain idempotent', () => {
  const f = fixture();
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    press(f.right, 7);
    emit(event === 'lostpointercapture' ? f.right : f.window, event, { pointerId: 7 });
    emit(f.window, 'touchend', { touches: [] });
    assert.equal(f.controls.sample().x, 0);
  }
  press(f.right, 7); emit(f.window, 'blur'); assert.equal(f.controls.sample().x, 0);
  press(f.up, 8); f.document.hidden = true; emit(f.document, 'visibilitychange'); assert.equal(f.controls.sample().y, 0);
  f.controls.dispose(); press(f.right, 7); assert.equal(f.controls.sample().x, 0);
});
