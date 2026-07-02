import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import neon from './neon-vite-plugin.ts'

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const neonLaunchpad =
    env.NEON_LAUNCHPAD_DISABLED === 'true' || !env.DATABASE_URL
      ? { name: 'neon-launchpad-disabled' }
      : neon

  return {
    resolve: { tsconfigPaths: true },
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
