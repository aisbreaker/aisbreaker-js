import { defineStore } from 'pinia'
import type { AisbreakerState } from './helper.js'
import { getLocalSetting, setLocalSetting } from './helper.js'
import { getAIsServicePropsTemplateByName } from './defaults.js'
import { store } from '@/store/index.js'
import { api } from 'aisbreaker-api-js'
import YAML from 'yaml'


export const useAisbreakerStore = defineStore('aisbreaker-store', {
  state: (): AisbreakerState => getLocalSetting(),
  actions: {
    setApiURL(url: string) {
      if (this.apiURL !== url) {
        this.apiURL = url
        this.recordState()
      }
    },

    /** @return true is changes; false if unchanged */
    setAIsServicePropsTemplateName(name: string | undefined): boolean {
      if (this.aisServicePropsTemplateName !== name) {
        this.aisServicePropsTemplateName = name
        this.aisServiceProps = getAIsServicePropsTemplateByName(name)?.serviceProps
        this.aisServicePropsStr = JSON.stringify(this.aisServiceProps, null, 2)
        this.recordState()
        return true
      }
      return false
    },

    /** @return parse error message in case of an error; undefined if valid */
    setAIsServicePropsStr(propsStr: string | undefined): string | undefined {
      // check and parse
      if (this.aisServicePropsStr !== propsStr) {
        try {
          this.aisServicePropsTemplateName = undefined
          this.aisServicePropsStr = propsStr
          this.recordState()

          const props = YAML.parse(propsStr || '')
          if (api.isAIsServiceProps(props)) {
            // is a valid object
            return undefined
          } else {
            // is an INVALID object
            return 'Invalid AIsServiceProps object (valid JSON/YAML, but properties are missing)'
          }
        } catch (e: any) {
          // string could't be parsed
          //console.log(e)
          return 'Invalid JSON/YAML: ' + (e?.message || '')
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
