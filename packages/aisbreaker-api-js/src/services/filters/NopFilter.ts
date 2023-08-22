import { Auth, Request, ResponseFinal, AIsAPIFactory, AIsBreaker } from '../../api/index.js'
import { BaseAIsFilter, FilterProps } from '../../base/index.js'


//
// NopFilter: No Operation (NOP/NOOP/NO OP): Simply pass to the forward2Service.
// Is usually used as placeholder in service props configurations.
//

const nopServiceId = 'aisbreaker:nop'

export class NopFilter extends BaseAIsFilter<FilterProps> {

    constructor(serviceProps: FilterProps, auth?: Auth) {
        super(serviceProps, auth)
    }

    async process(request: Request): Promise<ResponseFinal> {
        const forward2Service = this.getForward2Service()

        // action
        const result = await forward2Service.process(request)
        return result
    }
}

export class NopFilterFactory implements AIsAPIFactory<FilterProps, NopFilter> {
    createAIsService(props: FilterProps, auth?: Auth): NopFilter {
        return new NopFilter(props, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: nopServiceId, factory: new NopFilterFactory()})
