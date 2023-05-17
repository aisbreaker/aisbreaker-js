import crypto from 'crypto'
import Keyv from 'keyv'
import { fetchEventSource, FetchEventSourceInit } from '@waylaidwanderer/fetch-event-source'
import { Agent } from 'undici'

//import './fetch-polyfill.js'
import {
    fetch, Headers, /*Request,*/ Response,
} from 'undici'
//import { get_encoding, encoding_for_model } from Tiktoken
import { encoding_for_model, Tiktoken } from 'tiktoken'

import {
    Engine,
    ApiBase,
    ApiOptions,
    Input,
    InputText,
    Message,
    Output,
    OutputText,
    Request,
    ResponseCollector,
    ResponseEvent,
    ResponseFinal,
    Usage,
} from './api/index.js'


const CHATGPT_MODEL = 'gpt-3.5-turbo'

//
// general API implementation for OpenAI / ChatGPT API
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

    /*
    async sendMessage(
        message: string,
        conversationId: string | undefined = undefined,
        onProgress: Function | undefined = undefined, opts: any = {}
        ): Promise<any> {

        return (await this.openaiChatClient.sendMessage(message, conversationId, onProgress, opts))
    }
    */

    getEngine(model: string = CHATGPT_MODEL): Engine {
        const engine: Engine = {
            serviceId: 'openai',
            engineId: `chat/${model}`,
        }
        return engine
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        // prepare collection/aggregation of partial responses
        const responseCollector = new ResponseCollector(request)

        // update conversation (before OpenAI API request-response)
        const conversationId = request.conversationState || crypto.randomUUID()
        await this.addMessagesToConversation(conversationId, request.inputs, [])

        // get all messages so far - this is the conversation context
        const allMessages = await this.getMessagesOfConversation(conversationId)
        const allOpenAIChatMessages = messages2OpenAIChatMessages(allMessages)

        // the result
        let resultOutputs: Output[]
        let resultUsage: Usage
        let resultInternResponse: any

        // stream or synchronous result?
        if (request.streamProgressFunction) {
            //
            // expect stream result
            //
            const streamProgressFunc = request.streamProgressFunction
            const streamOpenAIProgressFunc: OpenAIChatSSEFunc = (data: OpenAIChatSSE) => {
                // convert SSE to response event
                const responseEvent = createResponseEventFromOpenAIChatSSEAndCollectIt(data, responseCollector)
                // call upstream progress function
                streamProgressFunc(responseEvent)
            }
            // call OpenAI API (it waits until streaming is finished)
            await this.openaiChatClient.getCompletion(
                allOpenAIChatMessages,
                request.internOptions,
                streamOpenAIProgressFunc,
                (request.internOptions?.abortController) || new AbortController(),
            )
    
            // avoids some rendering issues when using a CLI app
            if (this.openaiChatClient?.options?.debug) {
                console.debug();
            }

            // summarize the streamed result, incl. usage caclulation
            const inputsTokens = this.countInputsTokens(request.inputs)
            resultOutputs = responseCollector.getResponseFinalOutputs()
            const outputsTokens = this.countOutputsTokens(resultOutputs)
            resultUsage = {
                engine: this.getEngine(responseCollector.lastObservedEngineId),
                totalTokens: inputsTokens + outputsTokens,
                totalMilliseconds: responseCollector.getMillisSinceStart(),
            }
            resultInternResponse = responseCollector.getResponseFinalInternResponse()
        } else {
            //
            // expect synchronous result
            //

            // call OpenAI API and wait for the response
            const response0: OpenAIChatResponse | undefined = await this.openaiChatClient.getCompletion(
                allOpenAIChatMessages,
                request.internOptions,
                undefined,
                (request.internOptions?.abortController) || new AbortController(),
            )
            if (this.openaiChatClient?.options?.debug) {
                console.debug(JSON.stringify(response0))
            }
            if (!response0) {
                throw new Error('No result from OpenAI')
            }
            const response: OpenAIChatResponse = response0
            const r = response as any

            // summarize the synchronous result result, incl. usage
            resultOutputs = openAIChatReponse2Outputs(response)
            resultUsage = {
                engine: this.getEngine(r?.model),
                totalTokens: r?.usage?.total_tokens,
                totalMilliseconds: responseCollector.getMillisSinceStart(),
            }
            resultInternResponse = r
        }
        
        /*
        if (shouldGenerateTitle) {
            conversation.title = await this.generateTitle(userMessage, replyMessage);
            returnData.title = conversation.title;
        }
        */

        // update conversation (after OpenAI API request-response)
        await this.addMessagesToConversation(conversationId, [], resultOutputs)

        // return response
        const response: ResponseFinal = {
            outputs: resultOutputs,
            conversationState: conversationId,
            usage: resultUsage,
            internResponse: resultInternResponse,
        }
        return response
    }


    //
    // helpers for token counting
    //

    private tiktokenEncoding = encoding_for_model(CHATGPT_MODEL)
    private countTextTokens(text: string): number {
        const tokens = this.tiktokenEncoding.encode(text)
        return tokens.length
    }

    private countInputsTokens(inputs: Input[]) {
        let count = 0
        for (const input of inputs) {
            if (input.text) {
                count += this.countTextTokens(input.text.content)
            } else if (input.image) {
                // TODO: count image tokens
                count += 1000
            }
        }
        return count
    }

    private countOutputsTokens(outputs: Output[]) {
        let count = 0
        for (const output of outputs) {
            if (output.text) {
                count += this.countTextTokens(output.text.content)
            } else if (output.image) {
                // TODO: count image tokens
                count += 1000
            }
        }
        return count
    }
}

