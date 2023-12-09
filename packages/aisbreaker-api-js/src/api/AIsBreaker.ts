import { ERROR_404_Not_Found } from "../extern/index.js"
import { AIsError } from "./AIsError.js"
import { AIsAPIFactory, AIsServiceProps, AIsService } from "./AIsService.js"
import { Auth } from "./models/index.js"
import ky from 'ky-universal'
import { logger } from '../utils/logger.js'

/**
 * Class to create and manage service APIs.
 *
 * Starting point for app code / for code using the AIs framework.
 */

export class AIsBreaker {
    private static defaultAIsBreaker?: AIsBreaker

    private serviceId2FactoryMapping = new Map<string, AIsAPIFactory<AIsServiceProps, AIsService>>()

    constructor() {
    }

    static getInstance(): AIsBreaker {
        if (!AIsBreaker.defaultAIsBreaker) {
            AIsBreaker.defaultAIsBreaker = new AIsBreaker()
        }
        return AIsBreaker.defaultAIsBreaker
    }

    /**
     * Register a service API factory with its serviceId.
     */
    registerFactory(param: {serviceId: string, factory: AIsAPIFactory<AIsServiceProps, AIsService>}) {
        logger.info(`Registering factory for serviceId '${param.serviceId}'`)
        this.serviceId2FactoryMapping.set(param.serviceId, param.factory)
    }

    /**
     * TODO: make this more intelligent to find services that do not exactly match the given serviceId
     */
    getFactory(props: AIsServiceProps): AIsAPIFactory<AIsServiceProps, AIsService> {
        const serviceId = props.serviceId

        // action
        const bestServiceIdKey = this.getBestKeyForServiceId(Array.from(this.serviceId2FactoryMapping.keys()), serviceId)
        const factory = this.serviceId2FactoryMapping.get(bestServiceIdKey)

        // error handling and logging
        if (!factory) {
            logger.debug(`getFactory('${serviceId}') failed for: ${Array.from(this.serviceId2FactoryMapping.keys())}`)
            throw new AIsError(`No factory registered for serviceId '${serviceId}'`, ERROR_404_Not_Found)
        }
        logger.debug(`getFactory('${serviceId}') succeeded`)

        return factory
    }

    private getBestKeyForServiceId(serviceIdKeys: string[], serviceId: string): string {
      // filter out all matching keys
      const serviceIdTaskAndVendor = serviceId.split('/')[0]
      const matchingKeys = serviceIdKeys.filter(key => key.startsWith(serviceIdTaskAndVendor) &&
                                                       serviceId.startsWith(key))

      // return the longest matching key
      const longestMatchingKey = matchingKeys.reduce((a, b) => a.length > b.length ? a : b, "")
      return longestMatchingKey
    }


    /**
     * Get a service API for the given props (which include the serviceId).
     *
     * Inclusive all default filters. They will be added here during creation.
     *
     * @param props    of the requested service (incl. propos.serviceId)
     * @param auth     optional auth object
     * @returns
     */
    getLocalAIsService(props: AIsServiceProps, auth?: Auth): AIsService {
        // get API
        const factory = this.getFactory(props)
        const plainAIsAPI = factory.createAIsService(props, auth)

        // add filters
        const aisAPIWithFilters = this.applyAllDefaultFilters(plainAIsAPI)

        return aisAPIWithFilters
    }

    static getLocalAIsService(props: AIsServiceProps, auth?: Auth): AIsService {
        return AIsBreaker.getInstance().getLocalAIsService(props, auth)
    }


    /**
     * Get a service API for the given props (which include the serviceId)
     * from a remote AIsBreaker server.
     *
     * Inclusive all default filters. They will be added here during creation.
     *
     * @param aisbreakerServerURL       URL of the remote AIsBreaker server
     * @param props                     of the requested service (incl. propos.serviceId)
     * @param auth                      optional auth object
     * @returns
     */
    getAIsService(aisbreakerServerURL: string, props: AIsServiceProps, auth?: Auth): AIsService {
        // create props for remote access
        const remoteProps = {
            "serviceId": "aisbreaker:network",
            "url": aisbreakerServerURL,
            "forward2ServiceProps": props
        }            

        return this.getLocalAIsService(remoteProps, auth)
    }

    static getAIsService(aisbreakerServerURL: string, props: AIsServiceProps, auth?: Auth): AIsService {
        return AIsBreaker.getInstance().getAIsService(aisbreakerServerURL, props, auth)
    }


    async pingAIsService(aisbreakerServerURL: string): Promise<boolean> {
        try {
            const url = `${aisbreakerServerURL}/api/v1/ping`
            const resp = await ky.get(url).json()
            const message = (resp as any)?.message
            if (message && message.includes('pong')) {
                // success
                return true
            }
        } catch (error) {
            // error
            /*
            if (DEBUG) {
                logger.debug(`pingRemoteAIsService('${aisbreakerServerURL}') failed: ${error}`)
            }
            */
            return false
        }

        return false
    }

    static async pingAIsService(aisbreakerServerURL: string): Promise<boolean> {
        return await AIsBreaker.getInstance().pingAIsService(aisbreakerServerURL)
    }



    private applyAllDefaultFilters(service: AIsService): AIsService {
        let encapsulatedService = service

        /* TODO: use a different way to avoid circular dependencies

        // start with the last (called) filter, end with the first (called) filter
        encapsulatedService = new NormalizeFilter({
            serviceId: 'NormalizeFilter',
            forward2ServiceInstance: encapsulatedService
        })
        encapsulatedService = new LoggingFilter({
            serviceId: 'LoggingFilter',
            forward2ServiceInstance: encapsulatedService,
            logLevel: 'DEBUG'
        })
        */

        return encapsulatedService
    }
}
