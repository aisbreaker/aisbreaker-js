import ky from 'ky-universal'
import * as tiktoken from 'tiktoken'
import { api, base, extern, utils } from 'aisbreaker-api-js'

// short cuts
const logger = utils.logger


//
// general API implementation for OpenAI Chat completion API
//

export interface OpenaiComChatDefaults extends base.AIsServiceDefaults { }

const defaultServiceId = 'chat:openai.com'
const serviceDefaults: OpenaiComChatDefaults = {
  url: 'https://api.openai.com/v1/chat/completions',
  // OpenAI model/engine lists:
  // - https://platform.openai.com/docs/models/gpt-3-5
  // - https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo
  //engine: 'gpt-3.5-turbo', // worked 2023-11-08 and before; Currently points to gpt-3.5-turbo-0613. Will point to gpt-3.5-turbo-1106 starting Dec 11, 2023
  engine: 'gpt-3.5-turbo-1106', // worked 2023-11-08
  //engine: 'gpt-4', // worked 2023-11-08
  //engine: 'gpt-4-1106-preview', // (GPT-4 Turbo) worked 2023-11-08
  //engine: 'gpt-4-vision-preview', // (GPT-4 Turbo with vision) worked 2023-11-08
}


export interface OpenaiComChatProps extends api.AIsServiceProps { }

export class OpenaiComChatService extends base.BaseAIsService<OpenaiComChatProps, OpenaiComChatDefaults> {
  // properties to tune this service
  timeoutMillis = 3 * 60 * 1000 // 3 minutes
  enableDebug = false
  enableTraceHttp = false
  
  constructor(props: OpenaiComChatProps, serviceDefaults: OpenaiComChatDefaults, auth?: api.Auth) {
    super(props, serviceDefaults, auth)

    // check props
    if (!auth?.secret) {
      throw new api.AIsError(`OpenaiComChatService: missing auth.secret`, extern.ERROR_401_Unauthorized)
    }
  }

  /**
   * Do the work of process()
   * without the need to care about all error handling.
   * 
   * @param request  the request to process
   * @param context  optional context information/description/message prefix
   *                 for logging and for error messages
   * @returns The final result.
   *          In the case of an error it returns an AIsError OR throws an AIError or general Error.
   */
  async processUnprotected(request: api.Request, context: string): Promise<api.ResponseFinal | api.AIsError | undefined> {
    logger.debug(`${context} START`)
    
    // prepare collection/aggregation of partial responses
    const responseCollector = new utils.ResponseCollector(request)

    // update conversation (before OpenAI API request-response)
    const conversationState = utils.DefaultConversationState.fromBase64(request.conversationState)
    conversationState.addInputs(request.inputs)

    // get all messages so far - this is the conversation context
    const allMessages = conversationState.getMessages()
    const allOpenaiChatMessages = messages2OpenaiChatMessages(allMessages)

    // prepare OpenAI API request
    const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false
    const specialOpts = {} as any
    const openaiChatRequest: OpenaiChatRequest = {
        messages: allOpenaiChatMessages,
        model: this.engine,
        stream: isStreamingRequested,
        temperature: typeof specialOpts.temperature === 'undefined' ? 0.8 : specialOpts.temperature,
        top_p: typeof specialOpts.top_p === 'undefined' ? 1 : specialOpts.top_p,
        presence_penalty: typeof specialOpts.presence_penalty === 'undefined' ? 1 : specialOpts.presence_penalty,
        //stop: options.stop,
    }
    const abortController = utils.createSecondAbortControllerFromAbortController(request.abortSignal)

    let incompleteResponse: api.ResponseFinal | api.AIsError | undefined
    if (!isStreamingRequested) {
      // no streaming (simple)
      incompleteResponse = await this.processNonStreamingRequest(
        this.url,
        request,
        openaiChatRequest,
        abortController,
        responseCollector,
        conversationState,
        context,
      )

    } else {
      // streaming (more complex)
      incompleteResponse = await this.processStreamingRequest(
        this.url,
        request,
        openaiChatRequest,
        abortController,
        responseCollector,
        conversationState,
        context,
      )
    }

    // complete result
    if (!incompleteResponse || incompleteResponse instanceof api.AIsError) {
      // some error
      return incompleteResponse
    }

    // update conversation (after OpenAI API request-response)
    conversationState.addOutputs(incompleteResponse.outputs)

    // return response
    const responseFinal: api.ResponseFinal = {
      outputs: incompleteResponse.outputs,
      conversationState: conversationState.toBase64(),
      usage: incompleteResponse.usage,
      internResponse: incompleteResponse.internResponse,
    }
    return responseFinal
  }

