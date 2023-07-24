# AIs Breaker Chat CLI

## Introduction

This repo contains two demo applications `simple-chat-cli.js` and `chat-cli.js`
to demonstrate the usage of `aisbreaker-core-nodejs` (which is based on `aisbreaker-api-js`)
in a JavaScript NodeJS application.

AIsBreaker provides an interface/API/SDK to access different AI APIs (OpenAI ChatGPT/Completion, Google Bart and more) 
in the same way by providing a uniform interface/API inclusive SDK for NodeJS/TypeScript/JavaScript and maybe more.


## Run `simple-chat-cli.js`
This script take a command line argument as question for the `chat:openai.com` (ChatGPT) service.

It is a code code example.

Steps to run:

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="sk-..."
    # or from a script
    . ../../../setenv.sh

    # run the simple test chat
    ./simple-chat-cli.js "<A single question to ChatGPT>"
        # it will take few seconds to show the answer


## Run `chat-cli.js`
This script is a command line version of an interactive chat with the `chat:openai.com` (ChatGPT) service.

Steps to run:

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="sk-..."
    # or from a script
    . ../../../setenv.sh

    # run the simple test chat (with OpenAI as default service)
    ./chat-cli.js
        # follow the interactive instructions and chat


    # alternatively, spevify the AI service
    ./chat-cli.js --service=chat:dummy
        # follow the interactive instructions and chat
    
    ./chat-cli.js --service=chat:openai.com
        # follow the interactive instructions and chat

    ./chat-cli.js --service=chat:openai.com/gpt-4
        # follow the interactive instructions and chat

    ./chat-cli.js --service=aisbreaker:mirror/service/chat:openai.com/gpt-4
        # follow the interactive instructions and chat

    ./chat-cli.js --service=chat:example.com/foo
        # follow the interactive instructions and chat


