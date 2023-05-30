import { AIsAPIFactory, AIsProps, AIsService } from "./AIsService"
import { 
    OpenAIChatFactroy,
    OpenAIImageFactroy,
    StabilityAIText2ImageFactroy,
    TrivialAssistantFactory,
    AIsProxyFactory,
} from '../adapters/index.js'
import { 
    DelegateFactory,
    TrivialProxyFactory,
} from '../composers/index.js'

/**
 * Class to create and manage service APIs.
 *
 * Starting point for app code / for code using the AIs framework.
 */

export class AIsBreaker {
    private static defaultAIsBreaker?: AIsBreaker

    private serviceId2FactoryMapping = new Map<string, AIsAPIFactory<AIsProps, AIsService>>()

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
        this.registerFactory(new AIsProxyFactory())
        this.registerFactory(new OpenAIChatFactroy())
        this.registerFactory(new OpenAIImageFactroy())
        this.registerFactory(new StabilityAIText2ImageFactroy())
        this.registerFactory(new TrivialAssistantFactory())

        this.registerFactory(new DelegateFactory())
        this.registerFactory(new TrivialProxyFactory())

        return this
    }

    /**
     * Register a service API factory with its serviceId.
     */
    registerFactory(factory: AIsAPIFactory<AIsProps, AIsService>) {
        this.serviceId2FactoryMapping.set(factory.serviceId, factory)
    }

    private getFactory(props: AIsProps): AIsAPIFactory<AIsProps, AIsService> {
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
    createAIsService(props: AIsProps): AIsService {
        // get API
        const factory = this.getFactory(props)
        const plainAIsAPI = factory.createAIsAPI(props)

        // add filters
        const aisAPIWithFilters = this.applyAllDefaultFilters(plainAIsAPI)

        return aisAPIWithFilters
    }

    private applyAllDefaultFilters(api: AIsService): AIsService {
        // TODO
        return api
    }
}
