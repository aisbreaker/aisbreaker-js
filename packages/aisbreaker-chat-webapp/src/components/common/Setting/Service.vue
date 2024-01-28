<script lang="ts" setup>
import { VNode, computed, h, onMounted, ref } from 'vue'
import { NButton, NInput, NSelect, NText, SelectOption, useMessage, NTooltip } from 'naive-ui'
import { useAisbreakerStore } from '@/store/index.js'
import { defaultSetting } from '@/store/modules/aisbreaker/helper.js'
import { t } from '@/locales/index.js'
import { allAIsServicePropsTemplateNameOptions } from '@/store/modules/aisbreaker/defaults.js'


const aisbreakerStore = useAisbreakerStore()
const ms = useMessage()

const apiURL = computed({
  get(): string {
    return aisbreakerStore.apiURL
  },
  set(value: string) {
    aisbreakerStore.setApiURL(value)
  },
})
const aisServicePropsTemplateName = computed<string>({
  get(): string {
    return aisbreakerStore.aisServicePropsTemplateName || '< Custom >'
  },
  set(value: string) {
    const {changed, errorMsg} = aisbreakerStore.setAIsServicePropsTemplateName(value)
    if (errorMsg) {
      console.log("Validation Error from template: ", errorMsg)
      aisServicePropsStrValidationStatus.value = 'error'
      aisServicePropsStrValidationErrorMsg.value = errorMsg //.replace('\n', ' ')
    }
    if (changed) {
      revalidateFields()
    }
  },
})
const aisServicePropsStrValidationErrorMsg = ref<string | undefined>(undefined)
const aisServicePropsStrValidationStatus = ref<'success' | 'warning' | 'error' | undefined>(undefined)
const aisServicePropsStr = computed<string>({
  get(): string {
    return aisbreakerStore.aisServicePropsStr || defaultSetting().aisServicePropsStr || '{}'
  },
  set(value: string) {
    const validationError = aisbreakerStore.setAIsServicePropsStr(value)

    if (validationError) {
      console.log("Validation Error: ", validationError)
      aisServicePropsStrValidationStatus.value = 'error'
      aisServicePropsStrValidationErrorMsg.value = validationError //.replace('\n', ' ')
    } else {
      aisServicePropsStrValidationStatus.value = undefined
      aisServicePropsStrValidationErrorMsg.value = undefined
    }
  },
})
const aisAccessToken = computed<string>({
  get(): string {
    return aisbreakerStore.aisAccessToken || ''
  },
  set(value: string) {
    aisbreakerStore.setAIsAccessToken(value)
  },
})
/*
function updateSettings(options: Partial<AisbreakerState>) {
  useAisbreakerStore.updateSettings(options)
  ms.success(t('common.success'))
}
*/

function handleReset() {
  const defaults = defaultSetting()
  aisbreakerStore.setApiURL(defaults.apiURL)
  aisbreakerStore.setAIsServicePropsTemplateName(defaults.aisServicePropsTemplateName)
  aisbreakerStore.setAIsAccessToken(defaults.aisAccessToken)
  ms.success(t('common.success'))
  //window.location.reload()
}

/** It's a bit hacky, but it seams to work ... */
function revalidateFields() {
  // validation of aisServicePropsStr
  const originalTemplateNameValue = aisServicePropsTemplateName.value
  const originalValue = aisServicePropsStr.value
  // changed value is needed to trigger validation
  aisServicePropsStr.value = originalValue + ' '
  aisbreakerStore.setAIsServicePropsTemplateName(originalTemplateNameValue)
  aisServicePropsStr.value = originalValue
  console.log("revalidateFields() called")
}

onMounted(() => {
  revalidateFields()
})

function renderOptionWithTooltip({ node, option }: { node: VNode; option: SelectOption }) {
  console.log("renderOptionWithTooltip() option", JSON.stringify(option))
        return h(NTooltip, null, {
          trigger: () => node,
          default: () => option.tooltip,
        })
}

</script>

<template>
  <div class="p-4 space-y-5 min-h-[200px]">
    <div class="space-y-6">

      <!-- AIsBreaker API server -->
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ t('setting.apiServerUrl') }}</span>
        <NInput v-model:value="apiURL" placeholder="https://api.demo.aisbreaker.org ... http://localhost:3000/ ..." />
      </div>

      <!-- Service Properties template -->
      <!-- TODO: https://www.naiveui.com/en-US/os-theme/components/select#add-tooltip.vue -->
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ t('setting.apiServiceTemplate') }}</span>
        <NSelect
            class="flex-1"
            :value="aisServicePropsTemplateName"
            :options="allAIsServicePropsTemplateNameOptions"
            :render-option="renderOptionWithTooltip"
            @update-value="(value: string) => {aisServicePropsTemplateName = value; aisbreakerStore.setAIsServicePropsTemplateName(value)}"
          />
        <!-- @update-value="value => aisbreakerStore.setAIsServicePropsTemplateName(value)" -->
    </div>
      <!-- Service Properties details -->
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ t('setting.apiServiceProperties') }}</span>
        <NInput v-model:value="aisServicePropsStr"
          class="flex-1"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 10 }"
          :status="aisServicePropsStrValidationStatus"
          placeholder="{ service properties }" />
        <!--
        <NButton size="tiny" text type="primary" @XXclick="updateSettings({ systemMessage })">
          {{ t('common.save') }}
        </NButton>
        -->
      </div>
      <!-- Service Properties details: validation message -->
      <div v-if="aisServicePropsStrValidationErrorMsg" class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">&nbsp;</span>
        <NText type="error" 
         style="display: block; white-space: pre; -webkit-overflow-scrolling: touch; overflow-x: scroll; font-family: monospace; font-size: 80%;">
          {{aisServicePropsStrValidationErrorMsg}}
        </NText>
      </div>
  
      <!-- (AIsBreaker) access token -->
      <div class="flex items-center space-x-4">
        <span class="flex-shrink-0 w-[120px]">{{ t('setting.apiAccessToken') }}</span>
        <NInput v-model:value="aisAccessToken"
          class="flex-1"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 2 }"
          placeholder="< API access token/key/secret for AIsBreaker or AI service >" />
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
