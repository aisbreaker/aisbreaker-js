import { api, services } from 'aisbreaker-api-js'

import { services as coreServices } from './index.js' /* 'aisbreaker-core-nodejs' */


//
// simple test to see if the API is working
// and to test new features:  text chat with or without proxy
//

console.log("================================= startTest started");

// define prompts
const prompt1 = "Hello, do you have a name?"
const prompt2 = "How are you?"

// initialize API adapters of the proxy
const remoteAIs = new api.AIsBreaker()
remoteAIs.registerFactory(new services.TrivialAssistantFactory())

// select and initialize API
const enableLoggingfilter: boolean = true
const serviceId: 'TrivialAssistant' | 'TrivialProxy' | 'AisProxy2OpenAIChat' | string = 'AisProxy2OpenAIChat'
let apiProps: api.AIsProps
switch (serviceId) {
    case 'TrivialAssistant':
        apiProps = new services.TrivialAssistant({
            extraMsg: 'local',
        })
        console.log("apiProps: ", JSON.stringify(apiProps, undefined, 2))
        break
    case 'TrivialProxy':
        const apiProps0 = new services.TrivialProxy({
            name: 'trivialProxyX',
            remoteAIsBreaker: remoteAIs,
            forward2RemoteService: new services.TrivialAssistant({
                extraMsg: 'remote',
            }),
        });
        apiProps = new services.TrivialProxy(apiProps0)
        console.log("apiProps: ", JSON.stringify(apiProps, undefined, 2));
        break
    case 'AisProxy2OpenAIChat':
        apiProps = new services.AIsProxy({
            url: 'http://localhost:3000',
            apiKey: process.env.AISPROXY_API_KEY || "",
            remoteService: new coreServices.OpenAIChat({
            })
        })
        console.log("apiProps: ", JSON.stringify(apiProps, undefined, 2))
        break
    default:
        throw new Error(`Unknown serviceId: ${serviceId}`)
}
let aiService: api.AIsService = api.AIsBreaker.getInstance().createAIsService(apiProps)
if (enableLoggingfilter) {
    aiService = new services.LoggingFilterStatelessAPI({
        serviceId: 'LoggingFilter',
        forward2Service: aiService,
        logLevel: 'debug',
    });
}

// use the function with "async/await"
async function actionWithAsync() {
    console.log("");
    console.log("================================= actionWithAsync() started");

    console.log("----- Request 1 - without streaming");
    const response1 = await aiService.sendMessage({
        inputs: [{
            text: {
                role: 'user',
                content: prompt1,
            },
        }],
    });
    console.log("-- Response 1:");
    console.log(JSON.stringify(response1, undefined, 2));

    console.log("----- Request 2 - with streaming");
    //const streamProgress: StreamProgressFunction = (responseEvent: ResponseEvent) => {  console.log("streamProgress: ", JSON.stringify(responseEvent, undefined, 2)) }
    const response2 = await aiService.sendMessage({
        inputs: [{
            text: {
                role: 'user',
                content: prompt2,
            },
        }],
        conversationState: response1.conversationState,
        //streamProgressFunction: streamProgress,
    });
    console.log("-- Response 2:");
    console.log(JSON.stringify(response2, undefined, 2));
}
actionWithAsync();
