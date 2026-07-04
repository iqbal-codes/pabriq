import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import neon from './neon-vite-plugin.ts'
import { tanstackSerwistPlugin } from './src/tanstack-serwist-plugin.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const browserPolyfills = (): Plugin => ({
  name: 'browser-polyfills',
  enforce: 'pre',
  resolveId(
    source: string,
    _importer: string | undefined,
    options: { ssr?: boolean },
  ) {
    if (options?.ssr) {
      return null
    }
    if (
      source === 'node:stream' ||
      source === 'node:stream/web' ||
      source === 'node:async_hooks'
    ) {
      return path.resolve(__dirname, 'src/lib/node-polyfills-stub.ts')
    }
    return null
  },
})

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const neonLaunchpad =
    env.NEON_LAUNCHPAD_DISABLED === 'true' || !env.DATABASE_URL
      ? { name: 'neon-launchpad-disabled' }
      : neon
  return {
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      target: 'es2022',
    },
    server: {
      allowedHosts: true,
    },
    plugins: [
      browserPolyfills(),
      devtools(),
      neonLaunchpad,
      tailwindcss(),
      tanstackStart(),
      tanstackSerwistPlugin(),
      viteReact(),
    ],
  }
})

export default config
