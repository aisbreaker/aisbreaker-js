import { AIsServiceProps, AIsService, Auth, ClientRequest, Request, ResponseFinal } from '../../api/index.js'
import { BaseAIsFilter, FilterProps } from '../../base/index.js'
import { logger } from '../../utils/logger.js'


//
// NormalizeFilter
//

export interface NormalizeFilterProps extends AIsServiceProps {
    /** the actual service; this filter will forward to this service */
    forward2Service: AIsService
}

export class NormalizeFilter extends BaseAIsFilter<FilterProps> {
    constructor(serviceProps: FilterProps, auth?: Auth) {
        super(serviceProps, auth)
    }

    async process(request: Request): Promise<ResponseFinal> {
        const forward2Service = this.getForward2Service()

        // normalize before/normalize request
        request = this.normalizeRequest(request)

        // action
        let result = await forward2Service.process(request)

        // normalize after/normalize response
        result = this.normalizeResponse(result)

        return result
    }

    private normalizeRequest(request: ClientRequest): Request {
        if (request.text) {
            if (request.inputs && request.inputs.length > 0) {
                logger.debug(`request.text is set but ignored, because request.inputs is set and has higher priority`)
                delete request.text
            } else {
                request.inputs = [{text: {role: 'user', content: request.text}}]
            }
        }

        return request as Request
    }

    private normalizeResponse(response: ResponseFinal): ResponseFinal {
        // nothing implemented yet
        return response
    }       
}
