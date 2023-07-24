import { AIsServiceProps } from '../../api/AIsService.js'
import { Request } from '../../api/models/Request.js'

/**
* Send a message to the AI service via the AIsBreaker proxy.
*/
export interface AIsProxyNetworkRequest {
    /**
     * The requested service, incl. serviceId.
     */
    service: AIsServiceProps

    /**
     * The actual request
     */
    request: Request
}
