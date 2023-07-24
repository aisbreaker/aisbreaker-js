import { Input } from "./Input.js"
import { Output } from "./Output.js"

/**
 * A message sent to (request) or from (reponse) the AI service.
 */
export interface Message {
    /**
     * An input message; either input or output must be set.
     */
    input?: Input

    /**
     * An input message; either input or output must be set.
     */
    output?: Output
}
