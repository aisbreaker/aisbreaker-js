import { api, services } from 'aisbreaker-core-browserjs'


//
// initialize AIsBreaker API
//
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
serviceProps = {
    serviceId: 'aisbreaker:network',
    url: 'http://localhost:3000',
    urlNOT: 'http://proxy.demo.aisbreaker.org/',
    forward2ServiceProps: {
        serviceId: 'chat:dummy',
    },
} as api.AIsServiceProps
/*
auth = {
    secret: process.env.OPENAI_API_KEY || process.env.AISPROXY_API_KEY || "",
}
*/
auth = {
    secret: "aisbreaker_eyJ2ZXIiOiJhaXNicmVha2VyLm9yZy9qd3QvdjEiLCJ0eXAiOiJKT1NFIiwiYWxnIjoiZGlyIiwiZW5jIjoiQTEyOENCQy1IUzI1NiJ9..XilH4fKboTiaOprsGtSjkw.LSfCQTAfN7jeMlUBlzehHOI76w4GLGfgWVFaVcmtdsHjM6lzBkwdxoSB6a0USXcesHcGKteNCSl_MopKVmMxqsojdeDn9OrizuH6gxgc02GihIbznBkXgUQMpZD0_fppbbQ_E5jefN_FDY229OU15-aAoA6-S3HjcT3kY28UzhkBZCQeZ6v0NugTixUjRMcg-_BJBy2EiKY6qF_0Jap1lqhx4VJaOMHMPnPoDu2Q8P9KxYJJ-aOl1t7rKN7SMe2NvmIZXHCKkpjmOF3apPiLes_DRmEL1SEuUITJlLi3kqOdldnJvTP6bIDCanyYRMR0WOCaMjMTVFW94PUBvUzVKg3U8VI5iQDLLDF9Sy7gDhlDhXW5fugj10id3LA37cM5qpL_-znUU6os80GayBcThOl_8kbA_ODtN9Dx8AoLRSBLhZK0m3YsEJw1SdFxtUeAdAfqFj18-aVnYi25pyTbVnuJyO2doJWBQ_1s0LTX5YIUwRLmKjD3n7aMu9EQWOxMUKN0GMmX8PKet-kBvuPBlSgw2HsuKzX3SWjnkZOVnedA1GK8_FXwYXIbp4Rvd-qWUVYHVhchpydrQ1018FcTfmbkDzsbs4P7CI5lF27tnV8.dHRGwLwlV70vGhQynYOfOA"
}
const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)

console.log(services)
console.log(aisService)

export function getAIsService(): api.AIsService {
    return aisService
}
