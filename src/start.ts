#!/usr/bin/node

//
// simple test to see if the API is working
//
import { API, TrivialAssistantAPI, TrivialAssistantAPIOptions, OpenAIAPI, OpenAIAPIOptions } from "./api.js"

const isTrivialAssistant = false
let api: API
if (isTrivialAssistant) {
    api = new TrivialAssistantAPI()
} else {
    api = new OpenAIAPI({
        //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    })
}

const prompt = "Give me a sentence with any animal in it."
api.sendMessage(prompt, undefined, undefined, {debug: true}).then((response) => {
    console.log("----------------------------------")
    console.log("Response:")
    console.log(response)
})
