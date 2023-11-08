import ky from 'ky-universal'
import { api, base, extern, utils } from 'aisbreaker-api-js'

// short cuts
const logger = utils.logger


//
// general API implementation for Huggingface.co inference API for text generation API,
// docs: https://huggingface.co/docs/api-inference/detailed_parameters#conversational-task
//
// ???general API implementation for Huggingface.co inference API for text generation API,
// ???docs: https://huggingface.co/docs/api-inference/detailed_parameters#text-generation-task
//
// More about the task-specific parameters:
//   https://huggingface.co/docs/inference-endpoints/supported_tasks#conversational
//
// curl example request:
//   curl -v https://api-inference.huggingface.co/models/microsoft/DialoGPT-large \
//        -X POST \
//        -d '{"inputs": {"past_user_inputs": ["Which movie is the best ?", "Can you explain why ?"], "generated_responses": ["It is Die Hard for sure.", "It'"'"'s the best movie ever."], "text":"Tell me more"}}' \
//        -H "Authorization: Bearer ${HF_API_TOKEN}"

/* TODO:
  Only return a conversationState if the Huggungface response contains a `conversation`.
  Having no `conversaton` in the response means that the model task is not a 'Conversational task'.
  If it's not a 'Conversational task', then sending `past_user_inputs` and `generated_responses` in the follow up request
  will result in a Http 415 Unsupported Media type error.
  ???
*/
export interface HuggingfaceCoChatDefaults extends base.AIsServiceDefaults { }

const defaultServiceId = 'chat:huggingface.co'
const serviceDefaults: HuggingfaceCoChatDefaults = {
  url: 'https://api-inference.huggingface.co/models/${engine}',
  // recommended default model/engine from https://huggingface.co/docs/api-inference/detailed_parameters#conversational-task :
  engine: 'microsoft/DialoGPT-large',           // this model can correctly answer "What is JavaScript?"
  //engine: 'microsoft/DialoGPT-small',         // this model cannot correctly answer "What is JavaScript?"
  //engine: 'facebook/blenderbot-400M-distill', // this model cannot correctly answer "What is JavaScript?"
}


export interface HuggingfaceCoChatProps extends api.AIsServiceProps { }

export class HuggingfaceCoChatService extends base.BaseAIsService<HuggingfaceCoChatProps, HuggingfaceCoChatDefaults> {
  // properties to tune this service
  timeoutMillis = 3 * 60 * 1000 // 3 minutes
  enableDebug = false
  enableTraceHttp = false

  constructor(props: HuggingfaceCoChatProps, serviceDefaults: HuggingfaceCoChatDefaults, auth?: api.Auth) {
    super(props, serviceDefaults, auth)

    // check props
    /* unauthorized access is allowed
    if (!auth?.secret) {
      throw new api.AIsError(`HuggingfaceCoChatService: missing auth.secret`, extern.ERROR_401_Unauthorized)
    }
    */
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
    
    // prepare collection/aggregation of statistics
    const responseCollector = new utils.ResponseCollector(request)

    // get all messages so far - this is the conversation context
    const conversationState = utils.DefaultConversationState.fromBase64(request.conversationState)
    const allMessages = conversationState.getMessages()
    const pastUserInputs = messages2HuggingfaceInputs(allMessages)
    const generatedResponses = messages2HuggingfaceOutputs(allMessages)

    // update conversation (after creating allMessages)
    conversationState.addInputs(request.inputs)

    // prepare AI API request
    const specialOpts = {} as any
    const huggingfaceChatRequest: HuggingfaceChatRequest = {
      inputs: {
        past_user_inputs: pastUserInputs,
        generated_responses: generatedResponses,
        text: request.inputs[0]?.text?.content || '',
        /*
        model: this.model,
        temperature: typeof specialOpts.temperature === 'undefined' ? 0.8 : specialOpts.temperature,
        top_p: typeof specialOpts.top_p === 'undefined' ? 1 : specialOpts.top_p,
        presence_penalty: typeof specialOpts.presence_penalty === 'undefined' ? 1 : specialOpts.presence_penalty,
        //stop: options.stop,
        */
      }
    }
    const abortController = utils.createSecondAbortControllerFromAbortController(request.abortSignal)

    let incompleteResponse: api.ResponseFinal | api.AIsError | undefined

    // always no streaming
    incompleteResponse = await this.processNonStreamingRequest(
      this.url,
      request,
      huggingfaceChatRequest,
      abortController,
      responseCollector,
      conversationState,
      context,
    )

    if (this.enableDebug) {
      logger.debug(`incompleteResp=${JSON.stringify(incompleteResponse)}`)
    }

    // complete result
    if (!incompleteResponse || incompleteResponse instanceof api.AIsError) {
      // some error
      return incompleteResponse
    }

    // update conversation (after Huggingface API request-response)
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
    HuggingfaceChatRequest: HuggingfaceChatRequest,
    abortController: AbortController,
    responseCollector: utils.ResponseCollector,
    conversationState: utils.DefaultConversationState,
    context: string
  ): Promise<api.ResponseFinal | api.AIsError> {
    const headers = (this.auth?.secret) ?
      {
        'Content-Type': 'application/json', // optional because set automatically
        'Authorization': `Bearer ${this.auth?.secret}`,
      }
      :
      {
        'Content-Type': 'application/json', // optional because set automatically
      }
    const responseJsonPromise = ky.post(
      url,
      {
        headers: headers,
        json: HuggingfaceChatRequest,
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
      return new api.AIsError('No result from Huggingface API (non-stream)', extern.ERROR_444_No_Response)
    }

    // convert response
    const huggingfaceChatResponse = responseJson as HuggingfaceChatResponse
    const resultOutputs = aiReponse2Outputs(huggingfaceChatResponse)

    // almost final result
    const incompleteResponse: api.ResponseFinal = {
      outputs: resultOutputs,
      usage: {
        service: this.getService(),
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },
      internResponse: huggingfaceChatResponse,
    }
    return incompleteResponse
  }

  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: api.Request): string | undefined {
    let contextService = super.getContextService() || 'HuggingfaceCoChatService'
    contextService += `->${this.url}`
    return contextService
  }
}


