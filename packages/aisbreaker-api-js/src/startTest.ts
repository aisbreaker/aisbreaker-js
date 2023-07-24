#!/usr/bin/node

import { api, services } from './index.js' /* 'aisbreaker-api-js' */


//
// simple test to see if the API is working:  text chat
//
const tool = "startTest"
console.log(`================================= ${tool} started`)

// define prompts
const prompt1 = "Give me a sentence with any animal in it."
const prompt2 = "And now in German."

// select API
const serviceId: 'chat:dummy' | 'chat:echo' | 'chat:echo-mirror' | 'chat:proxy-openai.com/gpt'
    | string = 'chat:proxy-openai.com/gpt'

// initialize API
let serviceProps: api.AIsServiceProps
let auth: api.Auth | undefined = undefined
switch (serviceId) {
    case 'chat:dummy':
        serviceProps = {
            serviceId: 'chat:dummy',
            greeting: 'Hi Dude',
        } as api.AIsServiceProps
        break

    case 'chat:echo':
        serviceProps = {
            serviceId: 'chat:echo',
        }
        break

    case 'chat:dummy-mirror':
        serviceProps = {
            serviceId: 'aisbreaker:mirror',
            forward2ServiceProps: {
                serviceId: 'chat:dummy',
            },
        } as api.AIsServiceProps
        break

    case 'chat:proxy-openai.com/gpt':
        serviceProps = {
            serviceId: 'aisbreaker:proxy',
            //url: 'http://localhost:3000',
            url: 'http://proxy.demo.aisbreaker.org/',
            forward2ServiceProps: {
                serviceId: 'chat:openai.com/gpt',
            },
        } as api.AIsServiceProps
        auth = {
            secret: process.env.OPENAI_API_KEY || process.env.AISPROXY_API_KEY || "",
        }
        break   

    default:
        throw new Error(`Unknown serviceId: ${serviceId}`)
}
const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)


// use the function with "async/await"
async function actionWithAsync() {
    console.log("")
    console.log("================================= actionWithAsync() started")

    console.log("----- Request - without streaming")
    const response1 = await aisService.process({
        inputs: [ {
            text: {
                role: 'user',
                content: prompt1,
            },
        } ],
    })
    console.log("-- Response 1:")
    console.log(JSON.stringify(response1, undefined, 2))

    console.log("----- Request 2 - with streaming")
    const streamProgress: api.StreamProgressFunction =
        (responseEvent: api.ResponseEvent) => {
            console.log("streamProgress: ", JSON.stringify(responseEvent/*, undefined, 2*/)) 
        }
    const response2 = await aisService.process({
        inputs: [ {
            text: {
                role: 'user',
                content: prompt2,
            },
        } ],
        conversationState: response1.conversationState,
        streamProgressFunction: streamProgress,
    })
    console.log("-- Response 2:")
    console.log(JSON.stringify(response2, undefined, 2))
}
actionWithAsync()
