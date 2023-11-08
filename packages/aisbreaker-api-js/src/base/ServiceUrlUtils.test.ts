import { getServiceUrl } from './ServiceUrlUtils.js'

/**
 * Unit tests for ServiceUrlUtils
 * 
 * @group unit
 */
describe('getServiceUrl', () => {
  const serviceDefaults = { engine: 'default/model', url: 'https://default.com/def/api/v1/${engine}' }

  // tests for undefined or empty
  test('(1) returns undefined if url and serviceDefaults.url are undefined or empty', () => {
    const serviceDefaults = { engine: 'default/model', url: '' }
    expect(getServiceUrl(undefined, undefined, serviceDefaults)).toBeUndefined()
    expect(getServiceUrl('',        undefined, serviceDefaults)).toBeUndefined()
    expect(getServiceUrl(undefined, '',        serviceDefaults)).toBeUndefined()
    expect(getServiceUrl('',        '',        serviceDefaults)).toBeUndefined()
  })

  test('(2) uses serviceDefaults.url if url is undefined or empty', () => {
    expect(getServiceUrl(undefined, undefined, serviceDefaults)).toBe("https://default.com/def/api/v1/default/model")
    expect(getServiceUrl('',        undefined, serviceDefaults)).toBe("https://default.com/def/api/v1/default/model")
  })

  // normal cases
  test('(3) uses url if it is set + default path', () => {
    expect(getServiceUrl('https://custom-url.com/', undefined, serviceDefaults)).toBe('https://custom-url.com/def/api/v1/default/model')
  })

  test('(4) encodes engine and replaces "${engine}" in url', () => {
    expect(getServiceUrl(undefined, 'test/engine', serviceDefaults)).toBe('https://default.com/def/api/v1/test/engine')
  })

  test('(5) appends default path to url if allowed (default)', () => {
    expect(getServiceUrl('https://custom-url.com/my-api/', undefined, serviceDefaults)).toBe('https://custom-url.com/my-api/def/api/v1/default/model')
  })

  test('(6) does not append default path to url if not allowed, and remove #no-default-path flag', () => {
    expect(getServiceUrl('https://custom-url.com/my-api/#no-default-path', undefined, serviceDefaults)).toBe('https://custom-url.com/my-api/')
  })

  // tests for undefined or empty
  test('(7) returns undefined if serviceDefaults.url is undefined or empty and url does not exist', () => {
    const serviceDefaults = { engine: 'test', url: '' }
    expect(getServiceUrl(undefined, undefined, serviceDefaults)).toBeUndefined()
    expect(getServiceUrl('',        undefined, serviceDefaults)).toBeUndefined()
  })

  test('(8) returns undefined if serviceDefaults.url is undefined or empty and url is empty', () => {
    const serviceDefaults = { engine: 'test', url: '' }
    expect(getServiceUrl(undefined, '', serviceDefaults)).toBeUndefined()
    expect(getServiceUrl('',        '', serviceDefaults)).toBeUndefined()
  })

  test('(9) returns undefined if serviceDefaults.url is undefined or empty and url is undefined', () => {
    const serviceDefaults = { engine: 'test', url: '' }
    expect(getServiceUrl(undefined, undefined, serviceDefaults)).toBeUndefined()
  })
})