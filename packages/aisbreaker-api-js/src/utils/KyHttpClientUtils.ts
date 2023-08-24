
/* TODO: use for wrapping or delete:

//
// wrapper for ky  helper functions
//

export * from 'ky-universal'
export {default} from 'ky-universal'
export * as ky from 'ky-universal'
*/


//
// helper for ky helper functions
// to support [Server Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format)
//
// using [@waylaidwanderer/fetch-event-source/parse](https://github.com/waylaidwanderer/fetch-event-source/blob/main/src/parse.ts)
//

import { EventSourceMessage, getLines, getMessages } from '@waylaidwanderer/fetch-event-source/parse'
import { DownloadProgress, HTTPError } from 'ky'
import { AIsError, isAIsErrorData } from '../api/AIsError.js'
import { ERROR_500_Internal_Server_Error, ERROR_503_Service_Unavailable } from '../extern/HttpStatusCodes.js'
import { logger } from './logger.js'


const TRACE = false

/** Mapping onMessage() event handler to onChunk() */
function onChunk4onMessage(
  onMessage: (message: EventSourceMessage) => void
):(arr: Uint8Array) => void {

  let onChunk: (arr: Uint8Array) => void = getLines(getMessages(
    onMessage,    
    id => {
      /*
      if (id) {
          // store the id and send it back on the next retry:
          headers[LastEventId] = id;
      } else {
          // don't send the last-event-id header anymore:
          delete headers[LastEventId];
      }
      */
    }, retry => {
      /*
      retryInterval = retry;
      */
    }
  ))
  return onChunk
}

/**
 * Mapping onMessage() event handler to onDownloadProgress().
 * Useful for ky.post() / onDownloadProgress
 */
export function kyOnDownloadProgress4onMessage(
  onMessage: (message: EventSourceMessage) => void
): (progress: DownloadProgress, chunk: Uint8Array) => void {

  let onDownloadProgress = function (progress: DownloadProgress, chunk: Uint8Array): void {
    try {
      logger.debug("kyOnDownloadProgress4onMessage", progress)
      let onChunk = onChunk4onMessage(onMessageDebug(onMessage))
      onChunk(chunk)
    } catch (err) {
      logger.warn("kyOnDownloadProgress4onMessage", err)
    }
  }
  return onDownloadProgress
}

function onMessageDebug(onMessage: (message: EventSourceMessage) => void): (message: EventSourceMessage) => void {
  const funcDebug = function (message: EventSourceMessage): void {
    if (TRACE) {
      logger.silly("onMessageDebug() START: message=", message)
    }
    onMessage(message)
    if (TRACE) {
      logger.silly("onMessageDebug() END: message=", message)
    }
  }
  return funcDebug
}

/**
 * Default hook for ky.*()
 * 
 * Reduce logging spam by deleting some ky error details in the case of an HTTPError
 */
export function kyHooksToReduceLogging(debug?: boolean) { 
  return {
    beforeError: kyHooksBeforeErrorToReduceLogging(debug),
  }
}

export function kyHooksBeforeErrorToReduceLogging(debug?: boolean) {
  return [
    async (error: HTTPError) => {
      if (!debug) {
        logger.info("kyHooksBeforeErrorToReduceLogging(): Skip/delete some ky error details in HTTPError object for less logging spam")
        const originalResponse = error.response;
        (error as any).request =  "Skipped in kyHooksBeforeErrorToReduceLogging()";
        (error as any).response = "Skipped in kyHooksBeforeErrorToReduceLogging()";
        (error as any).options =  "Skipped in kyHooksBeforeErrorToReduceLogging()";
        if (originalResponse.json) {
          try {
            error.response = await originalResponse.json();
            error.response.ATTENTION = "***** Object details skipped/deleted in kyHooksBeforeErrorToReduceLogging() - for less logging spam!!! *****"
          } catch (err) {
            error.response = err
          }
        }
        // try to keep response.status and response.statusText
        // for later use in AIsError.fromHTTPError()
        try {
          if (!error.response) {
            error.response = {}
          }
          error.response.status = originalResponse.status
          error.response.statusText = originalResponse.statusText
        } catch (e) {
          logger.warn("kyHooksBeforeErrorToReduceLogging() error: ", e)
        }
      }
      return error;
    }
  ]
}


//
// error helpers
//

/**
 * Throws an AIsError if the response contains an error, otherwise it just returns 
 * 
 * @param response ky response, potenially with an JSON-encoded AIsError
 * @returns the AIsError if the response contains an error, otherwise undefined
 */
export async function tryToCreateAIsErrorFromKyResponse(response: any): Promise<AIsError | undefined> {
  let error: AIsError | string | undefined
  try {
    error = await tryToExtractErrorFromKyResponse(response)
  } catch (error) {
    const message = "tryToCreateAIsErrorFromKyResponse() error: "+error
    logger.warn(message, error)
    error = new AIsError(message, ERROR_500_Internal_Server_Error)
  }
  if (error) {
    if (isAIsErrorData(error)) {
      return AIsError.fromAIsErrorData(error)
    } else {
      const errorMessage = error
      return new AIsError(errorMessage, ERROR_503_Service_Unavailable)
    }
  }
}
async function tryToExtractErrorFromKyResponse(response: any): Promise<AIsError | string | undefined> {
  if (response && response.json) {
    try {
      const json = await response.json()
      //logger.debug("tryToExtractErrorFromKyResponse: ", json)
      if (json) {
        const error = json.error
        if (error) {
          const errorError = error?.error
          if (isAIsErrorData(errorError)) {
            return AIsError.fromAIsErrorData(errorError)
          }
          if (isAIsErrorData(error)) {
            return AIsError.fromAIsErrorData(error)
          }
          return JSON.stringify(error)
        } else {
          return JSON.stringify(json)
        }
      }
    } catch (error) {
      // exctract failed
      return undefined
    }
  }
  return undefined
}
