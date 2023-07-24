
/**
 * An image response from the AI service.
 */
export interface OutputImage {
    /**
     * Index of the message in the request - 
     * relevant to distinguest multiple alternatives if request_ops.sample|number_of_alternative_responses>1.
     */
    index: number

    /**
     * Role of the (output) message creator/input image.
     */
    role: OutputImageRoleType

    /**
     * The image, base64-encoded; either url or base64 must be set.
     */
    base64?: string

    /**
     * The image, url-encoded; either url or base64 must be set.
     */
    url?: string

    /**
     * If set to true, the image is still work in progress. If false, the image is the final response.
     */
    isProcessing?: boolean
}

export type OutputImageRoleType = "assistant"
