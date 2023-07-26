import { useChatStore } from '@/store/index.js'

export function useChat() {
  const chatStore = useChatStore()

  const getChatByUuidAndIndexFromStore = (uuid: number, index: number) => {
    return chatStore.getChatByUuidAndIndex(uuid, index)
  }

  const addChatToStore = (uuid: number, chat: Chat.Chat) => {
    chatStore.addChatByUuid(uuid, chat)
  }

  const updateChatInStore = (uuid: number, index: number, chat: Chat.Chat) => {
    chatStore.updateChatByUuid(uuid, index, chat)
  }

  const updateChatSomeInStore = (uuid: number, index: number, chat: Partial<Chat.Chat>) => {
    chatStore.updateChatSomeByUuid(uuid, index, chat)
  }

  return {
    addChatToStore,
    updateChatInStore,
    updateChatSomeInStore,
    getChatByUuidAndIndexFromStore,
  }
}
