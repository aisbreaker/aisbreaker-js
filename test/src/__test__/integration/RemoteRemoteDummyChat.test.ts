import { api } from 'aisbreaker-api-js'
import { processRemoteService, testPingRemoteAisbreakerServer } from '../utils/AisBreakerAccessUtils.js'
import { DEBUG, AISBREAKER_SERVER_URL as URL, AISBREAKER_API_KEY } from './config.js'


// precondition checks
describe('Test preconditions', () => {
  testPingRemoteAisbreakerServer(URL)

  test('Check for AISBREAKER_API_KEY', () => {
    expect(AISBREAKER_API_KEY).toBeDefined()
  })

})


// tests
describe('Test complex remote service chain', () => {
  // commont settings: client->aisbreaker->aisbreaker->mirror->dummy
  // (double remote - to test the AisBreaker client executed in the server)
  const serviceProps = {
    "serviceId": "aisbreaker:network",
    "url": URL,
    "forward2ServiceProps": {
      "serviceId": "aisbreaker:mirror",
      "forward2ServiceProps": {
        "serviceId": "chat:dummy",
      }
    }
  }
  const validAisbreakerAuth = {
    secret: AISBREAKER_API_KEY || "",
  }
  const invalidAisbreakerAuth = {
    secret: "aisbreaker_test_with_invalid_api_key",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "tpircSavaJ"


  test('Test complex remote service chain: without stream, aisbreaker key, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
    await processRemoteService(URL, serviceProps, validAisbreakerAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  })

  test('Test complex remote service chain: with stream, aisbreaker key, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processRemoteService(URL, serviceProps, validAisbreakerAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
    // this is maybe not correct for mirror+stream:
    //expect(streamedProgressText).toEqual(responseFinalText)
  })


  test('Test (complex) remote service chain: without stream, invalid access token (error expected)', async () => {
    // service initialization
    const doStream = false

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, serviceProps, invalidAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 401
    const expectedRootCauseMessage = `Invalid aisbreaker access token`
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })

  test('Test (complex) remote service chain: with stream, invalid access token (error expected)', async () => {
    // service initialization
    const doStream = true

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, serviceProps, invalidAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 401
    const expectedRootCauseMessage = 'Invalid aisbreaker access token'
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })
})
