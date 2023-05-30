import { AIsService, AIsBreaker, AIsProps, Request, ResponseFinal, AIsAPIFactory } from '../api/index.js'

//
// DelegateService: delegate to another service
//

export interface DelegateParams extends AIsProps{
}
export interface DelegateProps extends DelegateParams, AIsProps {
}
export class DelegateProxy implements DelegateProps {
    serviceId: string = 'Delegate'

    constructor(props: AIsProps) {
        this.serviceId = props.serviceId
    }
}

export class DelegateFactory implements AIsAPIFactory<DelegateProps,DelegateService> {
    serviceId: string = 'Delegate'

    constructor() {
    }

    createAIsAPI(props: DelegateProps): DelegateService {
        return new DelegateService(props)
    }
}

export class DelegateService implements AIsService {
    serviceId: string = 'Delegate'

    props: AIsProps

    constructor(props: AIsProps) {
        this.props = props
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        const otherService = AIsBreaker.getInstance().createAIsService(this.props)

        console.log(`DelegateService.sendMessage() forward to ${otherService.serviceId} START`)
        const result = await otherService.sendMessage(request)
        console.log(`DelegateService.sendMessage() forward to ${otherService.serviceId} END`)

        return result
    }
}
