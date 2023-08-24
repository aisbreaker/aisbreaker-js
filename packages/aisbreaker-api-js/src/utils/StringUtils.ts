import base64js from 'base64-js'
import * as util from 'util'

// Hint: we don't use Buffer because it's not available in the browser, only in NodeJS

let isNativeTextXxxcoderAvailable = isConstructor(TextEncoder)
let isImportedTextXxxcoderAvailable = isConstructor(util.TextEncoder)

export function base64ToBytes(base64: string): Uint8Array {
    return base64js.toByteArray(base64)
}

export function bytesToBase64(bytes: Uint8Array): string {
    return base64js.fromByteArray(bytes)
}

/*
function stringToUtf8BytesV1(str: string): Uint8Array {
    logger.debug(`stringToUtf8Bytes() with isNativeTextXxxcoderAvailable=${isNativeTextXxxcoderAvailable} and isImportedTextXxxcoderAvailable=${isImportedTextXxxcoderAvailable}`)
    if (isNativeTextXxxcoderAvailable) {
        let encoder = new TextEncoder()
        let uint8Array = encoder.encode(str)
        return uint8Array
    } else if (isImportedTextXxxcoderAvailable) {
        let encoder = new util.TextEncoder()
        let uint8Array = encoder.encode(str)
        return uint8Array
    } else {
        throw new Error('No TextEncoder available')
    }
}
*/
export function stringToUtf8Bytes(str: string): Uint8Array {
    // works always, also in NodeJS, with "import * as util from 'util'"
    let encoder = new TextEncoder()
    let uint8Array = encoder.encode(str)
    return uint8Array
}

/*
function utf8BytesToStringV1(bytes: Uint8Array): string {
    logger.debug(`utf8BytesToString() with isNativeTextXxxcoderAvailable=${isNativeTextXxxcoderAvailable} and isImportedTextXxxcoderAvailable=${isImportedTextXxxcoderAvailable}`)
    if (isNativeTextXxxcoderAvailable) {
        let decoder = new TextDecoder()
        let str = decoder.decode(bytes)
        return str
    } else if (isImportedTextXxxcoderAvailable) {
        let decoder = new util.TextDecoder()
        let str = decoder.decode(bytes)
        return str
    } else {
        throw new Error('No TextDecoder available')
    }
}
*/
export function utf8BytesToString(bytes: Uint8Array): string {
    // works always, also in NodeJS, with "import * as util from 'util'"
    let decoder = new TextDecoder()
    let str = decoder.decode(bytes)
    return str
}

export function stringToBase64(str: string): string {
    let bytes = stringToUtf8Bytes(str)
    return bytesToBase64(bytes)
}

export function base64ToString(base64: string): string {
    let bytes = base64ToBytes(base64)
    return utf8BytesToString(bytes)
}


//
// internal helper to "polyfill" TextEncoder/TextDecoder
//

function isConstructor(f: any) {
    try {
        new f()
    } catch (err) {
        // verify err is the expected error and then
        return false
    }
    return true
}
