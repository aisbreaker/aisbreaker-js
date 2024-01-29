import { defineStore } from 'pinia'
import type { AisbreakerState } from './helper.js'
import { getLocalSetting, parseAisServicePropsStr, setLocalSetting } from './helper.js'
import { getAIsServicePropsTemplateByName } from './defaults.js'
import { store } from '@/store/index.js'
import { api } from 'aisbreaker-api-js'


export const useAisbreakerStore = defineStore('aisbreaker-store', {
  state: (): AisbreakerState => getLocalSetting(),
  actions: {
    setApiURL(url: string) {
      if (this.apiURL !== url) {
        this.apiURL = url
        this.recordState()
      }
    },

    /** @return true/false if changed/unchanged, potential parese error message when parsing default aisServiceProps */
    setAIsServicePropsTemplateName(name: string | undefined): {changed: boolean, errorMsg: string|undefined} {
      if (this.aisServicePropsTemplateName !== name) {
        this.aisServicePropsStr = getAIsServicePropsTemplateByName(name)?.servicePropsStr //JSON.stringify(this.aisServiceProps, null, 2)
        const {aisServiceProps, parseError} = parseAisServicePropsStr(this.aisServicePropsStr)
        this.aisServiceProps = aisServiceProps
        this.aisServicePropsTemplateName = name
        this.recordState()
        return {
          changed: true,
          errorMsg: parseError,
        }
      }
      return {
        changed: false,
        errorMsg: undefined,
      }
    },

    /** @return parse error message in case of an error; undefined if valid */
    setAIsServicePropsStr(propsStr: string | undefined): string | undefined {
      // check and parse
      if (this.aisServicePropsStr !== propsStr) {
        const {aisServiceProps, parseError} = parseAisServicePropsStr(propsStr)

        this.aisServicePropsTemplateName = undefined
        this.aisServicePropsStr = propsStr
        this.aisServiceProps = aisServiceProps
        this.recordState()

        if (aisServiceProps) {
          // is a valid object
          return undefined
        } else {
          // is an INVALID object
          return parseError
        }
      }
      // nothing changed
      console.log('setAIsServicePropsStr(): nothing changed')
    },

    setAIsAccessToken(aisAccessToken: string | undefined) {
      if (this.aisAccessToken !== aisAccessToken) {
        this.aisAccessToken = aisAccessToken
        this.recordState()
      }
    },


    setAIsSystemPrompt(aisSystemPrompt: string | undefined) {
      if (this.aisSystemPrompt !== aisSystemPrompt) {
        this.aisSystemPrompt = aisSystemPrompt
        this.recordState()
      }
    },

    setAIsCreativity(aisCreativity: number | undefined) {
      if (this.aisCreativity !== aisCreativity) {
        this.aisCreativity = aisCreativity
        this.recordState()
      }
    },


    recordState() {
      setLocalSetting(this.$state)
    },
  },
})

export function useAisbreakerStoreWithOut() {
  return useAisbreakerStore(store)
}
