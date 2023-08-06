import { AIsServiceProps } from '../../api/AIsService.js'
import { Request } from '../../api/models/Request.js'

/**
* Send a message to the AI service via the AIsBreaker server.
*/
export interface AIsNetworkRequest {
    /**
     * The requested service, incl. serviceId.
     */
    service: AIsServiceProps

    /**
     * The actual request
     */
    request: Request
}
