import { api, base, utils } from 'aisbreaker-api-js'
import ky, { HTTPError, TimeoutError } from 'ky-universal'
import * as tiktoken from 'tiktoken'


//
// general API implementation for OpenAI / ChatGPT API
//
// API docs: https://platform.openai.com/docs/api-reference/chat/create
// API url:  https://api.openai.com/v1/chat/completions
//

const chatBaseServiceId = 'chat:openai.com'

const DEFAULT_CHATGPT_MODEL = 'gpt-3.5-turbo'
const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions'
const TIMEOUT_MILLIS = 3 * 60 * 1000 // 3 minutes

export class OpenaiChatService extends base.BaseAIsService {
    protected openaiChatClient: OpenaiChatClient

    constructor(props: api.AIsServiceProps, auth?: api.Auth) {
        super(props, auth)

        // check props
        if (!auth?.secret) {
            throw new Error(`OpenaiChatService: missing auth.secret`)
        }

        // backend
        (props as any).completionsUrl = props.url || DEFAULT_URL as string
        (props as any).model = this.getModelFromServiceId(props.serviceId) || DEFAULT_CHATGPT_MODEL
        this.openaiChatClient = new OpenaiChatClient(auth?.secret, props)
    }

    getEngine(model: string = DEFAULT_CHATGPT_MODEL): api.Engine {
        const engine: api.Engine = {
            serviceId: `${chatBaseServiceId}/${model}`
        }
        return engine
    }

