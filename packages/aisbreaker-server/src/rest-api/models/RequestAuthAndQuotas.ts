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
    return false
  }
  /* TODO
  if (obj.validUntil && typeof obj.validUntil !== 'Date') {
    return false
  }
  */
  if (obj.requestQuotas && !isRequestQuotas(obj.requestQuotas)) {
    return false
  }
  if (obj.serviceAuthSecrets && !isServiceIdPrefix2ServiceAuthSecretsObj(obj.serviceAuthSecrets)) {
    return false
  }
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
      return false
    }
    // check if value is a string
    if (typeof obj[key] !== 'string') {
      return false
    }
  }
  return true
}
