import { AIsServiceProps, AIsAPIFactory, AIsService, Auth, Request, ResponseFinal } from "../api/index.js"
import { DefaultConversationState } from "../utils/index.js"

export abstract class BaseAIsService implements AIsService {
    serviceProps: AIsServiceProps
    auth?: Auth

    constructor(serviceProps: AIsServiceProps, auth?: Auth) {
        this.serviceProps = serviceProps
        this.auth = auth
    }

    /**
     * Let the service do its work.
     */
    abstract process(request: Request): Promise<ResponseFinal>

    //
    // helper methods
    //

    /** check that all required fields are present */
    checkRequest(request: Request) {
        const className = this.constructor.name

        // check that all required fields are present
        if (!request) {
            throw new Error(`${className}.process() - request is missing`)
        }
        if (!request.inputs) {
            throw new Error(`${className}.process() - request.inputs is missing`)
        }
        if (!request.inputs[0]) {
            throw new Error(`${className}.process() - request.inputs[0] is missing`)
        }
    }

    getConversationState(request: Request): DefaultConversationState {
        return DefaultConversationState.fromBase64(request.conversationState)
    }

    /**
     * `task:service/model` -> `model`
     * Examples:
     *   `chat:foo.com/gpt-next` -> `gpt-next`
     *   `text-to-image:bar-ai/my-model` -> `my-model`
     * 
     * @param serviceId `
     */
    getModelFromServiceId(serviceId: string): string | undefined {
        const parts = serviceId.split('/')
        if (parts.length >= 2) {
            // model found
            return parts[1]
        }

        // no model found
        return undefined
    }
}

export abstract class BaseAIsServiceFactory<SERVICE_T extends AIsService> 
    implements AIsAPIFactory<AIsServiceProps, SERVICE_T> {
        constructor() {
    }

    abstract createAIsService(props: AIsServiceProps, auth?: Auth): SERVICE_T;
}
