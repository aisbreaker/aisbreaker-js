import { RequestMediaImage } from '../models/RequestMediaImage';
import { RequestMediaText } from '../models/RequestMediaText';

/**
* Request a media response (text, image, audio, and/or video) from the AI service.
*/
export type RequestMedia = {
    'text'?: RequestMediaText
    'image'?: RequestMediaImage
    /**
    * More details to be specified later.
    */
    'audio'?: any
    /**
    * More details to be specified later.
    */
    'video'?: any
}

