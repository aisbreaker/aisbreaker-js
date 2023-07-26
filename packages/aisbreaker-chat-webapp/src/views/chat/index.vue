<script setup lang='ts'>
import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAutoComplete, NButton, NInput, useDialog, useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import { Message } from './components/index.js'
import { useScroll } from './hooks/useScroll.js'
import { useChat } from './hooks/useChat.js'
import { useUsingContext } from './hooks/useUsingContext.js'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common/index.js'
import { useBasicLayout } from '@/hooks/useBasicLayout.js'
import { useChatStore, usePromptStore } from '@/store/index.js'
import { fetchChatAPIProcess } from '@/api/index.js'
import { t } from '@/locales/index.js'
import { api, services } from 'aisbreaker-core-browserjs'

let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()

const { isMobile } = useBasicLayout()
const { addChatToStore, updateChatInStore, updateChatSomeInStore, getChatByUuidAndIndexFromStore } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)

// add PromptStore
const promptStore = usePromptStore()

// use storeToRefs to ensure that the associated part can be re-rendered after the store is modified
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

//
// initialize AIsBreaker API
//
let serviceProps: api.AIsServiceProps
let auth: api.Auth | undefined = undefined
serviceProps = {
    /*
    serviceId: 'aisbreaker:mirror',
    forward2ServiceProps: {
        serviceId: 'chat:dummy',
    },
    */
    serviceId: 'chat:dummy',
} as api.AIsServiceProps
/*
serviceProps = {
    serviceId: 'aisbreaker:proxy',
    //url: 'http://localhost:3000',
    url: 'http://proxy.demo.aisbreaker.org/',
    forward2ServiceProps: {
        serviceId: 'chat:openai.com/gpt',
    },
} as api.AIsServiceProps
auth = {
    secret: process.env.OPENAI_API_KEY || process.env.AISPROXY_API_KEY || "",
}
*/
const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)

console.log(services)
console.log(aisService)


// For unknown reasons, when the page is refreshed,
// the loading state(s) does not reset, so it needs to be reset manually.
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSomeInStore(+uuid, index, { loading: false })
})

function handleSubmit() {
  onConversation()
}

async function onConversation() {
  let message = prompt.value

  console.log(`onConversation(): ${message}`)

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChatToStore(
    +uuid,
    {
      dateTime: dateToLocaleString(new Date()),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  //let options: Chat.ConversationRequest = {}
  //const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions
  const lastConversationState = undefined // TODO: conversationList.value[conversationList.value.length - 1]?.conversationState

  //if (lastContext && usingContext.value)
  //  options = { ...lastContext }

  addChatToStore(
    +uuid,
    {
      dateTime: dateToLocaleString(new Date()),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { /*...options*/ } },
    },
  )
  scrollToBottom()

  try {
    let lastText = ''
    console.log(`onConversation()#2: ${message}`)
    /*
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChatInStore(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: dateToLocaleString(new Date()),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            scrollToBottomIfAtBottom()
          }
          catch (error) {
            //
          }
        },
      })
      updateChatSomeInStore(+uuid, dataSources.value.length - 1, { loading: false })
    }
    */

    

    const streamProgressFunc: api.StreamProgressFunction =
      (responseEvent: api.ResponseEvent) => {
        console.log("streamProgress: ", JSON.stringify(responseEvent/*, undefined, 2*/)) 

        let dataText = responseEvent.outputs[0]?.text?.content || ''
        lastText += (dataText ?? '')
        try {
          updateChatInStore(
            +uuid,
            dataSources.value.length - 1,
            {
              dateTime: dateToLocaleString(new Date()),
              text: lastText,
              inversion: false,
              error: false,
              loading: true,
              //conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
              requestOptions: { prompt: message, options: { /*...options*/ } },
              //conversationState: responseEvent.conversationState,
            },
          )

          /*
          if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
            options.parentMessageId = data.id
            lastText = data.text
            message = ''
            return fetchChatAPIOnce()
          }
          */

          scrollToBottomIfAtBottom()
        }
        catch (error) {
          //
        }
    }   

    const response1 = await aisService.process({
        inputs: [ {
            text: {
                role: 'user',
                content: message,
            },
        } ],
        conversationState: lastConversationState,
        streamProgressFunction: streamProgressFunc,
        //abortSignal: controller.signal, // TODO
    })
    console.log(`onConversation() response1: ${JSON.stringify(response1)}`)

    //await fetchChatAPIOnce()
  }
  catch (error: any) {
    console.log(`onConversation() error`, error) // TODO
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSomeInStore(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndexFromStore(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSomeInStore(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChatInStore(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: dateToLocaleString(new Date()),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { /*...options*/ } },
      },
    )
    scrollToBottomIfAtBottom()
  }
  finally {
    updateChatSomeInStore(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
    scrollToBottomIfAtBottom()
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChatInStore(
    +uuid,
    index,
    {
      dateTime: dateToLocaleString(new Date()),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChatInStore(
              +uuid,
              index,
              {
                dateTime: dateToLocaleString(new Date()),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }
          }
          catch (error) {
            //
          }
        },
      })
      updateChatSomeInStore(+uuid, index, { loading: false })
    }
    await fetchChatAPIOnce()
  }
  catch (error: any) {
    if (error.message === 'canceled') {
      updateChatSomeInStore(
        +uuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = error?.message ?? t('common.wrong')

    updateChatInStore(
      +uuid,
      index,
      {
        dateTime: dateToLocaleString(new Date()),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

function dateToLocaleStringOriginal(date: Date) {
    return date.toLocaleString()
}

function dateToLocaleStringIso(date: Date) {
  var tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = function(num: number) {
          return (num < 10 ? '0' : '') + num;
      };

  return date.getFullYear() +
      '-' + pad(date.getMonth() + 1) +
      '-' + pad(date.getDate()) +
      //'T' + pad(date.getHours()) +
      ' ' + pad(date.getHours()) +
      ':' + pad(date.getMinutes()) +
      ':' + pad(date.getSeconds()) +
      ' ' +
      dif + pad(Math.floor(Math.abs(tzo) / 60)) +
      ':' + pad(Math.abs(tzo) % 60);
}

function dateToLocaleString(date: Date) {
    //return dateToLocaleStringOriginal(date)
    return dateToLocaleStringIso(date)
}

// Can be optimized
// Calculation of search options. Here, 'value' is used as the index, so when there are duplicate values, rendering is abnormal (multiple items are selected at the same time).
// Ideally, 'key' should be used as the index, but there are issues with the official 'renderOption' method, so 'value' is used to reverse 'renderLabel'.
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value reverse renders key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          id="image-wrapper"
          class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']"
        >
          <template v-if="!dataSources.length">
            <div class="flex items-center justify-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
              <span>Aha~</span>
            </div>
          </template>
          <template v-else>
            <div>
              <Message
                v-for="(item, index) of dataSources"
                :key="index"
                :date-time="item.dateTime"
                :text="item.text"
                :inversion="item.inversion"
                :error="item.error"
                :loading="item.loading"
                @regenerate="onRegenerate(index)"
                @delete="handleDelete(index)"
              />
              <div class="sticky bottom-0 left-0 flex justify-center">
                <NButton v-if="loading" type="warning" @click="handleStop">
                  <template #icon>
                    <SvgIcon icon="ri:stop-circle-line" />
                  </template>
									{{ t('common.stopResponding') }}
                </NButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <!--
          <HoverButton @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
          -->
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                ref="inputRef"
                v-model:value="prompt"
                type="textarea"
                :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                @input="handleInput"
                @focus="handleFocus"
                @blur="handleBlur"
                @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>