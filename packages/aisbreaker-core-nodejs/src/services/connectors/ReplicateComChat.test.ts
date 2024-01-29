import { api } from 'aisbreaker-api-js'
import { DEBUG, REPLICATE_API_KEY } from '../../test-config.js'
import { processLocalService } from 'aisbreaker-test-utils'
import { init as coreInit } from '../../index.js'

/**
 * Connector Integration Tests:
 * Test ReplicateComChatService
 * 
 * @group integration/connector
 */

const LONG_TEST_TIMEOUT_MILLIS = 3 * 60 * 1000 // 3 minutes

// precondition checks
describe('Test preconditions', () => {
  coreInit()

  test('Check for REPLICATE_API_KEY', () => {
    expect(REPLICATE_API_KEY).toBeDefined()
  })
})

// tests
describe('Test service chat:replicate.com', () => {
  // commont settings
  const serviceProps = {
    "serviceId": "chat:replicate.com",

    // mistralai/mistral-7b-v0.1: streaming failed with status 422 Unprocessable Entity ("Streaming not supported for the output type of the requested version.")
    //"serviceId": "chat:replicate.com/mistralai/mistral-7b-v0.1:d938add77615da25dd74c9bcbc5b8ee11c9c3476eb721a6991d32fe5c2ec1968",
  }
  const validAuth = {
    secret: REPLICATE_API_KEY || "",
  }
  const invalidAuth = {
    secret: "replicate.com-invalid_api_key_for_test",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "programming language"


  test('Test service chat:replicate.com: with stream, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validAuth, jsPrompt, doStream)

    // check result
    console.log("Test service chat:replicate.com: with stream, success - responseFinal: ",
                JSON.stringify(responseFinal, null, 2))
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
    expect(streamedProgressText).toEqual(responseFinalText)
  }, LONG_TEST_TIMEOUT_MILLIS)

  test('Test service chat:replicate.com: without stream, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validAuth, jsPrompt, doStream)

    // check result
    console.log("Test service chat:replicate.com: without stream, success - responseFinal: ",
                JSON.stringify(responseFinal, null, 2))
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  }, LONG_TEST_TIMEOUT_MILLIS)


  test('Test service chat:replicate.com: with stream, invalid access token', async () => {
    // service initialization
    const doStream = true

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processLocalService(serviceProps, invalidAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 401
    // error messages from replicate.com:
    const expectedRootCauseMessage = 'You did not pass a valid authentication token'
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })

  test('Test service chat:replicate.com: without stream, invalid access token', async () => {
    // service initialization
    const doStream = false

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processLocalService(serviceProps, invalidAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 401
    // error messages from replicate.com:
    const expectedRootCauseMessage = 'You did not pass a valid authentication token' 
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })
})
