//import './fetch-polyfill.js'
import {
    Agent, fetch, Headers, /*Request,*/ Response,
} from 'undici'

import {
    AIsProps,
    AIsAPIFactory,
    AIsService,
    Request,
    ResponseFinal,
} from '../../api'
import { AIsProxyRequest } from './AIsProxyRequest'


//
// AIsProxy: access a remote AIsBreaker proxy service
//
const DEFAULT_AISPROXY_URL = 'http://localhost:3000' // https://aisproxy.demo.aisbreaker.org

export interface AIsProxyParams {
    apiKeyId?: string
    apiKey?: string

    url?: string
    /** access this service on the remote/proxy site */
    remoteService: AIsProps
}
export interface AIsProxyProps extends AIsProxyParams, AIsProps {
}
export class AIsProxy implements AIsProxyProps {
    serviceId: string = 'AIsProxy'
    apiKeyId: string = 'AIsProxy'
    apiKey?: string

    url: string = DEFAULT_AISPROXY_URL
    remoteService: AIsProps

    constructor(props: AIsProxyParams) {
        this.url = props.url || DEFAULT_AISPROXY_URL
        this.apiKeyId = props.apiKeyId || 'AIsProxy'
        this.apiKey = props.apiKey
        this.remoteService = props.remoteService
    }
}

export class AIsProxyFactory implements AIsAPIFactory<AIsProxyProps,AIsProxyService> {
    serviceId: string = 'AIsProxy'

    constructor() {
    }

    createAIsAPI(props: AIsProxyProps): AIsProxyService {
        return new AIsProxyService(props)
    }
}

export class AIsProxyService implements AIsService {
    serviceId: string = 'AIsProxy'

    props: AIsProxyProps

    constructor(props: AIsProxyProps) {
        this.props = props
    }

    async sendMessage(request: Request): Promise<ResponseFinal> {
        const remoteService = this.props.remoteService
        console.log(`AIsProxyService.sendMessage() forward to ${remoteService.serviceId} START`)
        
        // remote access - no streaming of partial responses right now (TODO: implement streaming)
        const aisProxyRequest: AIsProxyRequest = {
            service: this.props.remoteService,
            request,
        }
        const url = `${this.props.url || DEFAULT_AISPROXY_URL}/api/v1/task`
        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.props.apiKey || 'NoApiKey'}`,
                },
                body: JSON.stringify(aisProxyRequest),
                dispatcher: new Agent({
                    bodyTimeout: 0,
                    headersTimeout: 0,
            }),
            signal: new AbortController().signal,
        })

        // synchronous HTTP reponse handling
        if (response.status !== 200) {
            const body = await response.text();
            const error: any = new Error(`Failed to send message. HTTP ${response.status} - ${body}`);
            error.status = response.status;
            try {
                error.json = JSON.parse(body);
            } catch {
                error.body = body;
            }
            throw error;
        }
        const result = await response.json() as ResponseFinal
        
        console.log(`AIsProxyService.sendMessage() forward to ${remoteService.serviceId} END`)
        return result
    }
}