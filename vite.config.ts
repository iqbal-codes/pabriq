import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import neon from './neon-vite-plugin.ts'

const config = defineConfig(({ mode, ssrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const neonLaunchpad =
    env.NEON_LAUNCHPAD_DISABLED === 'true' || !env.DATABASE_URL
      ? { name: 'neon-launchpad-disabled' }
      : neon

  const alias = !ssrBuild
    ? [
        {
          find: /^node:stream$/,
          replacement: './src/lib/node-polyfills-stub.ts',
        },
        {
          find: /^node:stream\/web$/,
          replacement: './src/lib/node-polyfills-stub.ts',
        },
        {
          find: /^node:async_hooks$/,
          replacement: './src/lib/node-polyfills-stub.ts',
        },
      ]
    : []

  return {
    resolve: {
      tsconfigPaths: true,
      alias,
    },
    build: {
      target: 'es2022',
    },
    server: {
      allowedHosts: true,
    },
    plugins: [
      devtools(),
      neonLaunchpad,
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  }
})

export default config
