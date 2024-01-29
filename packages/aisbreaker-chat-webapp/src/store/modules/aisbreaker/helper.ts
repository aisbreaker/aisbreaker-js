import { ss } from '@/utils/storage/index.js'
import /*type*/ { api } from 'aisbreaker-api-js'
import {
  defaultApiURL,
  defaultAIsServicePropsTemplateName,
  getAIsServicePropsTemplateByName,
  defaultAisSystemPrompt,
  defaultAisCreativity,
} from './defaults.js'
import YAML from 'yaml'

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
  let defaultPropsStr = getAIsServicePropsTemplateByName(defaultName)?.servicePropsStr
  const {aisServiceProps, parseError} = parseAisServicePropsStr(defaultPropsStr)
  if (parseError) {
    defaultPropsStr = "# ERROR: " + parseError + "\n\n" + defaultPropsStr
  }
  return { 
    apiURL: defaultApiURL,
    aisServicePropsTemplateName: defaultName,
    aisServicePropsStr: defaultPropsStr,
    aisServiceProps: aisServiceProps,
    aisAccessToken: undefined,
    aisSystemPrompt: defaultAisSystemPrompt,
    aisCreativity: defaultAisCreativity,
  }
}

export function parseAisServicePropsStr(aisServicePropsStr: string | undefined): 
  {aisServiceProps: api.AIsServiceProps | undefined, parseError: string | undefined} {
  try {
    const props = YAML.parse(aisServicePropsStr || '')
    if (api.isAIsServiceProps(props)) {
      // is a valid object
      return {
        aisServiceProps: props,
        parseError: undefined,
      }
    } else {
      // is an INVALID object
      return {
        aisServiceProps: undefined,
        parseError: 'Invalid AIsServiceProps object (valid JSON/YAML, but properties are missing)',
      }
    }
  } catch (e: any) {
    // string could't be parsed
    //console.log(e)
    return {
      aisServiceProps: undefined,
      parseError: 'Invalid JSON/YAML: ' + (e?.message || ''),
    }
  }
}


export function getLocalSetting(): AisbreakerState {
  const localSetting: AisbreakerState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalSetting(setting: AisbreakerState): void {
  ss.set(LOCAL_NAME, setting)
}
