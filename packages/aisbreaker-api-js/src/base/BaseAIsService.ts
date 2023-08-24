import { HTTPError } from "ky"
import {
  AIsAPIFactory,
  AIsError,
  AIsService,
  AIsServiceProps,
  Auth,
  isAIsErrorData,
  Request,
  ResponseFinal,
  ERROR_400_Bad_Request,
  ERROR_444_No_Response,
  ERROR_499_Client_Closed_Request,
  ERROR_500_Internal_Server_Error,
  ERROR_501_Not_Implemented,
  ERROR_502_Bad_Gateway,
  ERROR_503_Service_Unavailable,
} from "../api/index.js"
import { DefaultConversationState, tryToCreateAIsErrorFromKyResponse } from "../utils/index.js"

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

    try {
      console.log(`${context} START`)

      // action
      //const responseFinalOrAIsError = await processFunction()
      // check that all required fields are present
      this.checkRequest(request, context)

      // do the work
      console.log("********************* before processUnprotected")
      const responseFinalOrAIsError = await this.processUnprotected(request, context)
      console.log("********************* after processUnprotected")

      // process the final result
      if (!responseFinalOrAIsError) {
        throw new AIsError(`${context} - No final response`, ERROR_444_No_Response)
      } else if (responseFinalOrAIsError instanceof AIsError) {
        // re-throw the error unchanged
        throw responseFinalOrAIsError
      } else {
        // return the response
        console.log(`${context} END with successful responseFinal: `, responseFinalOrAIsError)
        return responseFinalOrAIsError
      }

    } catch (error) {
      // error handling
      const originalMessage = ""+error

      // Is this an error thrwon by ky HTTP client?
      // Then error.response could contain a message string or a JSON-encoded AIsError
      if ((error as any).response) {
        const aisError = undefined as any //await tryToCreateAIsErrorFromKyResponse((error as any).response)
        if (aisError) {
          aisError.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, aisError.message)
          console.warn(`${context} END with AIsError from network response:`, aisError)
          throw aisError
        }
      }

      // handle different kinds of errors
      if (error instanceof AIsError) {
        // re-throw the error unchanged
        error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
        console.warn(`${context} END with AIsError:`, error)
        throw error
      }
      if (isAIsErrorData(error)) {
        // re-throw as error
        error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
        const e = AIsError.fromAIsErrorData(error)
        console.warn(`${context} END with AIsErrorData:`, e)
        throw e
      }

      if ((error as any).name === 'NetworkError') {
        const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Fetch failed1(Base): ${originalMessage}${optionalErrorCauseMessage}`)
        console.warn(`${context} END with NetworkError: ${message}`, error)
        throw new AIsError(message, ERROR_502_Bad_Gateway)
      }

      if ((error as any).name === 'TypeError') {
        // some fetch/ky errors are TypeErrors ( https://stackoverflow.com/questions/69390474/fetchapi-response-on-dns-failure )
        const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Fetch failed2(Base): ${originalMessage}${optionalErrorCauseMessage}`)
        console.warn(`${context} END with TypeError: ${message}`, error)
        throw new AIsError(message, ERROR_503_Service_Unavailable)
      }

      if ((error as any).name === 'SyntaxError') {
        // e.g. ky.json() parse error
        const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Parse failed(Base): ${originalMessage}${optionalErrorCauseMessage}`)
        console.warn(`${context} END with SyntaxError: ${message}`, error)
        throw new AIsError(message, ERROR_503_Service_Unavailable)
      }

      if ((error as any).name === 'AbortError') {
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Fetch aborted(Base): ${originalMessage}`)
        console.warn(`${context} END with AbortError: ${message}`, error)
        throw new AIsError(message, ERROR_499_Client_Closed_Request)
      }

      if (error instanceof HTTPError) {
        error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
        console.warn(`${context} END with HTTPError:`, error)
        throw AIsError.fromHTTPError(error, context)
      }

      // any other error is an internal (server) error
      console.warn(`${context} END with internal error:`, error)
      const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
      throw new AIsError(
        `${context}: General Error(Base) - ${error}${optionalErrorCauseMessage}`,
        ERROR_500_Internal_Server_Error
      )
    }
  }
  /**
   * Let the service do its work.
   */
  async process00TODELETE(request: Request): Promise<ResponseFinal> {
    // preparation for loggging and exceptions
    const context = `${this.getContext(request)}.process()`

    // action
    const finalResult = await protectProcessFunction00TODELETE(async () => {
      // check that all required fields are present
      this.checkRequest(request, context)

      // do the work
      return await this.processUnprotected(request, context)
    }, context)
    return finalResult
  }


  /**
   * Do the work of process()
   * without the need to care about all error handling.
   * 
   * @param request  the request to process
   * @param context  optional context information/description/message prefix
   *                 for logging and for error messages
   * @returns The final result.
   *          In the case of an error it returns an AIsError OR throws an AIError or general Error.
   */
  async processUnprotected(request: Request, context: string): Promise<ResponseFinal | AIsError | undefined> {
    const className = this.constructor.name
    throw new AIsError(`${className}/${context}: Either process() or processUnprotected() must be implemented/overridden!`, ERROR_501_Not_Implemented)
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
 * In the case of an error, try to catch it
 * and propagate it as or convert it to an AIsError.
 */
export async function protectProcessFunction00TODELETE(
  processFunction: ()=>Promise<ResponseFinal | AIsError | undefined>,
  context: string
  ): Promise<ResponseFinal> {
  try {
    console.log(`${context}.process START`)

    // action
    const responseFinalOrAIsError = await processFunction()

    if (!responseFinalOrAIsError) {
      throw new AIsError(`${context}.process() - No final response`, ERROR_444_No_Response)
    } else if (responseFinalOrAIsError instanceof AIsError) {
      // re-throw the error unchanged
      throw responseFinalOrAIsError
    } else {
      // return the response
      console.log(`${context}.process END with responseFinal (success): `, responseFinalOrAIsError)
      return responseFinalOrAIsError
    }

  } catch (error) {
    // error handling
    const originalMessage = ""+error

    // Is this an error thrwon by ky HTTP client?
    // Then error.response could contain a message string or a JSON-encoded AIsError
    if ((error as any).response) {
      const aisError = await tryToCreateAIsErrorFromKyResponse((error as any).response)
      if (aisError) {
        aisError.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, aisError.message)
        console.warn(`${context}.process END with AIsError from network response:`, aisError)
        throw aisError
      }
    }

    // handle different kinds of errors
    if (error instanceof AIsError) {
      // re-throw the error unchanged
      error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
      console.warn(`${context}.process END with AIsError:`, error)
      throw error
    }
    if (isAIsErrorData(error)) {
      // re-throw as error
      error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
      const e = AIsError.fromAIsErrorData(error)
      console.warn(`${context}.process END with AIsErrorData:`, e)
      throw e
    }

    if ((error as any).name === 'NetworkError') {
      const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `fetch failed: ${originalMessage}`)
      console.warn(`${context}.process END with NetworkError: ${message}`, error)
      throw new AIsError(message, ERROR_502_Bad_Gateway)
    }

    if ((error as any).name === 'AbortError') {
      const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `fetch aborted: ${originalMessage}`)
      console.warn(`${context}.process END with AbortError: ${message}`, error)
      throw new AIsError(message, ERROR_499_Client_Closed_Request)
    }

    if (error instanceof HTTPError) {
      error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
      console.warn(`${context}.process END with HTTPError:`, error)
      throw AIsError.fromHTTPError(error, context)
    }

    // any other error is an internal (server) error
    console.warn(`${context}.process END with internal error:`, error)
    throw new AIsError(`${context}.process() - ${error}`, ERROR_500_Internal_Server_Error)
  }
}

function addPrefixIfNotAlreadyPresent(
  expectedPrefixSubstring: string,
  prefixToAdd: string,
  message: string
): string {
  // pre-check
  if (!message) {
    return prefixToAdd + "<undefined>"
  }
  // action
  if (message.includes(expectedPrefixSubstring)) {
    // nothing to do
    return message
  } else {
    // add prefix
    return prefixToAdd + message
  }
}

/** @returns a root cause message (with prefix ': '), or an empty string*/
function getOptionalErrorCauseMessageWithColonPrefix(error: any): string {
  if (error?.cause) {
    return `: ${error.cause}`
  } else {
    return ''
  }
}

export abstract class BaseAIsServiceFactory<SERVICE_T extends AIsService> 
    implements AIsAPIFactory<AIsServiceProps, SERVICE_T> {
        constructor() {
    }

    abstract createAIsService(props: AIsServiceProps, auth?: Auth): SERVICE_T;
}
