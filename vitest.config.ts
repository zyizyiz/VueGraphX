import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'vuegraphx': resolve(__dirname, './src/index.ts'),
      '@vuegraphx/core': resolve(__dirname, './packages/core/src/index.ts'),
      '@vuegraphx/math': resolve(__dirname, './packages/math/src/index.ts'),
      '@vuegraphx/commands': resolve(__dirname, './packages/commands/src/index.ts'),
      '@vuegraphx/vue': resolve(__dirname, './packages/vue/src/index.ts'),
      '@vuegraphx/backend-jsxgraph': resolve(__dirname, './packages/backend-jsxgraph/src/index.ts'),
      '@vuegraphx/backend-babylon': resolve(__dirname, './packages/backend-babylon/src/index.ts'),
      '@vuegraphx/backend-canvas2d': resolve(__dirname, './packages/backend-canvas2d/src/index.ts'),
      '@vuegraphx/backend-pixi': resolve(__dirname, './packages/backend-pixi/src/index.ts'),
      '@vuegraphx/backend-fabric': resolve(__dirname, './packages/backend-fabric/src/index.ts'),
      '@vuegraphx/backend-konva': resolve(__dirname, './packages/backend-konva/src/index.ts'),
      '@vuegraphx/backend-three': resolve(__dirname, './packages/backend-three/src/index.ts')
    }
  },
  test: {
    environment: 'jsdom'
  }
});
