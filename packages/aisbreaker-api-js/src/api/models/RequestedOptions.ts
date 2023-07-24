import { RequestedMediaImage } from './RequestedMediaImage.js'
import { RequestedMediaText } from './RequestedMediaText.js'

/**
* General (not service specific) options for the AI service request and its response.
*/
export interface RequestedOptions {
    //
    // Specify requested a media response (text, image, audio, and/or video).
    //

    /** Should be set if text/es is/are expected in the response. */
    text?: RequestedMediaText

    /** Should be set if image/s is/are expected in the response. */
    image?: RequestedMediaImage

    /**
     * Should be set if audio/s is/are expected in the response.
     * 
     * More details to be specified later.
     */
    audio?: object

    /**
     * Should be set if video/s is/are expected in the response.
     * 
     * More details to be specified later.
     */
    video?: object


    //
    // further options
    //

    /**
     * Number of alternative responses to generate (aka `samples`).
     */
    samples?: number

    /**
    * Spening limit for this request+respone (most services get paid by tokens).
    *
    'maxTotalTokens'?: number
    */
}
