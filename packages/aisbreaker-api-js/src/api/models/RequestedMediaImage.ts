
/**
* An image response is requested. Here we specify the favored image result.
*/
export interface RequestedMediaImage {
    /**
    * favored width of output image. Respect of limits of your service and engine. It\'s not guaranteed that the result fits into it.
    */
    width?: number
    /**
    * favored height of output image. Respect of limits of your service and engine. It\'s not guaranteed that the result fits into it.
    */
    height?: number
    /**
    * favored delivery format. It\'s not guaranteed that the service uses it.
    */
    delivery?: RequestedMediaImageDeliveryType
    /**
    * favored image format. It\'s not guaranteed that the service uses it.
    */
    format?: RequestedMediaImageFormatType
}

export type RequestedMediaImageDeliveryType = 'url' | 'base64'
export type RequestedMediaImageFormatType = 'jpeg' | 'png' | 'gif'
