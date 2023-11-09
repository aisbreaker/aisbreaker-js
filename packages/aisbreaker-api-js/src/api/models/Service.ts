
/**
 * AI service and its engine.
 */
export interface Service {
    /**
     * Service ID = connected service. 
     *              Ususally, inclusive the service-specific engine/model ID.
     * 
     * Details: https://aisbreaker.org/docs/serviceId
     */
    serviceId: string

    /**
     * Service specific engine/model ID
     */
    engine?: string;

    url?: string
}
