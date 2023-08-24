import {
    Input, 
    Output,
    Message,
} from '../api/models/index.js'
import * as StringUtils from './StringUtils.js'

export interface ConversationState {
    messages: Message[]
}

/**
 * Helper class to store and retrieve messages of a conversation,
 * 
 * The messages are stored in memory and can be imported from/exported to
 * a JSON string or a base64-encoded JSON string of a ConversationState object.
 */
export class DefaultConversationState implements ConversationState {
    messages: Message[]

    /** Construct from a base64 string which contains a ConversationState */
    constructor(converstationState: ConversationState) {
        this.messages = converstationState.messages
    }

    /** Create a new/empty ConversationState */
    static empty(): DefaultConversationState {
        return new DefaultConversationState({
            messages: [],
        })
    }

    /** Import from JSON string of a ConversationState object. */
    static fromJSON(json?: string): DefaultConversationState {
        // pre-check
        if (!json) {
            return this.empty()
        }

        // parse JSON string
        const obj = JSON.parse(json)
        if (obj.messages === undefined) {
            throw new Error('Invalid ConversationState')
        }

        // create ConversationState
        return new DefaultConversationState({
            messages: obj.messages,
        })
    }

    /** Import from base64-encode JSON string of a ConversationState object. */
    static fromBase64(base64?: string): DefaultConversationState {
        // pre-check
        if (!base64) {
            return this.empty()
        }

        // decode base64 string,
        // alternative to: const json = Buffer.from(base64, 'base64').toString('utf8')
        //logger.debug("fromBase64()")
        const json = StringUtils.base64ToString(base64)

        // parse JSON string and create ConversationState
        return DefaultConversationState.fromJSON(json)
    }

    /** Export to JSON string of a ConversationState object */
    toJSON(): string {
        const obj: ConversationState = {
            messages: this.messages,
        }
        return JSON.stringify(obj)
    }

    /** Export to JSON string of a ConversationState object */
    toBase64(): string {
        //logger.debug("toBase64()")
        const json = this.toJSON()
 
        // encode base64 string,
        // alternative to: return Buffer.from(json).toString('base64')
        return StringUtils.stringToBase64(json)
        
    }

    /** Get content from the conversaton. */
    getMessages(): Message[] {
        return this.messages
    }

    /** Add content to the conversation. */
    addMessage(message: Message) {
        if (message && (message.input || message.output)) {
            this.messages.push(message)
        }
    }

    /** Add content to the conversation. */
    addInputs(inputs: Input[]) {
        for (const input of inputs) {
            const message: Message = {input: input}
            this.addMessage(message)
        }
    }

    /** Add content to the conversation. */
    addOutputs(outputs: Output[]) {
        for (const output of outputs) {
            const message: Message = {output: output}
            this.addMessage(message)
        }
    }
}
