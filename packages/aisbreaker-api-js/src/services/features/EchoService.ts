
import {
    AIsBreaker,
    AIsServiceProps,
    AIsAPIFactory,
    Auth,
    Output,
    Request,
    ResponseFinal,
    Usage,
} from '../../api/index.js'
import { AIsServiceDefaults } from '../../base/AIsServiceDefaults.js'
import { BaseAIsService } from '../../base/index.js'


//
// EchoService service API: echo all (text) inputs, with '[ECHO] ' prefix
//

const defaultServiceId = 'chat:echo'
const serviceDefaults: AIsServiceDefaults = { }


export class EchoService extends BaseAIsService<AIsServiceProps, AIsServiceDefaults> {
    /**
     * Do the work of process()
     * without the need to care about all error handling.
     */
    async processUnprotected(request: Request): Promise<ResponseFinal> {

        // update conversation (before trivial request-response) - OPTIONAL because state is not used here
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

        // return response
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
}

export class EchoFactory implements AIsAPIFactory<AIsServiceProps, EchoService> {
    createAIsService(props: AIsServiceProps, auth?: Auth): EchoService {
        return new EchoService(props, serviceDefaults, auth)
    }
}


//
// register this service/feature
//
AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new EchoFactory()})
