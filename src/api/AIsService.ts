import { Request, ResponseFinal } from "./models"




/**
 * Every service API must implement this interface.
 */
export interface AIsService { 
    serviceId: string

    sendMessage(request: Request): Promise<ResponseFinal>
}

/**
 * Every AIsService can be parameterized with a service-specific implementation of this props.
 */
export interface AIsProps {
    serviceId: string

    /** If the service needs an API key/access key than an apiKey and/or apiKeyId must be set */
    apiKey?: string
    apiKeyId?: string
}

/**
 * Factory for creating a service API.
 */
export interface AIsAPIFactory<PROPS_T extends AIsProps, SERVICE_T extends AIsService> {
    serviceId: string
    createAIsAPI(props: PROPS_T): SERVICE_T
}


