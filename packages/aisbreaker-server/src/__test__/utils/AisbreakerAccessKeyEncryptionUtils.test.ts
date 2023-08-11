import { delay } from 'aisbreaker-api-js/build/utils/AsyncUtils.js'
import { RequestAuthAndQuotas } from '../../rest-api/index.js'
import { decryptAisbreakerAccessToken, encryptAisbreakerAccessToken } from '../../utils/index.js'


describe('testing AisbreakerAccessKeyEncryptionUtils', () => {
  // config
  const hostname = 'test.example.aisbreaker.org'
  const requestAuthAndQuotas: RequestAuthAndQuotas = {
    requestQuotas: {
      globalRequestLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 600,
        requestsPerDay: 1000,
      },
      perClientRequestLimits: {
        requestsPerMinute: 6,
        requestsPerHour: 60,
        requestsPerDay: 1000,
      }
    },
    serviceSecrets: [
      { serviceId: "chat:openai.com", authSecret: "secret" },
      { serviceId: "chat:dummy", authSecret: "" },
      { serviceId: "", authSecret: "INVALID" },
    ]
  }

  // tests
  test('encrypt', async () => {
    const accessToken = await encryptAisbreakerAccessToken(hostname, requestAuthAndQuotas, '2h')
    console.log("accessToken: ", accessToken)
    expect(accessToken).toMatch(/^aisbreaker_ey/)
  });

  test('encrypt and decrypt', async () => {
    const accessToken = await encryptAisbreakerAccessToken(hostname, requestAuthAndQuotas, '1s')
    console.log("accessToken: ", accessToken)
    expect(accessToken).toMatch(/^aisbreaker_ey/)

    // decrypt
    const decryptedRequestAuthAndQuotas = await decryptAisbreakerAccessToken(hostname, accessToken)
    console.log("decryptedRequestAuthAndQuotas: ", decryptedRequestAuthAndQuotas)

    // check result
    //expect(decryptedRequestAuthAndQuotas).toEqual(requestAuthAndQuotas)
    const d = decryptedRequestAuthAndQuotas
    const r = requestAuthAndQuotas
    expect(d.requestQuotas?.globalRequestLimits?.requestsPerMinute).
      toEqual(r.requestQuotas?.globalRequestLimits?.requestsPerMinute)

    // decrypt invalid token
    const invalidToken = accessToken.replace('ey', 'ex')
    await expect(decryptAisbreakerAccessToken(hostname, invalidToken))
      .rejects
      .toThrow()

    // decrypt after expiration of the token
    const bufferMillis = 100
    await delay(1*1000+bufferMillis)
    await expect(decryptAisbreakerAccessToken(hostname, accessToken))
      .rejects
      .toThrow()
  });
});
