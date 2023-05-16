

/**
* A text message response from the AI service.
*/
export type OutputText = {
    /**
    * Index of the message in the request - relevant to distinguest multiple alternatives if request_ops.number_of_alternative_responses>1.
    */
    index: number

    /**
    * Role of the (input) message creator.
    */
    role: OutputTextRoleType

    /**
    * The actual text message.
    */
    content: string

    /**
    * If set to true, the message is a delta (and to append) to the previous message, usually used while streaming the reponse. If false, it\'s a full message.
    */
    isDelta?: boolean

    /**
    * If set to true, the message is still work in progress. If false, the message is the final response.
    */
    isProcessing?: boolean
}

export type OutputTextRoleType = 'assistant'
