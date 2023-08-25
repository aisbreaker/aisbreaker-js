import { HTTPError } from "ky"
import { ERROR_500_Internal_Server_Error, ERROR_502_Bad_Gateway, ERROR_503_Service_Unavailable, getStatusText } from '../extern/index.js'
import { logger } from '../utils/logger.js'

//
// definition of an own Error class
// to be compatible with HTTP errors and error codes
//


/**
 * Error class struct to be able to easily forward HTTP errors and error codes
 * via the (network) AIsBreaker API to the actual client.
 */
export interface AIsErrorData {
  message: string
  statusCode: number
  statusText?: string
}
export function isAIsErrorData(obj: any): obj is AIsErrorData {
  const o = <AIsError>obj
  return (
    o?.message !== undefined &&
    typeof(o?.message) === 'string' &&
    o?.statusCode !== undefined &&
    typeof(o?.statusCode) === 'number'
  )
}

/**
 * Error class to be able to easily forward HTTP errors and error codes
 * via the (network) AIsBreaker API to the actual client.
 */
export class AIsError extends Error implements AIsErrorData {
  statusCode: number
  statusText?: string

  constructor(message: string, statusCode: number, statusText?: string) {
    // clean up status
    if (!statusText && statusCode) {
      statusText = getStatusText(statusCode)
    }

    // setup this object with error message
    if (message && statusCode) {
      super(message)
    } else {
      const code = (statusCode || statusCode === 0) ? statusCode : ''
      const text = statusText || ''
      const status = `${code} ${text}`.trim()
      const reason = status ? `status code ${status}` : 'an unknown error'
      super(`Failed with ${reason}: ${message}`)
    }

    // save status (after constructor call)
    this.statusCode = statusCode
    this.statusText = statusText


    // set the prototype explicitly
    Object.setPrototypeOf(this, AIsError.prototype);
  }

  getObject(): {message: string, statusCode: number, statusText?: string} {
    return {
      message: this.message,
      statusCode: this.statusCode,
      statusText: this.statusText,
    }
  }

  getErrorObject(): {error: {message: string, statusCode: number, statusText?: string}} {
    return {
      error: this.getObject(),
    }
  }


  /**
   * Convert existing (ky) HttpError into AIsError
   * 
   * @param httpError 
   * @param context optional context information/description/message prefix for error message
   * @returns AIsError
   */
  static fromHTTPError(httpError: HTTPError, context?: string): AIsError {
    const messagePrefix = context ? `${context}: ` : ''

    logger.debug(`fromHTTPError:`, httpError)

    logger.debug(`***** fromHTTPError DETAILS:`, JSON.stringify(httpError, null, 2))


    if (httpError.response) {
      // it has a response, so it looks like an HTTP error
      const response = httpError.response
      if (response.error && isAIsErrorData(response.error)) {
        // a propgated AIsError
        const e = response.error
        e.message = messagePrefix+e.message
        return AIsError.fromAIsErrorData(e)
      } else if (response.error) {
        // a propgated non-AIsBreaker error (e.g. from OpenAI API)
        const e = response.error
        const errorMessage = e.message || ""+e
        const statusCode = response.status || ERROR_503_Service_Unavailable
        const statusText = response.statusText
        return new AIsError(messagePrefix+httpError.message+": "+errorMessage, statusCode, statusText)
      } else {
        // a "normal HTTP error"
        const statusCode = response.status
        const statusText = response.statusText || ERROR_503_Service_Unavailable
        return new AIsError(messagePrefix+httpError.message, statusCode, statusText)
      }
    } else if (httpError.request) {
      // it doesn't have a response, so it looks like a network error
      return new AIsError(messagePrefix+httpError.message, ERROR_502_Bad_Gateway)

    } else {
      // doen't have a request nor a response, so it doesn't look like an HTTPError
      return AIsError.fromError(httpError, ERROR_500_Internal_Server_Error)
    }
  }

  /**
   * Convert existing Error into AIsError
   * 
   * @param error 
   * @param context optional context information/description/message prefix for error message
   * @returns AIsError
   */
  static fromError(error: Error, statusCode: number, context?: string): AIsError {
    const messagePrefix = context ? `${context}: ` : ''
    return new AIsError(messagePrefix+error.message, statusCode)
  }

  static fromAIsErrorData(data: AIsErrorData): AIsError {
    return new AIsError(data.message, data.statusCode, data.statusText)
  }
}
