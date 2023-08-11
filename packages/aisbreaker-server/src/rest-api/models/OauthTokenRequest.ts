import { RequestAuthAndQuotas } from "./RequestAuthAndQuotas.js";


export interface OauthTokenRequest {
  /**
   * User ID = username.
   * 
   * Currently ignored.
   */
  clientId?: string
  /**
   * Client secret = password.
   * 
   * Currently ignored.
   */
  clientSecret?: string

  /**
   * Details of the requested access token: quotas and embedded access tokens for selected service(Id)s
   */
  requestAuthAndQuotas: RequestAuthAndQuotas

  /**
   * expirationTimeSpan: is resolved to a time span and added to the current timestamp, e.g. '2h'
   * 
   * Default: 2h
   * Max: 90d
   */
  expirationTimeSpan?: string
}
