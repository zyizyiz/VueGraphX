import { createCuboidSolidTopology } from './src/architecture/shapes/internal/solidTopology';

const edgeSize = 100;
const topology = createCuboidSolidTopology({ width: edgeSize, height: edgeSize, depth: edgeSize });

topology.patches.forEach(p => {
  if (p.kind === 'polygon') {
    console.log(`Face: ${p.id}`);
    p.folded.vertices.forEach((v, i) => {
      console.log(`  V${i}: (${v.x}, ${v.y}, ${v.z})`);
    });
  }
});

