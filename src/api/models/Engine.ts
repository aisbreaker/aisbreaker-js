
/**
* AI service and its engine.
*/
export type Engine = {
    /**
    * Service ID = connected service. Usually, one service can handle multiple AI services represent by service-specific engines.
    */
    serviceId: string;
    /**
    * service specific engine/model ID
    */
    engineId: string;
}

