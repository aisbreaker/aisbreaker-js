import { api } from 'aisbreaker-api-js'
import { processRemoteService, testPingRemoteAisbreakerServer } from '../utils/AisBreakerAccessUtils.js'
import { DEBUG, AISBREAKER_SERVER_URL as URL, AISBREAKER_API_KEY } from './test-config.js'

/**
 * Server Integration Tests:
 * Test remote error propagation
 * 
 * @group integration/server
 */

// precondition checks
describe('Test preconditions', () => {
  testPingRemoteAisbreakerServer(URL)

  test('Check for AISBREAKER_API_KEY', () => {
    expect(AISBREAKER_API_KEY).toBeDefined()
  })

})

// tests
describe('Test remote error propagation (with complex remote service chain)', () => {
  // commont settings: client->aisbreaker->aisbreaker->mirror->dummy
  // (double remote - to test the AisBreaker client executed in the server)
  const serviceProps = {
    "serviceId": "aisbreaker:network",
    "url": URL,
    "forward2ServiceProps": {
      "serviceId": "aisbreaker:mirror",
      "forward2ServiceProps": {
        "serviceId": "chat:dummy",
      },
    },
  }
  const invalidServiceId = 'chat:invalid'
  const invalidServiceProps = {
    "serviceId": "aisbreaker:network",
    "url": URL,
    "forward2ServiceProps": {
      "serviceId": "aisbreaker:mirror",
      "forward2ServiceProps": {
        "serviceId": invalidServiceId,
      },
    },
  }
  const invalidServicePropsLongerChain = {
    "serviceId": "aisbreaker:network",
    "url": URL,
    "forward2ServiceProps": {
      "serviceId": "aisbreaker:network",
      "url": URL,
      "forward2ServiceProps": {
        "serviceId": "aisbreaker:mirror",
        "forward2ServiceProps": {
          "serviceId": "chat:invalid",
        },
      },
    },
  }
  const INVALID_URL = 'http://localhost-invalid:80'
  const invalidServicePropsWithInvalidURL = {
    "serviceId": "aisbreaker:network",
    "url": INVALID_URL,
    "forward2ServiceProps": {
      "serviceId": "aisbreaker:network",
      "url": URL,
      "forward2ServiceProps": {
        "serviceId": "aisbreaker:echo",
      },
    },
  }
  const invalidServicePropsWithChainWithInvalidURL = {
    "serviceId": "aisbreaker:network",
    "url": URL,
    "forward2ServiceProps": {
      "serviceId": "aisbreaker:network",
      "url": INVALID_URL,
      "forward2ServiceProps": {
        "serviceId": "aisbreaker:echo",
      },
    },
  }
  const validAisbreakerAuth = {
    secret: AISBREAKER_API_KEY || "",
  }
  const thirdPartyAuth = {
    secret: "test_with_third_party_or_invalid_api_key",
  }
  const jsPrompt = "What is JavaScript?"
  const jsContainedAnswer = "tpircSavaJ"


  test('Test remote error propagation: without stream, invalid access token, but not needed (success expected)', async () => {
    // service initialization
    const doStream = false

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processRemoteService(URL, serviceProps, thirdPartyAuth, jsPrompt, doStream)

    // check result: succcess (access token not needed)
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  })
  test('Test remote error propagation: with stream, invalid access token, but not needed (success expected)', async () => {
    // service initialization
    const doStream = true

    // process without stream
    const [responseFinal, responseFinalText, streamedProgressText] =
      await processRemoteService(URL, serviceProps, thirdPartyAuth, jsPrompt, doStream)

    // check result: succcess (access token not needed)
    expect(responseFinalText?.toLowerCase()).toContain(jsContainedAnswer.toLowerCase())
  })


  /*
   * test the equvalent of this curl command:
   *
      curl "${HOSTPORT}/api/v1/process" \
            -v -X POST \
            -d '{
        "service": {
          "serviceId": "aisbreaker:network",
          "url": "'"${HOSTPORT}"'",
          "forward2ServiceProps": {
            "serviceId": "aisbreaker:mirror",
            "forward2ServiceProps": {
              "serviceId": "chat:invalid"
            }
          }
        },
        "request": {
            "inputs": [ {
                "text": {
                    "role": "user",
                    "content": "What is JavaScript?"
                } aisbreaker key, success (error expected)
            } ],
            "stream": false
          }
        }' \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${AISBREAKER_API_KEY}"
   *
   */
  test('Test complex invalid remote service chain: without stream (error expected)', async () => {
    // service initialization
    const doStream = false

    // process without stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServiceProps, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 404
    const expectedRootCauseMessage = `No factory registered for serviceId '${invalidServiceId}'`
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })
  test('Test longer complex invalid remote service chain: without stream (error expected)', async () => {
    // service initialization
    const doStream = false

    // process without stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServicePropsLongerChain, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 404
    const expectedRootCauseMessage = `No factory registered for serviceId '${invalidServiceId}'`
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })


  /*
   * test the equvalent of this curl command:
   *
      curl "${HOSTPORT}/api/v1/process" \
            -v -X POST \
            -d '{
        "service": {
          "serviceId": "aisbreaker:network", aisbreaker key, success (error expected)
          "url": "'"${HOSTPORT}"'",
          "forward2ServiceProps": {
            "serviceId": "aisbreaker:mirror",
            "forward2ServiceProps": {
              "serviceId": "chat:invalid"
            }
          }
        },
        "request": {
            "inputs": [ {
                "text": {
                    "role": "user",
                    "content": "What is JavaScript?" aisbreaker key, success (error expected)
                }
            } ],
            "stream": true
          }
        }' \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${AISBREAKER_API_KEY}"
   *
   */
  test('Test complex invalid remote service chain: with stream (error expected)', async () => {
    // service initialization
    const doStream = true

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServiceProps, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 404
    const expectedRootCauseMessage = `No factory registered for serviceId '${invalidServiceId}'`
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })
  test('Test longer complex invalid remote service chain: with stream (error expected)', async () => {
    // service initialization
    const doStream = true

    // process with stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServicePropsLongerChain, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    const expectedStatusCode = 404
    const expectedRootCauseMessage = `No factory registered for serviceId '${invalidServiceId}'`
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage)
  })

  // helper function
  function expectInvalidHostError(error: api.AIsError | undefined) {
    // check result (expect "... getaddrinfo EAI_AGAIN localhost-invalid ..." or "... getaddrinfo ENOTFOUND localhost-invalid ...")
    const expectedStatusCode = 503
    const expectedRootCauseMessage0 = `Error`
    const expectedRootCauseMessage1 = `getaddrinfo`
    const expectedRootCauseMessage2 = `localhost-invalid`
    expect(error).toBeDefined()
    expect(error?.statusCode).toBe(expectedStatusCode)
    expect(error?.message).toContain(expectedRootCauseMessage0)
    expect(error?.message).toContain(expectedRootCauseMessage1)
    expect(error?.message).toContain(expectedRootCauseMessage2)
  }

  test('Test remote service chain with invalid URL/invalid hostname (simple): without stream (error expected)', async () => {
    // service initialization
    const doStream = false

    // process without stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServicePropsWithInvalidURL, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    expectInvalidHostError(error)
  })
  test('Test remote service chain with invalid URL/invalid hostname (simple): with stream (error expected)', async () => {
    // service initialization
    const doStream = true

    // process without stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServicePropsWithInvalidURL, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    expectInvalidHostError(error)
  })


  test('Test remote service chain with invalid URL/invalid hostname (chain): without stream (error expected)', async () => {
    // service initialization
    const doStream = false

    // process without stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServicePropsWithChainWithInvalidURL, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    expectInvalidHostError(error)
  })
  test('Test remote service chain with invalid URL/invalid hostname (chain): with stream (error expected)', async () => {
    // service initialization
    const doStream = true

    // process without stream
    let error: api.AIsError | undefined
    try {
      const [responseFinal, responseFinalText, streamedProgressText] =
        await processRemoteService(URL, invalidServicePropsWithChainWithInvalidURL, validAisbreakerAuth, jsPrompt, doStream)
    } catch (e) {
      console.log("ErrorInTest: ", e, (e as api.AIsError).getObject?.())
      error = e as api.AIsError
    }

    // check result
    expectInvalidHostError(error)
  })
})
