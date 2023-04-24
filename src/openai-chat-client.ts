import crypto from 'crypto';
import Keyv from 'keyv';
import { fetchEventSource, FetchEventSourceInit } from '@waylaidwanderer/fetch-event-source';
import { Agent } from 'undici';

//import './fetch-polyfill.js';
import {
    fetch, Headers, Request, Response,
} from 'undici';


const CHATGPT_MODEL = 'gpt-3.5-turbo';

interface Message {
    // id: string  // don't set because of error in OpenAI API: Additional properties are not allowed ('id' was unexpected)
    role: 'system' | 'assistant' | 'user'
    content: string
}

export default class OpenAIChatClient {
    apiKey: string
    conversationsCache: Keyv
    options: any
    modelOptions: any
    isChatGptModel = true // this.modelOptions.model.startsWith('gpt-');
    isUnofficialChatGptModel = false // this.modelOptions.model.startsWith('text-chat') || this.modelOptions.model.startsWith('text-davinci-002-render');
    completionsUrl: string|undefined

    constructor(
        apiKey: string,
        conversationsCache: Keyv,
        options: any = {},
    ) {
        this.apiKey = apiKey;
        if (options && options.debug) {
            console.debug(`API key: ${apiKey}`);
        } 

        this.conversationsCache = conversationsCache;

        this.setOptions(options);
    }

    setOptions(options: any) {
        if (this.options && !this.options.replaceOptions) {
            // nested options aren't spread properly, so we need to do this manually
            this.options.modelOptions = {
                ...this.options.modelOptions,
                ...options.modelOptions,
            };
            delete options.modelOptions;
            // now we can merge options
            this.options = {
                ...this.options,
                ...options,
            };
        } else {
            this.options = options;
        }

        if (this.options.openaiApiKey) {
            this.apiKey = this.options.openaiApiKey;
        }

        const modelOptions = this.options.modelOptions || {};
        this.modelOptions = {
            ...modelOptions,
            // set some good defaults (check for undefined in some cases because they may be 0)
            model: modelOptions.model || CHATGPT_MODEL,
            temperature: typeof modelOptions.temperature === 'undefined' ? 0.8 : modelOptions.temperature,
            top_p: typeof modelOptions.top_p === 'undefined' ? 1 : modelOptions.top_p,
            presence_penalty: typeof modelOptions.presence_penalty === 'undefined' ? 1 : modelOptions.presence_penalty,
            stop: modelOptions.stop,
        };

        this.completionsUrl = 'https://api.openai.com/v1/chat/completions'

        return this;
    }

    /** this function needed by sendMessage() */
    async getCompletion(
      inputMessages: Message[],
      onProgress: Function | undefined,
      abortController: AbortController = new AbortController()) {

        const modelOptions = { ...this.modelOptions };
        if (typeof onProgress === 'function') {
            modelOptions.stream = true;
        }
        modelOptions.messages = inputMessages;

        const { debug } = this.options;
        const url = this.completionsUrl as string
        if (debug) {
            console.debug();
            console.debug(url);
            console.debug(modelOptions);
            console.debug();
        }
        const opts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(modelOptions),
            dispatcher: new Agent({
                bodyTimeout: 0,
                headersTimeout: 0,
            }),
        };
        if (debug) {
            console.debug(opts)
        } 



