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

