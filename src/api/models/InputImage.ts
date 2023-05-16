
/**
* An image message sent to the AI service.
*/
export type InputImage = {
    /**
     * Role of the (input) message creator/input image. * \"user\": The image to edit or to respond to. Must be a valid PNG file, less than 4MB, and square. If mask is not provided, image must have transparency, which will be used as the mask. * \"mask\": An additional image whose fully transparent areas (e.g. where alpha is zero) indicate where image should be edited. Must be a valid PNG file, less than 4MB, and have the same dimensions as image.
     */
    role: InputImageRoleType

    /**
    * The image, base64-encoded; either url or base64 must be set.
    */
    base64?: string

    /**
    * The image, url-encoded; either url or base64 must be set.
    */
    url?: string
}

export type InputImageRoleType = "user" | "mask"


export type ImageInputMessageT = {
    /**
    * Name of the object type. For type mapping and debugging only. Should not be analysed be the client app.
    */
    type: 'ImageInput'

    /**
    * Role of the (input) message creator/input image. * \"user\": The image to edit or to respond to. Must be a valid PNG file, less than 4MB, and square. If mask is not provided, image must have transparency, which will be used as the mask. * \"mask\": An additional image whose fully transparent areas (e.g. where alpha is zero) indicate where image should be edited. Must be a valid PNG file, less than 4MB, and have the same dimensions as image.
    */
    'role': InputImageRoleType
    /**
    * The image, base64-encoded; either url or base64 must be set.
    */
    'base64'?: string
    /**
    * The image, url-encoded; either url or base64 must be set.
    */
    'url'?: string

}

