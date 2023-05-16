
/**
* A text message sent to the AI service.
*/
export type InputText = {
    /**
    * Role of the (input) message creator.
    */
    role: InputTextRoleType

    /**
    * The text message.
    */
    content: string

    /**
    * 1.0 means normal prompt (default), 0.0 means ignore, -1.0 means negative prompt; >1.0 or <-1.0 applifies the prompt
    */
    weight?: number
}

export type InputTextRoleType = 'system' | 'user'


export type TextInputMessageT = {
    /**
    * Name of the object type. For type mapping and debugging only. Should not be analysed be the client app.
    */
    type: 'TextInput'

    /**
    * Role of the (input) message creator.
    */
    role: InputTextRoleType

    /**
    * The text message.
    */
    text: string

    /**
    * 1.0 means normal prompt (default), 0.0 means ignore, -1.0 means negative prompt; >1.0 or <-1.0 applifies the prompt
    */
    weight?: number
}