        if (onProgress && modelOptions.stream) {
            // stream

            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                try {
                    let done = false;
                    await fetchEventSource(url, {
                        ...opts,
                        signal: abortController.signal,
                        async onopen(response) {
                            if (response.status === 200) {
                                return;
                            }
                            if (debug) {
                                console.debug(response);
                            }
                            let error: any;
                            try {
                                const body = await response.text();
                                error = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
                                error.status = response.status;
                                error.json = JSON.parse(body);
                            } catch {
                                error = error || new Error(`Failed to send message. HTTP ${response.status}`);
                            }
                            throw error;
                        },
                        onclose() {
                            if (debug) {
                                console.debug('Server closed the connection unexpectedly, returning...');
                            }
                            // workaround for private API not sending [DONE] event
                            if (!done) {
                                onProgress('[DONE]');
                                abortController.abort();
                                resolve(undefined);
                            }
                        },
                        onerror(err) {
                            if (debug) {
                                console.debug(err);
                            }
                            // rethrow to stop the operation
                            throw err;
                        },
                        onmessage(message) {
                            if (debug) {
                                console.debug(message);
                            }
                            if (!message.data || message.event === 'ping') {
                                return;
                            }
                            if (message.data === '[DONE]') {
                                onProgress('[DONE]');
                                abortController.abort();
                                resolve(undefined)
                                done = true;
                                return;
                            }
                            onProgress(JSON.parse(message.data));
                        },
                    } as FetchEventSourceInit);
                } catch (err) {
                    reject(err);
                }
            }); // return
        }
        // no stream

        const response = await fetch(
            url,
            {
                ...opts,
                signal: abortController.signal,
            },
        );
        if (response.status !== 200) {
            const body = await response.text();
            const error: any = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
            error.status = response.status;
            try {
                error.json = JSON.parse(body);
            } catch {
                error.body = body;
            }
            throw error;
        }
        return response.json();
    }

    /*
    async generateTitle(userMessage, botMessage) {
        const instructionsPayload = {
            role: 'system',
            content: `Write an extremely concise subtitle for this conversation with no more than a few words. All words should be capitalized. Exclude punctuation.

||>Message:
${userMessage.message}
||>Response:
${botMessage.message}

||>Title:`,
        };

        const titleGenClientOptions = JSON.parse(JSON.stringify(this.options));
        titleGenClientOptions.modelOptions = {
            model: 'gpt-3.5-turbo',
            temperature: 0,
            presence_penalty: 0,
            frequency_penalty: 0,
        };
        const titleGenClient = new ChatGPTClient(this.apiKey, titleGenClientOptions);
        const result = await titleGenClient.getCompletion([instructionsPayload], null);
        // remove any non-alphanumeric characters, replace multiple spaces with 1, and then trim
        return result.choices[0].message.content
            .replace(/[^a-zA-Z0-9' ]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    */

    async sendMessage(
        message: string,
        conversationState: string | undefined = undefined,
        onProgress: Function | undefined = undefined,
        opts: any = {},
    ): Promise<any> {
        if (opts.clientOptions && typeof opts.clientOptions === 'object') {
            this.setOptions(opts.clientOptions)
        }

        if (!conversationState){
            conversationState = crypto.randomUUID()
        }
        let conversation = await this.conversationsCache.get(conversationState)
        let isNewConversation = false;
        if (!conversation) {
            conversation = {
                messages: [],
                createdAt: Date.now(),
            };
            isNewConversation = true;
        }

        const shouldGenerateTitle = opts.shouldGenerateTitle && isNewConversation;

        const userMessage: Message = {
            //id: crypto.randomUUID(),
            role: 'user',
            content: message,
        };
        conversation.messages.push(userMessage);

        let payload = ""//await this.buildPrompt(conversation.messages as Message[], userMessage.id);

        let reply = '';
        let result: any = undefined
        if (onProgress && typeof onProgress === 'function') {
            // result streaming
            await this.getCompletion(
                conversation.messages,
                (progressMessage: any) => {
                    if (progressMessage === '[DONE]') {
                        return;
                    }
                    const token: string = progressMessage.choices[0].delta.content
                    // first event's delta content is always undefined
                    if (!token) {
                        return;
                    }
                    if (this.options.debug) {
                        console.debug(token);
                    }
                    onProgress(token);
                    reply += token;
                },
                opts.abortController || new AbortController(),
            );
        } else {
            // no result streaming
            result = await this.getCompletion(
                conversation.messages,
                undefined,
                opts.abortController || new AbortController(),
            );
            if (this.options.debug) {
                console.debug(JSON.stringify(result));
            }
            reply = result.choices[0].message.content;
        }

        // avoids some rendering issues when using the CLI app
        if (this.options.debug) {
            console.debug();
        }

        reply = reply.trim();

        const replyMessage: Message = {
            //id: crypto.randomUUID(),
            role: "assistant",
            content: reply,
        };
        conversation.messages.push(replyMessage);

        const returnData = {
            responseText: reply,
            conversationState: conversationState,
            details: result || {},
        };

        /*
        if (shouldGenerateTitle) {
            conversation.title = await this.generateTitle(userMessage, replyMessage);
            returnData.title = conversation.title;
        }
        */

        await this.conversationsCache.set(conversationState, conversation);

        return returnData;
    }

}
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

