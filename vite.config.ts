import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isBuildPlayground = process.env.BUILD_MODE === 'playground';
  const isPlayground = isServe || isBuildPlayground;

  return {
    plugins: [
      vue(),
      ...(!isPlayground ? [dts({ rollupTypes: true })] : [])
    ],
    resolve: {
      alias: {
        'vuegraphx': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      open: true,
    },
    // Playground 构建
    // 库构建：lib 模式输出 ESM + UMD
    ...(isPlayground ? { base: '/VueGraphX/' } : {}),
    build: isPlayground
      ? {
          outDir: 'dist-playground',
          emptyOutDir: true,
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