function createResponseEventFromOpenAIChatSSEAndCollectIt(data: OpenAIChatSSE, responseCollector: ResponseCollector) {
    const d = data as any
    const outputs: Output[] = []

    // text?
    const idx = 0
    if (d && d.choices && d.choices.length > idx && d.choices[idx].delta && d.choices[idx].delta.content) {
        // text part is in the data
        const deltaContent = d.choices[idx].delta.content
        const outputText: OutputText = {
            index: idx,
            role: 'assistant',
            content: deltaContent,
            isDelta: true,
            isProcessing: true,
        }
        outputs[idx] = {
            text: outputText,
        }
    } else {
        // nothing relevant is in the data
    }

    // meta data?
    if (d && d.model) {
        const openaiModel = d.model
        responseCollector.lastObservedEngineId = `${openaiModel}`
    }

    // call upstream progress function
    const responseEvent: ResponseEvent = {
        outputs: outputs,
        internResponse: data
    }

    // collect for later aggregation
    responseCollector.addResponseEvent(responseEvent)

    return responseEvent
}

function openAIChatReponse2Outputs(data: OpenAIChatResponse): Output[] {
    const d = data as any
    const outputs: Output[] = []

    if (d.choices) {
        for (const choice of d.choices) {
            if (choice.message && choice.message.content) {
                const outputText: OutputText = {
                    index: choice.index || 0,
                    role: choice.message.role,
                    content: choice.message.content,
                    isDelta: false,
                    isProcessing: false,
                }
                outputs[choice.index] = {
                    text: outputText,
                }
            }
        }
    }

    return outputs
}


//
// internal OpenAI specific stuff
//

interface OpenAIChatMessage {
    // Attention: Additional properties are not allowed ('XXX' was unexpected) by OpenAI API
    // Therefore, we cannot just use type InputText
    role: 'system' | 'assistant' | 'user'
    content: string
}

