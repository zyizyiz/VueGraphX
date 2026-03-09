import { cuboidFaceIds } from './src/architecture/shapes/internal/solidTopology';
import { getCuboidFaceMap } from './src/architecture/shapes/internal/solidTopology';

const faces = getCuboidFaceMap(100);
cuboidFaceIds.forEach(id => {
  const points = faces[id].folded.vertices;
  const p0 = points[0];
  const p1 = points[1];
  const p2 = points[2];
  
  const v1 = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z];
  const v2 = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z];
  
  let nx = v1[1] * v2[2] - v1[2] * v2[1];
  let ny = v1[2] * v2[0] - v1[0] * v2[2];
  let nz = v1[0] * v2[1] - v1[1] * v2[0];
  
  const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
  console.log(`Face ${id} normal: [${nx/len}, ${ny/len}, ${nz/len}]`);
});
