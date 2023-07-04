
import { Engine } from './Engine';

/**
* Details about the used AI service.
*/
export type Usage = {
    engine: Engine;

    /**
    * Total number of tokens used for this request+response.
    */
    totalTokens?: number;
    /**
    * Total number of milliseconds used for this request+response.
    */
    totalMilliseconds: number;
    /**
    * List of human readable free-text hints or warnings from the service to the client developer(s). The client should display them to the user.
    */
    serviceHints?: Array<string>;
}

