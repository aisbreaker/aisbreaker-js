import { Input } from './Input.js'
import { RequestedOptions } from './RequestedOptions.js'
import { ResponseEvent } from './ResponseEvent.js'

/**
 * Send a message to the AI service and get the response.
 */
export interface Request {
    /**
     * List of messages (prompts, media, ...) to send to the AI service for the conversation specified in `conversation_state`.
     */
    inputs: Input[]

    /**
     * The value presents the conversation, e.g. the history of all (relevant) messages of the conversation. Not set for the first call of a conversation. The `conversation_state` value is returned by previous call of the same conversation. The value is opaque to the client, it could be e.g. a conversation ID or the full conversation state as base64-encoded JSON string or ...
     */
    conversationState?: string

    requested?: RequestedOptions

    /**
     * Service implementation specific opts.
     * 
     * Try to avoid using them because they are NOT portable!!!
     */
    internOptions?: any

    /**
     * A unique identifier representing the end-user, which can help the AI service to monitor and detect abuse. ( e.g. https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids ) the value is opaque to the API. Do not use emails or other personally identifiable information (PII); instead use temporary identifies or hashed or encrypted values. ALternatively, this field can also be used for tracing and debugging purposes.
     */
    clientUser?: string

    /**
     * If set to true, partial message deltas will be sent, like in ChatGPT.
     * Tokens will be sent as events as they become available.
     */
    streamProgressFunction?: StreamProgressFunction

    /**
     * If set, the request will be aborted when the signal is aborted.
     */
    abortSignal?: AbortSignal
}

/**
 * Same as `Request` but with more optional fields.
 */
export interface ClientRequest {
    /**
     * List of messages (prompts, media, ...) to send to the AI service for the conversation specified in `conversation_state`.
     */
    inputs?: Input[]

    /**
     * Convenience field for sending a single text message to the AI service.
     * It is equivalent to `inputs: [{text: {role: 'user', content: text}}]`.
     * 
     * Exactly one of either `text` or `inputs` must be set.
     * 
     * In a _normalized_ request, the `text` field is never set, 
     * i.e. normal service implementation can ignore this field.
     */
    text?: string

    /**
     * The value presents the conversation, e.g. the history of all (relevant) messages of the conversation. Not set for the first call of a conversation. The `conversation_state` value is returned by previous call of the same conversation. The value is opaque to the client, it could be e.g. a conversation ID or the full conversation state as base64-encoded JSON string or ...
     */
    conversationState?: string

    requested?: RequestedOptions

    /**
     * Service implementation specific opts.
     * 
     * Try to avoid using them because they are NOT portable!!!
     */
    internOptions?: any

    /**
     * A unique identifier representing the end-user, which can help the AI service to monitor and detect abuse. ( e.g. https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids ) the value is opaque to the API. Do not use emails or other personally identifiable information (PII); instead use temporary identifies or hashed or encrypted values. ALternatively, this field can also be used for tracing and debugging purposes.
     */
    clientUser?: string

    /**
     * If set to true, partial message deltas will be sent, like in ChatGPT.  Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a data: [DONE]
     */
    streamProgressFunction?: StreamProgressFunction
}


export type StreamProgressFunction = (responseEvent: ResponseEvent) => void;
