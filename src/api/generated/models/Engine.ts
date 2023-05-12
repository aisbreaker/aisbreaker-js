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
* AI service and its engine.
*/
export class Engine {
    /**
    * Service ID = connected service. Usually, one service can handle multiple AI services represent by service-specific engines.
    */
    'serviceId': string;
    /**
    * service specific engine/model ID
    */
    'engineId': string;

    static readonly discriminator: string | undefined = undefined;

    static readonly attributeTypeMap: Array<{name: string, baseName: string, type: string, format: string}> = [
        {
            "name": "serviceId",
            "baseName": "service_id",
            "type": "string",
            "format": ""
        },
        {
            "name": "engineId",
            "baseName": "engine_id",
            "type": "string",
            "format": ""
        }    ];

    static getAttributeTypeMap() {
        return Engine.attributeTypeMap;
    }

    public constructor() {
    }
}

