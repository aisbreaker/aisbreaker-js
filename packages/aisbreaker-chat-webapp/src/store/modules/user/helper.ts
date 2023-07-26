import { ss } from '@/utils/storage/index.js'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
  description: string
}

export interface UserState {
  userInfo: UserInfo
}

export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: 'https://raw.githubusercontent.com/aisbreaker/aisbreaker-js/main/packages/aisbreaker-chat-webapp/src/assets/logo.svg',
      name: 'AIsBreaker Chat',
      description: 'WebApp code on <a href="https://github.com/aisbreaker/aisbreaker-js/packages/aisbreaker-chat-webapp/" class="text-blue-500" target="_blank">GitHub</a>',
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
