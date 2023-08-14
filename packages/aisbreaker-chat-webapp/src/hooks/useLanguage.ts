import { computed } from 'vue'
import { deDE, enUS, ruRU, koKR, viVN, zhCN, zhTW } from 'naive-ui'
import { useAppStore } from '@/store/index.js'
import { setLocale } from '@/locales/index.js'

export function useLanguage() {
  const appStore = useAppStore()

  /** See also: src/locales/index.ts + store/modules/app/helper.js */
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
      case 'vi-VN':
        setLocale('vi-VN')
        return viVN
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
