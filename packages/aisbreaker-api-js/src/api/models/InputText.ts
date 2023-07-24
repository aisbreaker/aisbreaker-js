
/**
 * A text message sent to the AI service.
 */
export interface InputText {
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
