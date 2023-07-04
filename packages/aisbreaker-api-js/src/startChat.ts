#!/usr/bin/node

import { api, services } from './index.js' /* 'aisbreaker-api-js' */


//
// simple test to see if the API is working:  text chat
//

console.log("================================= startChat started");

// define prompts
const prompt1 = "Give me a sentence with any animal in it."
const prompt2 = "And now in German."

// select and initialize API
const serviceId: 'TrivialAssistant' | 'OpenAIChat' | string = 'TrivialAssistant'
let apiProps: api.AIsProps
switch (serviceId) {
    case 'TrivialAssistant':
        apiProps = new services.TrivialAssistant({extraMsg: 'start-chat-trivial'})
        break
        /*
    case 'OpenAIChat':
        apiProps = new services.OpenAIChat({
            //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        })
        break
        */
    default:
        throw new Error(`Unknown serviceId: ${serviceId}`)
}
const aiService: api.AIsService = api.AIsBreaker.getInstance().createAIsService(apiProps)

// use the function with "async/await"
async function actionWithAsync() {
    console.log("")
    console.log("================================= actionWithAsync() started")

    console.log("----- Request - without streaming")
    const response1 = await aiService.sendMessage({
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
    const streamProgress: api.StreamProgressFunction = (responseEvent: api.ResponseEvent) => {  console.log("streamProgress: ", JSON.stringify(responseEvent/*, undefined, 2*/)) }
    const response2 = await aiService.sendMessage({
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
