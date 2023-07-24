#!/usr/bin/env node

//
// interactive chat CLI for OpenAI/GPT.
//
// Run it with (alternative examples):
//   ./chat-cli.js
//   ./chat-cli.js --service=chat:openai.com
//   ./chat-cli.js --service=chat:dummy
//

const DEBUG = false;
const DEFAULT_SERVICEID = 'chat:openai.com';

import fs from 'fs';
import { pathToFileURL } from 'url';
import { KeyvFile } from 'keyv-file';
import boxen from 'boxen';
import ora from 'ora';
import clipboard from 'clipboardy';
import inquirer from 'inquirer';
import inquirerAutocompletePrompt from 'inquirer-autocomplete-prompt';
import Keyv from 'keyv';
import { api } from 'aisbreaker-core-nodejs';

const arg = process.argv.find(_arg => _arg.startsWith('--settings'));
const path = arg?.split('=')[1] ?? './settings.js';

const arg2 = process.argv.find(_arg => _arg.startsWith('--service'));
const serviceId = arg2?.split('=')[1] ?? DEFAULT_SERVICEID;

let settings = {};
if (fs.existsSync(path)) {
    // get the full path
    const fullPath = fs.realpathSync(path);
    settings = (await import(pathToFileURL(fullPath).toString())).default;
} else {
    if (arg) {
        console.error('Error: the file specified by the --settings parameter does not exist.');
        process.exit(1);
    } else {
        console.error('Warning: the settings.js file does not exist.');
        // continue
    }
}

if (settings.storageFilePath && !settings.cacheOptions.store) {
    // make the directory and file if they don't exist
    const dir = settings.storageFilePath.split('/').slice(0, -1).join('/');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(settings.storageFilePath)) {
        fs.writeFileSync(settings.storageFilePath, '');
    }

    settings.cacheOptions.store = new KeyvFile({ filename: settings.storageFilePath });
}

let currentConversationData = {};
let chatCliCache = new Keyv(settings.cacheOptions)

const availableCommands = [
    {
        name: '!editor - Open the editor (for multi-line messages)',
        value: '!editor',
    },
    {
        name: '!resume - Resume last conversation',
        value: '!resume',
    },
    {
        name: '!new - Start new conversation',
        value: '!new',
    },
    {
        name: '!copy - Copy conversation to clipboard',
        value: '!copy',
    },
    {
        name: '!delete-all - Delete all conversations',
        value: '!delete-all',
    },
    {
        name: '!exit - Exit ChatGPT CLI',
        value: '!exit',
    },
];

inquirer.registerPrompt('autocomplete', inquirerAutocompletePrompt);

// service initialization
const servicePros = {
    serviceId: serviceId,
    debug: DEBUG,
    ...settings,
}
const auth = {
    secret: process.env.OPENAI_API_KEY || "",
}
const aisService = api.AIsBreaker.getInstance().getAIsService(servicePros, auth);


console.log(tryBoxen('Chat CLI', {
    padding: 0.7, margin: 1, borderStyle: 'double', dimBorder: true,
}));

await conversation();

