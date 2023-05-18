#!/usr/bin/node

import {
    API,
    OpenAIImageAPI,
    OpenAIImageAPIOptions,
    TrivialAssistantAPI, 
    TrivialAssistantAPIOptions,
} from './index.js'
import { StabilityAIText2ImageAPI } from './stabilityai_text2image.js'


//
// simple test to see if the API is working:  generate an image
//

const prompt = "Give me a cute teddy bear sitting in the forest."

// initialize API
const isTrivialAssistant = false
const isStableAI = true
let api: API
if (isTrivialAssistant) {
    api = new TrivialAssistantAPI()
} else {
    if (isStableAI) {
        api = new StabilityAIText2ImageAPI({
            //stabilityApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        })
    } else {
        api = new OpenAIImageAPI({
            //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        })
    }
}


function veryLongStringReplacer(key: any, value: any) {
    // Filtering out properties
    if (typeof value === "string") {
        if (value.length > 100) {
            return value.substring(0, 100) + " ... (truncated)"
        } else {
            return value
        }
    }
    return value;
}

// use the function with "async/await"
async function actionWithAsync() {
    console.log("")
    console.log("================================= started")

    let requestMedia = {}
    if (isStableAI) {
        requestMedia = {
            image: {
                width: 512,
                height: 512,
            },
        }
    }

    console.log("----- request/response")
    const response1 = await api.sendMessage({
        inputs: [ {
            text: {
                role: 'user',
                content: prompt,
            },
        } ],
        requestMedia: requestMedia,
        requestOptions: {
            numberOfAlternativeResponses: 2,
        }
    })
    console.log("-- Response:")
    console.log(JSON.stringify(response1, veryLongStringReplacer, 2))
}
actionWithAsync()