function inputText2OpenAIChatMessage(input: InputText): OpenAIChatMessage {
    const message: OpenAIChatMessage = {
        role: input.role,
        content: input.content,
    }
    return message
}
function outputText2OpenAIChatMessage(output: OutputText): OpenAIChatMessage {
    const message: OpenAIChatMessage = {
        role: output.role,
        content: output.content,
    }
    return message
}
function inputTexts2OpenAIChatMessages(input: InputText[]): OpenAIChatMessage[] {
    const result = input.map(inputText2OpenAIChatMessage)
    return result
}
function messages2OpenAIChatMessages(messages: Message[]): OpenAIChatMessage[] {
    const result: OpenAIChatMessage[] = []
    for (const message of messages) {
        if (message.input && message.input.text) {
            result.push(inputText2OpenAIChatMessage(message.input.text))
        } else if (message.output && message.output.text) {
            result.push(outputText2OpenAIChatMessage(message.output.text))
        }
    }
    return result
}


type OpenAIChatSSEFunc = (data: OpenAIChatSSE) => void

/* example OpenAIChatSSE object:
    {
       "id":"chatcmpl-7GYzfZcZw0z8J6V4T9YhCJmcoKxYo",
       "object":"chat.completion.chunk",
       "created":1684182119,
       "model":"gpt-3.5-turbo-0301",
       "choices":[
          {
             "delta":{
                "content":"Hello"
             },
             "index":0,
             "finish_reason":null
          }
       ]
    }
*/
type OpenAIChatSSE = object

/* example OpenAIChatRespponse:
     {
       "id":"chatcmpl-7GZaUtI4o3LTw3UrAtKlJUWbLaPa5",
       "object":"chat.completion",
       "created":1684184402,
       "model":"gpt-3.5-turbo-0301",
       "usage":{
          "prompt_tokens":10,
          "completion_tokens":10,
          "total_tokens":20
       },
       "choices":[
          {
             "message":{
                "role":"assistant",
                "content":"Hello there, how can I assist you today?"
             },
             "finish_reason":"stop",
             "index":0
          }
       ]
    }
*/
type OpenAIChatResponse = object

export default class OpenAIChatClient {
    apiKey: string
    conversationsCache: Keyv
    options: any
    modelOptions: any
    isChatGptModel = true // this.modelOptions.model.startsWith('gpt-');
    isUnofficialChatGptModel = false // this.modelOptions.model.startsWith('text-chat') || this.modelOptions.model.startsWith('text-davinci-002-render');
    completionsUrl: string|undefined

    constructor(
        apiKey: string,
        conversationsCache: Keyv,
        options: any = {},
    ) {
        this.apiKey = apiKey;
        if (options && options.debug) {
            console.debug(`API key: ${apiKey}`);
        } 

        this.conversationsCache = conversationsCache;

        this.setOptions(options);
    }

    setOptions(options: any) {
        if (this.options && !this.options.replaceOptions) {
            // nested options aren't spread properly, so we need to do this manually
            this.options.modelOptions = {
                ...this.options.modelOptions,
                ...options.modelOptions,
            };
            delete options.modelOptions;
            // now we can merge options
            this.options = {
                ...this.options,
                ...options,
            };
        } else {
            this.options = options;
        }

        if (this.options.openaiApiKey) {
            this.apiKey = this.options.openaiApiKey;
        }

        const modelOptions = this.options.modelOptions || {};
        this.modelOptions = {
            ...modelOptions,
            // set some good defaults (check for undefined in some cases because they may be 0)
            model: modelOptions.model || CHATGPT_MODEL,
            temperature: typeof modelOptions.temperature === 'undefined' ? 0.8 : modelOptions.temperature,
            top_p: typeof modelOptions.top_p === 'undefined' ? 1 : modelOptions.top_p,
            presence_penalty: typeof modelOptions.presence_penalty === 'undefined' ? 1 : modelOptions.presence_penalty,
            stop: modelOptions.stop,
        };

        this.completionsUrl = 'https://api.openai.com/v1/chat/completions'

        return this;
    }


 
    /*
    async generateTitle(userMessage, botMessage) {
        const instructionsPayload = {
            role: 'system',
            content: `Write an extremely concise subtitle for this conversation with no more than a few words. All words should be capitalized. Exclude punctuation.

||>Message:
${userMessage.message}
||>Response:
${botMessage.message}

||>Title:`,
        };

        const titleGenClientOptions = JSON.parse(JSON.stringify(this.options));
        titleGenClientOptions.modelOptions = {
            model: 'gpt-3.5-turbo',
            temperature: 0,
            presence_penalty: 0,
            frequency_penalty: 0,
        };
        const titleGenClient = new ChatGPTClient(this.apiKey, titleGenClientOptions);
        const result = await titleGenClient.getCompletion([instructionsPayload], null);
        // remove any non-alphanumeric characters, replace multiple spaces with 1, and then trim
        return result.choices[0].message.content
            .replace(/[^a-zA-Z0-9' ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    */


