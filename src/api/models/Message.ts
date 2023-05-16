import { Input } from "./Input";
import { Output } from "./Output";

/**
* A message sent to (request) or from (reponse) the AI service.
*/
export type Message = {
    /**
     * An input message; either input or output must be set.
     */
    input?: Input

    /**
     * An input message; either input or output must be set.
     */
    output?: Output
}

//export type MessageT = TextInputMessageT | ImageInputMessageT