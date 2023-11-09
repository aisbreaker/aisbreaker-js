//
// helper to derive AI service URL
//

import { AIsServiceDefaults } from "./AIsServiceDefaults.js"

/**
 * Derive the service URL.
 * 
 * Details on: https://aisbreaker.org/docs/url
 * 
 * @param url       The (base) URL specified in AIsServiceProps.
 * @param engine    The engine derived form serviceId
 * @param serviceDefaults 
 * @returns The URL to access the actual AI service.
 */
export function getServiceUrl(
  url: string | undefined,
  engine: string | undefined,
  serviceDefaults: AIsServiceDefaults): string | undefined {

  // prepare and check url
  let rawUrl: string
  let useDefaultUrl: boolean
  if (!url || url.length === 0) {
    if (!serviceDefaults.url || serviceDefaults.url.length === 0) {
      return undefined
    }
    useDefaultUrl = true
    rawUrl = serviceDefaults.url
  } else {
    useDefaultUrl = false
    rawUrl = url
  }

  // prepare and check engine
  let rawEngine = engine || serviceDefaults.engine
  rawEngine = encodeEngine(rawEngine)

  // look for flag "#no-default-path"
  const doAppendDefaultPath = rawUrl.includes('#no-default-path') ? false : true
  if (!doAppendDefaultPath) {
    // remove flag
    rawUrl = rawUrl.replace('#no-default-path', '')
  }

  // append default path?
  // Imprtant: do this before replacing "${engine}" in URL
  if (doAppendDefaultPath && !useDefaultUrl && serviceDefaults.url) {
    // yes: append default path to URL!
    const defaultPath = getPathFromUrl(serviceDefaults.url)
    // remove trailing slash '/' from url
    if (rawUrl.endsWith('/')) {
      rawUrl = rawUrl.slice(0, -1)
    }
    // append default path
    rawUrl = rawUrl + defaultPath
  }

  // replace "${engine}" in URL with engine
  if (rawEngine) {
    rawUrl = rawUrl.replace('${engine}', rawEngine)
  }

  // result
  return rawUrl
}

function encodeEngine(engine: string | undefined): string | undefined {
  if (!engine) {
    return undefined
  }
  // repace special chars, ':' and '?', but keep '/'
  const magicString = 'MYcwerfehSLASH'
  return encodeURIComponent(engine.replace('/', magicString)).replace(magicString, '/')
}

function getPathFromUrl(url: string): string {
  const urlObj = new URL(url)
  
  // path of URL
  let path = urlObj.pathname
  // fix url-encoded path,
  // example: /def/api/v1/$%7Bengine%7D -> /def/api/v1/${engine}
  path = decodeURIComponent(path)

  // query of URL
  const query = urlObj.search

  // result
  if (query && query.length > 0) {
    return path + query
  } else {
    return path
  }
}
