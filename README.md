# AIs Breaker API

## Introduction

AIsBreaker provides an easy-to-use and service-agnostic API to access different AI services
(like OpenAI/ChatGPT API, Open-Assistant API, Google Bart API and many more)
in a uniform way. 

More details:
- [AIsBreaker.org](https://aisbreaker.org/)
- [AIsBreaker Modules](https://aisbreaker.org/docs/aisbreaker-modules.html) or [AIsBreaker Packages](https://aisbreaker.org/docs/aisbreaker-packages.html)

This repo is a [Monorepo](https://aisbreaker.org/docs/monorepo.html) that combines several npm packages/modules.
Technically, we use [npm Workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces). 

Source code inclusive further READMEs of the packages/modules: [./packages/](./packages/)


## Run a simple Test

Steps:

    # install dependencies
    npm install

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="sk-..."
    # or from a script
    . ../setenv.sh

    # run the simple test chat
    ./start_chat.sh


## Build and Publish all npm Packages with the same Version

Steps:

    # TODO



Test the package installation (TODO: REVIEW AND ADAPT):
    # new dir
    mkdir tmp
    cd tmp/

    # set environment: access key for OpenAI
    export OPENAI_API_KEY="sk-..."
    # or from a script
    . ../setenv.sh

    # start from npm repo
    npx aisbreaker-core-nodejs

