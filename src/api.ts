import Keyv from "keyv"
import crypto from 'crypto';

import OpenAIChatClient from "./openai-chat-client.js"
import { Input } from "./api/models/Input.js";
import { RequestMedia } from "./api/models/RequestMedia.js";
import { RequestOptions } from "https";
import { ResponseEvent } from "./api/models/ResponseEvent.js";
import { ResponseFinal } from "./api/models/ResponseFinal.js";

import { InputText } from "./api/models/InputText.js";
import { InputImage } from "./api/models/InputImage.js";
import { Output } from "./api/models/Output.js";
import { Request } from "./api/models/Request.js";
import { Message } from "./api/models/Message.js";
import { Usage } from "./api/models/Usage.js";
import { OutputText } from "./api/models/OutputText.js";
import { OutputImage } from "./api/models/OutputImage.js";




//
// general API interface + helpers
//

export interface ApiOptions {
    cacheKeyvOptions?: Keyv.Options<any>
}



export interface API {
    sendMessage(r: Request): Promise<ResponseFinal>

    getMessagesOfConversation(conversationId: string): Promise<Message[]>
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

    async sendMessage(r: Request): Promise<ResponseFinal> {
        throw new Error("Not implemented")
    }

    async getMessagesOfConversation(conversationId: string): Promise<Message[]> {
        const messages = (await this.keyv.get(conversationId))?.messages as Message[] || []
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

    async addMessagesToConversation(conversationId: string, inputs: Input[], outputs: Output[]): Promise<boolean> {
        let storedMessages = await this.getMessagesOfConversation(conversationId)

        // add inputs
        for (const input of inputs) {
            const message: Message = {input: input}
            storedMessages.push(message)
        }
        // add outputs
        for (const output of outputs) {
            const message: Message = {output: output}
            storedMessages.push(message)
        }

        // store messages
        await this.keyv.set(conversationId, {messages: storedMessages})

        //const shouldGenerateTitle = opts.shouldGenerateTitle && isNewConversation;

        return true
    }

    async clearAllConversations(): Promise<boolean> {
        await this.keyv.clear()
        return true
    }
}

//
// general supporting stuff
//

/**
 * Collect all streamed ReponseEvents to create a FinalResponse at the end
 */
export class ResponseCollector {
    private responseEvents: ResponseEvent[] = []
    private startTime = Date.now()
    /** service specific engine/model ID */
    lastObservedEngineId: string | undefined

    constructor(public request: Request) {
    }

    addResponseEvent(responseEvent: ResponseEvent) {
        this.responseEvents.push(responseEvent)
    }

    /* NOT NEEDED? TODO DELETE
    getMaxOutputIndex(): number {
        let maxOutputIndex = -1
        for (const responseEvent of this.responseEvents) {
            if (responseEvent.outputs) {
                for (const output of responseEvent.outputs) {
                    if (output.text) {
                        if (output.text.index > maxOutputIndex) {
                            maxOutputIndex = output.text.index
                        }
                    } else if (output.image) {
                        if (output.image.index > maxOutputIndex) {
                            maxOutputIndex = output.image.index
                        }
                    }
                }
            }
        }
        return maxOutputIndex
    }
    */

    private setOrAppendSingleOutput(output: Output, outputs: Output[]): Output[] {
        if (output.text) {
            const text = output.text
            const index = text.index || 0
            const role = text.role

            if (text.content) {
                var content = text.content || ''
                if (text.isDelta) {
                    // aggregate
                    const previousContent = outputs[index]?.text?.content || ''
                    content = previousContent + content
    
                    // save aggregated
                    const aggregatedOutputText: OutputText = {
                        index: index,
                        role: role,
                        content: content,
                        isDelta: false,
                        isProcessing: false,
                    }
                    outputs[index] = {text: aggregatedOutputText}
                } else {
                    // no delta, just save
                    const aggregatedOutputText: OutputText = {
                        index: index,
                        role: role,
                        content: content,
                        isDelta: false,      // because it's for the final response
                        isProcessing: false, // because it's for the final response
                    }
                    outputs[index] = {text: aggregatedOutputText}
                }
            } else {
                // no content, nothing to do here
            }

        } else if (output.image) {
            // just save
            const image = output.image
            const index = image.index || 0
            const role = image.role
            const outputImage: OutputImage = {
                index: index,
                role: role,
                base64: image.base64,
                url: image.url,
                isProcessing: false, // because it's for the final response
            }
            outputs[index] = {image: outputImage}
        }

        return outputs
    }

    private collectInternResponses(): any[] | undefined {
        // collect all
        let internResponses: any[] = this.responseEvents.map((responseEvent) => {responseEvent.internResponse})
        
        // remove empty/undefined
        internResponses = internResponses.filter((internResponse) => {return internResponse})

        // result
        if (internResponses.length === 0) {
            return undefined
        } else {
            return internResponses
        }
    }

    /**
     * Create a final response from the collected response events
     */
    getResponseFinalOutputs(): Output[] {
        // collect and aggregate the outputs
        let outputs: Output[] = []
        for (const responseEvent of this.responseEvents) {
            if (responseEvent.outputs) {
                for (const output of responseEvent.outputs) {
                    outputs = this.setOrAppendSingleOutput(output, outputs)
                }
            }
        }
        return outputs
    }

     /**
     * Create a final response from the collected response events
     */
     getResponseFinalInternResponse(): any | undefined { 
        // collect and aggregate internResponses
        let internResponse: any
        let internResponses = this.collectInternResponses()
        if (internResponses && internResponses.length === 1) {
            internResponse = internResponses[0]
        } else {
            internResponse = internResponses
        }
        return internResponse
    }
       
    getMillisSinceStart(): number {
        return Date.now() - this.startTime
    }
}

//
// TrivialAssistant API
//
export interface TrivialAssistantAPIOptions extends ApiOptions {}

export class TrivialAssistantAPI extends ApiBase {
    async sendMessage(request: Request): Promise<ResponseFinal> {
        const input = request.inputs[0]
        let messageText = '???'
         if (input.text) {
            // it's a TextInputMessage message
            messageText = input.text.content
        }

        /* alternative
        const messageT = p.messagesT[0]
        if (messageT.type === 'TextInput') {
            // it's a TextInputMessage message
            console.log(messageT.text)
        }
        if (messageT.type === 'ImageInput') {
            // it's a TextInputMessage message
            console.log(messageT.url)
        }       
        */

        // generate output
        const outputs: Output[] = [{
            text: {
                index: 0,
                role: 'assistant',
                content: `The answer to '${messageText}' from TrivialAssistantAPI is unknown ...`,  
            }
        }]

        // update conversation
        const conversationId = request.conversationState || crypto.randomUUID()
        await this.addMessagesToConversation(conversationId, request.inputs, outputs)

        // calculate usage
        const usage: Usage = {
            engine: {
                serviceId: 'TrivialAssistant',
                engineId: 'default',
            },
            totalMilliseconds: 1,
        }

        // return response
        const response: ResponseFinal = {
            outputs: outputs,
            conversationState: conversationId,
            usage: usage,
        }
        return response
    }
}


