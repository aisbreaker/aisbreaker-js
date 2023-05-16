
/**
* An image response is requested. Here we specify the favored image result.
*/
export type RequestMediaImage = {
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
    delivery?: RequestMediaImageDeliveryType
    /**
    * favored image format. It\'s not guaranteed that the service uses it.
    */
    format?: RequestMediaImageFormatType
}


export type RequestMediaImageDeliveryType = 'url' | 'base64'
export type RequestMediaImageFormatType = 'jpeg' | 'png' | 'gif'

