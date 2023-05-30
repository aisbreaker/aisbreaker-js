import {
    Input,
    InputText,
    Message,
    Output,
    OutputText,
    Request,
    ResponseEvent,
    ResponseFinal,
    Usage,
} from '../api/index.js'
import { ResponseCollector } from "../utils/ResponseCollector.js"

import {
    AIsProps,
    AIsAPIFactory,
    AIsService,
} from '../api/AIsService.js'


//
// Logging Filter
//

export interface LoggingFilterProps extends AIsProps {
    forward2Service: AIsService
    logLevel: string
}
export class LoggingFilter implements LoggingFilterProps {
    serviceId: string = 'LoggingFilter'

    forward2Service: AIsService
    logLevel: string

    constructor(props: LoggingFilterProps) {
        this.forward2Service = props.forward2Service
        this.logLevel = props.logLevel
    }
}
/*
export class LoggingFilterFactroy implements AIsBaseAPIFactory<LoggingFilterProps,LoggingFilterBaseAPI> {
    serviceId: string = 'LoggingFilter'

    constructor() {
    }

    createAPI(props: LoggingFilterProps): LoggingFilterBaseAPI {
        return new LoggingFilterBaseAPI(props)
    }
}
*/
export class LoggingFilterStatelessAPI implements AIsService {
    serviceId: string = 'LoggingFilter'

    props: LoggingFilterProps

    constructor(props: LoggingFilterProps) {
        this.props = props
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        const forward2Service = this.props.forward2Service
        // logging before
        const level = this.props.logLevel
        console.log(`[${level}] LoggingFilter.sendMessage(request=${JSON.stringify(request)}) - forward to ${forward2Service?.serviceId}`)

        // action
        const result = await forward2Service.sendMessage(request)

        // logging after
        console.log(`[${level}] LoggingFilter.sendMessage() - result=${JSON.stringify(result)}`)
        return result
    }
}
