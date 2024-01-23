import { api, base, extern, utils } from 'aisbreaker-api-js'
import {
   VertexInit,
   VertexAI,
   VertexAI_Internal,
   HarmCategory,
   HarmBlockThreshold, GenerateContentResponse, GenerateContentCandidate, Content } from '@google-cloud/vertexai'
import { auth2GoogleCloudAccessToken, logGoogleCloudAccessTokenDetails } from './GoogleComCloudUtils.js'


// short cuts
const logger = utils.logger


//
// We use the Google Cloud Vertex AI JavaScript/SDK client library:
//    - https://github.com/googleapis/nodejs-vertexai/
//    - https://www.npmjs.com/package/@google-cloud/vertexai
// Hint: the error "401 Unauthorized" for an invalid access token when using the Google SDK
//       is currently not handled correctly by the SDK: It does not throw an error
//       but only logs the error to console and then hangs until the timeout occurs.

//
// Pure REST API - currently not used:
// API implementation for Google Cloud Vertex AI Gemini API,
// docs:
//   - https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/overview
//   - https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini#multimodal_1
//   - https://github.com/googleapis/nodejs-vertexai/
//
// curl example request:
//   curl -v https://us-central1-aiplatform.googleapis.com/v1/projects/united-storm-408415/locations/us-central1/publishers/google/models/gemini-pro:streamGenerateContent \
//        -X POST \
//        -d '{"contents": {"role": "user", "parts": {"text": "What is JavaScript?"}}}' \
//        -H "Authorization: Bearer ${GOOGLECLOUD_ACCESS_TOKEN}"
//
// JavaScript example request:
//   - https://github.com/googleapis/nodejs-vertexai/#readme
//

export interface GoogleComCloudVertexAiGeminiChatDefaults extends base.AIsServiceDefaults {
  /** default Google Cloud project ID */
  project: string
  /** default Google Cloud location ID */
  location: string
  /** default model/engine */
  engine: string
  /** default maximum output tokens */
  maxOutputTokens: number,
}

const defaultServiceId = 'chat:gemini.vertexai.google.com'
const serviceDefaults: GoogleComCloudVertexAiGeminiChatDefaults = {
  // url not needed when using the Google Cloud SDK
  //url: "https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/{engine}:streamGenerateContent",

  project: "united-storm-408415",
  location: "us-central1",
  // model/engine "gemini-pro-vision" not fully supported by this class yet
  engine: "gemini-pro",
  maxOutputTokens: 4*256,
}


//
// AIsBreaker connector implementation using TypeScritp package '@google-cloud/vertexai'
//

export interface GoogleComCloudVertexAiGeminiChatProps extends api.AIsServiceProps {
  /** Google Cloud project ID (where the model is deployed, the user/token has access) */
  project?: string
  /** Google Cloud location ID(where the model is deployed, the user/token has access) */
  location?: string
  /** maximum output tokens */
  maxOutputTokens?: number
}

export class GoogleComCloudVertexAiGeminiChatService extends base.BaseAIsService<GoogleComCloudVertexAiGeminiChatProps, GoogleComCloudVertexAiGeminiChatDefaults> {
  // properties to tune this service
  timeoutMillis = 3 * 60 * 1000 // 3 minutes
  enableDebug = false
  enableTraceHttp = false

