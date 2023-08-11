import * as jose from 'jose'
import { RequestAuthAndQuotas } from '../rest-api/index.js'
import { createHash } from 'crypto'



//
// Utils for using JSON Web Encryption (JWE) with JSON Web Tokens (JWT)
//
// Background specs (in addition to JWT):
// * JSON Web Encryption (JWE): https://www.rfc-editor.org/rfc/rfc7516.html
// * JSON Web Algorithms (JWA): https://www.rfc-editor.org/rfc/rfc7518.html
//
// Example header:
//    {ver: 'aisbreaker.org/jwt/v1', typ: 'JOSE', alg: 'dir', enc: 'A128CBC-HS256' }
// Example payload:
//    {
//      foo: 'foo-value',
//      bar: 'bar-value',
//      sub: 'api.example.com#aisbreaker',
//      iat: 1691710727,
//      exp: 1691710728
//    }

/** version to be saved in JWT header */
const JWT_VERSION_STRING = 'aisbreaker.org/jwt/v1'

/**
 * Encrypt an object to a JWT.
 * 
 * @param subject               part of the JWT header to be checked on decryption,
 *                              e.g. 'api.example.com#aisbreaker'
 * @param encryptDecryptKey     symetric key,
 *                              e.g. jose.base64url.decode('zH4NRP1HMALxxCFnRZABFA7GOJtzU_gIj02alfL1lvI')
 * @param expirationTimeSpan    it's resolved to a time span and added to the current timestamp,
 *                              e.g. '2h'
 * @param payloadObj            user data to be encrypted
 * @returns 
 */
export async function encryptJson(
  subject: string,
  encryptDecryptKey: Uint8Array,
  expirationTimeSpan: string,
  payloadObj: any,
  ): Promise<string> {

  const jwt = await new jose.EncryptJWT(payloadObj)
    .setProtectedHeader({ ver: JWT_VERSION_STRING, typ: 'JOSE', alg: 'dir', enc: 'A128CBC-HS256' })
    .setSubject(subject)
    //.setIssuer('urn:aisbreaker-server:issuer')
    //.setAudience('urn:aisbreaker-client:audience')
    .setIssuedAt()
    .setExpirationTime(expirationTimeSpan)
    .encrypt(encryptDecryptKey)

  return jwt
}

/**
 * Decrypt a JWT to an object.
 * 
 * Check the header values for correctness and throw an error if they are not as expected.
 * Returns the payload object.
 * 
 * @param jwt                   to be decrypted - was previously returned by encryptJson()
 * @param subject               part of the JWT header to be checked on decryption,
 *                              e.g. 'api.example.com#aisbreaker'
 * @param encryptDecryptKey     symetric key,
 *                              e.g. jose.base64url.decode('zH4NRP1HMALxxCFnRZABFA7GOJtzU_gIj02alfL1lvI')
 * @returns payloadObj from encrpytJson()
 */
export async function decryptJson(
  jwt: string,
  subject: string,
  encryptDescrptKey: Uint8Array): Promise<object> {
  const { payload, protectedHeader } = await jose.jwtDecrypt(jwt, encryptDescrptKey, {
    // expected values/claims
    subject: subject,
    //issuer: 'urn:aisbreaker-server:issuer',
    //audience: 'urn:aisbreaker-client:audience',
  })

  //console.log(protectedHeader)
  //console.log(payload)

  return payload
}



//
// hash function
//

export function stringTo265BitHash(s: string): Uint8Array {
  return createHash('sha256').update(s).digest()
}
