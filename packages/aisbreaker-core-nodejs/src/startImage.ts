#!/usr/bin/node

import { api, services } from 'aisbreaker-api-js'

// import without 'from' for side-effect/to register the contained services:
import './index.js' /* 'aisbreaker-core-nodejs' */
import { RequestedMediaImage } from 'aisbreaker-api-js/build/api/index.js'


//
// simple test to see if the API is working:  generate an image
//

const tool = "startImage"
console.log(`================================= ${tool} started`)

// define prompt(s)
const prompt = "Give me a cute teddy bear sitting in the forest."

// select API
const serviceId: string = 'text-to-image:openai.com'

// initialize API
let serviceProps: api.AIsServiceProps
let auth: api.Auth | undefined = undefined
switch (serviceId) {
    case 'text-to-image:dummy':
        serviceProps = {
            serviceId: 'chat:dummy',
            greeting: 'Hi Dude',
        } as api.AIsServiceProps
        break

    case 'text-to-image:openai.com':
        serviceProps = {
            serviceId: 'text-to-image:openai.com',
            debug: true,
        } as api.AIsServiceProps
        auth = {
            secret: process.env.OPENAI_API_KEY || "",
        }
        break

    case 'text-to-image:openai.com-mirror':
        serviceProps = {
            serviceId: 'aisbreaker:mirror',
            forward2ServiceProps: {
                serviceId: 'text-to-image:openai.com',
            },
        } as api.AIsServiceProps
        auth = {
            secret: process.env.OPENAI_API_KEY || "",
        }
        break

    case 'text-to-image:stability.ai':
        serviceProps = {
            serviceId: 'text-to-image:stability.ai',
            debug: true,
        } as api.AIsServiceProps
        auth = {
            secret: process.env.STABILITY_API_KEY || "",
        }
        break
    
    default:
        throw new Error(`${tool}: Unknown serviceId: ${serviceId}`)
}
const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)

// helper
function veryLongStringReplacer(key: any, value: any) {
    // Filtering out properties
    if (typeof value === "string") {
        if (value.length > 512) {
            return value.substring(0, 100) + ` ... (truncated from len=${value.length})`
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

    let requestedImage: RequestedMediaImage | undefined
    if (serviceId.includes('stability.ai')) {
        requestedImage = {
            width: 512,
            height: 512,
        }
    }

    console.log("----- Request")
    const response1 = await aisService.process({
        inputs: [ {
            text: {
                role: 'user',
                content: prompt,
            },
        } ],
        requested: {
            image: requestedImage,
            samples: 2,
        }
    })
    console.log("-- Response:")
    console.log(JSON.stringify(response1, veryLongStringReplacer, 2))
}
actionWithAsync()
