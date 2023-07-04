# AIs Breaker Chat CLI

## Introduction

This repo contains two demo applications `simple-chat-cli.js` and `chat-cli.js` to demonstrate the usage of `aisbreaker-api` in a JavaScript NodeJS application.

`aisbreaker-api` provides an interface/API/SDK to access different AI APIs (OpenAI ChatGPT/Completion, Google Bart and more) in the same way by providing a uniform interface/API inclusive SDK for NodeJS/TypeScript/JavaScript and maybe more.


## Run `simple-chat-cli.js`
This script take a command line argument as question for OpenAI chat/ChatGPT.

Steps tu run:

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="XYZ..."
    # or from a script
    . ../../setenv.sh

    # run the simple test chat
    ./simple-chat-cli.js "<A single question to ChatGPT>"
        # it will take few seconds to show the answer


## Run `chat-cli.js`
This script is a command line version of a chat to OpenAI chat/ChatGPT.

Steps tu run:

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="XYZ..."
    # or from a script
    . ../../setenv.sh

    # run the simple test chat
    ./chat-cli.js
        # now follow the interactive instructions and chat
