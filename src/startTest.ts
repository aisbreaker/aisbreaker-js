import { AIsBreaker, TrivialProxy, TrivialProxyFactory,  TrivialAssistant, TrivialAssistantFactory, AIsProps, AIsService, AIsProxy, OpenAIChat } from './index.js'
import { LoggingFilterStatelessAPI } from './filters/LoggingFilter.js'


//
// simple test to see if the API is working
// and to test new features:  text chat with or without proxy
//

console.log("================================= startTest started");

// define prompts
const prompt1 = "Hello, do you have a name?"
const prompt2 = "How are you?"

// initialize API adapters of the proxy
const remoteAIs = new AIsBreaker()
remoteAIs.registerFactory(new TrivialAssistantFactory())

// select and initialize API
const enableLoggingfilter: boolean = true
const serviceId: 'TrivialAssistant' | 'TrivialProxy' | 'AisProxy2OpenAIChat' | string = 'AisProxy2OpenAIChat'
let apiProps: AIsProps
switch (serviceId) {
    case 'TrivialAssistant':
        apiProps = new TrivialAssistant({
            extraMsg: 'local',
        })
        console.log("apiProps: ", JSON.stringify(apiProps, undefined, 2))
        break
    case 'TrivialProxy':
        const apiProps0 = new TrivialProxy({
            name: 'trivialProxyX',
            remoteAIsBreaker: remoteAIs,
            forward2RemoteService: new TrivialAssistant({
                extraMsg: 'remote',
            }),
        });
        apiProps = new TrivialProxy(apiProps0)
        console.log("apiProps: ", JSON.stringify(apiProps, undefined, 2));
        break
    case 'AisProxy2OpenAIChat':
        apiProps = new AIsProxy({
            url: 'http://localhost:3000',
            accessKey: process.env.AISPROXY_API_KEY || "",
            remoteService: new OpenAIChat({
            })
        })
        console.log("apiProps: ", JSON.stringify(apiProps, undefined, 2))
        break

    default:
        throw new Error(`Unknown serviceId: ${serviceId}`)
}
let api: AIsService = AIsBreaker.getInstance().createAIsService(apiProps)
if (enableLoggingfilter) {
    api = new LoggingFilterStatelessAPI({
        serviceId: 'LoggingFilter',
        forward2Service: api,
        logLevel: 'debug',
    });
}

// use the function with "async/await"
async function actionWithAsync() {
    console.log("");
    console.log("================================= actionWithAsync() started");

    console.log("----- Request 1 - without streaming");
    const response1 = await api.sendMessage({
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
    const response2 = await api.sendMessage({
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
