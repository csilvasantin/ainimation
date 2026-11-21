import { GridHelper } from 'three';

export function addObjectFloor(scene, height, cellSize) {
  const divisions = 48;
  const grid = new GridHelper(cellSize * divisions, divisions, '#638ba9', '#4c6a85');
  grid.position.y = height;
  grid.material.transparent = true;
  grid.material.opacity = .78;
  grid.material.depthWrite = false;
  scene.add(grid);
}
