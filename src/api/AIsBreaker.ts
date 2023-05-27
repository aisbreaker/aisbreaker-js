import { AIsAPIFactory, AIsProps, AIsAPI } from "./AIsAPIs"
import { 
    OpenAIChatFactroy,
    OpenAIImageFactroy,
    StabilityAIText2ImageFactroy,
    TrivialAssistantFactory,
    TrivialProxy,
    TrivialProxyFactory,
} from '../adapters/index.js'

/**
 * Class to create and manage service APIs.
 *
 * Starting point for app code / for code using the AIs framework.
 */

export class AIsBreaker {
    private static defaultAIsBreaker?: AIsBreaker

    private serviceId2FactoryMapping = new Map<string, AIsAPIFactory<AIsProps, AIsAPI>>()

    constructor() {
    }

    static getInstance(): AIsBreaker {
        if (!AIsBreaker.defaultAIsBreaker) {
            AIsBreaker.defaultAIsBreaker = new AIsBreaker()
        }
        AIsBreaker.defaultAIsBreaker.registerAllDefaultFactories()
        return AIsBreaker.defaultAIsBreaker
    }

    registerAllDefaultFactories(): AIsBreaker {
        // register
        this.registerFactory(new TrivialAssistantFactory())
        this.registerFactory(new TrivialProxyFactory())
        this.registerFactory(new OpenAIChatFactroy())
        this.registerFactory(new OpenAIImageFactroy())
        this.registerFactory(new StabilityAIText2ImageFactroy())

        return this
    }

    /**
     * Register a service API factory with its serviceId.
     */
    registerFactory(factory: AIsAPIFactory<AIsProps, AIsAPI>) {
        this.serviceId2FactoryMapping.set(factory.serviceId, factory)
    }

    private getFactory(props: AIsProps): AIsAPIFactory<AIsProps, AIsAPI> {
        const serviceId = props.serviceId
        const factory = this.serviceId2FactoryMapping.get(serviceId)
        if (!factory) {
            throw new Error(`No factory registered for serviceId '${serviceId}'`)
        }
        return factory
    }

    /**
     * Get a service API for the given props (which include the serviceId).
     *
     * Inclusive all default filters. They will be added here during creation.
     *
     * @param props    of the requested service (incl. propos.serviceId)
     * @returns
     */
    createAIsAPI(props: AIsProps): AIsAPI {
        // get API
        const factory = this.getFactory(props)
        const plainAIsAPI = factory.createAIsAPI(props)

        // add filters
        const aisAPIWithFilters = this.applyAllDefaultFilters(plainAIsAPI)

        return aisAPIWithFilters
    }

    private applyAllDefaultFilters(api: AIsAPI): AIsAPI {
        // TODO
        return api
    }
}
