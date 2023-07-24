
/**
 * AI service and its engine.
 */
export interface Engine {
    /**
     * Service ID = connected service. Ususally, inclusive the service-specific engine/model ID.
     * 
     * Details: https://aisbreaker.org/docs/serviceId
     */
    serviceId: string
    /**
    * service specific engine/model ID
    engineId: string;
    */
}

