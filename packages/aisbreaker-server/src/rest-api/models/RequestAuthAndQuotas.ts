import logger from "../../utils/logger.js"
import { RequestQuotas, isRequestQuotas } from "./RequestQuotas.js"

/**
 * authentication + request quotas,
 * usually extracted from client-provided auth
 * 
 * Expiration is not set here - this is handled by the JWT payload property 'exp'.
 */
export interface RequestAuthAndQuotas {
  requestQuotas?: RequestQuotas
  //serviceAuthSecrets?: ServiceIdPrefix2ServiceAuthSecret
  serviceSecrets?: ServiceIdAuthSecret[]
}

/*
export type ServiceIdPrefix2ServiceAuthSecret = {
    [serviceIdPrefix: string]: / *serviceAuthSecret* /string
}
*/
export interface ServiceIdAuthSecret {
  serviceId: string
  authSecret: string
}


//
// User Defined Type Guards
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards
//
export function isRequestAuthAndQuotas(obj: any): obj is RequestAuthAndQuotas {
  if (!obj) {
    logger.debug(`isRequestAuthAndQuotas() - invalid obj=undefined`)
    return false
  }
  /* TODO
  if (obj.validUntil && typeof obj.validUntil !== 'Date') {
    return false
  }
  */
  if (obj.requestQuotas && !isRequestQuotas(obj.requestQuotas)) {
    logger.debug(`isRequestAuthAndQuotas() - invalid requestQuotas: ${JSON.stringify(obj.requestQuotas)}`)
    return false
  }
  if (obj.serviceAuthSecrets && !isServiceIdPrefix2ServiceAuthSecretsObj(obj.serviceAuthSecrets)) {
    logger.debug(`isRequestAuthAndQuotas() - invalid serviceAuthSecrets: ${JSON.stringify(obj.serviceAuthSecrets)}`)
    return false
  }
  logger.debug(`isRequestAuthAndQuotas() - valid obj`)
  return true
}

/** pseudo type guard for 'type' */
function isServiceIdPrefix2ServiceAuthSecretsObj(obj: any): boolean {
  if (!obj) {
    return false
  }
  // iterate over all keys
  for (const key in obj) {
    // check if key is a string
    if (typeof key !== 'string') {
      logger.debug(`isServiceIdPrefix2ServiceAuthSecretsObj() - invalid key: ${key}`)
      return false
    }
    // check if value is a string
    if (typeof obj[key] !== 'string') {
      logger.debug(`isServiceIdPrefix2ServiceAuthSecretsObj() - invalid key/value: '${key}'/'${obj[key]}'`)
      return false
    }
  }
  return true
}
