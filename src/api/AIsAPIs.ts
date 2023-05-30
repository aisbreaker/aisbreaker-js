import { Request, ResponseFinal } from "./models"




/**
 * Every service API must implement this interface.
 */
export interface AIsAPI { 
    serviceId: string

    sendMessage(request: Request): Promise<ResponseFinal>
}

/**
 * Every AIsAPI can be parametereized with a service-specific implementation of this props.
 */
export interface AIsProps {
    serviceId: string
    /** If the service needs an access key than either an accessKey or accessKeyId is set */
    //TODO: accessKey?: string
    accessKeyId?: string
}

/**
 * Factory for creating a service API.
 */
export interface AIsAPIFactory<PROPS_T extends AIsProps, API_T extends AIsAPI> {
    serviceId: string
    createAIsAPI(props: PROPS_T): API_T
}


