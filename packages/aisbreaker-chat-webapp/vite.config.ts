import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
//const vue = require('@vitejs/plugin-vue').default
import { VitePWA } from 'vite-plugin-pwa'
//import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
//const VueI18nPlugin  require('@intlify/unplugin-vue-i18n/vite').default
//import { resolve, dirname } from 'node:path'
//import { fileURLToPath } from 'url'

function setupPlugins(env: ImportMetaEnv): PluginOption[] {
  return [
    vue(),
    //VueI18nPlugin({
      /* options */
      // locale messages resource pre-compile option
      //include: resolve(dirname(fileURLToPath(import.meta.url)), './src/locales/**'),
    //}),
    env.VITE_GLOB_APP_PWA === 'true' && VitePWA({
      injectRegister: 'auto',
      manifest: {
        name: 'chatGPT',
        short_name: 'chatGPT',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ]
}

export default defineConfig((env) => {
  const viteEnv = loadEnv(env.mode, process.cwd()) as unknown as ImportMetaEnv

  return {
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    plugins: setupPlugins(viteEnv),
    server: {
      host: '127.0.0.1',
      port: 5002,
      open: false,
      proxy: {
        '/api': {
          target: viteEnv.VITE_APP_API_BASE_URL,
          changeOrigin: true, // Allow cross-origin requests
          rewrite: path => path.replace('/api/', '/'),
        },
      },
    },
    build: {
      reportCompressedSize: false,
      sourcemap: false,
      commonjsOptions: {
        ignoreTryCatch: false,
      },
    },
  }
})
