# AIs Breaker API

## Introduction

AIsBreaker provides an easy-to-use and service-agnostic API to access different AI services
(like OpenAI/ChatGPT API, Open-Assistant API, Google Bart API and many more)
in a uniform way. More details: [AIsBreaker.org](https://aisbreaker.org/)

This repo contains the AIsBreaker API/SDK for NodeJS/TypeScript/JavaScript.


## Run a simple Test

Steps:

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="XYZ..."
    # or from a script
    . ../../setenv.sh

    # run the simple test chat
    ./start.sh


## Build and Publish an npm Package

Steps:

    # adjust/increase version in package.json (must be unique)
    vi package.json

    # build (compile TypeScript)
    npm run build

    # publish to npmjs.com
    npm login
        # login in webbrowser as user aisbreaker

    npm publish

Test the package installation

    # new dir
    mkdir tmp
    cd tmp/

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="XYZ..."
    # or from a script
    . ../../setenv.sh

    # start from npm repo
    npx aisbreaker-api
