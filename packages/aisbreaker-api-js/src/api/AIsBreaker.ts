import { AIsAPIFactory, AIsServiceProps, AIsService } from "./AIsService.js"
import { Auth } from "./models/index.js"

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
            throw new Error(`No factory registered for serviceId '${serviceId}'`)
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

    static getAIsService(props: AIsServiceProps): AIsService {
        return AIsBreaker.getInstance().getAIsService(props)
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
