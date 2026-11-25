import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';

// One codebase, two build targets. BUILD_TARGET=public|internal picks which pages exist.
const target = process.env.BUILD_TARGET === 'internal' ? 'internal' : 'public';

const routes = {
  public: [
    ['/', './src/targets/public/index.astro'],
    ['/services', './src/targets/public/services.astro'],
    ['/vitals', './src/targets/public/vitals.astro'],
    ['/hardware', './src/targets/public/hardware.astro'],
    ['/stories', './src/targets/public/stories.astro'],
    ['/about', './src/targets/public/about.astro'],
    ['/data/public.json', './src/targets/public/data.ts'],
  ],
  internal: [
    ['/', './src/targets/internal/index.astro'],
    ['/services', './src/targets/internal/services.astro'],
    ['/health', './src/targets/internal/health.astro'],
    ['/ops', './src/targets/internal/ops.astro'],
    ['/login', './src/targets/internal/login.astro'],
    ['/auth/enroll', './src/targets/internal/enroll.astro'],
    ['/settings', './src/targets/internal/settings/index.astro'],
    ['/settings/appearance', './src/targets/internal/settings/appearance.astro'],
    ['/settings/home', './src/targets/internal/settings/home.astro'],
    ['/settings/notifications', './src/targets/internal/settings/notifications.astro'],
    ['/settings/security', './src/targets/internal/settings/security.astro'],
    ['/boot.js', './src/targets/internal/boot-js.ts'],
    ['/boot-init.js', './src/targets/internal/boot-init-js.ts'],
    ['/svc-icons.css', './src/targets/internal/svc-icons-css.ts'],
    ['/data/internal.json', './src/targets/internal/data.ts'],
  ],
};

const targetRoutes = {
  name: 'target-routes',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      for (const [pattern, entrypoint] of routes[target]) injectRoute({ pattern, entrypoint });
    },
    // The internal portal makes no cross-origin requests, so it carries its own copy of the backdrops.
    'astro:build:done': ({ dir }) => {
      if (target !== 'internal') return;
      const out = path.join(new URL(dir).pathname, 'backdrops');
      fs.cpSync('./public/backdrops', out, { recursive: true });
    },
  },
};

export default defineConfig({
  outDir: `./dist-${target}`,
  publicDir: target === 'public' ? './public' : './public-internal',
  site: target === 'public' ? 'https://nairbn.github.io' : undefined,
  integrations: [targetRoutes],
  devToolbar: { enabled: false },
  // The internal portal runs under a strict CSP (style-src 'self', script-src 'self'): never inline styles or scripts there.
  build: { assets: '_assets', inlineStylesheets: target === 'internal' ? 'never' : 'auto' },
  vite: { define: { __TARGET__: JSON.stringify(target) }, ...(target === 'internal' ? { build: { assetsInlineLimit: 0 } } : {}) },
});
