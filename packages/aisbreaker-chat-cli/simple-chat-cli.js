#!/usr/bin/env node

//
// Simple chat CLI for OpenAI/GPT.
//
// Run it with:
//   ./simple-chat-cli.js "What is the meaning of life?"
//

import { api } from 'aisbreaker-api-js';
import * as core from 'aisbreaker-core-nodejs';


async function action() {
    console.log("simple-chat-cli");
    console.log("---------------");
    core.init();

    // service initialization
    const servicePros = {
        serviceId: 'chat:openai.com',
    }
    const auth = {
        secret: process.env.OPENAI_API_KEY || "",
    }
    const aisService = api.AIsBreaker.getInstance().getAIsService(servicePros, auth);

    // 1st question
    const question1 = process.argv[2];
    console.log(`Question: ${question1}`);
    if (!question1) {
        console.log("No question provided - Exit now.");
        return;
    }

    // 1st: answer
    const response1 = await aisService.process({
        inputs: [ {
            text: {
                role: 'user',
                content: question1,
            },
        } ],
    });
    console.log(`(1) Answer:\n${response1.outputs[0].text.content}`);

    // 2nd: use a hard-coded prompt
    const prompt2 = `
        If your previous answer in English, then translate your answser to German.
        If your previous answer was not English, then translate your answser to English.
        Only provide the translated text.
        `;
    const response2 = await aisService.process({
        inputs: [ {
            text: {
                role: 'system',
                content: prompt2,
            },
        } ],
        conversationState: response1.conversationState,
    })
    console.log(`(2) Translated answer:\n${response2.outputs[0].text.content}`);
}

action();
