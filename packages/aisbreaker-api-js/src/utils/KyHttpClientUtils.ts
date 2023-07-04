
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
import { DownloadProgress } from 'ky'

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

/**
 * Mapping onMessage() event handler to onDownloadProgress().
 * Useful for ky.post() / onDownloadProgress
 */
export function kyOnDownloadProgress4onMessage(onMessage: (message: EventSourceMessage) => void):
    (progress: DownloadProgress, chunk: Uint8Array) => void {

    let onDownloadProgress = function (progress: DownloadProgress, chunk: Uint8Array): void {
        let onChunk = onChunk4onMessage(onMessage)
        onChunk(chunk)
    }
    return onDownloadProgress
}
