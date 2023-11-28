import { RequestAuthAndQuotas, RequestQuotas } from "../models/index.js"

let apiRequestQuotasCache: RequestQuotas | undefined
/**
 * (API overall quotas)
 * 
 * @returns Absolute/overall request quotas for the API
 */
export async function getApiRequestQuotas(): Promise<RequestQuotas> {
  // already loaded?
  if (apiRequestQuotasCache) {
    // yes
    return apiRequestQuotasCache
  }
  
  // no, load now
  apiRequestQuotasCache = await getApiRequestQuotasInitial()
  return apiRequestQuotasCache
}
async function getApiRequestQuotasInitial(): Promise<RequestQuotas> {
  return {
    globalRequestLimits: {
      requestsPerMinute: 600,
      requestsPerHour: 3600,
      requestsPerDay: 86400,
    },
    perClientRequestLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 360,
      requestsPerDay: 8640,
    }     
  }
}

/**
 * Request without auth? Use this default API key/access token.
 *
 * @returns default API key/access token, or undefined if none is configured.
 */
export async function getDefaultAisbreakerApiKey(): Promise<string | undefined> {
  let result = process.env.DEFAULT_AISBREAKER_API_KEY
  if (result && result.trim().length === 0) {
    result = undefined
  }
  return result
}


let defaultRequestAuthAndQuotasCache: RequestAuthAndQuotas | undefined
/**
 * (quotas per Auth)
 * 
 * @returns default authentication+request quotas (in addition to getApiRequestQuotas()),
 *          used if no (valid) Auth was provided by the client.         
 */
export async function getDefaultRequestAuthAndQuotas(serverHostname: string): Promise<RequestAuthAndQuotas> {
  // already loaded?
  if (defaultRequestAuthAndQuotasCache) {
    // yes
    return defaultRequestAuthAndQuotasCache
  }

  // no, load now
  defaultRequestAuthAndQuotasCache = await getDefaultRequestAuthAndQuotasInitial(serverHostname)
  return defaultRequestAuthAndQuotasCache
}
async function getDefaultRequestAuthAndQuotasInitial(serverHostname: string): Promise<RequestAuthAndQuotas> {
  return {
    requestQuotas: {
      globalRequestLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 600,
        requestsPerDay: 1200,
      },
      perClientRequestLimits: {
        requestsPerMinute: 10,
        requestsPerHour: 60,
        requestsPerDay: 120,
      }     
    }
  }
}
