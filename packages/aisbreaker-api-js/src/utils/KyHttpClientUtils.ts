
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

/** Mapping onMessage() event handler to onChunk() */
function onChunk4onMessage(onMessage: (message: EventSourceMessage) => void):
    (arr: Uint8Array) => void {

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

/*
function getLinesDebug(onLine: (line: Uint8Array, fieldLength: number) => void): (arr: Uint8Array) => void {
    
    const funcDebug = function (arr: Uint8Array): void {
        console.log("\nfuncDebug START\n\n\n\n*********funcDebug START: arr=", arr)
        getLines(onLine)(arr)
        console.log("\nfuncDebug END\n\n\n\n*********funcDebug END: arr=", arr)
    }
    return funcDebug
}
*/

/**
 * Mapping onMessage() event handler to onDownloadProgress().
 * Useful for ky.post() / onDownloadProgress
 */
export function kyOnDownloadProgress4onMessage(
  onMessage: (message: EventSourceMessage) => void
): (progress: DownloadProgress, chunk: Uint8Array) => void {

  let onDownloadProgress = function (progress: DownloadProgress, chunk: Uint8Array): void {
    try {
      console.log("kyOnDownloadProgress4onMessage", progress)
      let onChunk = onChunk4onMessage(onMessageDebug(onMessage))
      onChunk(chunk)
    } catch (err) {
      console.error("kyOnDownloadProgress4onMessage", err)
    }
  }
  return onDownloadProgress
}

function onMessageDebug(onMessage: (message: EventSourceMessage) => void): (message: EventSourceMessage) => void {
    const funcDebug = function (message: EventSourceMessage): void {
        console.log("\nfuncDebug START\n\n\n\n*********funcDebug START: message=", message)
        onMessage(message)
        console.log("\nfuncDebug END\n\n\n\n*********funcDebug END: message=", message)
    }
    return funcDebug
}

/**
 * Default hook for ky.*()
 * 
 * Reduce logging spam by deleting some ky error details in the case of an HTTPError
 */
export function kyHooks(debug?: boolean) { 
    return {
        beforeError: kyHooksBeforeError(debug),
    }
}

export function kyHooksBeforeError(debug?: boolean) {
    return [
        async (error: HTTPError) => {
            if (!debug) {
                console.log("kyHooksBeforeError(): Delete some ky error details in HTTPError for less logging spam");
                const originalResponse = error.response;
                (error as any).request =  "Deleted in kyHooksBeforeError()";
                (error as any).response = "Deleted in kyHooksBeforeError()";
                (error as any).options =  "Deleted in kyHooksBeforeError()";
                if (originalResponse.json) {
                    try {
                        error.response = await originalResponse.json();
                        error.response.hint = "Details deleted in kyHooksBeforeError()"
                    } catch (err) {
                        error.response = err
                    }
                }
            }
            return error;
        }
    ]
}
