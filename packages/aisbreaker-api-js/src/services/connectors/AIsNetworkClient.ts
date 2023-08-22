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
import { AIsError, isAIsErrorData } from '../../api/AIsError.js'
import { BaseAIsService } from '../../base/BaseAIsService.js'


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

export class AIsNetworkClientService extends BaseAIsService<AIsNetworkClientProps> {

  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(): string | undefined {
    let contextService = super.getContextService() || 'AIsNetworkClient'
    contextService += `->${this.serviceProps?.url}->${this.serviceProps?.forward2ServiceProps?.serviceId}`
    return contextService
  }


  async processUnprotected(request: Request, context: string): Promise<ResponseFinal> {

      console.log(`${context} BEFORE START`)
      const forward2ServiceProps = this.serviceProps?.forward2ServiceProps
      const url = `${this.serviceProps.url || DEFAULT_AISSERVER_URL}${AISSERVER_API_PATH}`
      try {
        console.log(`${context} START`)
        
        // remote access - no streaming of partial responses right now (TODO: implement streaming)
        const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false
        if (isStreamingRequested) {
          (request as any).stream = true
        }
        const aisNetworkRequest: AIsNetworkRequest = {
          service: forward2ServiceProps,
          request,
        }

        let responseFinal: ResponseFinal | undefined
        let errorFinal: AIsError | undefined
        if (!isStreamingRequested) {
          // no streaming (simple)
          const responseJson = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-AIsNetworkClientService'}`,
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
          // streaming (more complex)
          const streamProgressFunction = request.streamProgressFunction as StreamProgressFunction
          const responseTextIgnored = await ky.post(
            url,
            {
                headers: {
                    'Content-Type': 'application/json', // optional because set automatically
                    'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-AIsNetworkClientService'}`,
                },
                json: aisNetworkRequest,
                onDownloadProgress: utils.kyOnDownloadProgress4onMessage((message: any) => {
                  try {
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
                    if (message.event === 'error') {
                      let dataObj = JSON.parse(message.data)
                      if (dataObj.error) {
                        dataObj = dataObj.error
                      }
                      console.log("STREAMED ERROR: ", dataObj)
                      errorFinal = AIsError.fromAIsErrorData(dataObj)
                      console.log("STREAMED ERROR errorFinal: ", errorFinal)
                      if (errorFinal) {
                        throw errorFinal
                      }
                    }
                    if (message.event === 'final') {
                      const dataObj = JSON.parse(message.data)
                      responseFinal = dataObj
                    } else {
                      const dataObj = JSON.parse(message.data)
                      streamProgressFunction(dataObj)
                    }
                  } catch (error) {
                    console.error(`${context} onDownloadProgress() error:`, error)
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
          ).text() 
          // ky.post() responseTextIgnored is ignored,
          //           but we need to wait for the Promise of .text() to finish
          //console.log("final text", responseTextIgnored)
        }

        // final response/result
        console.log(`${context} END (except throwing or returning final result) with responseFinal: `, responseFinal, ', errorFinal: ', errorFinal)
        if (errorFinal) {
          throw errorFinal
        }
        if (!responseFinal) {
          throw new AIsError(`${context} Error: No final response`, utils.ERROR_444_No_Response)
        }
        return responseFinal

      } catch (error) {
        console.error("AIsNetworkClientService error", error)

        // error (message) in response?
        if ((error as any).response) {
          let aisError: AIsError | undefined
          try {
            aisError = await tryToCreateAIsErrorFromKyResponse((error as any).response)
          } catch (innerError) {
            console.error("AIsNetworkClientService innerError: "+innerError)
          }
          console.log("AIsNetworkClientService aisError: "+ aisError)
          if (aisError) {
            console.log("AIsNetworkClientService aisError thrown")
            throw aisError
          }
        }

        // normal error: let it handle by the calling process() function
        throw error
      }
    }
}

//
// error helpers
//

/**
 * Throws an AIsError if the response contains an error, otherwise it just returns 
 * @param response T
 */
async function tryToCreateAIsErrorFromKyResponse(response: any): Promise<AIsError | undefined> {
  const error = await tryToExtractErrorFromKyResponse(response)
  if (error) {
    if (isAIsErrorData(error)) {
      return AIsError.fromAIsErrorData(error)
    } else {
      const errorMessage = error
      return new AIsError(errorMessage, utils.ERROR_503_Service_Unavailable)
    }
  }
}
async function tryToExtractErrorFromKyResponse(response: any): Promise<AIsError | string | undefined> {
  if (response && response.json) {
    try {
      const json = await response.json()
      //console.log("tryToExtractErrorFromKyResponse: ", json)
      if (json) {
        const error = json.error
        if (error) {
          const errorError = error?.error
          if (isAIsErrorData(errorError)) {
            return AIsError.fromAIsErrorData(errorError)
          }
          if (isAIsErrorData(error)) {
            return AIsError.fromAIsErrorData(error)
          }
          return JSON.stringify(error)
        } else {
          return JSON.stringify(json)
        }
      }
    } catch (error) {
      // exctract failed
      return undefined
    }
  }
  return undefined
}


//
// factory
//

export class AIsNetworkClientFactory implements AIsAPIFactory<AIsNetworkClientProps, AIsNetworkClientService> {
    createAIsService(props: AIsNetworkClientProps, auth?: Auth): AIsNetworkClientService {
        return new AIsNetworkClientService(props, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: networkServiceId, factory: new AIsNetworkClientFactory()})
