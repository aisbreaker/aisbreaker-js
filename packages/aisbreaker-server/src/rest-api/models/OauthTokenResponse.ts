
export interface OauthTokenResponse {
    /**
    * Access token for subsequent calls of other pathes of this API.
    * 
    * Use undersore in the name to follow the naming convention of the OAuth 2.0 RFC.
    */
    access_token: string

    /**
    * HTTP Authenication type of the accessToken. Currently, always 'Bearer'.
    * 
    * Use undersore in the name to follow the naming convention of the OAuth 2.0 RFC.
    */
    token_type: 'Bearer'
}
