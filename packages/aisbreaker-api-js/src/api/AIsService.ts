import { Auth, Request, ResponseFinal } from "./models/index.js"


/**
 * Every service API must implement this interface.
 */
export interface AIsService { 
    /** set in constructor */
    serviceProps: AIsServiceProps
    /** only some services have `auth` and it's set in constructor *
    auth?: Auth
    */

    /**
     * Let the service do its work.
     * 
     * Alternative names: infer, derive, task, reply, respond, process, ...
     */
    process(request: Request): Promise<ResponseFinal>
}

/**
 * Every AIsService can be parameterized with these 
 * or (in very rare cases) with a service-specific extention of these properties.
 */
export interface AIsServiceProps {
    /**
     * Unique identified of the AIsBreaker service,
     * see: https://aisbreaker.org/docs/serviceId
     */
    serviceId: string

    /**
     * URL of the AI service (optional).
     */
    url?: string

    /**
     * Service implementation specific opts.
     * Try to avoid using them because they are NOT portable!!!
     */
    internServiceOptions?: any
}

/**
 * Factory for creating a service API.
 */
/* maybe over engineered with PROPS_T: */
export interface AIsAPIFactory<PROPS_T extends AIsServiceProps, SERVICE_T extends AIsService> {
    createAIsService(props: PROPS_T, auth?: Auth): SERVICE_T
}
