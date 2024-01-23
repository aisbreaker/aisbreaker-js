import { api, base, extern, utils } from 'aisbreaker-api-js'
import { StreamProgressFunction } from 'aisbreaker-api-js/build/api/index.js'
import Replicate from "replicate"
import ApiError from "replicate"

// short cuts
const logger = utils.logger


//
// We use the replicate TypeScript NodeJs client lib (https://github.com/replicate/replicate-javascript)
//

export interface ReplicateComChatDefaults extends base.AIsServiceDefaults {
    /** default maximum output tokens */
    maxOutputTokens: number,
}

const defaultServiceId = 'chat:replicate.com'
const serviceDefaults: ReplicateComChatDefaults = {
  // model/engine - from https://replicate.com/
  engine: "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
  maxOutputTokens: 1*256,
}


//
// AIsBreaker connector implementation using TypeScritp package '@google-cloud/vertexai'
//

export interface ReplicateComChatProps extends api.AIsServiceProps {
  /** maximum output tokens */
  maxOutputTokens?: number
}

export class ReplicateComChatService extends base.BaseAIsService<ReplicateComChatProps, ReplicateComChatDefaults> {
  // properties to tune this service
  timeoutMillis = 3 * 60 * 1000 // 3 minutes
  enableDebug = true
  replicate: Replicate

  constructor(props: ReplicateComChatProps, serviceDefaults: ReplicateComChatDefaults, auth?: api.Auth) {
    super(props, serviceDefaults, auth)

    // check props
    if (!auth?.secret) {
      throw new api.AIsError(`ReplicateComChatService: missing auth.secret`, extern.ERROR_401_Unauthorized)
    }
    this.replicate = new Replicate({
      // get your token from https://replicate.com/account
      auth: auth.secret, // defaults to process.env.REPLICATE_API_TOKEN
    });
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
    //const allMessages = conversationState.getMessages()

    // update conversation (after creating allMessages)
    conversationState.addInputs(request.inputs)

    // prepare AI API request
    const abortController = utils.createSecondAbortControllerFromAbortController(request.abortSignal)
    const replicateOptions = {
      input: {
        prompt: request.inputs[0]?.text?.content || "",
        max_new_tokens: this.serviceProps.maxOutputTokens || serviceDefaults.maxOutputTokens,
      },
      signal: abortController.signal,
    }
    // The model version identifier in the format "{owner}/{name}" or "{owner}/{name}:{version}",
    // for example "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3"
    const replicateIdentifier = this.engine as `${string}/${string}` | `${string}/${string}:${string}`
    const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false
  
    //
    // generate
    //
    try {
      let outputs: api.Output[]
      let internResponse: any
      if (!isStreamingRequested) {
        //
        // no streaming (simple)
        //

        // action
        const aiOutput = await this.replicate.run(replicateIdentifier, replicateOptions)

        // result
        if (this.enableDebug) {
          console.log('aiOutput: ', JSON.stringify(aiOutput))
        }
        outputs = aiContent2Outputs(
          /*content:*/ aiOutput as string[],
          /*index:*/ 0,
          /*isDelta:*/ false,
          /*isProcessing:*/ false,
        )
        internResponse = aiOutput
      } else {

        //
        // streaming (more complex)
        //
        const streamProgressFunction = request.streamProgressFunction as api.StreamProgressFunction

        // action
        for await (const aiResponseEvent of (this.replicate.stream(replicateIdentifier, replicateOptions))) {
          // get streamed chunk
          if (this.enableDebug) {
            console.log('stream chunk: ', JSON.stringify(aiResponseEvent))
          }

          if (aiResponseEvent.event === "output") {
            // actual data received
            const outputs = aiContent2Outputs(
              /*content:*/ aiResponseEvent.data,
              /*index:*/ 0,
              /*isDelta:*/ true,
              /*isProcessing:*/ true,
            )
            const responseEvent: api.ResponseEvent = {
              outputs: outputs,
              internResponse: aiResponseEvent.data,
            }

            // collect for later aggregation
            responseCollector.addResponseEvent(responseEvent)

            // call progress function
            streamProgressFunction(responseEvent)
          }

          internResponse = responseCollector.getResponseFinalInternResponse
        }

        // almost final result
        outputs = responseCollector.getResponseFinalOutputs()
      }
      
      //
      // final result
      //

      // update conversation (after AI API request-response)
      conversationState.addOutputs(outputs)

      // create final response
      const responseFinal: api.ResponseFinal = {
        outputs: outputs,
        usage: {
          service: this.getService(),
          totalMilliseconds: responseCollector.getMillisSinceStart(),
        },
        internResponse: internResponse,
      }
      return responseFinal
    } catch (error: any) {
      // special error handling handling for "401 Unauthorized"
      if (error.name && error.name === "ApiError" && error.message && error.message.includes("401 Unauthorized")) {
        return new api.AIsError(error.message, extern.ERROR_401_Unauthorized)
      } else {
        throw error
      }
    }
  }

  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: api.Request): string | undefined {
    let contextService = super.getContextService() || 'ReplicateComChatService'
    //contextService += `->${this.url}`
    contextService += `->Replicate(model=${this.engine})`
    return contextService
  }
}


//
// data converters Replicate API <-> AIsBreaker API
//

function aiContent2Outputs(
  content: string | string[],
  index: number,
  isDelta: boolean,
  isProcessing: boolean
): api.Output[] {
  // build a single string result
  let resultText: string
  if (Array.isArray(content)) {
    // array of strings
    resultText = content.join("")
  } else {
    // single string
    resultText = content
  }
  const outputText: api.OutputText = {
    index: index,
    role: "assistant",
    content: resultText,
    isDelta: isDelta,
    isProcessing: isProcessing,
  }

  return [{ text: outputText, }]
}

//
// factory
//
export class ReplicateComChatFactory implements api.AIsAPIFactory<ReplicateComChatProps, ReplicateComChatService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): ReplicateComChatService {
      return new ReplicateComChatService(props, serviceDefaults, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new ReplicateComChatFactory()})
