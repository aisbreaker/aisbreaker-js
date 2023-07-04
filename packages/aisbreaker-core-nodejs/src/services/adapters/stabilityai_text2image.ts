import { api, utils } from 'aisbreaker-api-js'
import ky from 'ky-universal'
import crypto from 'crypto'
import fs from 'fs'



const engine: api.Engine = {
    serviceId: 'StabilityAIText2Image',
    engineId: 'stable-diffusion-v1-5',
}

//
// general API implementation for stability.ai API
//
// API docs: https://platform.stability.ai/rest-api#tag/v1generation/operation/textToImage
// Authentication/getting STABILITY_API_KEY: https://platform.stability.ai/docs/getting-started/authentication
//

export interface StabilityAIText2ImageParams {
    apiKey?: string
    apiKeyId?: string
    debug?: boolean
}
export interface StabilityAIText2ImageProps extends StabilityAIText2ImageParams, api.AIsProps {
}
export class StabilityAIText2Image implements StabilityAIText2ImageProps {
    serviceId: string = 'StabilityAIText2Image'
    apiKeyId: string = 'StabilityAI'
    apiKey?: string

    constructor(props: StabilityAIText2ImageParams) {
        this.apiKey = props.apiKey
    }
}

export class StabilityAIText2ImageFactroy implements api.AIsAPIFactory<StabilityAIText2ImageProps,StabilityAIText2ImageService> {
    serviceId: string = 'StabilityAIText2Image'

    constructor() {
    }

    createAIsAPI(props: StabilityAIText2ImageProps): StabilityAIText2ImageService {
        return new StabilityAIText2ImageService(props)
    }
}

export class StabilityAIText2ImageService implements api.AIsService {
    serviceId: string = 'StabilityAIText2Image'

    stabilityApiKey: string
    props: StabilityAIText2ImageProps

    constructor(props: StabilityAIText2ImageProps) {
        this.props = props
        this.stabilityApiKey = props?.apiKey || process.env.STABILITY_API_KEY || ""
    }

    async sendMessage(request: api.Request): Promise<api.ResponseFinal> {
        // prepare collection/aggregation of partial responses
        const responseCollector = new utils.ResponseCollector(request)

        // build prompt from input(s)
        const allMessages: api.Message[] = []
        for (const input of request.inputs) {
            const message: api.Message = {input: input}
            allMessages.push(message)
        }
        const prompts = inputMessages2StabilityPrompts(allMessages)

        // call Stablility API and wait for the response
        const url = `https://api.stability.ai/v1/generation/${engine.engineId}/text-to-image`
        const body = {
            text_prompts: prompts,
            samples: request.requestOptions?.numberOfAlternativeResponses || 1,
            width: imageDimension(request.requestMedia?.image?.width || 256),
            height: imageDimension(request.requestMedia?.image?.height || 256),
        }
        console.log("Rest request body: " + JSON.stringify(body))
        const responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.stabilityApiKey}`,
                },
                json: body,
            }
        ).json()
        if (this.props?.debug) {
            console.debug(JSON.stringify(responseJson))
        }

        // convert the result
        let resultOutputs = StabilityAIText2ImageResponse2Outputs(responseJson as StabilityAIText2ImageResponse)
        let resultUsage: api.Usage = {
            engine: engine,
            totalMilliseconds: responseCollector.getMillisSinceStart(),
        }
        let resultInternResponse: any = responseJson

        // write base64 images to files
        writeBase64ImageOutputsToFile(resultOutputs)

        // return response
        const responseFinal: api.ResponseFinal = {
            outputs: resultOutputs,
            //conversationState: undefined,
            usage: resultUsage,
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
    fs.writeFile(filename, base64Data, 'base64', function(err: any) {
        console.log(err);
    });
}

function StabilityAIText2ImageResponse2Outputs(res: StabilityAIText2ImageResponse): api.Output[] {
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

