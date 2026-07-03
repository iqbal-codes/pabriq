import path from 'node:path'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// SAFETY: Ensure tests run via `bun run test` which uses load-env-test
if (!process.env.VITEST_FROM_SCRIPT) {
  console.error(
    '\n❌ SAFETY ABORT: Running vitest directly is not allowed!',
  )
  console.error(
    '   Use `bun run test` to ensure correct database environment.\n',
  )
  process.exit(1)
}

export default defineConfig({
  plugins: [viteReact()],
  test: {
    fileParallelism: false,
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.output', '.agents'],
  },
  resolve: {
    alias: {
      '#': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
