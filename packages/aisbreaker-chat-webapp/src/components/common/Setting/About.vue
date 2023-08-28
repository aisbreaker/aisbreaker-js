<script setup lang='ts'>
import { computed, onMounted, ref } from 'vue'
import { NSpin } from 'naive-ui'
import { fetchChatConfig } from '@/api/index.js'
import pkg from '@/../package.json'
import { useAisbreakerStore, useAuthStore } from '@/store/index.js'
import { t } from '@/locales/index.js'

interface ConfigState {
  timeoutMs?: number
  reverseProxy?: string
  apiModel?: string
  socksProxy?: string
  httpsProxy?: string
  usage?: string
}

const loading = ref(false)

/*
const authStore = useAuthStore()

const config = ref<ConfigState>()

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

async function fetchConfig() {
  try {
    loading.value = true
    const { data } = await fetchChatConfig<ConfigState>()
    config.value = data
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchConfig()
})
*/

const aisbreakerStore = useAisbreakerStore()

const apiURL = computed({
  get(): string {
    return aisbreakerStore.apiURL
  },
  set(value: string) {
    throw new Error("Not implemented: apiURL.set() should now be called here")
  },
})


</script>

<template>
  <NSpin :show="loading">
    <div class="p-4 space-y-4">
      <h2 class="text-xl font-bold">
        AIsBreaker Chat Webapp - Version {{ pkg.version }}
      </h2>
      <div class="p-2 space-y-2 rounded-md bg-neutral-100 dark:bg-neutral-700">
        <p>
          This project is open source on
          <a
            class="text-blue-600 dark:text-blue-500"
            href="https://github.com/aisbreaker/aisbreaker-js/"
            target="_blank"
          >
            GitHub
          </a>
          , free and based on the MIT license, with no form of payment required!
        </p>
        <p>
          If you find this project helpful, please give us a Star on GitHub and spread the work, thank you!
        </p>
      </div>
      <p>{{ t("setting.api") }}：{{ apiURL }}</p>

      <!--
      <p>{{ t("setting.api") }}：{{ config?.apiModel ?? '-' }}</p>
      <p v-if="isChatGPTAPI">
        {{ t("setting.monthlyUsage") }}：{{ config?.usage ?? '-' }}
      </p>
      <p v-if="!isChatGPTAPI">
        {{ t("setting.reverseProxy") }}：{{ config?.reverseProxy ?? '-' }}
      </p>
      <p>{{ t("setting.timeout") }}：{{ config?.timeoutMs ?? '-' }}</p>
      <p>{{ t("setting.socks") }}：{{ config?.socksProxy ?? '-' }}</p>
      <p>{{ t("setting.httpsProxy") }}：{{ config?.httpsProxy ?? '-' }}</p>
    -->
    </div>
  </NSpin>
</template>