//
// data converters Huggingface API <-> AIsBreaker API
//
function aiReponse2Outputs(data: HuggingfaceChatResponse): api.Output[] {
    const d = data as any
    const outputs: api.Output[] = []

    if (d.generated_text) {
      const outputText: api.OutputText = {
        index: 0,
        role: 'assistant',
        content: d.generated_text,
        isDelta: false,
        isProcessing: false,
      }
      outputs.push({ text: outputText })
    }

    return outputs
}


//
// internal Huggingface specific stuff
//

type HuggingfaceChatMessage = string

/* Example HuggingfaceChatRequest
  {
    "inputs":{
        "past_user_inputs":[
          "Which movie is the best ?",
          "Can you explain why ?"
        ],
        "generated_responses":[
          "It is Die Hard for sure.",
          "It's the best movie ever."
        ],
        "text":"Tell me more"
    }
  }
*/
interface HuggingfaceChatRequest {
  inputs: HuggingfaceChatRequestInputs
}
interface HuggingfaceChatRequestInputs {
  past_user_inputs: string[]
  generated_responses: string[]
  text: string
}

function inputText2HuggingfaceChatMessage(input: api.InputText): HuggingfaceChatMessage {
  return input.content
}
function outputText2HuggingfaceChatMessage(output: api.OutputText): HuggingfaceChatMessage {
  return output.content
}

function messages2HuggingfaceInputs(messages: api.Message[]): HuggingfaceChatMessage[] {
  const result: HuggingfaceChatMessage[] = []
  for (const message of messages) {
      if (message.input && message.input.text) {
          result.push(inputText2HuggingfaceChatMessage(message.input.text))
      }
  }
  return result
}
function messages2HuggingfaceOutputs(messages: api.Message[]): HuggingfaceChatMessage[] {
  const result: HuggingfaceChatMessage[] = []
  for (const message of messages) {
      if (message.output && message.output.text) {
          result.push(outputText2HuggingfaceChatMessage(message.output.text))
      }
  }
  return result
}

/* example HuggingfaceChatRespponse:
    {
       "generated_text":"It's the best movie ever.",
       "conversation":{
          "past_user_inputs":[
             "Which movie is the best ?",
             "Can you explain why ?",
             "Tell me more"
          ],
          "generated_responses":[
             "It is Die Hard for sure.",
             "It's the best movie ever.",
             "It's really the very best movie ever."
          ]
       },
       "warnings":[
          "A decoder-only architecture is being used, but right-padding was detected! For correct generation results, please set `padding_side='left'` when initializing the tokenizer.",
          "Setting `pad_token_id` to `eos_token_id`:50256 for open-end generation.",
          "The attention mask and the pad token id were not set. As a consequence, you may observe unexpected behavior. Please pass your input's `attention_mask` to obtain reliable results.",
          "Using cls_token, but it is not set yet.",
          "Using mask_token, but it is not set yet.",
          "Using sep_token, but it is not set yet."
       ]
    }
*/
type HuggingfaceChatResponse = object


//
// factory
//
export class HuggingfaceCoChatFactory implements api.AIsAPIFactory<HuggingfaceCoChatProps, HuggingfaceCoChatService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): HuggingfaceCoChatService {
      return new HuggingfaceCoChatService(props, serviceDefaults, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new HuggingfaceCoChatFactory()})
