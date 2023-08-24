import ky, { HTTPError, KyResponse, TimeoutError } from 'ky-universal'
import * as tiktoken from 'tiktoken'
import { api, base, extern, utils } from 'aisbreaker-api-js'

// short cuts
const logger = utils.logger


//
// AIsNetworkClient: Service (client) to access a remote AIsBreaker (proxy) server.
//

const chatBaseServiceId = 'chat:openai.com'

const DEFAULT_CHATGPT_MODEL = 'gpt-3.5-turbo'
const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions'
const TIMEOUT_MILLIS = 3 * 60 * 1000 // 3 minutes
const DEBUG = true
const TRACE_HTTP = false

export interface OpenaiComChatProps extends api.AIsServiceProps {
  /** access this OpenAI API server */
  url?: string
}

export class OpenaiComChatService extends base.BaseAIsService<OpenaiComChatProps> {
  model: string
  url: string

  constructor(props: OpenaiComChatProps, auth?: api.Auth) {
    super(props, auth)

    // check props
    if (!auth?.secret) {
        throw new api.AIsError(`OpenaiComChatService: missing auth.secret`, extern.ERROR_401_Unauthorized)
    }

    // determine some OpenAI details
    this.model = this.getModelFromServiceId(props.serviceId) || DEFAULT_CHATGPT_MODEL
    this.url = this.serviceProps.url || DEFAULT_URL
  }

  getEngine(model: string = DEFAULT_CHATGPT_MODEL): api.Engine {
      const engine: api.Engine = {
          serviceId: `${chatBaseServiceId}/${model}`
      }
      return engine
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
        model: this.model,
        stream: isStreamingRequested,
        temperature: typeof specialOpts.temperature === 'undefined' ? 0.8 : specialOpts.temperature,
        top_p: typeof specialOpts.top_p === 'undefined' ? 1 : specialOpts.top_p,
        presence_penalty: typeof specialOpts.presence_penalty === 'undefined' ? 1 : specialOpts.presence_penalty,
        //stop: options.stop,
    }
    const abortController = utils.createSecondAbortControllerFromAbortController(request.abortSignal)

    let incompleteResp: IncompleteFinalResponse | api.AIsError | undefined
    if (!isStreamingRequested) {
      // no streaming (simple)
      incompleteResp = await this.processNonStreamingRequest(
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
      incompleteResp = await this.processStreamingRequest(
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
    if (!incompleteResp || incompleteResp instanceof api.AIsError) {
      // some error
      return incompleteResp
    }

    // update conversation (after OpenAI API request-response)
    conversationState.addOutputs(incompleteResp.outputs)

    // return response
    const responseFinal: api.ResponseFinal = {
      outputs: incompleteResp.outputs,
      conversationState: conversationState.toBase64(),
      usage: incompleteResp.usage,
      internResponse: incompleteResp.internResponse,
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
  ): Promise<IncompleteFinalResponse | api.AIsError> {
    const responseJsonPromise = ky.post(
      url,
      {
          headers: {
              'Content-Type': 'application/json', // optional because set automatically
              'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-OpenaiComChatService'}`,
          },
          json: openaiChatRequest,
          timeout: TIMEOUT_MILLIS,
          hooks: utils.kyHooksToReduceLogging(TRACE_HTTP),
          throwHttpErrors: true,
          /*
          dispatcher: new Agent({
              bodyTimeout: 0,
              headersTimeout: 0,
          }),
          */
          signal: abortController.signal,
      }
    ).json()
    const responseJson = await responseJsonPromise

    // simple checks of the result
    if (DEBUG) {
      logger.debug(`responseJson: ${JSON.stringify(responseJson)}`)
    }
    if (!responseJson) {
      return new api.AIsError('No result from OpenAI API (non-stream)', extern.ERROR_444_No_Response)
    }

    // convert response
    const openaiChatResponse = responseJson as OpenaiChatResponse
    const resultOutputs = openaiChatReponse2Outputs(openaiChatResponse)

    // summarize the non-streamed result result, incl. usage
    const resultUsage = {
        engine: this.getEngine((openaiChatResponse as any)?.model),
        //totalTokens: r?.usage?.total_tokens,
        totalMilliseconds: responseCollector.getMillisSinceStart(),
    }
    /*
    if (shouldGenerateTitle) {
      conversation.title = await this.generateTitle(userMessage, replyMessage);
      returnData.title = conversation.title;
    }
    */

    // almost final result
    const incompleteFinalResponse: IncompleteFinalResponse = {
      outputs: resultOutputs,
      usage: resultUsage,
      internResponse: openaiChatResponse,
    }
    return incompleteFinalResponse
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
  ): Promise<IncompleteFinalResponse | api.AIsError | undefined> {

    let responseFinal: api.ResponseFinal | undefined
    let errorFinal: api.AIsError | undefined

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
          timeout: TIMEOUT_MILLIS,
          hooks: utils.kyHooksToReduceLogging(TRACE_HTTP),
          throwHttpErrors: true,
          onDownloadProgress: utils.kyOnDownloadProgress4onMessage((message: any) => {
            try {
              if (DEBUG) {
                  logger.debug('onMessage() called', message)
              }
              if (!message.data || message.event === 'ping') {
                  return;
              }
              if (message.data === '[DONE]') {
                  // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the Promise/resolve will return instead
                  abortController.abort()
                  //done = true;
                  return
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
              }
              */
              // normal data received (without event name)
              const dataObj = JSON.parse(message.data)
              streamOpenaiProgressFunc(dataObj)

            } catch (error) {
              logger.warn(`${context} onDownloadProgress() error:`, error)
            }
          }),
          /*
          dispatcher: new Agent({
              bodyTimeout: 0,
              headersTimeout: 0,
          }),
          */
          signal: abortController.signal,
      }
    ).text() 
    //logger.debug("final text", responseTextIgnored)

    // error response from OpenAI API (not from SSE)?
    let errorStr: string | undefined
    logger.debug('final ky reponse (streamed): responseText: ', responseText)
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
    const resultOutputs = responseCollector.getResponseFinalOutputs()
    const inputsTokens = this.countInputsTokens(request.inputs)
    const outputsTokens = this.countOutputsTokens(resultOutputs)
    const resultUsage = {
        engine: this.getEngine(responseCollector.lastObservedEngineId),
        //totalTokens: inputsTokens + outputsTokens,
        totalMilliseconds: responseCollector.getMillisSinceStart(),
    }
    /*
    if (shouldGenerateTitle) {
      conversation.title = await this.generateTitle(userMessage, replyMessage);
      returnData.title = conversation.title;
    }
    */

    // avoids some rendering issues when using the CLI app (TODO: can this be deleted or moved to the CLI app???)
    /*
    if (DEBUG) {
      logger.debug()
    }
    */
  
    // almost final result
    const incompleteFinalResponse: IncompleteFinalResponse = {
      outputs: resultOutputs,
      usage: resultUsage,
      internResponse: responseCollector.getResponseFinalInternResponse,
    }
    return incompleteFinalResponse
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

interface IncompleteFinalResponse {
  outputs: api.Output[]
  usage: api.Usage
  internResponse: any
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
export class OpenaiComChatFactory implements api.AIsAPIFactory<api.AIsServiceProps, OpenaiComChatService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): OpenaiComChatService {
      return new OpenaiComChatService(props, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: chatBaseServiceId, factory: new OpenaiComChatFactory()})
api.AIsBreaker.getInstance().registerFactory({serviceId: chatBaseServiceId+'/gpt-4', factory: new OpenaiComChatFactory()})
