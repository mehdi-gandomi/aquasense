import * as THREE from 'three';

/**
 * Bridge between the WebGL scene and the HTML overlay.
 *
 * Anchors are registered in world space by the scene, and the projector writes
 * screen transforms straight onto the registered DOM nodes each frame. Doing the
 * projection ourselves keeps dozens of sensor tags welded to their equipment
 * without pushing a single React re-render per frame.
 */

export interface Anchor {
  id: string;
  world: THREE.Vector3;
  el: HTMLElement | null;
  visible: boolean;
}

const anchors = new Map<string, Anchor>();

export function registerAnchor(id: string, world: [number, number, number]) {
  const existing = anchors.get(id);
  if (existing) {
    existing.world.set(world[0], world[1], world[2]);
    return;
  }
  anchors.set(id, {
    id,
    world: new THREE.Vector3(world[0], world[1], world[2]),
    el: null,
    visible: true,
  });
}

export function attachAnchorElement(id: string, el: HTMLElement | null) {
  const anchor = anchors.get(id);
  if (anchor) anchor.el = el;
  else if (el) {
    anchors.set(id, { id, world: new THREE.Vector3(), el, visible: true });
  }
}

export function allAnchors(): IterableIterator<Anchor> {
  return anchors.values();
}

export function clearAnchorElements() {
  for (const anchor of anchors.values()) anchor.el = null;
}
