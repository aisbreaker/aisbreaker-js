/**
 * The existence of this objects shows that a text response is requested. 
 * An empty object is possible to just indicated that a text repsonse is wanted.
 */
export interface RequestedMediaText {
    /**
     * ISO 639-1 language code.  See https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
     * 
     * Examples: 'en', 'es', 'de', 'zh', ...
     */
    'language'?: string

    /**
     * Maximum number of characters in the response. 
     * Similar to the `max_tokens` parameter OpenAI'API multiplied with a factor
     * but more portable across different services and vendors
     * 
     maxChars?: number
     */
}
