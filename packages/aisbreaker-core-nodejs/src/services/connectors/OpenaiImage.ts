import { api, base, utils } from 'aisbreaker-api-js'
import ky from 'ky-universal'


//
// general API implementation for OpenAI API
//
// API docs: https://platform.openai.com/docs/api-reference/images/create
// API url:  https://api.openai.com/v1/images/generations
//

const textToImageBaseServiceId = 'text-to-image:openai.com'

const DEFAULT_URL = 'https://api.openai.com/v1/images/generations'
const TIMEOUT_MILLIS = 3 * 60 * 1000 // 3 minutes


export class OpenaiImageService extends base.BaseAIsService<api.AIsServiceProps> {
    openaiApiKey: string

    constructor(props: api.AIsServiceProps, auth?: api.Auth) {
        super(props, auth)

        // check props
        if (!auth?.secret) {
            throw new Error(`OpenaiImageService: missing auth.secret`)
        }

        // backend
        this.openaiApiKey = auth.secret
    }

    getEngine(): api.Engine {
        const engine: api.Engine = {
            serviceId: `${textToImageBaseServiceId}`
        }
        return engine
    }

    async process(request: api.Request): Promise<api.ResponseFinal> {
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
        const url = this.serviceProps.url || DEFAULT_URL
        const body = {
            prompt: prompt,
            n: request.requested?.samples || 1,
            size: size,
            response_format: responseFormat,
            user: request.clientUser,
        }
        console.log("OpenaiImageService.process() body: " + JSON.stringify(body))
        const responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                },
                json: body,
                timeout: TIMEOUT_MILLIS,
                hooks: utils.kyHooks(false),
    }
        ).json()
        if ((this as any).props?.debug) {
            console.debug(JSON.stringify(responseJson))
        }

        // convert the result
        let resultOutputs = openaiImageResponse2Outputs(responseJson as OpenaiImageResponse)
        let resultUsage: api.Usage = {
            engine: this.getEngine(),
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

function openaiImageResponse2Outputs(res: OpenaiImageResponse): api.Output[] {
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


export class OpenaiImageFactory implements api.AIsAPIFactory<api.AIsServiceProps, OpenaiImageService> {
    createAIsService(props: api.AIsServiceProps, auth?: api.Auth): OpenaiImageService {
        return new OpenaiImageService(props, auth)
    }
}


//
// register this service/connector
//
api.AIsBreaker.getInstance().registerFactory({serviceId: textToImageBaseServiceId, factory: new OpenaiImageFactory()})
