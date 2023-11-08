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

// timeout to limit test runs
//const HUGGINGFACE_LONG_ANSWER_TIMEOUT_MILLIS = 10*1000

// timeout that would alos wait for loading a model:
const HUGGINGFACE_LONG_ANSWER_TIMEOUT_MILLIS = 3*60*1000


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
    //"serviceId": "chat:huggingface.co/microsoft/DialoGPT-large", // worked correctly 2023-11-08
    //"serviceId": "chat:huggingface.co/RatInChat/Pilup7575",  // almost never used model - to test model loading, but with higher timeout above (https://huggingface.co/RatInChat/Pilup7575)
    //"serviceId": "chat:huggingface.co/0xDEADBEA7/DialoGPT-small-rick", // almost never used model - to test model loading, but with higher timeout above (https://huggingface.co/RatInChat/Pilup7575)
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
    console.log("Test service chat:huggingface.co: without stream, success - responseFinal: ",
                JSON.stringify(responseFinal, null, 2))
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
    const expectedStatusCode = 401
    // error messages from huggingface.co:
    const expectedRootCauseMessage = 'Authorization header is correct, but the token seems invalid' 
    //const expectedRootCauseMessage2 = 'You can find your API key at https://platform.openai.com/account/api-keys'
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
    //expect(error?.message).toContain(expectedRootCauseMessage2)
  })
})
