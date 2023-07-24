
import {
    AIsBreaker,
    AIsServiceProps,
    AIsAPIFactory,
    Output,
    Request,
    ResponseFinal,
    Usage,
} from '../../api/index.js'
import { BaseAIsService } from '../../base/index.js'


//
// EchoService service API: echo all (text) inputs, with '[ECHO] ' prefix
//

const echoServiceId = 'chat:echo'

export class EchoService extends BaseAIsService {

    constructor(serviceProps: AIsServiceProps) {
        super(serviceProps)
    }

    async process(request: Request): Promise<ResponseFinal> {
        this.checkRequest(request)

        // update conversation (before trivial request-response) - OPTIONAL because state is not used
        const conversationState = this.getConversationState(request)
        conversationState.addInputs(request.inputs)

        // echo all (text) inputs
        const outputs: Output[] = []
        for (const input of request.inputs) {
            if (input?.text) {
                // it's a TextInputMessage message
                outputs.push({
                    text: {
                        index: 0,
                        role: 'assistant',
                        content: '[ECHO] '+input.text.content,
                    }
                })
            }
        }

        // update conversation (after echo request-response) - OPTIONAL because state is not used
        conversationState.addOutputs(outputs)

        // calculate usage
        const usage: Usage = {
            engine: {
                serviceId: echoServiceId,
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

export class EchoFactory implements AIsAPIFactory<AIsServiceProps, EchoService> {
    createAIsService(props: AIsServiceProps): EchoService {
        return new EchoService(props)
    }
}


//
// register this service/feature
//
AIsBreaker.getInstance().registerFactory({serviceId: echoServiceId, factory: new EchoFactory()})
