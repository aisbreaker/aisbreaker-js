import { api } from 'aisbreaker-api-js'
import { processLocalService } from 'aisbreaker-test-utils'
import { DEBUG, HUGGINGFACE_API_KEY } from '../../test-config.js'
import { init as coreInit } from '../../index.js'

/**
 * Connector Integration Tests:
 * Test service chat:huggingface.co
 * 
 * @group integration/connector
 */

const HUGGINGFACE_LONG_ANSWER_TIMEOUT_MILLIS = 10000

// precondition checks
describe('Test preconditions', () => {
  coreInit()

  /* DON'T CHECK because Huggingface API key is optional:
  test('Check for HUGGINGFACE_API_KEY', () => {
    expect(HUGGINGFACE_API_KEY).toBeDefined()
  })
  */
})


// tests
describe('Test service chat:huggingface.co', () => {
  // commont settings
  const serviceProps = {
    "serviceId": "chat:huggingface.co",
  }
  const validAuth = {
    secret: HUGGINGFACE_API_KEY || "",
  }
  const invalidAuth = {
    secret: "sk-invalid_api_key_for_test",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "programming language"


  test('Test service chat:huggingface.co: without stream, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  }, HUGGINGFACE_LONG_ANSWER_TIMEOUT_MILLIS)

  test('Test service chat:huggingface.co: without stream, invalid access token', async () => {
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
    //const expectedStatusCode = 401
    const expectedStatusCode = 400
    // error messages from huggingface.co:
    const expectedRootCauseMessage = 'Authorization header is correct, but the token seems invalid' 
    //const expectedRootCauseMessage2 = 'You can find your API key at https://platform.openai.com/account/api-keys'
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
    //expect(error?.message).toContain(expectedRootCauseMessage2)
  })
})
