
/**
* General (not servcie specific) options for the AI service request.
*/
export class RequestOptions {
    /**
    * service specific engine/model ID
    */
    'engineId'?: string;
    /**
    * Spening limit for this request+respone (most services get paid by tokens).
    */
    'maxTotalTokens'?: number;
    /**
    * Number of alternative responses to generate (aka `samples`).
    */
    'numberOfAlternativeResponses'?: number;

    public constructor() {
    }
}

