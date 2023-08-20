import { api } from 'aisbreaker-core-nodejs'

const DEBUG = false
const API_SERVER = 'http://localhost:3000'
const AISBREAKER_API_KEY = process.env.AISBREAKER_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY


// pre-checks
describe('Test remote service chat:openai.com is ready', () => {
  /* TODO
  test('Test ping remote service API', async () => {
    const aisService = api.AIsBreaker.getInstance().getAIsService({
      "serviceId": "aisbreaker:network",
      "url": API_SERVER,
    })
    //const response = await aisService.ping()
    // TODO: aisService.ping() must be implemented
    const response = "TODO: aisService.ping() must be implemented"
    expect(response).toEqual('pong')
  })
  */

  test('Check for OPENAI_API_KEY', () => {
    expect(OPENAI_API_KEY).toBeDefined()
  })
})


// tests
describe('Test remote service chat:openai.com', () => {
  // commont settings
  const serviceProps = {
    "serviceId": "aisbreaker:network",
    "url": API_SERVER,
    "forward2ServiceProps": {
      "serviceId": "chat:openai.com",
    }
  }
  const validOpenaiComAuth = {
    secret: OPENAI_API_KEY || "",
  }
  const validAisbreakerAuth = {
    secret: AISBREAKER_API_KEY || "",
  }
  const invalidAuth = {
    secret: "foo_invalid_api_key",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "programming language"


  test('Test remote service chat:openai.com, without stream, openai key, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processService(serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer)
  })


  test('Test remote service chat:openai.com, with stream, openai key, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processService(serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer)
    expect(streamedProgressText).toEqual(responseFinalText)
  })


  test('Test remote service chat:openai.com, without stream, aisbreaker key, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processService(serviceProps, validAisbreakerAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer)
  })


  test('Test remote service chat:openai.com, with stream, aisbreaker key, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processService(serviceProps, validAisbreakerAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer)
    expect(streamedProgressText).toEqual(responseFinalText)
  })


  test('Test remote service chat:openai.com, without stream, invalid access token', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processService(serviceProps, invalidAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer)
  })

  test('Test remote service chat:openai.com, with stream, invalid access token', async () => {
    // service initialization
    const doStream = true

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processService(serviceProps, invalidAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer)
  })

})


//
// helper functions
//

async function processService(
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
      inputs: [ {
          text: {
              role: 'user',
              content: prompt,
          },
      } ],
      streamProgressFunction: doStream ? streamProgressFunc : undefined,
  });
  const responseFinalText = responseFinal?.outputs[0]?.text?.content

  // both results
  return [responseFinal, responseFinalText, streamedProgressText]
}
