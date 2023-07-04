
import { InputImage } from './InputImage';
import { InputText } from './InputText';

/**
* A message sent to the AI service.  ???This is usually NOT a response to a previous request/reponse of the same conversation, because previous messages are stored in the conversation_state.
*/
export type Input = {
    /**
     * An input message; either text or image or audio or video must be set.
     */
    text?: InputText    

    /**
     * An input message; either text or image or audio or video must be set.
     */
    image?: InputImage    

    /**
     * An input message; either text or image or audio or video must be set.
     */
    audio?: any    

    /**
     * An input message; either text or image or audio or video must be set.
     */
    video?: any    
}
