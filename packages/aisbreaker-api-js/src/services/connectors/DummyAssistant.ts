
import {
    AIsServiceProps,
    AIsAPIFactory,
    Output,
    Request,
    ResponseEvent,
    ResponseFinal,
    Usage,
    AIsBreaker,
    Auth,
} from '../../api/index.js'
import { BaseAIsService } from '../../base/index.js'
import { delay } from '../../utils/AsyncUtils.js'


//
// DummyAssistant service API
//

const dummyServiceId = 'chat:dummy'

export interface DummyAssistantServiceProps extends AIsServiceProps {
    greeting?: string
}

export class DummyAssistantService extends BaseAIsService {
    greeting: string

    constructor(serviceProps: DummyAssistantServiceProps, auth?: Auth) {
        super(serviceProps)
        this.greeting = serviceProps.greeting || 'Hello'
    }

    async process(request: Request): Promise<ResponseFinal> {
        this.checkRequest(request)

        // update conversation (before trivial request-response)
        const conversationState = this.getConversationState(request)
        conversationState.addInputs(request.inputs)

        const input = request.inputs[0]
        let messageText = '???'
         if (input?.text) {
            // it's a TextInputMessage message
            messageText = input.text.content
        }

        // generate output
        const resultText = `${this.greeting}, the answer to '${messageText}' from DummyAssistantService is unknown ...`
        const resultIndex = 0
        const resultRole = 'assistant'
        const outputs: Output[] = [{
            text: {
                index: resultIndex,
                role: resultRole,
                content: resultText,  
            }
        }]

        // stream output if requested
        if (request.streamProgressFunction) {
            const resultTextParts = this.splitTextIntoParts(resultText)

            // stream each word
            for (let i = 0; i < resultTextParts.length; i++) {
                const resultTextPart = resultTextParts[i]
                const responseEvent: ResponseEvent = {
                    outputs: [{
                        text: {
                            index: resultIndex,
                            role: resultRole,
                            content: resultTextPart,
                            isDelta: true,
                            isProcessing: i < resultTextParts.length - 1,
                        }
                    }]
                }
                request.streamProgressFunction(responseEvent)
                await delay(200)
            }
        }

        // update conversation (after dummy request-response)
        conversationState.addOutputs(outputs)

        // calculate usage
        const usage: Usage = {
            engine: {
                serviceId: dummyServiceId,
            },
            totalMilliseconds: 1,
        }

        // return final response
        const response: ResponseFinal = {
            outputs: outputs,
            conversationState: conversationState.toBase64(),
            usage: usage,
        }
        return response
    }

    splitTextIntoParts(text: string): string[] {
        // split
        const separator = ' '
        const parts = text.split(separator)

        // append separator to all words except last
        for (let i = 0; i < parts.length - 1; i++) {
            parts[i] += separator
        }
        return parts
    }
}

export class DummyAssistantFactory implements AIsAPIFactory<DummyAssistantServiceProps, DummyAssistantService> {
    createAIsService(props: DummyAssistantServiceProps, auth?: Auth): DummyAssistantService {
        return new DummyAssistantService(props, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: dummyServiceId, factory: new DummyAssistantFactory()})
