
import { OutputImage } from './OutputImage.js'
import { OutputText } from './OutputText.js'

/**
 * A message sent to the AI service. 
 * 
 * Hint: This is usually NOT a response to a previous request/reponse of the same conversation,
 *       because previous messages are stored in the conversation_state.
 */
export interface Output {
    /**
     * An Output message; either text or image or audio or video must be set.
     */
    text?: OutputText    

    /**
     * An Output message; either text or image or audio or video must be set.
     */
    image?: OutputImage    

    /**
     * An Output message; either text or image or audio or video must be set.
     */
    audio?: any    

    /**
     * An Output message; either text or image or audio or video must be set.
     */
    video?: any    
}
