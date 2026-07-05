// Pseudocode only.

const DIR8 = ["up","up_right","right","down_right","down","down_left","left","up_left"];

function directionTo8WayIndex(direction) {
  return {
    up: 0,
    up_right: 1,
    right: 2,
    down_right: 3,
    down: 4,
    down_left: 5,
    left: 6,
    up_left: 7,
  }[direction] ?? 2;
}

function setAtlasFrame(material, dirIndex) {
  material.map.repeat.set(1 / 4, 1 / 2);
  material.map.offset.set((dirIndex % 4) / 4, 1 - (Math.floor(dirIndex / 4) + 1) / 2);
  material.map.needsUpdate = true;
}
