import crypto from 'crypto'

//import './fetch-polyfill.js'
import {
    fetch, Headers, /*Request,*/ Response,
} from 'undici'
import fs from 'fs'
import {
    AIsAPI,
    AIsProps,
    AIsAPIFactory,
    Engine,
    Message,
    Output,
    OutputImage,
    Request,
    ResponseFinal,
    Usage,
} from '../api/index.js'
import { ResponseCollector } from "../utils/ResponseCollector.js"

const engine: Engine = {
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
    stabilityApiKey?: string
    debug?: boolean
}
export interface StabilityAIText2ImageProps extends StabilityAIText2ImageParams, AIsProps {
}
export class StabilityAIText2Image implements StabilityAIText2ImageProps {
    serviceId: string = 'StabilityAIText2Image'
    stabilityApiKey?: string

    constructor(props: StabilityAIText2ImageParams) {
        this.stabilityApiKey = props.stabilityApiKey
    }
}

export class StabilityAIText2ImageFactroy implements AIsAPIFactory<StabilityAIText2ImageProps,StabilityAIText2ImageAPI> {
    serviceId: string = 'StabilityAIText2Image'

    constructor() {
    }

    createAIsAPI(props: StabilityAIText2ImageProps): StabilityAIText2ImageAPI {
        return new StabilityAIText2ImageAPI(props)
    }
}

export class StabilityAIText2ImageAPI implements AIsAPI {
    serviceId: string = 'StabilityAIText2Image'

    stabilityApiKey: string
    props: StabilityAIText2ImageProps

    constructor(props: StabilityAIText2ImageProps) {
        this.props = props
        this.stabilityApiKey = (props && props.stabilityApiKey) || process.env.STABILITY_API_KEY || ""
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        // prepare collection/aggregation of partial responses
        const responseCollector = new ResponseCollector(request)

        // build prompt from input(s)
        const allMessages: Message[] = []
        for (const input of request.inputs) {
            const message: Message = {input: input}
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
        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.stabilityApiKey}`,
                },
                body: JSON.stringify(body),
            },
        )

        // synchronous HTTP reponse handling
        if (!response) {
            throw new Error('No result from stability.ai')
        }        
        if (response.status !== 200) {
            const body = await response.text();
            const error: any = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
            error.status = response.status;
            try {
                error.json = JSON.parse(body);
            } catch {
                error.body = body;
            }
            throw error;
        }
        if (this.props?.debug) {
            console.debug(JSON.stringify(response))
        }

        // convert the result
        let responseJson = await response.json()
        let resultOutputs = StabilityAIText2ImageResponse2Outputs(responseJson as StabilityAIText2ImageResponse)
        let resultUsage: Usage = {
            engine: engine,
            totalMilliseconds: responseCollector.getMillisSinceStart(),
        }
        let resultInternResponse: any = responseJson

        // write base64 images to files
        writeBase64ImageOutputsToFile(resultOutputs)

        // return response
        const responseFinal: ResponseFinal = {
            outputs: resultOutputs,
            //conversationState: undefined,
            usage: resultUsage,
            internResponse: resultInternResponse,
        }
        return responseFinal
    }
}

function writeBase64ImageOutputsToFile(outputs: Output[]) {
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

function StabilityAIText2ImageResponse2Outputs(res: StabilityAIText2ImageResponse): Output[] {
    const outputs: Output[] = []

    let index = 0
    if (res.artifacts) {
        for (const r of res.artifacts) {
            if (r.base64) {
                const outputImage: OutputImage = {
                    index: index,
                    role: 'assistant',
                    base64: r.base64,
                    isProcessing: false,
                }
                const output: Output = {
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

function inputMessages2StabilityPrompts(messages: Message[]): StabilityPrompt[] {
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

