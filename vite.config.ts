import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isBuildPlayground = process.env.BUILD_MODE === 'playground';
  const isPlayground = isServe || isBuildPlayground;
  const playgroundBase = process.env.VITE_BASE_PATH || '/VueGraphX/';
  const playgroundInputs = {
    main: resolve(__dirname, 'index.html'),
    allCommands: resolve(__dirname, 'test-vuegraphx-all-commands.html')
  };

  return {
    plugins: [
      vue(),
      ...(!isPlayground ? [dts({ rollupTypes: true })] : [])
    ],
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
        '@vuegraphx/backend-three': resolve(__dirname, './packages/backend-three/src/index.ts'),
      },
    },
    server: {
      port: 5174,
      open: true,
    },
    // Playground 构建
    // 库构建：lib 模式输出 ESM + UMD
    ...(isBuildPlayground ? { base: playgroundBase } : {}),
    build: isPlayground
      ? {
          outDir: 'dist-playground',
          emptyOutDir: true,
          rollupOptions: {
            input: playgroundInputs
          }
        }
      : {
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'VueGraphX',
            fileName: 'vuegraphx',
            formats: ['es', 'umd'] as any
          },
          rollupOptions: {
            external: ['vue', 'jsxgraph', 'mathjs', 'nerdamer', 'katex'],
            output: {
              globals: {
                vue: 'Vue',
                jsxgraph: 'JXG',
                mathjs: 'math',
                nerdamer: 'nerdamer',
                katex: 'katex'
              }
            }
          }
        }
  };
});
