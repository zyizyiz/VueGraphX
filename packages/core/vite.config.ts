import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueGraphXCore',
      fileName: 'vuegraphx-core',
      formats: ['es', 'umd']
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
  },
  plugins: [
    dts({ rollupTypes: true })
  ]
});
