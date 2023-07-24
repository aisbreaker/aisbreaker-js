
import { InputImage } from './InputImage.js'
import { InputText } from './InputText.js'

/**
 * A message sent to the AI service. 
 * 
 * Hint: This is usually NOT a response to a previous request/reponse of the same conversation,
 *       because previous messages are stored in the conversationState.
 */
export interface Input {
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
