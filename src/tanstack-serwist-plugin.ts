import path from 'node:path'
import { injectManifest } from '@serwist/build'
import { build, type Plugin } from 'vite'

export function tanstackSerwistPlugin(): Plugin {
  let rootDir = process.cwd()
  let isProduction = false
  let hasBuiltServiceWorker = false

  return {
    name: 'tanstack-serwist-plugin',
    configResolved(config) {
      rootDir = config.root
      isProduction = config.isProduction
    },
    async closeBundle() {
      if (!isProduction || hasBuiltServiceWorker) {
        return
      }

      hasBuiltServiceWorker = true

      const outDir = path.resolve(rootDir, 'dist', 'client')
      const swSrc = path.resolve(rootDir, 'src', 'sw.ts')
      const swDest = path.resolve(outDir, 'sw.js')

      try {
        await build({
          root: rootDir,
          configFile: false,
          mode: 'production',
          define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
          },
          build: {
            lib: {
              entry: swSrc,
              formats: ['es'],
              fileName: () => 'sw.js',
            },
            outDir,
            emptyOutDir: false,
            minify: true,
            rollupOptions: {
              output: {
                entryFileNames: 'sw.js',
              },
            },
          },
          logLevel: 'error',
        })

        await injectManifest({
          swSrc: swDest,
          swDest,
          globDirectory: outDir,
          globPatterns: [
            '**/*.{js,css,html,png,svg,ico,json,webmanifest,woff,woff2}',
          ],
          globIgnores: ['sw.js'],
          injectionPoint: 'self.__SW_MANIFEST',
        })

        console.log('Built service worker at dist/client/sw.js')
      } catch (error) {
        console.error('Failed to build service worker', error)
        throw error
      }
    },
  }
}
