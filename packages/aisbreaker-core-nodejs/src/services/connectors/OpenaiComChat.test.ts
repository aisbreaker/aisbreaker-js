import { api } from 'aisbreaker-api-js'
import { processLocalService } from 'aisbreaker-test-utils'
import { DEBUG, OPENAI_API_KEY } from '../../test-config.js'
import { init as coreInit } from '../../index.js'

/**
 * Connector Integration Tests:
 * Test service chat:openai.com
 * 
 * @group integration/connector
 */

const OPENAI_LONG_ANSWER_TIMEOUT_MILLIS = 10000

// precondition checks
describe('Test preconditions', () => {
  coreInit()

  test('Check for OPENAI_API_KEY', () => {
    expect(OPENAI_API_KEY).toBeDefined()
  })

})


// tests
describe('Test service chat:openai.com', () => {
  // commont settings
  const serviceProps = {
    "serviceId": "chat:openai.com",
  }
  const validOpenaiComAuth = {
    secret: OPENAI_API_KEY || "",
  }
  const invalidOpenaiComAuth = {
    secret: "sk-invalid_api_key_for_test",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "programming language"


  test('Test service chat:openai.com: without stream, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  }, OPENAI_LONG_ANSWER_TIMEOUT_MILLIS)


  test('Test service chat:openai.com: with stream, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
    expect(streamedProgressText).toEqual(responseFinalText)
  }, OPENAI_LONG_ANSWER_TIMEOUT_MILLIS)

  test('Test service chat:openai.com: without stream, invalid access token', async () => {
    // service initialization
    const doStream = false

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processLocalService(serviceProps, invalidOpenaiComAuth, jsPrompt, doStream)
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

  test('Test service chat:openai.com: with stream, invalid access token', async () => {
    // service initialization
    const doStream = true

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processLocalService(serviceProps, invalidOpenaiComAuth, jsPrompt, doStream)
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
