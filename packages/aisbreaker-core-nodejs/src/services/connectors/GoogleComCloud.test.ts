import { DEBUG, GOOGLE_CLOUD_API_KEY_authorized_user, GOOGLE_CLOUD_API_KEY_service_account } from '../../test-config.js'
import { auth2GoogleCloudAccessToken, logGoogleCloudAccessTokenDetails } from './GoogleComCloudUtils.js'
import { processLocalService } from 'aisbreaker-test-utils'
import { init as coreInit } from '../../index.js'

/**
 * Connector Integration Tests:
 * Test Google Cloud access token handling
 * 
 * @group integration/connector
 */

const LONG_TEST_TIMEOUT_MILLIS = 15*1000

// precondition checks
describe('Test preconditions', () => {
  coreInit()

  test('Check for GOOGLE_CLOUD_API_KEY_authorized_user', () => {
    expect(GOOGLE_CLOUD_API_KEY_authorized_user).toBeDefined()
  })
  test('Check for GOOGLE_CLOUD_API_KEY_service_account', () => {
    expect(GOOGLE_CLOUD_API_KEY_service_account).toBeDefined()
  })
})

// tests
describe('Test using GOOGLE_CLOUD_API_KEY_* secrets', () => {

  test('Test auth2GoogleCloudAccessToken() with GOOGLE_CLOUD_API_KEY_authorized_user', async () => {
    const authAuthorizedUser = {
      secret: GOOGLE_CLOUD_API_KEY_authorized_user || "",
    }
  
    // get token
    const token = await auth2GoogleCloudAccessToken(authAuthorizedUser)
    expect(token).toBeDefined()

    // print token details
    await logGoogleCloudAccessTokenDetails(token)
  })

  test('Test auth2GoogleCloudAccessToken() with GOOGLE_CLOUD_API_KEY_service_account', async () => {
    const auth = {
      secret: GOOGLE_CLOUD_API_KEY_service_account || "",
    }

    // get token
    const token = await auth2GoogleCloudAccessToken(auth)
    expect(token).toBeDefined()

    // print token details
    await logGoogleCloudAccessTokenDetails(token)
  }),

  test('Test caching of auth2GoogleCloudAccessToken() with GOOGLE_CLOUD_API_KEY_service_account', async () => {
    const auth = {
      secret: GOOGLE_CLOUD_API_KEY_service_account || "",
    }

    // get token1
    const token1 = await auth2GoogleCloudAccessToken(auth)
    expect(token1).toBeDefined()

    // get and  print token1 details
    const details1 = await logGoogleCloudAccessTokenDetails(token1)
    const token1Exp = details1.exp
    expect(token1Exp).toBeDefined()

    // wait am monent (5 secs)
    console.log("Waiting 5 secs...")
    await new Promise(resolve => setTimeout(resolve, 5000))

    // get token2
    const token2 = await auth2GoogleCloudAccessToken(auth)
    expect(token2).toBeDefined()

    // get and  print token1 details
    const details2 = await logGoogleCloudAccessTokenDetails(token1)
    const token2Exp = details2.exp
    expect(token2Exp).toBeDefined()

    // both tokens should be the same because of caching
    expect(token1Exp).toEqual(token2Exp)
    expect(token1).toEqual(token2)
  }, LONG_TEST_TIMEOUT_MILLIS)
})
 
// tests
describe('Test service chat:gemini.vertexai.google.com', () => {
  // commont settings
  const serviceProps = {
    "serviceId": "chat:gemini.vertexai.google.com",
  }
  const validOpenaiComAuth = {
    secret: GOOGLE_CLOUD_API_KEY_service_account || "",
  }
  const invalidOpenaiComAuth = {
    secret: "googlecloud-invalid_api_key_for_test",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "programming language"


  test('Test service chat:gemini.vertexai.google.com: without stream, success', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    console.log("Test service chat:gemini.vertexai.google.com: without stream, success - responseFinal: ",
                JSON.stringify(responseFinal, null, 2))
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  }, LONG_TEST_TIMEOUT_MILLIS)

  test('Test service chat:gemini.vertexai.google.com: with stream, success', async () => {  
    // service initialization
    const doStream = true

    // process with stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processLocalService(serviceProps, validOpenaiComAuth, jsPrompt, doStream)

    // check result
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
    expect(streamedProgressText).toEqual(responseFinalText)
  }, LONG_TEST_TIMEOUT_MILLIS)

})
