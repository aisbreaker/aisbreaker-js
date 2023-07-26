import { defineStore } from 'pinia'
import type { PromptStore } from './helper.js'
import { getLocalPromptList, setLocalPromptList } from './helper.js'

export const usePromptStore = defineStore('prompt-store', {
  state: (): PromptStore => getLocalPromptList(),

  actions: {
    updatePromptList(promptList: []) {
      this.$patch({ promptList })
      setLocalPromptList({ promptList })
    },
    getPromptList() {
      return this.$state
    },
  },
})
