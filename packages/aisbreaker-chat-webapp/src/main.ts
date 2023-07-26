import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales/index.js'
import { setupAssets, setupScrollbarStyle } from './plugins/index.js'
import { setupStore } from './store/index.js'
import { setupRouter } from './router/index.js'

async function bootstrap() {
  const app = createApp(App)
  setupAssets()

  setupScrollbarStyle()

  setupStore(app)

  setupI18n(app)

  await setupRouter(app)

  app.mount('#app')
}

bootstrap()
