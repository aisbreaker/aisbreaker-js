import { AIsBreaker, Auth, Output, Request, ResponseEvent, ResponseFinal, StreamProgressFunction, Usage } from '../../api/index.js'
import { AIsAPIFactory } from '../../api/AIsService.js'
import { BaseAIsFilter, FilterProps } from '../../base/BaseAIsFilter.js'
import { assert } from '../../utils/index.js'


//
// MirrorFilter: mirror all text outputs of the actual service
//

const mirrorServiceId = 'aisbreaker:mirror'

export class MirrorFilter extends BaseAIsFilter<FilterProps> {
    constructor(serviceProps: FilterProps, auth?: Auth) {
        super(serviceProps, auth)
    }

    async process(request: Request): Promise<ResponseFinal> {
        const forward2Service = this.getForward2Service()

        // prepare forwarding request
        const request2Forward: Request = {
            inputs: request.inputs,
            conversationState: request.conversationState,
            requested: request.requested,
            internOptions: request.internOptions,
            clientUser: request.clientUser,
            streamProgressFunction: this.getMirroredStreamProgressFunction(request.streamProgressFunction),
        }

        // action
        const tmpResult = await forward2Service.process(request2Forward)

        // create result
        const result: ResponseFinal = {
            outputs: this.mirrorOutputs(tmpResult.outputs),
            conversationState: tmpResult.conversationState,
            usage: this.getMirroredUsage(tmpResult.usage),
            internResponse: tmpResult.internResponse,
        }
        return result
    }

    //
    // helper functions
    //

    protected mirrorOutputs(origOutputs: Output[]): Output[] {
        // mirror all (text) outputs
        const mirroredOutputs: Output[] = []
        for (const output of origOutputs) {
            if (output?.text) {
                // it's a TextOutput message
                const text = output.text

                // mirror text
                const mirroredOutput: Output = {
                    text: {
                        index: text.index,
                        role: text.role,
                        content: this.mirrorString(text.content),
                    }
                }

                // add remaining properties
                assert(mirroredOutput.text !== undefined)
                if (text.isDelta) {
                    mirroredOutput.text.isDelta = text.isDelta
                }
                if (text.isProcessing) {
                    mirroredOutput.text.isProcessing = text.isProcessing
                }

                // take it
                mirroredOutputs.push(mirroredOutput)
            }
        }
        return mirroredOutputs
    }

    protected mirrorString(s: string): string {
        // mirror char of a string
        return s.split('').reverse().join('')
    }

    protected getMirroredStreamProgressFunction(origFunc?: StreamProgressFunction): StreamProgressFunction | undefined {
        // trivial check
        if (!origFunc) {
            return origFunc
        }

        // normal case
        const this0 = this
        const f = function(responseEvent: ResponseEvent) {
            // mirror responseEvent
            const mirroredResponseEvent: ResponseEvent = {
                outputs: this0.mirrorOutputs(responseEvent.outputs),
                internResponse: responseEvent.internResponse,
            }

            // call original function
            origFunc(mirroredResponseEvent)
        }
        return f
    }

    protected getMirroredUsage(origUsage: Usage): Usage {
        return {
            ...origUsage,
            engine: {
                serviceId: this.getMirroredServiceId(origUsage?.engine?.serviceId),
            }
        }
    }
    protected getMirroredServiceId(origServiceId: string): string {
        if (origServiceId) {
            return `${mirrorServiceId}/service/${origServiceId}`
        } else {
            return mirrorServiceId
        }
    }

}

export class MirrorFilterFactory implements AIsAPIFactory<FilterProps, MirrorFilter> {
    createAIsService(props: FilterProps, auth?: Auth): MirrorFilter {
        return new MirrorFilter(props, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: mirrorServiceId, factory: new MirrorFilterFactory()})
