import { AIsProps } from '../../api/AIsService'
import { Request } from '../../api/models/Request'

/**
* Send a message to the AI service via the AIsBreaker proxy.
*/
export interface AIsProxyRequest {
    /**
     * The requested service, incl. serviceId.
     */
    service: AIsProps

    /**
     * The actual request
     */
    request: Request
}
