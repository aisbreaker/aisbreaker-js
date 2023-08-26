<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NModal, NTabPane, NTabs } from 'naive-ui'
import Service from './Service.vue'
import Config from './Config.vue'
import Use from './Use.vue'
import Advanced from './Advanced.vue'
import About from './About.vue'
import { SvgIcon } from '@/components/common/index.js'

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()


/** active tab = default tab */
const active = ref('Service')

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})
</script>

<template>
  <NModal v-model:show="show" :auto-focus="false" preset="card" style="width: 95%; max-width: 640px">
    <template #header>
      {{ $t('setting.settingHeader') }}
    </template>
    <template #header-extra>
      {{ $t('setting.settingHeaderSavedAutomatically') }}
    </template>
    <div>
      <NTabs v-model:value="active" type="line" animated>
        <NTabPane name="Service" tab="Service">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:list-settings-line" />
            <span class="ml-2">{{ $t('setting.apiService') }}</span>
          </template>
          <div class="min-h-[100px]">
            <Service />
          </div>
        </NTabPane>
        <NTabPane name="Config" tab="Config">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:chat-settings-line" />
            <span class="ml-2">{{ $t('setting.config') }}</span>
          </template>
          <div class="min-h-[100px]">
            <Config />
          </div>
        </NTabPane>
        <NTabPane name="Use" tab="Use">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:user-settings-line" iconNO="ri:file-user-line" />
            <span class="ml-2">{{ $t('setting.use') }}</span>
          </template>
          <div class="min-h-[100px]">
            <Use />
          </div>
        </NTabPane>
        <!--
        <NTabPane v-if="isChatGPTAPI" name="Advanced" tab="Advanced">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:equalizer-line" />
            <span class="ml-2">{{ $t('setting.advanced') }}</span>
          </template>
          <div class="min-h-[100px]">
            <Advanced />
          </div>
        </NTabPane>
        -->
        <NTabPane name="About" tab="About">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:information-line" />
            <span class="ml-2">{{ $t('setting.about') }}</span>
          </template>
          <About />
        </NTabPane>
      </NTabs>
    </div>
  </NModal>
</template>
