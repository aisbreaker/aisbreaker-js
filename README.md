# AIs Breaker API

## Deprecation

**This repository will no longer be actively developed. For more details, please read: [AIsBreaker API is Now Deprecated - We Recommend Using LangChain Instead](https://aisbreaker.org/blog/2024-09-08-aisbreaker-api-deprecation-langchain-recommendation)**


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
    # publish all npms (example with version 0.0.1)
    ./set-version-in-all-packages-after-build-check.sh 0.0.1

    # git add, commit and push updated package.json files
    git add -A package*json packages/*/package.json
    git commit -m "New version '0.0.1' of npm packages to publish"
    git push

    # if not on central repo: merge to 'https://github.com/aisbreaker/aisbreaker-js'

    # on repo 'https://github.com/aisbreaker/aisbreaker-js' + branch 'main':
    # CI/CD pipeline will build and publish to npm repo


## Build and Publish all npm Packages with the same Version (OLD)
Steps:

    # publish all npms (example with version 0.0.1)
    ./publish-all-packages.sh 0.0.1

    # git add, commit and push updated package.json files
    git add -A package*json packages/*/package.json
    git commit -m "New version '0.0.1' of npm packages published"
    git push
    

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


Configure CI
------------

Environment variables needed for CI:
- NPM_AUTH_TOKEN (for publishing to npmjs.com)
- DOCKER_PASSWORD (for pushing to hub.docker.com)
- DOCKER_USERNAME (for pushing to hub.docker.com)
- KUBE_CONFIG (for deployment)
- AISBREAKER_SERVER_URL (for integration testing; optional, default: http://localhost:3000)
- AISBREAKER_API_KEY (for integration testing)
- OPENAI_API_KEY (for integration testing)
