import { defineConfig } from 'astro/config';

// One codebase, two build targets. BUILD_TARGET=public|internal picks which pages exist.
const target = process.env.BUILD_TARGET === 'internal' ? 'internal' : 'public';

const routes = {
  public: [
    ['/', './src/targets/public/index.astro'],
    ['/data/public.json', './src/targets/public/data.ts'],
  ],
  internal: [
    ['/', './src/targets/internal/index.astro'],
    ['/data/internal.json', './src/targets/internal/data.ts'],
  ],
};

const targetRoutes = {
  name: 'target-routes',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      for (const [pattern, entrypoint] of routes[target]) injectRoute({ pattern, entrypoint });
    },
  },
};

export default defineConfig({
  outDir: `./dist-${target}`,
  publicDir: target === 'public' ? './public' : './public-internal',
  site: target === 'public' ? 'https://nairbn.github.io' : undefined,
  integrations: [targetRoutes],
  devToolbar: { enabled: false },
  build: { assets: '_assets', inlineStylesheets: 'auto' },
  vite: { define: { __TARGET__: JSON.stringify(target) } },
});