async function conversation() {
    console.log('Type "!" to access the command menu.');
    const prompt = inquirer.prompt([
        {
            type: 'autocomplete',
            name: 'message',
            message: 'Write a message:',
            searchText: '​',
            emptyText: '​',
            suggestOnly: true,
            source: () => Promise.resolve([]),
        },
    ]);
    // hiding the ugly autocomplete hint
    prompt.ui.activePrompt.firstRender = false;
    // The below is a hack to allow selecting items from the autocomplete menu while also being able to submit messages.
    // This basically simulates a hybrid between having `suggestOnly: false` and `suggestOnly: true`.
    await delay(0)
    prompt.ui.activePrompt.opt.source = (answers, input) => {
        if (!input) {
            return [];
        }
        prompt.ui.activePrompt.opt.suggestOnly = !input.startsWith('!');
        return availableCommands.filter(command => command.value.startsWith(input));
    };
    let { message } = await prompt;
    message = message.trim();
    if (!message) {
        return conversation();
    }
    if (message.startsWith('!')) {
        switch (message) {
            case '!editor':
                return useEditor();
            case '!new':
                return newConversation();
            case '!delete-all':
                return deleteAllConversations();
            case '!exit':
                return true;
            default:
                return conversation();
        }
    }
    return onMessage(message);
}
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function onMessage(message) {
    let aiLabel = 'Assistant';

    let reply = '';
    const spinnerPrefix = `${aiLabel} is typing...`;
    const spinner = ora(spinnerPrefix);
    spinner.prefixText = '\n   ';
    spinner.start();
    try {
        const streamProgressFunc/*: StreamProgressFunction*/ = (responseEvent/*: ResponseEvent*/) => {
            if (DEBUG) {
                console.log("streamProgress: ", JSON.stringify(responseEvent/*, undefined, 2*/)) 
            }
            const token = responseEvent?.outputs[0]?.text?.content || '';    
            if (DEBUG) {
                console.log("token: ", token);
                console.log("\n\n\n\n\n");
            }
            reply += token;
            const output = tryBoxen(`${reply.trim()}█`, {
                title: aiLabel, padding: 0.7, margin: 1, dimBorder: true,
            });
            spinner.text = `${spinnerPrefix}\n${output}`;
        };
        const responseFinal = await aisService.process({
            inputs: [ {
                text: {
                    role: 'user',
                    content: message,
                },
            } ],
            conversationState: currentConversationData.conversationState,
            streamProgressFunction: streamProgressFunc,
        });
        let responseText = responseFinal?.outputs[0]?.text?.content;
        if (DEBUG) {
            console.log("responseText: ", responseText, "\n\n\n\n\n")
        }
        currentConversationData.conversationState = responseFinal?.conversationState;

        clipboard.write(responseText).then(() => {}).catch(() => {});
        spinner.stop();
        currentConversationData = {
            conversationState: responseFinal.conversationState,
        };
        await chatCliCache.set('currentConversation', currentConversationData);
        const output = tryBoxen(responseText, {
            title: aiLabel, padding: 0.7, margin: 1, dimBorder: true,
        });
        console.log(output);
    } catch (error) {
        spinner.stop();
        logError(error?.json?.error?.message || error.body || error || 'Unknown error');
    }
    return conversation();
}

async function useEditor() {
    let { message } = await inquirer.prompt([
        {
            type: 'editor',
            name: 'message',
            message: 'Write a message:',
            waitUserInput: false,
        },
    ]);
    message = message.trim();
    if (!message) {
        return conversation();
    }
    console.log(message);
    return onMessage(message);
}

async function resumeConversation() {
    currentConversationData = (await chatCliCache.get('currentConversation')) || {};
    if (currentConversationData.conversationState) {
        logSuccess(`Resumed conversation ${currentConversationData.conversationState}.`);
    } else {
        logWarning('No conversation to resume.');
    }
    return conversation();
}

async function newConversation() {
    currentConversationData = {};
    logSuccess('Started new conversation.');
    return conversation();
}

async function deleteAllConversations() {
    await chatCliCache.clear();
    logSuccess('Deleted all conversations.');
    return conversation();
}

async function copyConversation() {
    if (!currentConversationData.conversationState) {
        logWarning('No conversation to copy.');
        return conversation();
    }
    const messages = getMessagesOfConversation(currentConversationData.conversationState);
    const conversationString = messages.map(message => `#### ${message.role}:\n${message.message}`).join('\n\n');
    try {
        await clipboard.write(`${conversationString}\n\n----\nMade with Chat CLI: <https://github.com/aisbreaker/aisbreaker-js/tree/main/packages/aisbreaker-chat-cli/>`);
        logSuccess('Copied conversation to clipboard.');
    } catch (error) {
        logError(error?.message || error);
    }
    return conversation();
}

function logError(message) {
    console.log(tryBoxen(message, {
        title: 'Error', padding: 0.7, margin: 1, borderColor: 'red',
    }));
}

function logSuccess(message) {
    console.log(tryBoxen(message, {
        title: 'Success', padding: 0.7, margin: 1, borderColor: 'green',
    }));
}

function logWarning(message) {
    console.log(tryBoxen(message, {
        title: 'Warning', padding: 0.7, margin: 1, borderColor: 'yellow',
    }));
}

/**
 * Boxen can throw an error if the input is malformed, so this function wraps it in a try/catch.
 * @param {string} input
 * @param {*} options
 */
function tryBoxen(input, options) {
    try {
        return boxen(input, options);
    } catch {
        return input;
    }
}