  constructor(props: GoogleComCloudVertexAiGeminiChatProps, serviceDefaults: GoogleComCloudVertexAiGeminiChatDefaults, auth?: api.Auth) {
    super(props, serviceDefaults, auth)

    // check props
    /* unauthorized access is allowed
    if (!auth?.secret) {
      throw new api.AIsError(`GoogleComCloudVertexAiGeminiChatService: missing auth.secret`, extern.ERROR_401_Unauthorized)
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

    // update conversation (before AI API request-response)
    const conversationState = utils.DefaultConversationState.fromBase64(request.conversationState)
    conversationState.addInputs(request.inputs)

    // get all messages so far - this is the conversation context
    const allMessages = conversationState.getMessages()
    const allVertextaiContents = messages2VertextaiContents(allMessages)
    
    // prepare AI API request
    const vertexaiRequest = {
      contents: allVertextaiContents
    }
    const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false


    //
    // setup API/SDK
    //
    const project = this.serviceProps.project || serviceDefaults.project
    const location = this.serviceProps.location || serviceDefaults.location

    const fallbackAuth = {
      secret:
       process.env.GOOGLE_CLOUD_API_KEY ||
       process.env.GOOGLE_CLOUD_API_KEY_service_account ||
       process.env.GOOGLE_CLOUD_API_KEY_authorized_user,
    }
    const validAuth = this.auth || fallbackAuth
    const vertex_ai = new VertexAI_for_AIsBreaker(validAuth, {project: project, location: location});
  
    // Instantiate models
    const maxOutputTokens = this.serviceProps.maxOutputTokens || serviceDefaults.maxOutputTokens
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: serviceDefaults.engine,
      // The following parameters are optional
      // They can also be passed to individual content generation requests
      safety_settings: [{category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE}],
      generation_config: {max_output_tokens: maxOutputTokens},
    });
  
  
    //
    // generate
    //
    let contentResponse: GenerateContentResponse
    if (!isStreamingRequested) {
      // no streaming (simple)
      const normalResp = await generativeModel.generateContent(vertexaiRequest)
      contentResponse = await normalResp.response

    } else {
      // streaming (more complex)
      const streamProgressFunction = request.streamProgressFunction as api.StreamProgressFunction
      const streamingResp = await generativeModel.generateContentStream(vertexaiRequest)
      for await (const responseEventItem of streamingResp.stream) {
        // stream chunk
        console.log('stream chunk: ', JSON.stringify(responseEventItem))
        const responseEventOutputs = vertexaiGenerateContentResponse2Outputs(responseEventItem, /*isDelta:*/ true)
        const responseEvent: api.ResponseEvent = {
          outputs: responseEventOutputs,
          internResponse: responseEventItem,
        }
        streamProgressFunction(responseEvent)
      }
      // aggregated final response
      contentResponse = await streamingResp.response
    }
    console.log('aggregated response: ', JSON.stringify(contentResponse));

    //
    // final result
    //

    // convert response
    const resultOutputs = vertexaiGenerateContentResponse2Outputs(contentResponse, /*isDelta:*/ false)

    // update conversation (after AI API request-response)
    conversationState.addOutputs(resultOutputs)

    // return response
    const responseFinal: api.ResponseFinal = {
      outputs: resultOutputs,
      conversationState: conversationState.toBase64(),
      usage: {
        service: this.getService(),
        //totalTokens: r?.usage?.total_tokens,
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },
      internResponse: contentResponse,
    } 
    
    return responseFinal
  }

  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: api.Request): string | undefined {
    let contextService = super.getContextService() || 'GoogleComCloudVertexAiGeminiChatService'
    //contextService += `->${this.url}`
    contextService += `->GoogleCloud(project=${this.serviceProps.project},location=${this.serviceProps})`
    return contextService
  }
}


//
// data converters Google Cloud VertexAI Gemini API <-> AIsBreaker API
//

function vertexaiGenerateContentResponse2Outputs(contentResponse: GenerateContentResponse, isDelta: boolean): api.Output[] {
  // put all outputs of all candidates into one array
  const outputs = contentResponse.candidates.flatMap((contentCandidate) => {
    const singleOutputs = vertexaiGenerateContentCandidate2Outputs(contentCandidate, isDelta)
    return singleOutputs
  })
  return outputs
}
function vertexaiGenerateContentCandidate2Outputs(contentCandidate: GenerateContentCandidate, isDelta: boolean): api.Output[] {
  const outputs = vertexaiContent2Outputs(
    contentCandidate.content,
    contentCandidate.index || 0,
    isDelta,
    /*isProcessing:*/ (contentCandidate.finishReason ? false : true)
  )
  return outputs
}
function vertexaiContent2Outputs(
  content: Content,
  index: number,
  isDelta: boolean,
  isProcessing: boolean
): api.Output[] {
  const outputs: api.Output[] = []
  for (const part of content.parts) {
    if (part.text) {
      const outputText: api.OutputText = {
        index: index,
        role: vertexaiRole2OutputRole(content.role),
        content: part.text,
        isDelta: isDelta,
        isProcessing: isProcessing,
      }
      outputs.push({ text: outputText })
    }
  }
  return outputs
}
function vertexaiRole2OutputRole(vertexaiRole?: string): api.OutputTextRoleType {
  switch (vertexaiRole) {
    //case 'user': return 'user'
    case 'model': return 'assistant'
    default: return 'assistant'
  }
}

