import { Auth, Request, ResponseFinal, AIsAPIFactory, AIsBreaker } from '../../api/index.js'
import { BaseAIsFilter, FilterProps } from '../../base/index.js'


//
// LoggingFilter: log all process() requests to the console
//
import { logger } from '../../utils/logger.js'

const loggingServiceId = 'aisbreaker:logging'

export interface LoggingFilterProps extends FilterProps {
    /**
     * LogLevels  = {
     *   error: 0,
     *   warn: 1,
     *   info: 2,
     *   http: 3,
     *   verbose: 4,
     *   debug: 5,
     *   silly: 6,
     */
    logLevel: number
}

export class LoggingFilter extends BaseAIsFilter<LoggingFilterProps> {
 
    constructor(serviceProps: LoggingFilterProps, auth?: Auth) {
        super(serviceProps, auth)
    }

    async process(request: Request): Promise<ResponseFinal> {
        const forward2Service = this.getForward2Service()
        const serviceId = forward2Service.serviceProps.serviceId
        const logLevel = this.serviceProps.logLevel

        // logging before
        logger.log(logLevel, `LoggingFilter.process(request=${JSON.stringify(request)}) - forward to ${serviceId}`)

        // action
        const result = await forward2Service.process(request)

        // logging after
        logger.log(logLevel, `LoggingFilter.process() - result=${JSON.stringify(result)}`)
        return result
    }
}

export class LoggingFilterFactory implements AIsAPIFactory<LoggingFilterProps, LoggingFilter> {
    createAIsService(props: LoggingFilterProps, auth?: Auth): LoggingFilter {
        return new LoggingFilter(props, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: loggingServiceId, factory: new LoggingFilterFactory()})
