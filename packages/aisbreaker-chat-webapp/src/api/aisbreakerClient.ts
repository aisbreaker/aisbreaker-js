import { api, services } from 'aisbreaker-core-browserjs'

import { useAisbreakerStore } from '@/store/index.js'

//
// initialize AIsBreaker API
//
const aisbreakerStore = useAisbreakerStore()

let serviceProps: api.AIsServiceProps
let auth: api.Auth | undefined = undefined
/*
serviceProps = {
    / *
    serviceId: 'aisbreaker:mirror',
    forward2ServiceProps: {
        serviceId: 'chat:dummy',
    },
    * /
    serviceId: 'chat:dummy',
} as api.AIsServiceProps
*/

/*
serviceProps = {
    serviceId: 'aisbreaker:network',
    url: 'http://localhost:3000',
    urlNOT: 'http://proxy.demo.aisbreaker.org/',
    forward2ServiceProps: {
        //serviceId: 'chat:dummy',
        serviceId: 'chat:openai.com',
    },
} as api.AIsServiceProps
*/
/*
auth = {
    secret: process.env.OPENAI_API_KEY || process.env.AISPROXY_API_KEY || "",
}
auth = {
    secret: "aisbreaker_eyJ2ZXIiOiJhaXNicmVha2VyLm9yZy9qd3QvdjEiLCJ0eXAiOiJKT1NFIiwiYWxnIjoiZGlyIiwiZW5jIjoiQTEyOENCQy1IUzI1NiJ9..XilH4fKboTiaOprsGtSjkw.LSfCQTAfN7jeMlUBlzehHOI76w4GLGfgWVFaVcmtdsHjM6lzBkwdxoSB6a0USXcesHcGKteNCSl_MopKVmMxqsojdeDn9OrizuH6gxgc02GihIbznBkXgUQMpZD0_fppbbQ_E5jefN_FDY229OU15-aAoA6-S3HjcT3kY28UzhkBZCQeZ6v0NugTixUjRMcg-_BJBy2EiKY6qF_0Jap1lqhx4VJaOMHMPnPoDu2Q8P9KxYJJ-aOl1t7rKN7SMe2NvmIZXHCKkpjmOF3apPiLes_DRmEL1SEuUITJlLi3kqOdldnJvTP6bIDCanyYRMR0WOCaMjMTVFW94PUBvUzVKg3U8VI5iQDLLDF9Sy7gDhlDhXW5fugj10id3LA37cM5qpL_-znUU6os80GayBcThOl_8kbA_ODtN9Dx8AoLRSBLhZK0m3YsEJw1SdFxtUeAdAfqFj18-aVnYi25pyTbVnuJyO2doJWBQ_1s0LTX5YIUwRLmKjD3n7aMu9EQWOxMUKN0GMmX8PKet-kBvuPBlSgw2HsuKzX3SWjnkZOVnedA1GK8_FXwYXIbp4Rvd-qWUVYHVhchpydrQ1018FcTfmbkDzsbs4P7CI5lF27tnV8.dHRGwLwlV70vGhQynYOfOA"
}
const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)
console.log(aisService)
*/

console.log(services)

export function getAIsService(): api.AIsService {
	// get settings
	const serviceProps = aisbreakerStore.aisServiceProps as api.AIsServiceProps
    const url = aisbreakerStore.apiURL
    //const url = 'http://proxy.demo.aisbreaker.org/'
    /* TODO: DELETE OLD CODE:
    {
		serviceId: 'aisbreaker:network',
		url: aisbreakerStore.apiURL,
		urlNOT: 'http://proxy.demo.aisbreaker.org/',
		forward2ServiceProps: aisbreakerStore.aisServiceProps,
	} as api.AIsServiceProps
    */
	console.log(`getAIsService() - url: '${url}', serviceProps: ${JSON.stringify(serviceProps, null, 2)}`)
	const auth = {
		secret: aisbreakerStore.aisAccessToken,
	} as api.Auth
	const authSecretToLog = auth?.secret ? `${auth.secret.substring(0, 4)}... (len=${auth.secret.length})` : ''
	console.log("getAIsService() - auth: ", authSecretToLog)

	// get AIsService
	const aisService: api.AIsService = api.AIsBreaker.getRemoteAIsService(url, serviceProps, auth)

  return aisService
}
