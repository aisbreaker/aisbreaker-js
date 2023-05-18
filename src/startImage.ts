#!/usr/bin/node

import {
    API,
    OpenAIImageAPI,
    OpenAIImageAPIOptions,
    TrivialAssistantAPI, 
    TrivialAssistantAPIOptions,
} from './index.js'


//
// simple test to see if the API is working:  generate an image
//

const prompt = "Give me a cute teddy bear sitting in the forest."

// initialize API
const isTrivialAssistant = false
let api: API
if (isTrivialAssistant) {
    api = new TrivialAssistantAPI()
} else {
    api = new OpenAIImageAPI({
        //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    })
}

// use the function with "async/await"
async function actionWithAsync() {
    console.log("")
    console.log("================================= started")

    console.log("----- request/response")
    const response1 = await api.sendMessage({
        inputs: [ {
            text: {
                role: 'user',
                content: prompt,
            },
        } ],
    })
    console.log("-- Response:")
    console.log(JSON.stringify(response1, undefined, 2))
}
actionWithAsync()
