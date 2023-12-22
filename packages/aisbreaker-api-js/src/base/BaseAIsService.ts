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
  Service,
} from "../api/index.js"
import {
  ERROR_400_Bad_Request,
  ERROR_444_No_Response,
  ERROR_499_Client_Closed_Request,
  ERROR_500_Internal_Server_Error,
  ERROR_501_Not_Implemented,
  ERROR_502_Bad_Gateway,
  ERROR_503_Service_Unavailable,
} from '../extern/HttpStatusCodes.js'

import { DefaultConversationState } from "../utils/index.js"
import { logger } from '../utils/logger.js'
import { AIsServiceDefaults } from "./AIsServiceDefaults.js"
import { getTaskVendorEngineFromServiceId } from "./TaskVendorEngineUtils.js"
import { getServiceUrl } from "./ServiceUrlUtils.js"
import { assert } from "console"


export abstract class BaseAIsService<PROPS_T extends AIsServiceProps,
                                     DEFAULTS_T extends AIsServiceDefaults>
                implements AIsService {
  // provided properties                  
  serviceProps: PROPS_T
  serviceDefaults: DEFAULTS_T
  auth?: Auth

  // derived properties
  task: string
  vendor: string
  engineOpt?: string
  engine: string
  urlOpt?: string
  url: string

  constructor(serviceProps: PROPS_T, serviceDefaults: DEFAULTS_T, auth?: Auth) {
    this.serviceProps = serviceProps
    this.serviceDefaults = serviceDefaults
    this.auth = auth

    // derive settings from the parameters
    const taskVendorEngine = getTaskVendorEngineFromServiceId(serviceProps.serviceId, serviceDefaults)

    if (!taskVendorEngine.task) {
      throw new Error (`task is missing for serviceId: ${serviceProps.serviceId}`)
    }
    this.task = taskVendorEngine.task
    this.vendor = taskVendorEngine.vendor || this.constructor.name
    this.engineOpt = taskVendorEngine.engine
    this.engine = this.engineOpt || '<unknown-engine>'

    this.urlOpt = this.getServiceUrl(serviceProps.url, this.engineOpt, serviceDefaults)
    this.url = this.urlOpt || '<unknown-url>'
  }

  /**
   * Let the service do its work.
   */
  async process(request: Request): Promise<ResponseFinal> {
    // preparation for loggging and exceptions
    const context = `${this.getContext(request)}.process()`

    try {
      logger.debug(`${context} START`)

      // action
      //const responseFinalOrAIsError = await processFunction()
      // check that all required fields are present
      this.checkRequest(request, context)

      // do the work
      const responseFinalOrAIsError = await this.processUnprotected(request, context)

      // process the final result
      if (!responseFinalOrAIsError) {
        throw new AIsError(`${context} - No final response`, ERROR_444_No_Response)
      } else if (responseFinalOrAIsError instanceof AIsError) {
        // re-throw the error unchanged
        throw responseFinalOrAIsError
      } else {
        // return the response
        logger.silly(`${context} END with successful responseFinal: `, responseFinalOrAIsError)
        return responseFinalOrAIsError
      }

    } catch (error) {
      // error handling
      const originalMessage = ""+error

      // Is this an error thrown by ky HTTP client?
      // Then error.response could contain a message string or a JSON-encoded AIsError
      if ((error as any).response) {
        const aisError = undefined as any //await tryToCreateAIsErrorFromKyResponse((error as any).response)
        if (aisError) {
          aisError.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, aisError.message)
          logger.warn(`${context} END with AIsError from network response:`, aisError)
          throw aisError
        }
      }

      // handle different kinds of errors
      if (error instanceof AIsError) {
        // re-throw the error unchanged
        error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
        logger.warn(`${context} END with AIsError:`, error)
        throw error
      }
      if (isAIsErrorData(error)) {
        // re-throw as error
        error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
        const e = AIsError.fromAIsErrorData(error)
        logger.warn(`${context} END with AIsErrorData:`, e)
        throw e
      }

      if ((error as any).name === 'NetworkError') {
        const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Fetch failed1(Base): ${originalMessage}${optionalErrorCauseMessage}`)
        logger.warn(`${context} END with NetworkError: ${message}`, error)
        throw new AIsError(message, ERROR_502_Bad_Gateway)
      }

      if ((error as any).name === 'TypeError') {
        // some fetch/ky errors are TypeErrors ( https://stackoverflow.com/questions/69390474/fetchapi-response-on-dns-failure )
        const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Fetch failed2(Base): ${originalMessage}${optionalErrorCauseMessage}`)
        logger.warn(`${context} END with TypeError: ${message}`, error)
        throw new AIsError(message, ERROR_503_Service_Unavailable)
      }

      if ((error as any).name === 'SyntaxError') {
        // e.g. ky.json() parse error
        const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Parse failed(Base): ${originalMessage}${optionalErrorCauseMessage}`)
        logger.warn(`${context} END with SyntaxError: ${message}`, error)
        throw new AIsError(message, ERROR_503_Service_Unavailable)
      }

      if ((error as any).name === 'AbortError') {
        const message = addPrefixIfNotAlreadyPresent(context, `${context}: `, `Fetch aborted(Base): ${originalMessage}`)
        logger.warn(`${context} END with AbortError: ${message}`, error)
        throw new AIsError(message, ERROR_499_Client_Closed_Request)
      }

      if (error instanceof HTTPError) {
        error.message = addPrefixIfNotAlreadyPresent(context, `${context}: `, error.message)
        logger.warn(`${context} END with HTTPError:`, error)
        throw AIsError.fromHTTPError(error, context)
      }

      // any other error is an internal (server) error
      logger.warn(`${context} END with internal error:`, error)
      try {
        logger.warn(`${context} END with internal error:`, error, ', as JSON:', JSON.stringify(error))
      } catch (ex) {
        // ignore
      }
      const optionalErrorCauseMessage = getOptionalErrorCauseMessageWithColonPrefix(error)
      throw new AIsError(
        `${context}: General Error(Base) - ${error}${optionalErrorCauseMessage}`,
        ERROR_500_Internal_Server_Error
      )
    }
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

  //
  // functions for service implementation
  //

  /**
   * @returns ResponseFinal.usage.service
   */
  getService(actualEngine?: string): Service {
    const service = {
      serviceId: this.serviceProps.serviceId,
      engine: actualEngine || this.engineOpt,
      url: this.urlOpt,
    }
    return service
  }

  //
  // functions for logging and error handling
  //

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

  /**
   * Derive the service URL.
   * 
   * Implemented as method here to allow overriding.
   * 
   * @param url       The (base) URL specified in AIsServiceProps.
   * @param engine    The engine derived form serviceId
   * @param serviceDefaults 
   * @returns The URL to access the actual AI service.
   */
  getServiceUrl(
    url: string | undefined,
    engine: string | undefined,
    serviceDefaults: AIsServiceDefaults): string | undefined {
    
    return getServiceUrl(url, engine, serviceDefaults)
  }
  
  /**
   * Check that all required fields are present
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
}

//
// helper functions
//

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
