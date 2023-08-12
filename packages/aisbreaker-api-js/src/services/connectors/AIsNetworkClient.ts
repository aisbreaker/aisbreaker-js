import ky from 'ky-universal'
//TODO: import ('ky-universal')

import {
    AIsBreaker,
    AIsServiceProps,
    AIsAPIFactory,
    AIsService,
    Auth,
    Request,
    ResponseFinal,
    StreamProgressFunction
} from '../../api/index.js'
import * as utils from '../../utils/index.js'
import { AIsNetworkRequest } from './AIsNetworkRequest.js'


//
// AIsNetworkClient: Service (client) to access a remote AIsBreaker (proxy) server.
//

const networkServiceId = 'aisbreaker:network'

const DEFAULT_AISSERVER_URL = 'http://localhost:3000' // https://api.demo.aisbreaker.org
const AISSERVER_API_PATH = '/api/v1/process'

const DEBUG = true

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
      try {
        console.log(`AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId} START`)
        
        // remote access - no streaming of partial responses right now (TODO: implement streaming)
        const url = `${this.serviceProps.url || DEFAULT_AISSERVER_URL}${AISSERVER_API_PATH}`
        const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false
        if (isStreamingRequested) {
          (request as any).stream = true
        }
        const aisNetworkRequest: AIsNetworkRequest = {
          service: forward2ServiceProps,
          request,
        }

        let responseFinal: ResponseFinal | undefined = undefined
        if (!isStreamingRequested) {
          // no streaming
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
          responseFinal = responseJson as ResponseFinal

        } else {
          // streaming
          const streamProgressFunction = request.streamProgressFunction as StreamProgressFunction
          const l = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.auth || 'NoAuthProvided'}`,
                },
                json: aisNetworkRequest,
                onDownloadProgress: utils.kyOnDownloadProgress4onMessage((message: any) => {
                  if (DEBUG) {
                      console.log('onMessage() called', message)
                  }
                  if (!message.data || message.event === 'ping') {
                      return;
                  }
                  if (message.data === '[DONE]') {
                      // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the Promise/resolve will return instead
                      //abortController.abort();
                      //resolve(undefined)
                      //done = true;
                      return;
                  }
                  if (message.event === 'final') {
                    const dataObj = JSON.parse(message.data)
                    responseFinal = dataObj
                  } else {
                    const dataObj = JSON.parse(message.data)
                    streamProgressFunction(dataObj)
                  }
                }),
                /*
                dispatcher: new Agent({
                    bodyTimeout: 0,
                    headersTimeout: 0,
                }),
                */
                signal: new AbortController().signal,
            }
          ).text() // ky.post() response is ignored
          console.log("final text", l)
        }

        // final response/result
        console.log("Final Result parsed: ", responseFinal)
        if (!responseFinal) {
          throw new Error(`no final response`)
        }
        console.log(`AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId} END`)
        return responseFinal

      } catch (error) {
        let errorMsg: string
        if ((error as any).name === 'AbortError') {
          errorMsg = `AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId}: fetch aborted`
        } else {
          errorMsg = `AIsProxyClientService.process() forward to ${forward2ServiceProps.serviceId} with error: ${error}`
        }
        console.error(errorMsg)
        throw new Error(errorMsg)
      }
    }
}

/** Create callback function for ky for streaming */
function getOnDownloadProgressFunction(
  streamProgressFunction: StreamProgressFunction 
  ): (progress: any, chunk: Uint8Array) => void {
  // streaming requested
  const onDownloadProgress = utils.kyOnDownloadProgress4onMessage((message: any) => {
    if (DEBUG) {
        console.log('onMessage() called', message)
    }
    if (!message.data || message.event === 'ping') {
        return;
    }
    if (message.data === '[DONE]') {
        // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the Promise/resolve will return instead
        //abortController.abort();
        //resolve(undefined)
        //done = true;
        return;
    }
    const dataObj = JSON.parse(message.data)
    streamProgressFunction(dataObj)
  })
  return onDownloadProgress
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
