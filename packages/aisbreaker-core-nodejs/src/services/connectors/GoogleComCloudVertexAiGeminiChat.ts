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
  url: string
  project: string
  location: string
  engine: string
}

const defaultServiceId = 'chat:gemini.vertexai.google.com'
const serviceDefaults: GoogleComCloudVertexAiGeminiChatDefaults = {
  url: "https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/{engine}:streamGenerateContent",
  project: "united-storm-408415",
  location: "us-central1",
  // recommended default model/engine: TODO
  engine: "gemini-pro", // "gemini-pro-vision" not fully supported by this class yet
}


//
// AIsBreaker connector implementation using TypeScritp package '@google-cloud/vertexai'
//

export interface GoogleComCloudVertexAiGeminiChatProps extends api.AIsServiceProps { }

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


    // TODO: catch GoogleAuthError!!!


    /*
    // get all messages so far - this is the conversation context
    const conversationState = utils.DefaultConversationState.fromBase64(request.conversationState)
    const allMessages = conversationState.getMessages()
    const pastUserInputs = messages2GoogleVertexAiGeminiInputs(allMessages)
    const generatedResponses = messages2GoogleVertexAiGeminiOutputs(allMessages)

    // update conversation (after creating allMessages)
    conversationState.addInputs(request.inputs)
    */

    // prepare AI API request
    const specialOpts = {} as any

    const vertexaiRequest = {
      contents: inputs2VertextaiContents(request.inputs)
      //contents:   {role: 'user', parts: [{text: 'What is JavaScript?'}]}],
    };



    //
    // setup API/SDK
    //

    const project = serviceDefaults.project
    const location = serviceDefaults.location
  
    const validAuth = this.auth || { secret: process.env.GOOGLE_CLOUD_API_KEY }
    const vertex_ai = new VertexAI_for_AIsBreaker(validAuth, {project: project, location: location});
  
    // Instantiate models
    const generativeModel = vertex_ai.preview.getGenerativeModel({
        model: serviceDefaults.engine,
        // The following parameters are optional
        // They can also be passed to individual content generation requests
        safety_settings: [{category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE}],
        generation_config: {max_output_tokens: 4*256},
      });
  
    const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
        model: serviceDefaults.engine,
    });
  
  
    //
    // generate (stream)
    //
  
    // streaming
    /*
    const streamingResp = await generativeModel.generateContentStream(request);
    for await (const item of streamingResp.stream) {
      const i: GenerateContentResponse = item
      console.log('stream chunk: ', JSON.stringify(item));
    }
    const response1 = await streamingResp.response
    console.log('aggregated response: ', JSON.stringify(response1));
    */

    // no streaming
    const normalResp = await generativeModel.generateContent(vertexaiRequest);
    const contentResponse = await normalResp.response
    console.log('aggregated response: ', JSON.stringify(contentResponse));
  


    // update conversation (after GoogleVertexAiGemini API request-response)
    //TODO: conversationState.addOutputs(incompleteResponse.outputs)

    // return response
    const usage = {
      service: this.getService(),
      totalMilliseconds: responseCollector.getMillisSinceStart(),
    }
    const responseFinal: api.ResponseFinal = 
      vertexaiGenerateContentResponse2ResponseFinal(contentResponse, usage)
    
    
    return responseFinal
  }



  /** process non-streaming *
  async processNonStreamingRequest(
    url: string,
    request: api.Request,
    googleVertexAiGeminiChatRequest: GoogleVertexAiGeminiChatRequest,
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
        json: googleVertexAiGeminiChatRequest,
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
      return new api.AIsError('No result from GoogleVertexAiGemini API (non-stream)', extern.ERROR_444_No_Response)
    }

    // convert response
    const googleVertexAiGeminiChatResponse = responseJson as GoogleVertexAiGeminiChatResponse
    const resultOutputs = aiReponse2Outputs(googleVertexAiGeminiChatResponse)

    // almost final result
    const incompleteResponse: api.ResponseFinal = {
      outputs: resultOutputs,
      usage: {
        service: this.getService(),
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },
      internResponse: googleVertexAiGeminiChatResponse,
    }
    return incompleteResponse
  }
*/
  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: api.Request): string | undefined {
    let contextService = super.getContextService() || 'GoogleComCloudVertexAiGeminiChatService'
    contextService += `->${this.url}`
    return contextService
  }
}


//
// data converters Google Cloud VertexAI Gemini API <-> AIsBreaker API
//

function vertexaiGenerateContentResponse2ResponseFinal(
  contentResponse: GenerateContentResponse,
  usage: api.Usage
): api.ResponseFinal {
  // put all outputs of all candidates into one array
  const outputs = contentResponse.candidates.flatMap((contentCandidate) => {
    const singleOutputs = vertexaiGenerateContentCandidate2Outputs(contentCandidate, /*isDelta:*/ false)
    return singleOutputs
  })

  // put everything together
  const responseFinal: api.ResponseFinal = {
    outputs: outputs,
    // TODO: conversationState?: string;
    usage: usage,
    internResponse: contentResponse,
  }
  return responseFinal
}
//function aiReponse2Outputs(data: GoogleVertexAiGeminiChatResponse): api.Output[] {
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
