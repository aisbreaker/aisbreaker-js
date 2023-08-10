import { RequestAuthAndQuotas, isRequestAuthAndQuotas } from '../rest-api/index.js'
import { decryptJson, encryptJson, stringTo265BitHash } from './JsonWebEncryptionUtils.js'
import { v4 as uuidv4 } from 'uuid'


//
// Utils for using JSON Web Encryption (JWE) with JSON Web Tokens (JWT)
//
// Background specs (in addition to JWT):
// * JSON Web Encryption (JWE): https://www.rfc-editor.org/rfc/rfc7516.html
// * JSON Web Algorithms (JWA): https://www.rfc-editor.org/rfc/rfc7518.html
//
// Example encrypted JWT:
//    'aisbreaker_eyJ2ZXIiOiJhaXNicm...'
// Example header:
//    {ver: 'aisbreaker.org/jwt/v1', typ: 'JOSE', alg: 'dir', enc: 'A128CBC-HS256' }
// Example payload:
//    {
//      requestQuotas: { globalRequestLimits: { requestsPerMinute: 60,  requestsPerHour: 600, ... } ...}, 
//      serviceSecrets: [ { serviceId: 'chat:openai.com', authSecret: 'secret' }, ... ],
//      sub: 'test.example.aisbreaker.org#aisbreaker',
//      iat: 1691710727,
//      exp: 1691710728
//     }


/** prefix of the bearer token/ before the JWT value */
export const ACCESS_TOKEN_PREFIX = 'aisbreaker_'

/**
 * Main key for encryption+decryption
 * 
 * Example:
 *   AUTH_ENCRYPTION_KEYPHRASE='aisbreaker.org-SuperSecret20398ucn938tVn24568'
 */
const AUTH_ENCRYPTION_KEYPHRASE = process.env.AUTH_ENCRYPTION_KEYPHRASE

/** 
 * Space limited keyphrases for descrion, in addtion to AUTH_ENCRYPTION_KEYPHRASE
 *
 * Multiple keys are usefull for a transition period when changing the encryption key.
 * 
 * Example:
 *   AUTH_ADDITIONAL_DECRYPTION_KEYPHRASES='fooKeafncfasc bar3249vgserdz baz3q4vter5tv'
 */
const AUTH_ADDITIONAL_DECRYPTION_KEYPHRASES = process.env.AUTH_ADDITIONAL_DECRYPTION_KEYPHRASES



//
// handling keys: configuration and conversion
//

/** 32 Byte/256bit key used for encryption and decryption */
function getEncryptionKey(): Uint8Array {
  // hard-coded demo:   jose.base64url.decode('zH4NRP1HMALxxCFnRZABFA7GOJtzU_gIj02alfL1lvI')

  // real key
  let keyphrase = AUTH_ENCRYPTION_KEYPHRASE
  if (!keyphrase || keyphrase.length < 10) {
    keyphrase = uuidv4()
    console.warn(`ATTENTION: AUTH_ENCRYPTION_KEYPHRASE is not set or too short - use a random key for each restart. For this test session we use '${keyphrase}'. DO NOT USE THIS IN PRODUCTION!`)
  } else {
    console.log(`AUTH_ENCRYPTION_KEYPHRASE='${keyphrase.substring(0, 3)}...' (len=${keyphrase.length}) is used.`)
  }

  // calculate sha256 hash
  return stringTo265BitHash(keyphrase)
}
const encryptionKey = getEncryptionKey()

/**
 * 32 Byte/256bit key(s) used for decryption
 * 
 * Multiple keys are usefull for a transition period when changing the encryption key.
 */
function getDecryptionKeys(): Uint8Array[] {
  // split by spaces, ignore empty strings, calculate sha256 hashes
  let additionalKeys: Uint8Array[] = []
  if (AUTH_ADDITIONAL_DECRYPTION_KEYPHRASES) {
    const keyPhrases = AUTH_ADDITIONAL_DECRYPTION_KEYPHRASES.split(' ').filter(s => s.length > 0)
    additionalKeys = keyPhrases.map(phrase => stringTo265BitHash(phrase))
  }

  // concat main key with additional keys
  return [encryptionKey, ...additionalKeys]
}
const decryptionKeys = getDecryptionKeys()


//
// encryption / decryption
//

/**
 * Create a HTTP bearer access token with encrypted/JWT payload.
 * 
 * @param hostname              e.g. 'api.example.com'
 * @param requestAuthAndQuotas  the quotas and secrets to be encrypted
 * @param expirationTimeSpan    it's resolved to a time span and added to the current timestamp,
 *                              e.g. '2h'
 * @returns Access token, like 'aisbreaker_eyABCxyz...'
 */
export async function encryptAisbreakerAccessToken(
  hostname: string,
  requestAuthAndQuotas: RequestAuthAndQuotas, 
  expirationTimeSpan: string): Promise<string> {
  const subject = getJoseSubjectValue(hostname)
  const payloadObj = requestAuthAndQuotas
  const jwt = await encryptJson(subject, encryptionKey, expirationTimeSpan, payloadObj)

  return ACCESS_TOKEN_PREFIX + jwt
}


export async function decryptAisbreakerAccessToken(
  hostname: string,
  accessToken: string): Promise<RequestAuthAndQuotas> {
  // trivial check
  if (!accessToken.startsWith(ACCESS_TOKEN_PREFIX)) {
    throw new Error(`Invalid access token start: '${accessToken.substring(0, 10)}...' (len=${accessToken.length})`)
  }

  // preparation
  const jwt = accessToken.substring(ACCESS_TOKEN_PREFIX.length)
  const subject = getJoseSubjectValue(hostname)

  // try all decryption keys
  for (const decryptionKey of decryptionKeys) {
    try {
      const result = await decryptAisbreakerAccessTokenWithSingleDecryptionKey(subject, jwt, decryptionKey)

      // no exception = success
      return result

    } catch (error) {
      // failed with this key - try next
    }
  }
  throw new Error(`Could decrypt access token with any available key: '${accessToken.substring(0, 10)}...' (len=${accessToken.length})`)
}

/**
 * Try to decrypt - throws an exception if it fails.
 * 
 * @param hostname
 * @param accessToken 
 */
async function decryptAisbreakerAccessTokenWithSingleDecryptionKey(
  subject: string,
  jwt: string,
  decryptionKey: Uint8Array): Promise<RequestAuthAndQuotas> {
  // try to decrypt
  const payloadObj = await decryptJson(jwt, subject, decryptionKey)

  // got payload that is not expired yet
  if (isRequestAuthAndQuotas(payloadObj)) {
    return payloadObj
  }

  // invalid payload
  throw new Error(`Invalid (access token) jwt payload type: '${jwt.substring(0, 5)}...' (len=${jwt.length})`)
}


function getJoseSubjectValue(hostname: string): string {
  return `${hostname}#aisbreaker`
}


