import { computed } from 'vue'
import { deDE, enUS, ruRU, koKR, zhCN, zhTW } from 'naive-ui'
import { useAppStore } from '@/store/index.js'
import { setLocale } from '@/locales/index.js'

export function useLanguage() {
  const appStore = useAppStore()

  const language = computed(() => {
    switch (appStore.language) {
      case 'de-DE':
        setLocale('de-DE')
        return deDE
      case 'en-US':
        setLocale('en-US')
        return enUS
      case 'ru-RU':
        setLocale('ru-RU')
        return ruRU
      case 'ko-KR':
        setLocale('ko-KR')
        return koKR
      case 'zh-CN':
        setLocale('zh-CN')
        return zhCN
      case 'zh-TW':
        setLocale('zh-TW')
        return zhTW
      default:
        setLocale('en-US')
        return enUS
    }
  })

  return { language }
}
