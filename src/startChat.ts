#!/usr/bin/node

import {
    AIsAPI,
    OpenAIChat,
    ResponseEvent,
    StreamProgressFunction,
    TrivialAssistant,
    AIsProps,
    AIsBreaker,
    TrivialAssistantFactory,
    OpenAIChatFactroy,
} from './index.js'


//
// simple test to see if the API is working:  text chat
//

console.log("================================= startChat started");

// define prompts
const prompt1 = "Give me a sentence with any animal in it."
const prompt2 = "And now in German."

// select and initialize API
const serviceId: 'TrivialAssistant' | 'OpenAIChat' | string = 'OpenAIChat'
let apiProps: AIsProps
switch (serviceId) {
    case 'TrivialAssistant':
        apiProps = new TrivialAssistant({extraMsg: 'start-chat-trivial'})
        break
    case 'OpenAIChat':
        apiProps = new OpenAIChat({
            //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        })
        break
    default:
        throw new Error(`Unknown serviceId: ${serviceId}`)
}
const api: AIsAPI = AIsBreaker.getInstance().createAIsAPI(apiProps)

// use the function with "async/await"
async function actionWithAsync() {
    console.log("")
    console.log("================================= actionWithAsync() started")

    console.log("----- Request - without streaming")
    const response1 = await api.sendMessage({
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
    const streamProgress: StreamProgressFunction = (responseEvent: ResponseEvent) => {  console.log("streamProgress: ", JSON.stringify(responseEvent/*, undefined, 2*/)) }
    const response2 = await api.sendMessage({
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
