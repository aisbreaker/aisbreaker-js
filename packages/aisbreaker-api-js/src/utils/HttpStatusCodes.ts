
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
// often used status codes
//
export const ERROR_400_Bad_Request = 400
export const ERROR_401_Unauthorized = 401
export const ERROR_499_Client_Closed_Request = 499

export const ERROR_500_Internal_Server_Error = 500
export const ERROR_501_Not_Implemented = 501
export const ERROR_502_Bad_Gateway = 502
export const ERROR_503_Service_Unavailable = 503
