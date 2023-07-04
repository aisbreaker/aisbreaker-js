import { api, utils } from 'aisbreaker-api-js'
import ky from 'ky-universal'

const engine: api.Engine = {
    serviceId: 'OpenAIImage',
    engineId: 'unknown',
}

//
// general API implementation for OpenAI / ChatGPT API
//
// API docs: https://platform.openai.com/docs/api-reference/images/create
//

export interface OpenAIImageParams {
    apiKey?: string
    apiKeyId?: string
    debug?: boolean
}
export interface OpenAIImageProps extends OpenAIImageParams, api.AIsProps {
}
export class OpenAIImage implements OpenAIImageProps {
    serviceId: string = 'OpenAIImage'
    apiKeyId: string = 'OpenAI'
    apiKey?: string

    constructor(props: OpenAIImageParams) {
        this.apiKey = props.apiKey
    }
}

export class OpenAIImageFactroy implements api.AIsAPIFactory<OpenAIImageProps,OpenAIImageService> {
    serviceId: string = 'OpenAIImage'

    constructor() {
    }

    createAIsAPI(props: OpenAIImageProps): OpenAIImageService {
        return new OpenAIImageService(props)
    }
}

export class OpenAIImageService implements api.AIsService {
    serviceId: string = 'OpenAIImage'

    openaiApiKey: string
    props: OpenAIImageProps

    constructor(props: OpenAIImageProps) {
        this.props = props
        this.openaiApiKey = props?.apiKey || process.env.OPENAI_API_KEY || ""
    }

    async sendMessage(request: api.Request): Promise<api.ResponseFinal> {
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
        if (request.requestMedia?.image?.width && request.requestMedia?.image?.height) {
            const rw = request.requestMedia.image.width
            const rh = request.requestMedia.image.height
            if (rw > 256 || rh > 256) {
                if (rw > 512 || rh > 512) {
                    size = '1024x1024'
                } else {
                    size = '512x512'
                }
            }
        }
        let responseFormat = 'url'
        if (request.requestMedia?.image?.delivery === 'base64') {
            responseFormat = 'b64_json'
        }

        // call OpenAI API and wait for the response
        const url = 'https://api.openai.com/v1/images/generations'
        const body = {
            prompt: prompt,
            n: request.requestOptions?.numberOfAlternativeResponses || 1,
            size: size,
            response_format: responseFormat,
            user: request.clientUser,
        }
        console.log("OpenAIImageAPI.sendMessage() body: " + JSON.stringify(body))
        const responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                },
                json: body,
            }
        ).json()
        if (this.props?.debug) {
            console.debug(JSON.stringify(responseJson))
        }

        // convert the result
        let resultOutputs = openAIImageResponse2Outputs(responseJson as OpenAIImageResponse)
        let resultUsage: api.Usage = {
            engine: engine,
            totalMilliseconds: responseCollector.getMillisSinceStart(),
        }
        let resultInternResponse: any = responseJson

        // update conversation (after OpenAI API request-response)
        conversationState.addOutputs(resultOutputs)

        // return response
        const responseFinal: api.ResponseFinal = {
            outputs: resultOutputs,
            conversationState: conversationState.toBase64(),
            usage: resultUsage,
            internResponse: resultInternResponse,
        }
        return responseFinal
    }
}

function openAIImageResponse2Outputs(res: OpenAIImageResponse): api.Output[] {
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

interface OpenAIChatMessage {
    // Attention: Additional properties are not allowed ('XXX' was unexpected) by OpenAI API
    // Therefore, we cannot just use type InputText
    role: 'system' | 'assistant' | 'user'
    content: string
}

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

/* example OpenAIImageResponse:
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
type OpenAIImageResponse = {
    created?: number
    data?: {
        url?: string
        b64_json?: string
    }[]
}


//
// register this service/adapter
//
api.AIsBreaker.getInstance().registerFactory(new OpenAIImageFactroy())
