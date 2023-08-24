import { HTTPError } from "ky"
import { AIsError } from "../api/AIsError.js"
import { AIsServiceProps, AIsAPIFactory, AIsService, Auth, Request, ResponseFinal } from "../api/index.js"
import { DefaultConversationState, ERROR_400_Bad_Request, ERROR_499_Client_Closed_Request, ERROR_500_Internal_Server_Error, ERROR_501_Not_Implemented, ERROR_502_Bad_Gateway } from "../utils/index.js"

export abstract class BaseAIsService<PROPS_T extends AIsServiceProps> implements AIsService {
    serviceProps: PROPS_T
    auth?: Auth

    constructor(serviceProps: PROPS_T, auth?: Auth) {
        this.serviceProps = serviceProps
        this.auth = auth
    }

  /**
   * Let the service do its work.
   */
  async process(request: Request): Promise<ResponseFinal> {
    // preparation for loggging and exceptions
    const context = `${this.getContext(request)}.process()`

    // action
    return await protectProcessFunction(async () => {
      // check that all required fields are present
      this.checkRequest(request, context)

      // do the work
      return await this.processUnprotected(request, context)
    }, context)
  }

  /**
   * Do the work of process()
   * without the need to care about all error handling.
    * @param request
    * @param context  optional context information/description/message prefix
    *                 for logging and for error messages
   */
  async processUnprotected(request: Request, context: string): Promise<ResponseFinal> {
    const className = this.constructor.name
    throw new AIsError(`${className}: Either process() or processUnprotected() must be implemented/overridden!`, ERROR_501_Not_Implemented)
  }

  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContext(request?: Request): string {
    const className = this.constructor.name
    const serviceIdOrSimilarContext = this.getContextService(request)
    if (serviceIdOrSimilarContext) {
      return `${className}(${serviceIdOrSimilarContext})`
    } else {
      return `${className}`
    }
  }
  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: Request): string | undefined {
    const contextService = this.serviceProps?.serviceId
    return contextService
  }

    //
    // helper methods
    //

    /** check that all required fields are present
     * 
     * @param request
     * @param context  optional context information/description/message prefix
     *                 for logging and for error messages
     */
    checkRequest(request: Request, context: string) {
        // check that all required fields are present
        if (!request) {
            throw new AIsError(`${context}.process() - request is missing`, ERROR_400_Bad_Request)
        }
        if (!request.inputs) {
            throw new AIsError(`${context}.process() - request.inputs is missing`, ERROR_400_Bad_Request)
        }
        if (!request.inputs[0]) {
            throw new AIsError(`${context}.process() - request.inputs[0] is missing`, ERROR_400_Bad_Request)
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

/**
 * In the case of an error, try to catch it and convert it to an AIsError.
 */
export async function protectProcessFunction(
  processFunction: ()=>Promise<ResponseFinal>,
  context: string
  ): Promise<ResponseFinal> {
  try {

    // action
    return await processFunction()

  } catch (error) {
    // error handling
    let originalMessage = ""+error

    if (error instanceof AIsError) {
      // re-throw the error unchanged
      console.error(`${context} - AIsError:`, error)
      throw error
    }

    if ((error as any).name === 'NetworkError') {
      const message = `${context}: fetch failed: ${originalMessage}`
      console.error(message, error)
      throw new AIsError(message, ERROR_502_Bad_Gateway)
    }

    if ((error as any).name === 'AbortError') {
      const message = `${context}: fetch aborted: ${originalMessage}`
      console.error(message, error)
      throw new AIsError(message, ERROR_499_Client_Closed_Request)
    }

    if (error instanceof HTTPError) {
      console.log(`${context} - HTTPError:`, error)
      throw AIsError.fromHTTPError(error, context)
    }

    // any other error is an internal (server) error
    console.log(`${context} - internal error:`, error)
    throw new AIsError(`${context}.process() - ${error}`, ERROR_500_Internal_Server_Error)
  }
}


export abstract class BaseAIsServiceFactory<SERVICE_T extends AIsService> 
    implements AIsAPIFactory<AIsServiceProps, SERVICE_T> {
        constructor() {
    }

    abstract createAIsService(props: AIsServiceProps, auth?: Auth): SERVICE_T;
}
