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
import { AIsNetworkRequest } from './AIsNetworkRequest.js'


//
// AIsNetworkClient: Service (client) to access a remote AIsBreaker (proxy) server.
//

const networkServiceId = 'aisbreaker:network'

const DEFAULT_AISSERVER_URL = 'http://localhost:3000' // https://aisproxy.demo.aisbreaker.org
const AISSERVER_API_PATH = '/api/v1/process'


export interface AIsNetworkClientProps extends AIsServiceProps {
    /** access this AIs server */
    url: string

    /** the actual service; this filter will forward to this service */
    forward2ServiceProps: AIsServiceProps
}

export class AIsNetworkClientService implements AIsService {
    serviceProps: AIsNetworkClientProps
    auth?: Auth

    constructor(props: AIsNetworkClientProps, auth?: Auth) {
        this.serviceProps = props
        this.auth = auth
    }

    async process(request: Request): Promise<ResponseFinal> {
        const forward2ServiceProps = this.serviceProps.forward2ServiceProps
        console.log(`AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId} START`)
        
        // remote access - no streaming of partial responses right now (TODO: implement streaming)
        const aisNetworkRequest: AIsNetworkRequest = {
            service: forward2ServiceProps,
            request,
        }
        const url = `${this.serviceProps.url || DEFAULT_AISSERVER_URL}${AISSERVER_API_PATH}`
        const responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.auth || 'NoAuthProvided'}`,
                },
                json: aisNetworkRequest,
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

export class AIsNetworkClientFactory implements AIsAPIFactory<AIsNetworkClientProps, AIsNetworkClientService> {
    createAIsService(props: AIsNetworkClientProps): AIsNetworkClientService {
        return new AIsNetworkClientService(props)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: networkServiceId, factory: new AIsNetworkClientFactory()})