  /** process non-streaming */
  async processNonStreamingRequest(
    url: string,
    request: api.Request,
    openaiChatRequest: OpenaiChatRequest,
    abortController: AbortController,
    responseCollector: utils.ResponseCollector,
    conversationState: utils.DefaultConversationState,
    context: string
  ): Promise<api.ResponseFinal | api.AIsError> {
    const responseJsonPromise = ky.post(
      url,
      {
        headers: {
          'Content-Type': 'application/json', // optional because set automatically
          'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-OpenaiComChatService'}`,
        },
        json: openaiChatRequest,
        timeout: this.timeoutMillis,
        hooks: utils.kyHooksToReduceLogging(this.enableTraceHttp),
        throwHttpErrors: true,
        signal: abortController.signal,
      }
    ).json()
    const responseJson = await responseJsonPromise

    // simple checks of the result
    if (this.enableDebug) {
      logger.debug(`responseJson: ${JSON.stringify(responseJson)}`)
    }
    if (!responseJson) {
      return new api.AIsError('No result from OpenAI API (non-stream)', extern.ERROR_444_No_Response)
    }

    // convert response
    const openaiChatResponse = responseJson as OpenaiChatResponse
    const resultOutputs = aiReponse2Outputs(openaiChatResponse)

    // summarize the non-streamed result result, incl. usage
    /*
    if (shouldGenerateTitle) {
      conversation.title = await this.generateTitle(userMessage, replyMessage);
      returnData.title = conversation.title;
    }
    */

    // almost final result
    const incompleteResponse: api.ResponseFinal = {
      outputs: resultOutputs,
      usage: {
        service: this.getService((openaiChatResponse as any)?.model),
        //totalTokens: r?.usage?.total_tokens,
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },
      internResponse: openaiChatResponse,
    }
    return incompleteResponse
  }

  /** process streaming */
  async processStreamingRequest(
    url: string,
    request: api.Request,
    openaiChatRequest: OpenaiChatRequest,
    abortController: AbortController,
    responseCollector: utils.ResponseCollector,
    conversationState: utils.DefaultConversationState,
    context: string
  ): Promise<api.ResponseFinal | api.AIsError | undefined> {

    const streamProgressFunction = request.streamProgressFunction as api.StreamProgressFunction
    const streamOpenaiProgressFunc: OpenaiChatSSEFunc = (data: OpenaiChatSSE) => {
      // convert SSE to response event
      const responseEvent = createResponseEventFromOpenaiChatSSEAndCollectIt(data, responseCollector)
      // call upstream progress function
      streamProgressFunction(responseEvent)
    }

    // ky.post() responseText can maybe ignored,
    // but we need to wait for the Promise of .text() to finish
    const responseText = await ky.post(
      url,
      {
        headers: {
          'Content-Type': 'application/json', // optional because set automatically
          'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-OpenaiComChatService'}`,
        },
        json: openaiChatRequest,
        timeout: this.timeoutMillis,
        hooks: utils.kyHooksToReduceLogging(this.enableTraceHttp),
        throwHttpErrors: true,
        onDownloadProgress: utils.kyOnDownloadProgress4onMessage((message: any) => {
          try {
            if (this.enableDebug) {
                logger.debug('onMessage() called', message)
            }
            if (!message.data || message.event === 'ping') {
                return;
            }
            /*
            if (message.event === 'error') {
              let dataObj = JSON.parse(message.data)
              if (dataObj.error) {
                dataObj = dataObj.error
              }
              errorFinal = api.AIsError.fromAIsErrorData(dataObj)
              logger.warn("STREAMED ERROR errorFinal: ", errorFinal)
              if (errorFinal) {
                throw errorFinal
              }
              return
            }
            */
            if (message.data === '[DONE]') {
              // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the return will resolve the Promise
              abortController.abort()
              return
            }
            // normal data received (without event name)
            const dataObj = JSON.parse(message.data)
            streamOpenaiProgressFunc(dataObj)

          } catch (error) {
            logger.warn(`${context} onDownloadProgress() error:`, error)
          }
        }),
        signal: abortController.signal,
      }
    ).text() 

    // error response from OpenAI API (not from SSE)?
    let errorStr: string | undefined
    if (this.enableDebug) {
      logger.debug('final ky reponse (streamed): responseText: ', responseText)
    }
    try {
        //if (respStr && respStr.toLowerCase().includes("error")) {
        //    errorStr = ""+respStr
        //}
        const resp = JSON.parse(responseText)
        if (resp.error) {
            errorStr = JSON.stringify(resp.error)
        }
    } catch (e) {
        // ignore JSON parse errors
    }
    if (errorStr) {
      return new api.AIsError("OpenAI API Stream Error: "+errorStr, extern.ERROR_503_Service_Unavailable)
    }

    // summarize the streamed result, incl. usage caclulation
    /*
    if (shouldGenerateTitle) {
      conversation.title = await this.generateTitle(userMessage, replyMessage);
      returnData.title = conversation.title;
    }
    */
  
    // almost final result
    const resultOutputs = responseCollector.getResponseFinalOutputs()
    const incompleteResponse: api.ResponseFinal = {
      outputs: resultOutputs,
      usage: {
        service: this.getService(responseCollector.lastObservedEngineId),
        //const inputsTokens = this.countInputsTokens(request.inputs)
        //const outputsTokens = this.countOutputsTokens(resultOutputs)
        //totalTokens: inputsTokens + outputsTokens,
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },
      internResponse: responseCollector.getResponseFinalInternResponse,
    }
    return incompleteResponse
  }


  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: api.Request): string | undefined {
    let contextService = super.getContextService() || 'OpenaiComChatService'
    contextService += `->${this.url}`
    return contextService
  }


  //
  // helpers for token counting
  //

  private tiktokenEncoding = tiktoken.encoding_for_model('gpt-3.5-turbo')
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


//
// data converters OpenAI API <-> AIsBreaker API
//
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

function aiReponse2Outputs(data: OpenaiChatResponse): api.Output[] {
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

interface OpenaiChatRequest {
  messages: OpenaiChatMessage[]
  model: string
  stream: boolean
  temperature: number
  top_p: number
  presence_penalty: number
  //stop: string[]
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


//
// factory
//
export class OpenaiComChatFactory implements api.AIsAPIFactory<OpenaiComChatProps, OpenaiComChatService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): OpenaiComChatService {
      return new OpenaiComChatService(props, serviceDefaults, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new OpenaiComChatFactory()})
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId+'/gpt-4', factory: new OpenaiComChatFactory()})
