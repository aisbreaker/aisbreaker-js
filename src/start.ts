#!/usr/bin/node

//
// simple test to see if the API is working
//
import {
     API,
     ResponseEvent,
     StreamProgressFunction, 
     TrivialAssistantAPI, 
     TrivialAssistantAPIOptions 
} from './api/index.js'
import { OpenAIAPI, OpenAIAPIOptions } from './openaichat.js'

const isTrivialAssistant = false
let api: API
if (isTrivialAssistant) {
    api = new TrivialAssistantAPI()
} else {
    api = new OpenAIAPI({
        //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    })
}


const prompt1 = "Give me a sentence with any animal in it."
const prompt2 = "And now in German."

/*
// use the API without "async/await"
api.sendMessage({
    inputs: [ {
        text: {
            role: 'user',
            content: prompt1,
        },
    } ],
    //streamProgressFunction: f,
}).then((response) => {
    console.log("----------------------------------")
    console.log("-- Response:")
    console.log(JSON.stringify(response, undefined, 2))

    // now use the function with "async/await"
    actionWithAsync() 
})
*/

// use the function with "async/await"
async function actionWithAsync() {
    console.log("")
    console.log("================================= actionWithAsync() started")

    console.log("----- request/response 1 - without streaming")
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

    console.log("----- request/response 2 - with streaming")
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
