import { ERROR_404_Not_Found } from "../utils/index.js"
import { AIsError } from "./AIsError.js"
import { AIsAPIFactory, AIsServiceProps, AIsService } from "./AIsService.js"
import { Auth } from "./models/index.js"
import ky from 'ky-universal'

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
        console.log(`Registering factory for serviceId '${param.serviceId}'`)
        this.serviceId2FactoryMapping.set(param.serviceId, param.factory)
    }

    /**
     * TODO: make this more intelligent to find services that do not exactly match the given serviceId
     */
    private getFactory(props: AIsServiceProps): AIsAPIFactory<AIsServiceProps, AIsService> {
        const serviceId = props.serviceId

        // action
        const factory = this.serviceId2FactoryMapping.get(serviceId)

        // error handling and logging
        if (!factory) {
            console.log(`getFactory('${serviceId}') failed for: ${Array.from(this.serviceId2FactoryMapping.keys())}`)
            throw new AIsError(`No factory registered for serviceId '${serviceId}'`, ERROR_404_Not_Found)
        }
        console.log(`getFactory('${serviceId}') succeeded`)

        return factory
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
    getAIsService(props: AIsServiceProps, auth?: Auth): AIsService {
        // get API
        const factory = this.getFactory(props)
        const plainAIsAPI = factory.createAIsService(props, auth)

        // add filters
        const aisAPIWithFilters = this.applyAllDefaultFilters(plainAIsAPI)

        return aisAPIWithFilters
    }

    static getAIsService(props: AIsServiceProps, auth?: Auth): AIsService {
        return AIsBreaker.getInstance().getAIsService(props, auth)
    }


    /**
     * Get a service API for the given props (which include the serviceId)
     * from a remote AIsBreaker server.
     *
     * Inclusive all default filters. They will be added here during creation.
     *
     * @param apiSaisbreakerServerURL   URL of the remote AIsBreaker server
     * @param props                     of the requested service (incl. propos.serviceId)
     * @param auth                      optional auth object
     * @returns
     */
    getRemoteAIsService(aisbreakerServerURL: string, props: AIsServiceProps, auth?: Auth): AIsService {
        // create props for remote access
        const remoteProps = {
            "serviceId": "aisbreaker:network",
            "url": aisbreakerServerURL,
            "forward2ServiceProps": props
        }            

        return this.getAIsService(remoteProps, auth)
    }

    static getRemoteAIsService(aisbreakerServerURL: string, props: AIsServiceProps, auth?: Auth): AIsService {
        return AIsBreaker.getInstance().getRemoteAIsService(aisbreakerServerURL, props, auth)
    }


    async pingRemoteAIsService(aisbreakerServerURL: string): Promise<boolean> {
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
                console.log(`pingRemoteAIsService('${aisbreakerServerURL}') failed: ${error}`)
            }
            */
            return false
        }

        return false
    }

    static async pingRemoteAIsService(aisbreakerServerURL: string): Promise<boolean> {
        return await AIsBreaker.getInstance().pingRemoteAIsService(aisbreakerServerURL)
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
