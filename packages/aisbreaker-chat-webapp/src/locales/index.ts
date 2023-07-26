import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import deDE from './de-DE.js'
import enUS from './en-US.js'
import koKR from './ko-KR.js'
import zhCN from './zh-CN.js'
import zhTW from './zh-TW.js'
import ruRU from './ru-RU.js'
import { useAppStoreWithOut } from '@/store/modules/app/index.js'
import type { Language } from '@/store/modules/app/helper.js'

const appStore = useAppStoreWithOut()

const defaultLocale = appStore.language || 'en-US'

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'en-US',
  allowComposition: true,
  messages: {
    'de-DE': deDE,
    'en-US': enUS,
    'ko-KR': koKR,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'ru-RU': ruRU,
  },
})

export const t = i18n.global.t

export function setLocale(locale: Language) {
  i18n.global.locale = locale
}

export function setupI18n(app: App) {
  app.use(i18n)
}

export default i18n