function role2VertexaiRole(role: api.InputTextRoleType | api.OutputTextRoleType | undefined ): string {
  switch (role) {
    case 'user': return 'user'
    case 'system': return 'system'
    case 'assistant': return 'model'
    default: return 'assistant'
  }
}

function inputs2VertextaiContents(inputs: api.Input[]): Content[] {
  const result: Content[] = []
  for (const input of inputs) {
    const content = input2VertextaiContent(input)
    if (content) {
      result.push(content)
    }
  }
  return result
}
function input2VertextaiContent(input: api.Input): Content | undefined {
  if (input.text) {
    return {
      role: role2VertexaiRole(input.text.role),
      parts: [
        {
          text: input.text.content,
        },
      ],
    }
  }

  return undefined
}
function output2VertextaiContent(output: api.Output): Content | undefined {
  if (output.text) {
    return {
      role: role2VertexaiRole(output.text.role),
      parts: [
        {
          text: output.text.content,
        },
      ],
    }
  }

  return undefined
}

function messages2VertextaiContents(messages: api.Message[]): Content[] {
  const result: Content[] = []

  // combine successive messages with the same role
  let lastRole: api.InputTextRoleType | api.OutputTextRoleType | undefined = undefined
  let lastVertextaiContent: Content | undefined = undefined
  for (const message of messages) {
    if (message.input && message.input.text) {
      if (lastRole === message.input.text.role) {
        lastVertextaiContent?.parts.push({text: message.input.text.content})
      } else {
        lastVertextaiContent = input2VertextaiContent(message.input)
        if (lastVertextaiContent) {
          result.push(lastVertextaiContent)
          lastRole = message.input.text.role
        } else {
          lastRole = undefined
        }
      }
    } else if (message.output && message.output.text) {
      if (lastRole === message.output.text.role) {
        lastVertextaiContent?.parts.push({text: message.output.text.content})
      } else {
        lastVertextaiContent = output2VertextaiContent(message.output)
        if (lastVertextaiContent) {
          result.push(lastVertextaiContent)
          lastRole = message.output.text.role
        } else {
          lastRole = undefined
        }
      }
    }
  }
  return result
}

//
// internal GoogleVertexAiGemini specific stuff
//


//
// customize Google VertexAI JavaScript client library - for multi-tenancy/multi-google-cloud-account handling
//

class VertexAI_for_AIsBreaker extends VertexAI {
  public preview: VertexAI_Internal;

  /**
   * @constructor
   * @param{VertexInit} init - {@link VertexInit} 
   *       assign authentication related information to instantiate a Vertex AI client.
   */
  constructor(auth: api.Auth, init: VertexInit) {
    super(init)
    this.preview = new VertexAI_Internal_for_AIsBreaker(
      auth,
      init.project,
      init.location,
      init.apiEndpoint
    );
  }
}

class VertexAI_Internal_for_AIsBreaker extends VertexAI_Internal {
  constructor(
    readonly auth: api.Auth,
    readonly project: string,
    readonly location: string,
    readonly apiEndpoint?: string
  ) {
    super(project, location, apiEndpoint)
  }

  get token(): Promise<any> {
    return auth2GoogleCloudAccessToken(this.auth)
  }
}


//
// factory
//
export class GoogleComCloudVertexAiGeminiChatFactory implements api.AIsAPIFactory<GoogleComCloudVertexAiGeminiChatProps, GoogleComCloudVertexAiGeminiChatService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): GoogleComCloudVertexAiGeminiChatService {
      return new GoogleComCloudVertexAiGeminiChatService(props, serviceDefaults, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new GoogleComCloudVertexAiGeminiChatFactory()})
