import { Output } from './Output.js'

/**
 * Response received from the AI service. Can also be a partial response in the case of streaming/HTTP Server Side Events.
 */
export interface ResponseEvent {
    /**
     * List of messages (prompts, media, ...) received from the AI service
     * in the context of the provided `conversation_state`.
     */
    outputs: Output[]

    /**
     * Service implementation specific reponse values.
     * 
     * Try to avoid using them because they are NOT portable!!!
     */
    internResponse?: any
}
