import Keyv from "keyv"
import crypto from 'crypto';

import OpenAIChatClient from "./openai-chat-client.js"



//
// general API interface + helpers
//

export interface ApiOptions {
    cacheKeyvOptions?: Keyv.Options<any>
}

export interface API {
    sendMessage(
        message: string,
        conversationState: string | undefined ,
        onProgress: Function | undefined,
        options: any
    ): Promise<string>

    getMessagesOfConversation(conversationId: string): Promise<string[]>
    clearAllConversations(): Promise<boolean>
}

export abstract class ApiBase implements API {
    keyv: Keyv

    constructor(apiOptions?: ApiOptions) {

        // init cache (by default, use in-memory cache)
        const cacheKeyvOptions = apiOptions?.cacheKeyvOptions || {}
        cacheKeyvOptions.namespace = `${this.constructor.name}-${crypto.randomUUID()}`
        this.keyv = new Keyv(cacheKeyvOptions)
    }

    async sendMessage(
        message: string,
        conversationId: string | undefined = undefined,
        onProgress: Function | undefined = undefined, opts: any = {}
    ): Promise<any> {
        throw new Error("Not implemented")
    }

    async getMessagesOfConversation(conversationId: string): Promise<string[]> {
        const messages = (await this.keyv.get(conversationId))?.messages as string[] || []
        /* algorithm, if messages are stored separately in the cache:
        const messages = []
        let i = 0
        while (true) {
            const key = `${conversationId}-${i}`
            const message = await this.keyv.get(key)
            if (message === undefined) {
                break
            }
            messages.push(message)
            i++
        }*/
        return messages
    }

    async clearAllConversations(): Promise<boolean> {
        await this.keyv.clear()
        return true
    }
}

//
// TrivialAssistant API
//
export interface TrivialAssistantAPIOptions extends ApiOptions {}

export class TrivialAssistantAPI extends ApiBase {
    async sendMessage(
        message: string,
        conversationId: string | undefined,
        onProgress: Function | undefined,
        opts: any = {}
    ): Promise<string> {
        return `The answer to '${message}' from TrivialAssistantAPI is unknown ...`
    }
}

//
// OpenAI / ChatGPT API
//
export interface OpenAIAPIOptions extends ApiOptions {
    openaiApiKey?: string
}

export class OpenAIAPI extends ApiBase {
    openaiApiKey: string
    openaiChatClient: OpenAIChatClient

    constructor(apiOptions: OpenAIAPIOptions) {
        super(apiOptions)
        this.openaiApiKey = (apiOptions && apiOptions.openaiApiKey) || process.env.OPENAI_API_KEY || ""

        // backend
        this.openaiChatClient = new OpenAIChatClient(this.openaiApiKey, this.keyv, apiOptions)
    }

    async sendMessage(
        message: string,
        conversationId: string | undefined = undefined,
        onProgress: Function | undefined = undefined, opts: any = {}
        ): Promise<any> {

        return (await this.openaiChatClient.sendMessage(message, conversationId, onProgress, opts))
    }
}
