import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales/index.js'
import { setupAssets, setupScrollbarStyle } from './plugins/index.js'
import { setupStore } from './store/index.js'
import { setupRouter } from './router/index.js'
import VueGtag from 'vue-gtag'

// usage statistics
const DEFAULT_GA_MEASUREMENT_ID = 'G-Z1X0FSZ2Y0'
const gaMeasurementId: string | undefined = undefined

async function bootstrap() {
  const app = createApp(App)

  setupAssets()

  setupScrollbarStyle()

  setupStore(app)

  setupI18n(app)

  await setupRouter(app)

  app.use(VueGtag, {
    // initialize usage statistics
    config: { id: gaMeasurementId || DEFAULT_GA_MEASUREMENT_ID }
  }).mount("#app")
}

bootstrap()
