
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
import { AIsServiceDefaults } from '../../base/AIsServiceDefaults.js'
import { BaseAIsService } from '../../base/index.js'
import { delay } from '../../utils/AsyncUtils.js'


//
// DummyAssistant service API
//

export interface DummyAssistantDefaults extends AIsServiceDefaults { 
  greeting: string
}
  
const defaultServiceId = 'chat:dummy'
const serviceDefaults: DummyAssistantDefaults = {
  greeting: 'Hello',
}


export interface DummyAssistantServiceProps extends AIsServiceProps {
    greeting?: string
}

export class DummyAssistantService extends BaseAIsService<DummyAssistantServiceProps, DummyAssistantDefaults> {
    greeting: string

    constructor(serviceProps: DummyAssistantServiceProps, serviceDefaults: DummyAssistantDefaults, auth?: Auth) {
        super(serviceProps, serviceDefaults, auth)
        this.greeting = serviceProps.greeting || serviceDefaults.greeting
    }

    /**
     * Do the work of process()
     * without the need to care about all error handling.
     */
    async processUnprotected(request: Request, context: string): Promise<ResponseFinal> {
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
        const resultText = `${this.greeting}, this is the reponse to '${messageText}' from DummyAssistantService ... To get a useful answer, choose a different service/serviceId ...`
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
                if (request.abortSignal?.aborted) {
                    break
                }
            }
        }

        // update conversation (after dummy request-response)
        conversationState.addOutputs(outputs)

        // return final response
        const response: ResponseFinal = {
            outputs: outputs,
            conversationState: conversationState.toBase64(),
            usage: {
                service: this.getService(),
                totalMilliseconds: 1,
            }
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
        return new DummyAssistantService(props, serviceDefaults, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new DummyAssistantFactory()})
