import { fileURLToPath, URL } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

// Chromium refuses to start when its config dir is unwritable (and raises a blocking dialog),
// which is the case under a sandbox that mounts $HOME read-only. Keep config + cache in the
// writable temp dir instead. env replaces process.env, so carry it over explicitly.
const browserConfigDir = join(tmpdir(), 'dsh-browser-config')
const browserEnv = {
  ...process.env,
  XDG_CONFIG_HOME: browserConfigDir,
  XDG_CACHE_HOME: browserConfigDir,
}

export default defineConfig({
  // keep in sync with vite.config.ts/vitest.config.ts, or an `@/…` import resolves in the app
  // but not under this browser test run
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    // this config runs the DOM tests only, the mirror of vitest.config.ts's
    // `exclude: [..., "**/*.dom.test.ts"]`. Without it a bare run of this config also drags the
    // node-environment suites into the browser, where their node-only imports fail.
    include: ['**/*.dom.test.ts'],
    browser: {
      enabled: true,
      // CHROMIUM_PATH: point at a system-installed browser (e.g. NixOS, where Playwright's own
      // downloaded chromium is dynamically linked against libs the sandbox doesn't have).
      // Unset elsewhere (CI, other machines) so Playwright uses its own managed browser.
      provider: playwright({
        launchOptions: {
          env: browserEnv,
          ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
        },
      }),
      // https://vitest.dev/config/browser/playwright
      instances: [
        { name: 'chromium', browser: 'chromium' },
      ],
      locators: {
        testIdAttribute: 'id',
      },
    },
  },
})
