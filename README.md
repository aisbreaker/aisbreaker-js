# AIs Breaker API

## Introduction

This project provides an interface/API/SDK to access different AI APIs (OpenAI ChatGPT/Completion, Google Bart and more) in the same way by providing a uniform interface/API inclusive SDK for NodeJS/TypeScript/JavaScript and maybe more.


## Run a simple Test

Steps:

    cd aisbreaker-api/

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="XYZ..."
    # or from a script
    . ../../setenv.sh

    # run the simple test chat
    ./start.sh


## Build and Publish the npm Package `aisbreaker-api`

Steps:

    cd aisbreaker-api/

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
    
    
## Generate TypeScript Classes from OpenAPI Spec

See: openapi-spec/README.md


