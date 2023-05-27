

import { AIsAPI, AIsProps, AIsAPIFactory, Output, Request, ResponseFinal, Usage } from "../api"

import { DefaultConversationState } from "../utils/SessionUtil.js"

//
// TrivialAssistant API
//

export interface TrivialAssistantParams {
    extraMsg: string
}
export interface TrivialAssistantProps extends TrivialAssistantParams, AIsProps {
}
export class TrivialAssistant implements TrivialAssistantProps {
    serviceId: string = 'TrivialAssistant'
    extraMsg: string

    constructor(props: TrivialAssistantParams) {
        this.extraMsg = props.extraMsg
    }
}

export class TrivialAssistantFactory implements AIsAPIFactory<TrivialAssistantProps,TrivialAssistantAPI> {
    serviceId: string = 'TrivialAssistant'

    constructor() {
    }

    createAIsAPI(props: TrivialAssistantProps): TrivialAssistantAPI {
        return new TrivialAssistantAPI(props)
    }
}

export class TrivialAssistantAPI implements AIsAPI {
    serviceId: string = 'TrivialAssistant'
    props: TrivialAssistantProps

    constructor(props: TrivialAssistantProps) {
        this.props = props
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        // update conversation (before Trivial request-response)
        const conversationState = DefaultConversationState.fromBase64(request.conversationState)
        conversationState.addInputs(request.inputs)

        const input = request.inputs[0]
        let messageText = '???'
         if (input.text) {
            // it's a TextInputMessage message
            messageText = input.text.content
        }

        /* alternative
        const messageT = p.messagesT[0]
        if (messageT.type === 'TextInput') {
            // it's a TextInputMessage message
            console.log(messageT.text)
        }
        if (messageT.type === 'ImageInput') {
            // it's a TextInputMessage message
            console.log(messageT.url)
        }       
        */

        // generate output
        const outputs: Output[] = [{
            text: {
                index: 0,
                role: 'assistant',
                content: `The answer to '${messageText}' from TrivialAssistantAPI is unknown ...`,  
            }
        }]

        // update conversation (after Trivial request-response)
        conversationState.addOutputs(outputs)

        // calculate usage
        const usage: Usage = {
            engine: {
                serviceId: 'TrivialAssistant',
                engineId: 'default',
            },
            totalMilliseconds: 1,
        }

        // return response
        const response: ResponseFinal = {
            outputs: outputs,
            conversationState: conversationState.toBase64(),
            usage: usage,
        }
        return response
    }
}
