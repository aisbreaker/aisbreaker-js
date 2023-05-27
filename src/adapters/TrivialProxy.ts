
import {
    AIsBreaker,
    AIsProps,
    AIsAPIFactory,
    AIsAPI,
    Request,
    ResponseFinal,
} from '../api'


//
// TrivialProxy: locally simulate a proxy to a remote service
//

export interface TrivialProxyParams {
    name: string
    remoteAIsBreaker: AIsBreaker
    forward2RemoteService: AIsProps
}
export interface TrivialProxyProps extends TrivialProxyParams, AIsProps {
}
export class TrivialProxy implements TrivialProxyProps {
    serviceId: string = 'TrivialProxy'
    name: string
    remoteAIsBreaker: AIsBreaker
    forward2RemoteService: AIsProps

    constructor(props: TrivialProxyParams) {
        this.name = props.name
        this.remoteAIsBreaker = props.remoteAIsBreaker
        this.forward2RemoteService = props.forward2RemoteService
    }
}

export class TrivialProxyFactory implements AIsAPIFactory<TrivialProxyProps,TrivialProxyAPI> {
    serviceId: string = 'TrivialProxy'

    constructor() {
    }

    createAIsAPI(props: TrivialProxyProps): TrivialProxyAPI {
        return new TrivialProxyAPI(props)
    }
}

export class TrivialProxyAPI implements AIsAPI {
    serviceId: string = 'TrivialProxy'

    props: TrivialProxyProps

    constructor(props: TrivialProxyProps) {
        this.props = props
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        const aisBaseAPI = this.props.remoteAIsBreaker.createAIsAPI(this.props.forward2RemoteService)

        console.log(`TrivialProxyAPI.sendMessage(name=${this.props.name}) forward to ${aisBaseAPI.serviceId} START`)
        const result = await aisBaseAPI.sendMessage(request)
        console.log(`TrivialProxyAPI.sendMessage(name=${this.props.name}) forward to ${aisBaseAPI.serviceId} END`)

        return result
    }
}
