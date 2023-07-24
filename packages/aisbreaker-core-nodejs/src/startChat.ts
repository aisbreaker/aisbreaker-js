#!/usr/bin/node

import { api, services } from 'aisbreaker-api-js'

// import without 'from' for side-effect/to register the contained services:
import './index.js' /* 'aisbreaker-core-nodejs' */


//
// simple test to see if the API is working:  text chat
//

const tool = "startChat"
console.log(`================================= ${tool} started`)

// define prompts
const prompt1 = "Give me a sentence with any animal in it."
const prompt2 = "And now in German."

// select API
const serviceId: 'chat:dummy' | 'chat:openai.com' | 'chat:openai.com/gpt-4' | 'chat:openai.com-mirror'
    | string = 'chat:openai.com'


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

    case 'chat:openai.com':
    case 'chat:openai.com/gpt-4':
        serviceProps = {
            serviceId: serviceId,
            //debug: true,
        } as api.AIsServiceProps
        auth = {
            secret: process.env.OPENAI_API_KEY || "",
        }
        break

    case 'chat:openai.com-mirror':
        serviceProps = {
            serviceId: 'aisbreaker:mirror',
            forward2ServiceProps: {
                serviceId: 'chat:openai.com',
            },
        } as api.AIsServiceProps
        auth = {
            secret: process.env.OPENAI_API_KEY || "",
        }
        break

    default:
        throw new Error(`${tool}: Unknown serviceId: ${serviceId}`)
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
