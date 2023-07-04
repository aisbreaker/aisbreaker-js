#!/usr/bin/env node

import { AIsBreaker, OpenAIChat } from 'aisbreaker-api';

async function action() {
    console.log("simple-chat-cli");
    console.log("---------------");

    // initialization
    const api = AIsBreaker.getInstance().createAIsAPI(
        new OpenAIChat({
            //openaiApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        })
    );

    // 1 question
    const question1 = process.argv[2];
    console.log(`Question: ${question1}`);
    if (!question1) {
        console.log("No question provided - Exit now.");
        return;
    }

    // 1st: answer
    const response1 = await api.sendMessage({
        inputs: [ {
            text: {
                role: 'user',
                content: question1,
            },
        } ],
    });
    console.log(`(1) Answer: ${response1.outputs[0].text.content}`);

    // 2nd: use a hard-coded prompt
    const prompt2 = `
        If the previous message was in English, then please translate it to German.
        Otherwise, please translate it to English.
        Only provide the translated text.
        `;
    const response2 = await api.sendMessage({
        inputs: [ {
            text: {
                role: 'system',
                content: prompt2,
            },
        } ],
        conversationState: response1.conversationState,
    })
    console.log(`(2) Translated answer: ${response2.outputs[0].text.content}`);
}

action();
