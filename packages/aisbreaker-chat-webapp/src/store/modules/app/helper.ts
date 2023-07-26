import { ss } from '@/utils/storage/index.js'

const LOCAL_NAME = 'appSetting'

export type Theme = 'light' | 'dark' | 'auto'

export type Language = 'de-DE' | 'en-US' | 'zh-CN' | 'zh-TW' | 'ko-KR' | 'ru-RU'

export interface AppState {
  siderCollapsed: boolean
  theme: Theme
  language: Language
}

export function defaultSetting(): AppState {
  return { siderCollapsed: false, theme: 'light', language: 'en-US' }
}

export function getLocalSetting(): AppState {
  const localSetting: AppState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalSetting(setting: AppState): void {
  ss.set(LOCAL_NAME, setting)
}