    /** 
     * This function needed by sendMessageWithoutStream() + sendMessageWithStream()
     * 
     * @returns the OpenAI reponse object for non-streaming; undefined for streaming
     */
    async getCompletion(
      messages: OpenAIChatMessage[],
      internOptions: any = {},
      streamProgressFunc: OpenAIChatSSEFunc | undefined,
      abortController: AbortController = new AbortController()): Promise<OpenAIChatResponse|undefined> {
  
        let modelOptions = { ...this.modelOptions }
        if (streamProgressFunc && typeof streamProgressFunc === 'function') {
            modelOptions.stream = true
        }
        if (internOptions && typeof internOptions === 'object') {
            modelOptions = { ...modelOptions, ...internOptions }
        }

        const { debug } = this.options;
        const url = this.completionsUrl as string
        modelOptions.messages = messages
        if (debug) {
            console.debug();
            console.debug(url);
            console.debug(modelOptions);
            console.debug();
        }
        const opts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(modelOptions),
            dispatcher: new Agent({
                bodyTimeout: 0,
                headersTimeout: 0,
            }),
        };
        if (debug) {
            console.debug(opts)
        } 

        if (streamProgressFunc && modelOptions.stream) {
            // stream:

            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                try {
                    let done = false;
                    await fetchEventSource(url, {
                        ...opts,
                        signal: abortController.signal,
                        async onopen(response) {
                            if (response.status === 200) {
                                return;
                            }
                            if (debug) {
                                console.debug(response);
                            }
                            let error: any;
                            try {
                                const body = await response.text();
                                error = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
                                error.status = response.status;
                                error.json = JSON.parse(body);
                            } catch {
                                error = error || new Error(`Failed to send message. HTTP ${response.status}`);
                            }
                            throw error;
                        },
                        onclose() {
                            if (debug) {
                                console.debug('Server closed the connection unexpectedly, returning...');
                            }
                            // workaround for private API not sending [DONE] event
                            if (!done) {
                                // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the Promise/resolve will return instead
                                abortController.abort();
                                resolve(undefined);
                            }
                        },
                        onerror(err) {
                            if (debug) {
                                console.debug(err);
                            }
                            // rethrow to stop the operation
                            throw err;
                        },
                        onmessage(message) {
                            if (debug) {
                                console.debug(message);
                            }
                            if (!message.data || message.event === 'ping') {
                                return;
                            }
                            if (message.data === '[DONE]') {
                                // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the Promise/resolve will return instead
                                abortController.abort();
                                resolve(undefined)
                                done = true;
                                return;
                            }
                            const dataObj = JSON.parse(message.data)
                            streamProgressFunc(dataObj) // TODO: as OpenAIChatSSE
                        },
                    } as FetchEventSourceInit);
                } catch (err) {
                    reject(err);
                }
                // done

                // avoids some rendering issues when using the CLI app
                if (this.options.debug) {
                    console.debug();
                }
            }); // return
        }
        // no stream:

        const response = await fetch(
            url,
            {
                ...opts,
                signal: abortController.signal,
            },
        )
        // synchronous HTTP reponse handling
        if (response.status !== 200) {
            const body = await response.text();
            const error: any = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
            error.status = response.status;
            try {
                error.json = JSON.parse(body);
            } catch {
                error.body = body;
            }
            throw error;
        }
        
        return response.json() as OpenAIChatResponse
    }
}


//
// generic helper functions
//
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

