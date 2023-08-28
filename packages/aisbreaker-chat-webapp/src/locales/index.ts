import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import deDE from './de-DE.js'
import enUS from './en-US.js'
import koKR from './ko-KR.js'
import ruRU from './ru-RU.js'
import viVN from './vi-VN.js'
import zhCN from './zh-CN.js'
import zhTW from './zh-TW.js'
import type { Language } from '@/store/modules/app/helper.js'

// reduce imports to avoid cyclic dependencies/startup problems:
//import { useAppStoreWithOut } from '@/store/modules/app/index.js'
//const appStore = useAppStoreWithOut()
//const defaultLocale = appStore.language || 'en-US'
const defaultLocale = 'en-US'

/** See also: store/modules/app/helper.js + src/hooks/useLanguage.ts */
const i18n = createI18n({
  locale: defaultLocale,
  //legacy: false,
  fallbackLocale: 'en-US',
  allowComposition: true,
  messages: {
    'de-DE': deDE,
    'en-US': enUS,
    'ko-KR': koKR,
    'ru-RU': ruRU,
    'vi-VN': viVN,
    'zh-CN': zhCN,
    'zh-TW': zhTW,
  },
})
/** See also: store/modules/app/helper.js + src/hooks/useLanguage.ts */
export const languageOptions: { label: string; key: Language; value: Language }[] = [
  { label: 'Deutsch', key: 'de-DE', value: 'de-DE' },
  { label: 'English', key: 'en-US', value: 'en-US' },
  { label: '한국어', key: 'ko-KR', value: 'ko-KR' },
  { label: 'Русский язык', key: 'ru-RU', value: 'ru-RU' },
  { label: 'Tiếng Việt', key: 'vi-VN', value: 'vi-VN' },
  { label: '简体中文', key: 'zh-CN', value: 'zh-CN' },
  { label: '繁體中文', key: 'zh-TW', value: 'zh-TW' },
]


export const t = i18n.global.t

export function setLocale(locale: Language) {
  i18n.global.locale = locale
}

export function setupI18n(app: App) {
  app.use(i18n)
}

export default i18n
