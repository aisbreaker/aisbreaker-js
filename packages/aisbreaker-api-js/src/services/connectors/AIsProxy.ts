import ky from 'ky-universal'
//TODO: import ('ky-universal')

import {
    AIsBreaker,
    AIsServiceProps,
    AIsAPIFactory,
    AIsService,
    Request,
    ResponseFinal,
    Auth,
} from '../../api/index.js'
import { AIsProxyNetworkRequest } from './AIsProxyNetworkRequest.js'


//
// AIsProxyClient: Service (client) to access a remote AIsBreaker (proxy) server.
//

const proxyServiceId = 'aisbreaker:proxy'

const DEFAULT_AISPROXY_URL = 'http://localhost:3000' // https://aisproxy.demo.aisbreaker.org
//const AISPROXY_API_PATH = '/api/v1alpha1/process'
const AISPROXY_API_PATH = '/api/v1/task'


export interface AIsProxyClientProps extends AIsServiceProps {
    /** access this AIs proxy server */
    url: string

    /** the actual service; this filter will forward to this service */
    forward2ServiceProps: AIsServiceProps
}

export class AIsProxyClientService implements AIsService {
    serviceProps: AIsProxyClientProps
    auth?: Auth

    constructor(props: AIsProxyClientProps, auth?: Auth) {
        this.serviceProps = props
        this.auth = auth
    }

    async process(request: Request): Promise<ResponseFinal> {
        const forward2ServiceProps = this.serviceProps.forward2ServiceProps
        console.log(`AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId} START`)
        
        // remote access - no streaming of partial responses right now (TODO: implement streaming)
        const aisProxyRequest: AIsProxyNetworkRequest = {
            service: forward2ServiceProps,
            request,
        }
        const url = `${this.serviceProps.url || DEFAULT_AISPROXY_URL}${AISPROXY_API_PATH}`
        const responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.auth || 'NoAuthProvided'}`,
                },
                json: aisProxyRequest,
                /*
                dispatcher: new Agent({
                    bodyTimeout: 0,
                    headersTimeout: 0,
                }),
                */
                signal: new AbortController().signal,
            }
        ).json()
        const result = responseJson as ResponseFinal
        
        console.log(`AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId} END`)
        return result
    }
}

export class AIsProxyClientFactory implements AIsAPIFactory<AIsProxyClientProps, AIsProxyClientService> {
    createAIsService(props: AIsProxyClientProps): AIsProxyClientService {
        return new AIsProxyClientService(props)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: proxyServiceId, factory: new AIsProxyClientFactory()})