    async process(request: api.Request): Promise<api.ResponseFinal> {
        // prepare collection/aggregation of partial responses
        const responseCollector = new utils.ResponseCollector(request)

        // update conversation (before OpenAI API request-response)
        const conversationState = utils.DefaultConversationState.fromBase64(request.conversationState)
        conversationState.addInputs(request.inputs)

        // get all messages so far - this is the conversation context
        const allMessages = conversationState.getMessages()
        const allOpenaiChatMessages = messages2OpenaiChatMessages(allMessages)

        // the result
        let resultOutputs: api.Output[]
        let resultUsage: api.Usage
        let resultInternResponse: any

        // stream or synchronous result?
        if (request.streamProgressFunction) {
            //
            // expect stream result
            //
            const streamProgressFunc = request.streamProgressFunction
            const streamOpenaiProgressFunc: OpenaiChatSSEFunc = (data: OpenaiChatSSE) => {
                // convert SSE to response event
                const responseEvent = createResponseEventFromOpenaiChatSSEAndCollectIt(data, responseCollector)
                // call upstream progress function
                streamProgressFunc(responseEvent)
            }
            // call OpenAI API (it waits until streaming is finished)
            await this.openaiChatClient.getCompletion(
                allOpenaiChatMessages,
                request.internOptions,
                streamOpenaiProgressFunc,
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
                //totalTokens: inputsTokens + outputsTokens,
                totalMilliseconds: responseCollector.getMillisSinceStart(),
            }
            resultInternResponse = responseCollector.getResponseFinalInternResponse()
        } else {
            //
            // expect synchronous result
            //

            // call OpenAI API and wait for the response
            const response0: OpenaiChatResponse | undefined = await this.openaiChatClient.getCompletion(
                allOpenaiChatMessages,
                request.internOptions,
                undefined,
                (request.internOptions?.abortController) || new AbortController(),
            )
            if (this.openaiChatClient?.options?.debug) {
                console.debug(JSON.stringify(response0))
            }
            if (!response0) {
                throw new Error('No result from OpenAI API')
            }
            const response: OpenaiChatResponse = response0
            const r = response as any

            // summarize the synchronous result result, incl. usage
            resultOutputs = openaiChatReponse2Outputs(response)
            resultUsage = {
                engine: this.getEngine(r?.model),
                //totalTokens: r?.usage?.total_tokens,
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
        conversationState.addOutputs(resultOutputs)

        // return response
        const response: api.ResponseFinal = {
            outputs: resultOutputs,
            conversationState: conversationState.toBase64(),
            usage: resultUsage,
            internResponse: resultInternResponse,
        }
        return response
    }


    //
    // helpers for token counting
    //

    private tiktokenEncoding = tiktoken.encoding_for_model(DEFAULT_CHATGPT_MODEL)
    private countTextTokens(text: string): number {
        const tokens = this.tiktokenEncoding.encode(text)
        return tokens.length
    }

    private countInputsTokens(inputs: api.Input[]) {
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

    private countOutputsTokens(outputs: api.Output[]) {
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

function createResponseEventFromOpenaiChatSSEAndCollectIt(
    data: OpenaiChatSSE, responseCollector: utils.ResponseCollector
) {
    const d = data as any
    const outputs: api.Output[] = []

    // text?
    const idx = 0
    if (d && d.choices && d.choices.length > idx && d.choices[idx].delta && d.choices[idx].delta.content) {
        // text part is in the data
        const deltaContent = d.choices[idx].delta.content
        const outputText: api.OutputText = {
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
    const responseEvent: api.ResponseEvent = {
        outputs: outputs,
        internResponse: data
    }

    // collect for later aggregation
    responseCollector.addResponseEvent(responseEvent)

    return responseEvent
}

function openaiChatReponse2Outputs(data: OpenaiChatResponse): api.Output[] {
    const d = data as any
    const outputs: api.Output[] = []

    if (d.choices) {
        for (const choice of d.choices) {
            if (choice.message && choice.message.content) {
                const outputText: api.OutputText = {
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

interface OpenaiChatMessage {
    // Attention: Additional properties are not allowed ('XXX' was unexpected) by OpenAI API
    // Therefore, we cannot just use type InputText
    role: 'system' | 'assistant' | 'user'
    content: string
}

function inputText2OpenaiChatMessage(input: api.InputText): OpenaiChatMessage {
    const message: OpenaiChatMessage = {
        role: input.role,
        content: input.content,
    }
    return message
}
function outputText2OpenaiChatMessage(output: api.OutputText): OpenaiChatMessage {
    const message: OpenaiChatMessage = {
        role: output.role,
        content: output.content,
    }
    return message
}
function inputTexts2OpenaiChatMessages(input: api.InputText[]): OpenaiChatMessage[] {
    const result = input.map(inputText2OpenaiChatMessage)
    return result
}
function messages2OpenaiChatMessages(messages: api.Message[]): OpenaiChatMessage[] {
    const result: OpenaiChatMessage[] = []
    for (const message of messages) {
        if (message.input && message.input.text) {
            result.push(inputText2OpenaiChatMessage(message.input.text))
        } else if (message.output && message.output.text) {
            result.push(outputText2OpenaiChatMessage(message.output.text))
        }
    }
    return result
}


type OpenaiChatSSEFunc = (data: OpenaiChatSSE) => void

/* example OpenaiChatSSE object:
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
type OpenaiChatSSE = object

/* example OpenaiChatRespponse:
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
type OpenaiChatResponse = object

export default class OpenaiChatClient {
    apiKey: string
    options: any
    completionsUrl: string|undefined

    constructor(
        apiKey: string,
        options: any = {},
    ) {
        this.apiKey = apiKey;
        if (options && options.debug) {
            console.debug(`API key: ${apiKey}`);
        } 

        this.setOptions(options);
    }

    setOptions(options: any) {
        //console.log('setOptions', options)

        if (options.openaiApiKey) {
            this.apiKey = options.openaiApiKey;
        }

        this.options = {
            ...options,
            // set some good defaults (check for undefined in some cases because they may be 0)
            //model: modelOptions.model,
            temperature: typeof options.temperature === 'undefined' ? 0.8 : options.temperature,
            top_p: typeof options.top_p === 'undefined' ? 1 : options.top_p,
            presence_penalty: typeof options.presence_penalty === 'undefined' ? 1 : options.presence_penalty,
            stop: options.stop,
        };
        //console.log('options', this.options)

        this.completionsUrl = this.options.completionsUrl

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
      messages: OpenaiChatMessage[],
      internOptions: any = {},
      streamProgressFunc: OpenaiChatSSEFunc | undefined,
      abortController: AbortController = new AbortController()): Promise<OpenaiChatResponse|undefined> {
        let options = this.options

        if (streamProgressFunc && typeof streamProgressFunc === 'function') {
            options.stream = true
        }

        const { debug } = options;
        const modelOptions = {
            messages: messages,
            model: options.model,
            stream: options.stream,
            temperature: options.temperature,
            top_p: options.top_p,
            presence_penalty: options.presence_penalty,
            stop: options.stop,
        }

        const url = this.completionsUrl as string
        if (debug) {
            console.debug();
            console.debug(url);
            console.debug(modelOptions);
            console.debug();
        }

        if (streamProgressFunc && options.stream) {
            // stream:

            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                let done = false
                const finalKyReponse = await ky.post(
                    url,
                    {
                        headers: {
                            'Content-Type': 'application/json', // optional because set automatically
                            'Authorization': `Bearer ${this.apiKey}`,
                        },
                        json: modelOptions,
                        timeout: TIMEOUT_MILLIS,
                        hooks: utils.kyHooks(debug),
                        onDownloadProgress: utils.kyOnDownloadProgress4onMessage((message: any) => {
                            if (debug) {
                                console.log('onMessage() called', message)
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
                            streamProgressFunc(dataObj) // TODO: as OpenaiChatSSE
                        }),
                    }
                )
                // done

                // avoids some rendering issues when using the CLI app
                if (debug) {
                    console.debug();
                }
            }); // return
        }
        // no stream:
        let responseJson
        responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                json: modelOptions,
                timeout: TIMEOUT_MILLIS,
                hooks: utils.kyHooks(debug),
            }
        ).json()

        return responseJson as OpenaiChatResponse
    }
}

export class OpenaiChatFactory implements api.AIsAPIFactory<api.AIsServiceProps, OpenaiChatService> {
    createAIsService(props: api.AIsServiceProps, auth?: api.Auth): OpenaiChatService {
        return new OpenaiChatService(props, auth)
    }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: chatBaseServiceId, factory: new OpenaiChatFactory()})
api.AIsBreaker.getInstance().registerFactory({serviceId: chatBaseServiceId+'/gpt-4', factory: new OpenaiChatFactory()})
