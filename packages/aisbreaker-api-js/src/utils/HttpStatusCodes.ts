
/**
 * Code and textes from sepc:
 *   https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses
 *   https://httpwg.org/specs/rfc9110.html#overview.of.status.codes
 */
export const statusTextes: {[id: number]: string}  = {
    100: 'Continue',
    101: 'Switching Protocols',
	200: 'OK',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status (WebDAV)',
	208: 'Already Reported (WebDAV)',
	226: 'IM Used',
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified',
	305: 'Use Proxy',
	306: '(Unused)',
	307: 'Temporary Redirect',
	308: 'Permanent Redirect (experimental)',
 	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found',
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Timeout',
	409: 'Conflict',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Request Entity Too Large',
	414: 'Request-URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Requested Range Not Satisfiable',
	417: 'Expectation Failed',
	418: 'I\'m a teapot (RFC 2324)',
	420: 'Enhance Your Calm (Twitter)',
	422: 'Unprocessable Entity (WebDAV)',
	423: 'Locked (WebDAV)',
	424: 'Failed Dependency (WebDAV)',
	425: 'Reserved for WebDAV',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests',
	431: 'Request Header Fields Too Large',
	444: 'No Response (Nginx)',
	449: 'Retry With (Microsoft)',
	450: 'Blocked by Windows Parental Controls (Microsoft)',
	451: 'Unavailable For Legal Reasons',
	499: 'Client Closed Request (Nginx)',
	500: 'Internal Server Error',
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates (Experimental)',
	507: 'Insufficient Storage (WebDAV)',
	508: 'Loop Detected (WebDAV)',
	509: 'Bandwidth Limit Exceeded (Apache)',
	510: 'Not Extended',
	511: 'Network Authentication Required',
	598: 'Network read timeout error',
	599: 'Network connect timeout error',	
}

export function getStatusText(statusCode: number): string | undefined {
	try {
    	return statusTextes[statusCode]
	} catch (e) {
		return undefined
	}
}

//
// all used status codes
//

export const STATUS_200_OK = 200
export const STATUS_201_Created = 201
export const STATUS_202_Accepted = 202
export const STATUS_204_No_Content = 204
export const STATUS_206_Partial_Content = 206
export const STATUS_207_Multi_Status = 207
export const STATUS_208_Already_Reported = 208
export const STATUS_226_IM_Used = 226

export const STATUS_300_Multiple_Choices = 300
export const STATUS_301_Moved_Permanently = 301
export const STATUS_302_Found = 302
export const STATUS_303_See_Other = 303
export const STATUS_304_Not_Modified = 304
export const STATUS_307_Temporary_Redirect = 307
export const STATUS_308_Permanent_Redirect = 308

export const ERROR_400_Bad_Request = 400
export const ERROR_401_Unauthorized = 401
export const ERROR_403_Forbidden = 403
export const ERROR_404_Not_Found = 404
export const ERROR_405_Method_Not_Allowed = 405
export const ERROR_406_Not_Acceptable = 406
export const ERROR_409_Conflict = 409
export const ERROR_410_Gone = 410
export const ERROR_411_Length_Required = 411
export const ERROR_412_Precondition_Failed = 412
export const ERROR_413_Request_Entity_Too_Large = 413
export const ERROR_414_Request_URI_Too_Long = 414
export const ERROR_415_Unsupported_Media_Type = 415
export const ERROR_416_Requested_Range_Not_Satisfiable = 416
export const ERROR_417_Expectation_Failed = 417
export const ERROR_422_Unprocessable_Entity = 422
export const ERROR_429_Too_Many_Requests = 429
export const ERROR_431_Request_Header_Fields_Too_Large = 431
export const ERROR_444_No_Response = 444
export const ERROR_449_Retry_With = 449
export const ERROR_451_Unavailable_For_Legal_Reasons = 451
export const ERROR_499_Client_Closed_Request = 499

export const ERROR_500_Internal_Server_Error = 500
export const ERROR_501_Not_Implemented = 501
export const ERROR_502_Bad_Gateway = 502
export const ERROR_503_Service_Unavailable = 503
export const ERROR_504_Gateway_Timeout = 504
export const ERROR_505_HTTP_Version_Not_Supported = 505
export const ERROR_507_Insufficient_Storage = 507
export const ERROR_508_Loop_Detected = 508
export const ERROR_509_Bandwidth_Limit_Exceeded = 509
export const ERROR_510_Not_Extended = 510
export const ERROR_511_Network_Authentication_Required = 511
export const ERROR_598_Network_Read_Timeout_Error = 598
export const ERROR_599_Network_Connect_Timeout_Error = 599

