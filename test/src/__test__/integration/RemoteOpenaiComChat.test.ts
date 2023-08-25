import { api } from 'aisbreaker-api-js'
import { processRemoteService, testPingRemoteAisbreakerServer } from '../utils/AisBreakerAccessUtils.js'
import { DEBUG, AISBREAKER_SERVER_URL as URL, AISBREAKER_API_KEY, OPENAI_API_KEY } from './config.js'


// precondition checks
describe('Test preconditions', () => {
  testPingRemoteAisbreakerServer(URL)

  test('Check for OPENAI_API_KEY', () => {
    expect(OPENAI_API_KEY).toBeDefined()
  })

  test('Check for AISBREAKER_API_KEY', () => {
    expect(AISBREAKER_API_KEY).toBeDefined()
  })

})

const OPENAI_LONG_ANSWER_TIMEOUT_MILLIS = 10000


// tests
describe('Test remote service chat:openai.com', () => {
  // commont settings
  const serviceProps = {
    "serviceId": "chat:openai.com",
  }
  const validOpenaiComAuth = {
    secret: OPENAI_API_KEY || "",
  }
  const validAisbreakerAuth = {
    secret: AISBREAKER_API_KEY || "",
  }
  const invalidOpenaiComAuth = {
    secret: "sk-invalid_api_key_for_test",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "programming language"


  test('Test remote service chat:openai.com: without stream, openai key, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processRemoteService(URL, serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  }, OPENAI_LONG_ANSWER_TIMEOUT_MILLIS)


  test('Test remote service chat:openai.com: with stream, openai key, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processRemoteService(URL, serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
    expect(streamedProgressText).toEqual(responseFinalText)
  }, OPENAI_LONG_ANSWER_TIMEOUT_MILLIS)


  test('Test remote service chat:openai.com: without stream, aisbreaker key, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
    await processRemoteService(URL, serviceProps, validAisbreakerAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  }, OPENAI_LONG_ANSWER_TIMEOUT_MILLIS)


  test('Test remote service chat:openai.com: with stream, aisbreaker key, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processRemoteService(URL, serviceProps, validAisbreakerAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
    expect(streamedProgressText).toEqual(responseFinalText)
  }, OPENAI_LONG_ANSWER_TIMEOUT_MILLIS)

  test('Test remote service chat:openai.com: without stream, invalid access token', async () => {
    // service initialization
    const doStream = false

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, serviceProps, invalidOpenaiComAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 401
    // error messages from openai.com:
    const expectedRootCauseMessage = 'Incorrect API key provided' 
    const expectedRootCauseMessage2 = 'You can find your API key at https://platform.openai.com/account/api-keys'
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
    expect(error?.message).toContain(expectedRootCauseMessage2)
  })

  test('Test remote service chat:openai.com: with stream, invalid access token', async () => {
    // service initialization
    const doStream = true

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, serviceProps, invalidOpenaiComAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 401
    // error messages from openai.com:
    const expectedRootCauseMessage = 'Incorrect API key provided' 
    const expectedRootCauseMessage2 = 'You can find your API key at https://platform.openai.com/account/api-keys'
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
    expect(error?.message).toContain(expectedRootCauseMessage2)
  })
})
