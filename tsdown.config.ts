import { defineConfig } from 'tsdown'

const loaderBanner = "window.__ModuleLoader__.load({ id: 'dsh-skill-manager', factory: (require) => {"
const loaderFooter = 'return module.exports; } });'

/** Standalone build: the browser face is a lazy CommonJS closure for DSH ModuleLoader. */
export default defineConfig([
  {
    entry: { index: 'src/index.ts', invariant: 'src/invariant.ts' },
    outDir: 'lib', format: ['esm'], platform: 'node', tsconfig: 'tsconfig.host.json', dts: false, clean: false,
    external: [/^@deepseek-ai\//, 'fflate', 'yaml'],
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib', format: ['cjs'], platform: 'browser', tsconfig: 'tsconfig.client.json', dts: false, clean: false,
    noExternal: [/^@deepseek-ai\//, 'fflate', 'yaml'],
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: loaderBanner,
      footer: loaderFooter,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
