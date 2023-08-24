import { ss } from '@/utils/storage/index.js'
import type { api } from 'aisbreaker-api-js'
import {
  defaultApiURL,
  defaultAIsServicePropsTemplateName,
  getAIsServicePropsTemplateByName,
  defaultAisSystemPrompt,
  defaultAisCreativity,
} from './defaults.js'

const LOCAL_NAME = 'aisbreakerSetting'


export interface AisbreakerState {
  apiURL: string
  aisServicePropsTemplateName?: string
  aisServicePropsStr?: string
  aisServiceProps?: api.AIsServiceProps
  aisAccessToken?: string

  aisSystemPrompt?: string
  aisCreativity?: number
}

export function defaultSetting(): AisbreakerState {
  const defaultName = defaultAIsServicePropsTemplateName
  const defaultProps = getAIsServicePropsTemplateByName(defaultName)?.serviceProps
  return { 
    apiURL: defaultApiURL,
    aisServicePropsTemplateName: defaultName,
    aisServicePropsStr: JSON.stringify(defaultProps, null, 2),
    aisServiceProps: defaultProps,
    aisAccessToken: undefined,
    aisSystemPrompt: defaultAisSystemPrompt,
    aisCreativity: defaultAisCreativity,
  }
}

export function getLocalSetting(): AisbreakerState {
  const localSetting: AisbreakerState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalSetting(setting: AisbreakerState): void {
  ss.set(LOCAL_NAME, setting)
}
