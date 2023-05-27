

import { Output } from './Output';
import { Usage } from './Usage';

/**
* Full/last response received for a request from the AI service.
*/
export type ResponseFinal = {
    /**
    * List of messages (prompts, media, ...) received from the AI service in the context of `conversation_state`.
    */
    outputs: Array<Output>

    /**
    * The value presents the conversation, i.e. the history of all (relevant) messages of the conversation. Not set for the first call of a conversation. The `conversation_state` value is returned by previous call of the same conversation. The value is opaque to the client, it could be e.g. a conversation ID or the full conversation state as base64-encoded JSON string or ...
    */
    conversationState?: string

    usage: Usage

    /**
    * Service implementation specific reponse values. Try to avoid using them because theay are NOT portable!!!
    */
    internResponse?: any
}
