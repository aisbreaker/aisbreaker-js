
import { Output } from './Output';

/**
* Response received from the AI service. Can also be a partial response in the case of streaming/HTTP Server Side Events.
*/
export type ResponseEvent = {
    /**
    * List of messages (prompts, media, ...) received from the AI service int he context of `conversation_state`.
    */
    outputs: Output[]

    /**
    * Service implementation specific reponse values. Try to avoid using them because theay are NOT portable!!!
    */
    internResponse?: any
}
