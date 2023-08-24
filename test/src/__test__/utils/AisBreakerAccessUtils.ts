import * as core from 'aisbreaker-core-nodejs'
import { api } from 'aisbreaker-api-js'

//
// helper functions for tests
//

core.init()

export function testPingRemoteAisbreakerServer(aisbreakerServerURL: string) {
    test(`Ping remote AIsBreaker server '${aisbreakerServerURL}'`, async () => {
      const success = await api.AIsBreaker.pingRemoteAIsService(aisbreakerServerURL)
  
      // check result
      expect(success).toBe(true)
    })
  }
  
  
export async function processRemoteService(
  apiServerUrl: string,
  serviceProps: api.AIsServiceProps,
  auth: api.Auth,
  prompt: string,
  doStream: boolean):   
  Promise<[
    responseFinal: api.ResponseFinal, 
    responseFinalText: string | undefined, 
    streamedProgressText: string | undefined
  ]> {

  // service initialization
  const aisService = api.AIsBreaker.getRemoteAIsService(apiServerUrl, serviceProps, auth)

  // process with stream
  let streamedProgressText: string | undefined
  let streamProgressFunc: api.StreamProgressFunction = (responseEvent: api.ResponseEvent) => {
    if (responseEvent?.outputs?.length > 0) {
      const token = responseEvent?.outputs[0]?.text?.content || ''
      if (!streamedProgressText) {
        streamedProgressText = ''
      }
      streamedProgressText += token
    }
  }
  const responseFinal = await aisService.process({
    inputs: [{
      text: {
        role: 'user',
        content: prompt,
      },
    }],
    streamProgressFunction: doStream ? streamProgressFunc : undefined,
  });
  let responseFinalText
  if (responseFinal?.outputs) {
    responseFinalText = responseFinal?.outputs[0]?.text?.content
  }

  // both results
  return [responseFinal, responseFinalText, streamedProgressText]
}
    
export async function processService(
  serviceProps: api.AIsServiceProps,
  auth: api.Auth,
  prompt: string,
  doStream: boolean):   
  Promise<[
    responseFinal: api.ResponseFinal, 
    responseFinalText: string | undefined, 
    streamedProgressText: string | undefined
  ]> {

  // service initialization
  const aisService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)

  // process with stream
  let streamedProgressText: string | undefined
  let streamProgressFunc: api.StreamProgressFunction = (responseEvent: api.ResponseEvent) => {
    if (responseEvent?.outputs?.length > 0) {
      const token = responseEvent?.outputs[0]?.text?.content || ''
      if (!streamedProgressText) {
        streamedProgressText = ''
      }
      streamedProgressText += token
    }
  }
  const responseFinal = await aisService.process({
    inputs: [{
      text: {
        role: 'user',
        content: prompt,
      },
    }],
    streamProgressFunction: doStream ? streamProgressFunc : undefined,
  });
  const responseFinalText = responseFinal?.outputs[0]?.text?.content

  // both results
  return [responseFinal, responseFinalText, streamedProgressText]
}
