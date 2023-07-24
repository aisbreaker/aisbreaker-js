import { AIsBreaker, AIsServiceProps, AIsService, Auth, Request, ResponseFinal } from '../api/index.js'


//
// BaseAIsFilter: template for filters
//


export interface FilterProps extends AIsServiceProps {
    /**
     * The actual service; this filter will forward to this service.
     * Either forward2ServiceProps or forward2Service must be set.
     */
    forward2ServiceProps?: AIsServiceProps
    /**
     * The actual service instance; this filter will forward to this service.
     * Either forward2ServiceProps or forward2Service must be set.
     */
    forward2Service?: AIsService
}

export abstract class BaseAIsFilter<PROPS_T extends FilterProps> implements AIsService {
    serviceProps: PROPS_T
    auth?: Auth

    constructor(serviceProps: PROPS_T, auth?: Auth) {
        this.serviceProps = serviceProps
        this.auth = auth
    }

    abstract process(request: Request): Promise<ResponseFinal>

    getForward2Service(): AIsService {
        // determine service to forward to
        let service = this.serviceProps?.forward2Service
        if (!service) {
            // try to get serviceInstance from serviceProps
            if (!this.serviceProps?.forward2ServiceProps) {
                throw new Error(`either forward2ServiceProps or forward2Service must be set`)
            }
            service =
                AIsBreaker.getInstance().getAIsService(this.serviceProps.forward2ServiceProps, this.auth)
        }
        return service
    }
}
