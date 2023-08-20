import { HTTPError } from "ky"
import { getStatusText } from '../utils/index.js'

//
// definition of an own Error class
// to be compatible with HTTP errors and error codes
//


/**
 * Error class to be able to easily forward HTTP errors and error codes
 * via the (network) AIsBreaker API to the actual client.
 */
export class AIsError extends Error {
  statusCode?: number
  statusText?: string

  constructor(message: string, statusCode?: number, statusText?: string) {
    // clean up status
    if (!statusText && statusCode) {
      statusText = getStatusText(statusCode)
    }

    // setup this object with error message
    const code = (statusCode || statusCode === 0) ? statusCode : ''
		const text = statusText || ''
		const status = `${code} ${text}`.trim()
		const reason = status ? `status code ${status}` : 'an unknown error'
		super(`Failed with ${reason}: ${message}`);

    // save status (after constructor call)
    this.statusCode = statusCode
    this.statusText = statusText


    // set the prototype explicitly
    Object.setPrototypeOf(this, AIsError.prototype);
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

    if (httpError.response) {
      // it has a response, so it looks like an HTTP error
      const response = httpError.response
      const statusCode = response.status
      const statusText = response.statusText
      return new AIsError(messagePrefix+httpError.message, statusCode, statusText)

    } else if (httpError.request) {
      // it doesn't have a response, so it looks like a network error
      return new AIsError(messagePrefix+httpError.message, 502 /*'Bad Gateway'*/)

    } else {
      // doen't have a request nor a response, so it doesn't look like an HTTPError
      return AIsError.fromError(httpError)
    }
  }

  /**
   * Convert existing Error into AIsError
   * 
   * @param error 
   * @param context optional context information/description/message prefix for error message
   * @returns AIsError
   */
  static fromError(error: Error, context?: string): AIsError {
    const messagePrefix = context ? `${context}: ` : ''
    return new AIsError(messagePrefix+error.message)
  }
}
