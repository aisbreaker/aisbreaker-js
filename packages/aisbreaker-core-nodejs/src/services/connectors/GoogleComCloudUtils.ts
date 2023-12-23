import ky from 'ky'
import { HTTPError } from "ky"
import { api, extern, utils } from 'aisbreaker-api-js'
import { GoogleAuth } from 'google-auth-library'
import NodeCache from 'node-cache'

// short cuts
const logger = utils.logger

const specialApiKeyPrefix = "googlecloud-account-json-base64_"

/**
 * In memory cache of Google Cloud access tokens
 * key: auth secret (string)
 * value: access token (string)
 */
const allGoogleCloudAccessKeysCache = new NodeCache({
  stdTTL: 1*60, // 1 min (save setting; usually, tokens live for 3600 seconds = 1h)
})


/**
 * Get short-lived Google Cloud access token from auth.secret
 * 
 * @param auth
 * @returns access token
 */
export async function auth2GoogleCloudAccessToken(auth: api.Auth): Promise<string> {
  const secret = auth?.secret;
  if (!secret) {
    throw new Error("auth.secret is undefined")
  }
  if (secret.startsWith(specialApiKeyPrefix)) {
    // get Google Cloud token from account json
    // (type="authorized_user" or type="service_account")

    // try to get from cache
    let token = allGoogleCloudAccessKeysCache.get(secret) as string
    if (!token) {
      token = await auth2GoogleCloudOAuth2TokenUncached(auth)
      allGoogleCloudAccessKeysCache.set(secret, token)
    }
    return token
  } else {
    // this should be a normal Google Cloud token
    return secret
  }
}

/**
 * Prints and returns Google Cloud access token details
 * 
 * @param googleCloudAccessToken 
 * @returns token details
 */
export async function logGoogleCloudAccessTokenDetails(googleCloudAccessToken: string): Promise<any> {
  try {
    const json = await ky.post(`https://oauth2.googleapis.com/tokeninfo?access_token=${googleCloudAccessToken}`).json()
    logger.info(`Google Cloud access token details: ${JSON.stringify(json, undefined, 2)}\n`)
    return json
  } catch (error: any) {
    // network error
    if (error instanceof HTTPError) {
      logger.warn(`HTTPError:`, error)
      throw api.AIsError.fromHTTPError(error)
    } 
    // any other error
    throw new api.AIsError('Error while try to get Google Cloud access token: ${error}', extern.ERROR_401_Unauthorized) 
  }
}


//
// internal implementation
//

async function auth2GoogleCloudOAuth2TokenUncached(auth: api.Auth): Promise<string> {
  const secret = auth?.secret;
  if (!secret) {
    throw new Error("auth.secret is undefined")
  }
  if (secret.startsWith(specialApiKeyPrefix)) {
    // get Google Cloud token from account json
    // (type="authorized_user" or type="service_account")
    try {
      const accoutJsonBase64 = secret.substring(specialApiKeyPrefix.length)
      const token = await getGoogleCloudAccessTokenFromAccountJson(accoutJsonBase64)
      return token

    } catch (error: any) {
      // pass AIsErrors through
      if (error instanceof api.AIsError) {
        throw error
      }
      // network error
      if (error instanceof HTTPError) {
        logger.warn(`HTTPError:`, error)
        throw api.AIsError.fromHTTPError(error)
      } 
      // any other error
      throw new api.AIsError('Error while try to get Google Cloud access token: ${error}', extern.ERROR_401_Unauthorized) 
    }
  } else {
    // this should be a normal Google Cloud token
    return secret
  }
}

async function getGoogleCloudAccessTokenFromAccountJson(accountJsonBase64: string): Promise<string> {
  const accountJson = Buffer.from(accountJsonBase64, 'base64').toString('ascii');
  const account = JSON.parse(accountJson);
  const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
      // pass keyFile or pass credentials directly:
      //keyFile: "./google_credentials_firstname.lastname.json",
      credentials: account,
  });
  const token = await auth.getAccessToken()
  if (!token) {
    throw new api.AIsError('Got Google AccessToken=undefined from GoogleAuth.getAccessToken()', extern.ERROR_401_Unauthorized)
  }
  return token
}
