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

import { HttpFile } from '../http/http';

/**
* The existence of this objects shows that a text response is requested. An empty object is possible to just indicated that a text repsonse is wanted.
*/
export class RequestMediaText {
    /**
    * ISO 639-1 language code.  See https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    */
    'languageCode'?: string;

    static readonly discriminator: string | undefined = undefined;

    static readonly attributeTypeMap: Array<{name: string, baseName: string, type: string, format: string}> = [
        {
            "name": "languageCode",
            "baseName": "language_code",
            "type": "string",
            "format": ""
        }    ];

    static getAttributeTypeMap() {
        return RequestMediaText.attributeTypeMap;
    }

    public constructor() {
    }
}

