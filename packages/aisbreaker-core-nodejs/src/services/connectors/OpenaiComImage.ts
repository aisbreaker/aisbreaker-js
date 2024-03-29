import { api, base, extern, utils } from 'aisbreaker-api-js'
import ky from 'ky-universal'


//
// general API implementation for OpenAI Image generation API
//
// API docs: https://platform.openai.com/docs/api-reference/images/create
// API url:  https://api.openai.com/v1/images/generations
//

export interface OpenaiComImageDefaults extends base.AIsServiceDefaults { }

const defaultServiceId = 'text-to-image:openai.com'
const serviceDefaults: OpenaiComImageDefaults = {
  url: 'https://api.openai.com/v1/images/generations',
  //engine: '',
}

const TIMEOUT_MILLIS = 3 * 60 * 1000 // 3 minutes

export interface OpenaiComImageProps extends api.AIsServiceProps { }


export class OpenaiComImageService extends base.BaseAIsService<OpenaiComImageProps, OpenaiComImageDefaults> {
  constructor(props: OpenaiComImageProps, serviceDefaults: OpenaiComImageDefaults, auth?: api.Auth) {
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
    // prepare collection/aggregation of partial responses
    const responseCollector = new utils.ResponseCollector(request)

    // update conversation (before OpenAI API request-response)
    const conversationState = utils.DefaultConversationState.fromBase64(request.conversationState)
    conversationState.addInputs(request.inputs)

    // get all messages so far - this is the conversation context
    const allMessages = conversationState.getMessages()
    const prompt = inputMessages2SinglePrompt(allMessages)

    // requested image details
    let size = '256x256'
    if (request.requested?.image?.width && request.requested?.image?.height) {
      const rw = request.requested.image.width
      const rh = request.requested.image.height
      if (rw > 256 || rh > 256) {
        if (rw > 512 || rh > 512) {
          size = '1024x1024'
        } else {
          size = '512x512'
        }
      }
    }
    let responseFormat = 'url'
    if (request.requested?.image?.delivery === 'base64') {
      responseFormat = 'b64_json'
    }

    // call OpenAI API and wait for the response
    const body = {
      prompt: prompt,
      n: request.requested?.samples || 1,
      size: size,
      response_format: responseFormat,
      user: request.clientUser,
    }
    console.log("OpenaiImageService.process() body: " + JSON.stringify(body))
    const responseJson = await ky.post(
      this.url,
      {
        headers: {
          'Content-Type': 'application/json', // optional because set automatically
          'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-OpenaiComImageService'}`,
        },
        json: body,
        timeout: TIMEOUT_MILLIS,
        hooks: utils.kyHooksToReduceLogging(false),
    }).json()
    /*
    if ((this as any).props?.debug) {
      console.debug(JSON.stringify(responseJson))
    }
    */

    // convert the result
    let resultOutputs = aiResponse2Outputs(responseJson as OpenaiImageResponse)
    let resultInternResponse: any = responseJson

    // update conversation (after OpenAI API request-response)
    conversationState.addOutputs(resultOutputs)

    // return response
    const responseFinal: api.ResponseFinal = {
      outputs: resultOutputs,
      conversationState: conversationState.toBase64(),
      usage: {
        service: this.getService(),
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },
      internResponse: resultInternResponse,
    }
    return responseFinal
  }
}

function aiResponse2Outputs(res: OpenaiImageResponse): api.Output[] {
  const outputs: api.Output[] = []

  if (res.data) {
    let index = 0
    for (const d of res.data) {
      if (d.url || d.b64_json) {
        const outputImage: api.OutputImage = {
          index: index,
          role: 'assistant',
          url: d.url,
          base64: d.b64_json,
          isProcessing: false,
        }
        const output: api.Output = {
          image: outputImage,
        }
        outputs.push(output)
        index++
      }
    }
  }
  return outputs
}


//
// internal OpenAI specific stuff
//

function inputMessages2SinglePrompt(messages: api.Message[]): string {
  let result: string = ''
  for (const message of messages) {
    if (message.input && message.input?.text?.content) {
      result += message.input.text.content + ". "
    } else if (message.output && message.output.text) {
      // ignore outputs
    }
  }
  return result.trim()
}

/* example OpenaiImageResponse:
    {
      "created": 1589478378,
      "data": [
        {
        "url": "https://..."
        },
        {
        "url": "https://..."
        }
      ]
    }
*/
type OpenaiImageResponse = {
  created?: number
  data?: {
    url?: string
    b64_json?: string
  }[]
}


//
// factory
//
export class OpenaiComImageFactory implements api.AIsAPIFactory<api.AIsServiceProps, OpenaiComImageService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): OpenaiComImageService {
    return new OpenaiComImageService(props, serviceDefaults, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new OpenaiComImageFactory()})
