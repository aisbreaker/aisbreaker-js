import { api, base, extern, utils } from 'aisbreaker-api-js'
import ky from 'ky-universal'
import crypto from 'crypto'
import fs from 'fs'


//
// general API implementation for stability.ai API
//
// API docs: https://platform.stability.ai/rest-api#tag/v1generation/operation/textToImage
// Authentication/getting STABILITY_API_KEY: https://platform.stability.ai/docs/getting-started/authentication
//

export interface StabilityAiImageDefaults extends base.AIsServiceDefaults { }

const defaultServiceId = 'text-to-image:stability.ai'
const serviceDefaults: StabilityAiImageDefaults = {
  url: 'https://api.stability.ai/v1/generation/${engine}/text-to-image',
  engine: 'stable-diffusion-v1-5',
}

const TIMEOUT_MILLIS = 3 * 60 * 1000 // 3 minutes

export interface StabilityAiImageProps extends api.AIsServiceProps { }


export class StabilityAiImageService extends base.BaseAIsService<StabilityAiImageProps, StabilityAiImageDefaults> {
  constructor(props: StabilityAiImageProps, serviceDefaults: StabilityAiImageDefaults, auth?: api.Auth) {
    super(props, serviceDefaults, auth)

    // check props
    if (!auth?.secret) {
      throw new api.AIsError(`StabilityAiTextToImageService: missing auth.secret`, extern.ERROR_401_Unauthorized)
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

    // build prompt from input(s)
    const allMessages: api.Message[] = []
    for (const input of request.inputs) {
      const message: api.Message = { input: input }
      allMessages.push(message)
    }
    const prompts = inputMessages2StabilityPrompts(allMessages)

    // call Stablility API and wait for the response
    const body = {
      text_prompts: prompts,
      samples: request.requested?.samples || 1,
      width: imageDimension(request.requested?.image?.width || 256),
      height: imageDimension(request.requested?.image?.height || 256),
    }
    console.log("Rest request body: " + JSON.stringify(body))
    const responseJson = await ky.post(
      this.url,
      {
        headers: {
          'Content-Type': 'application/json', // optional because set automatically
          'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-StabilityAiImageService'}`,
        },
        json: body,
        timeout: TIMEOUT_MILLIS,
        hooks: utils.kyHooksToReduceLogging(false),
      }
    ).json()
    /*
    if ((this as any).props?.debug) {
      console.debug(JSON.stringify(responseJson))
    }
    */

    // convert the result
    let resultOutputs = aiResponse2Outputs(responseJson as StabilityAIText2ImageResponse)
    let resultInternResponse: any = responseJson

    // write base64 images to files
    writeBase64ImageOutputsToFile(resultOutputs)

    // return response
    const responseFinal: api.ResponseFinal = {
      outputs: resultOutputs,
      //conversationState: undefined,
      usage: {
        service: this.getService(),
        totalMilliseconds: responseCollector.getMillisSinceStart(),
      },

      internResponse: resultInternResponse,
    }
    return responseFinal
  }
}

function writeBase64ImageOutputsToFile(outputs: api.Output[]) {
  const randomUUID = crypto.randomUUID()
  for (const output of outputs) {
    if (output?.image?.base64) {
      const filename = `/tmp/stability.ai_${randomUUID}-output-${output.image.index}.png`
      writeBase64ImageToFile(output.image.base64, filename)
    }
  }
}
function writeBase64ImageToFile(base64: string, filename: string) {
  const base64Data = base64.replace(/^data:image\/png;base64,/, "");
  console.log("Writing file: " + filename)
  fs.writeFile(filename, base64Data, 'base64', function (err: any) {
    console.log(err);
  });
}

function aiResponse2Outputs(res: StabilityAIText2ImageResponse): api.Output[] {
  const outputs: api.Output[] = []

  let index = 0
  if (res.artifacts) {
    for (const r of res.artifacts) {
      if (r.base64) {
        const outputImage: api.OutputImage = {
          index: index,
          role: 'assistant',
          base64: r.base64,
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
// internal stability.ai specific stuff
//

function inputMessages2StabilityPrompts(messages: api.Message[]): StabilityPrompt[] {
  let prompts: StabilityPrompt[] = []
  for (const message of messages) {
    if (message.input && message.input?.text?.content) {
      const prompt: StabilityPrompt = {
        text: message.input.text.content,
        weight: message.input.text.weight,
      }
      prompts.push(prompt)
    } else if (message.output && message.output.text) {
      // ignore outputs
    }
  }
  return prompts
}
type StabilityPrompt = {
  text: string,
  weight?: number,
}

/** make sure that width + height are  multiple of 64 >= 128 */
function imageDimension(dim: number): number {
  let d = 128
  if (dim > 128) {
    d = Math.floor(dim / 64) * 64
  }
  return d
}


/* example StabilityAIText2ImageResponse:
  [
    {
      "base64": "...very long string...",
      "finishReason": "SUCCESS",
      "seed": 1050625087
    },
    {
      "base64": "...very long string...",
      "finishReason": "CONTENT_FILTERED",
      "seed": 1229191277
    }
  ]
*/
type StabilityAIText2ImageResponse = {
  artifacts: {
    base64: string,
    finishReason: string, // Enum: 'CONTENT_FILTERED' | 'ERROR' | 'SUCCESS'
    seed: number,
  }[]
}


//
// factory
//
export class StabilityAiImageFactory implements api.AIsAPIFactory<api.AIsServiceProps, StabilityAiImageService> {
  createAIsService(props: api.AIsServiceProps, auth?: api.Auth): StabilityAiImageService {
    return new StabilityAiImageService(props, serviceDefaults, auth)
  }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new StabilityAiImageFactory()})
