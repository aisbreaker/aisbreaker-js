<script lang="ts" setup>
import { computed, } from 'vue'
import { NButton, NInput, NSlider, useMessage } from 'naive-ui'
import { useAisbreakerStore } from '@/store/index.js'
import { defaultSetting } from '@/store/modules/aisbreaker/helper.js'
import { t } from '@/locales/index.js'


const aisbreakerStore = useAisbreakerStore()
const ms = useMessage()

const aisSystemPrompt = computed<string>({
  get() {
    return aisbreakerStore.aisSystemPrompt || ''
  },
  set(value: string) {
    aisbreakerStore.setAIsSystemPrompt(value)
  },
})
const aisCreativity = computed<number>({
  get() {
    return aisbreakerStore.aisCreativity || 0
  },
  set(value: number /*string*/) {
    aisbreakerStore.setAIsCreativity(value /*Number(value)*/)
  },
})

function handleReset() {
  const defaults = defaultSetting()
  aisbreakerStore.setAIsSystemPrompt(defaults.aisSystemPrompt)
  aisbreakerStore.setAIsCreativity(defaults.aisCreativity)
  ms.success(t('common.success'))
  //window.location.reload()
}
</script>

<template>
  <div class="p-4 space-y-5 min-h-[200px]">
    <div class="space-y-6">

      <!-- System prompt -->
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ t('setting.systemPrompt') }} </span>
        <div class="flex-1">
          <NInput v-model:value="aisSystemPrompt" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="< cannot be set at the moment >" 
            disabled />
        </div>
        <!--
        <NButton size="tiny" text type="primary" @click="updateSettings({ systemPrompt })">
          {{ t('common.save') }}
        </NButton>
        -->
      </div>

      <!-- Creativity -->
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ t('setting.creativity') }} </span>
        <div class="flex-1">
          <NSlider v-model:value="aisCreativity" :min="-1" :max="1"  :step="0.1" disabled />
        </div>
        <span>{{ aisCreativity }}</span>
        <!--
        <NButton size="tiny" text type="primary" @click="updateSettings({ temperature })">
          {{ t('common.save') }}
        </NButton>
        -->
      </div>

      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">&nbsp;</span>
        <NButton size="small" @click="handleReset">
          {{ t('common.resetToDefaults') }}
        </NButton>
      </div>

    </div>
  </div>
</template>
