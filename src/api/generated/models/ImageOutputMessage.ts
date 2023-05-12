/**
 * AIsBreaker API
 * Specification of the AIsBreaker API. This API is used to access AI services.
 *
 * OpenAPI spec version: 0.6.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { OutputMessage } from '../models/OutputMessage';
import { HttpFile } from '../http/http';

/**
* An image response from the AI service.
*/
export class ImageOutputMessage extends OutputMessage {
    /**
    * The image, base64-encoded; either url or base64 must be set.
    */
    'base64'?: string;
    /**
    * The image, url-encoded; either url or base64 must be set.
    */
    'url'?: string;

    static readonly discriminator: string | undefined = "objectType";

    static readonly attributeTypeMap: Array<{name: string, baseName: string, type: string, format: string}> = [
        {
            "name": "base64",
            "baseName": "base64",
            "type": "string",
            "format": ""
        },
        {
            "name": "url",
            "baseName": "url",
            "type": "string",
            "format": ""
        }    ];

    static getAttributeTypeMap() {
        return super.getAttributeTypeMap().concat(ImageOutputMessage.attributeTypeMap);
    }

    public constructor() {
        super();
        this.objectType = "ImageOutputMessage";
    }
}

