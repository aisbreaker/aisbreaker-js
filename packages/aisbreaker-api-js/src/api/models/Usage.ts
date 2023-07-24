import { Engine } from './Engine.js'

/**
 * Details about the used AI service.
 */
export interface Usage {
    /**
     * The AI service/engine used for this request+response.
     */
    engine: Engine

    /**
     * Total number of credits/tokens used for this request+response.
     * 
     * Problem: credits/tokens of different services/vendors are not comparable.
     *
     totalTokens?: number
     */

    /**
     * Total number of milliseconds used for this request+response.
     */
    totalMilliseconds: number

    /**
     * List of human readable free-text hints or warnings from the service to the client developer(s).
     * The client should display them to the user.???
     */
    serviceHints?: Array<string>
}
