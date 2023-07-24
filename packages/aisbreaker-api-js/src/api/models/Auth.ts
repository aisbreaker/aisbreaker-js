
/**
 * Authentication data to use a specific AI service.
 * 
 * Shoud not be logged for security reasons.
 */
export interface Auth {
    /**
     * If the service needs an access token/auth token/API key/access key it must be set here.
     */
    secret?: string
}

export class AccessToken implements Auth {
    secret: string

    constructor(secret: string) {
        this.secret = secret
    }
}
