import ky from 'ky-universal'

import {
    AIsBreaker,
    AIsServiceProps,
    AIsAPIFactory,
    Auth,
    Request,
    ResponseFinal,
    StreamProgressFunction,
} from '../../api/index.js'
import * as utils from '../../utils/index.js'
import { AIsNetworkRequest } from './AIsNetworkRequest.js'
import { AIsError, isAIsErrorData } from '../../api/AIsError.js'
import { BaseAIsService } from '../../base/BaseAIsService.js'
import { logger } from '../../utils/logger.js'


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
   * Do the work of process()
   * without the need to care about all error handling.
   * 
   * @param request  the request to process
   * @param context  optional context information/description/message prefix
   *                 for logging and for error messages
   * @returns The final result.
   *          In the case of an error it returns an AIsError OR throws an AIError or general Error.
   */
  async processUnprotected(request: Request, context: string): Promise<ResponseFinal | AIsError | undefined> {
    logger.debug(`${context} BEFORE INNER START`)
    const forward2ServiceProps = this.serviceProps?.forward2ServiceProps
    const url = `${this.serviceProps.url || DEFAULT_AISSERVER_URL}${AISSERVER_API_PATH}`
    logger.debug(`${context} INNER START`)
    
    // remote access
    const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false
    if (isStreamingRequested) {
      (request as any).stream = true
    }
    const aisNetworkRequest: AIsNetworkRequest = {
      service: forward2ServiceProps,
      request,
    }
    if (!isStreamingRequested) {
      // no streaming (simple)
      return this.processNonStreamingRequest(url, request, aisNetworkRequest, context)
    } else {
      // streaming (more complex)
      return await this.processStreamingRequest(url, request, aisNetworkRequest, context)
    }
  }

  async processNonStreamingRequest(
    url: string,
    request: Request,
    aisNetworkRequest: AIsNetworkRequest,
    context: string
  ): Promise<ResponseFinal | AIsError> {
    const responseJsonPromise =  ky.post(
      url,
      {
          headers: {
              'Content-Type': 'application/json', // optional because set automatically
              'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-AIsNetworkClientService'}`,
          },
          json: aisNetworkRequest,
          hooks: utils.kyHooksToReduceLogging(),
          throwHttpErrors: true,
          /*
          dispatcher: new Agent({
              bodyTimeout: 0,
              headersTimeout: 0,
          }),
          */
          signal: request.abortSignal,
      }
    ).json()
    const responseJson = await responseJsonPromise

    return responseJson as ResponseFinal
  }

  async processStreamingRequest(
    url: string,
    request: Request,
    aisNetworkRequest: AIsNetworkRequest,
    context: string
  ): Promise<ResponseFinal | AIsError | undefined> {
    let responseFinal: ResponseFinal | undefined
    let errorFinal: AIsError | undefined

    const streamProgressFunction = request.streamProgressFunction as StreamProgressFunction

    // ky.post() responseTextIgnored is ignored,
    // but we need to wait for the Promise of .text() to finish
    const responseTextIgnored = await ky.post(
      url,
      {
          headers: {
              'Content-Type': 'application/json', // optional because set automatically
              'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-AIsNetworkClientService'}`,
          },
          json: aisNetworkRequest,
          hooks: utils.kyHooksToReduceLogging(),
          throwHttpErrors: true, // works also with false (probably)
          onDownloadProgress: utils.kyOnDownloadProgress4onMessage((message: any) => {
            try {
              if (DEBUG) {
                  logger.debug('onMessage() called', message)
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
                errorFinal = AIsError.fromAIsErrorData(dataObj)
                logger.warn("STREAMED ERROR errorFinal: ", errorFinal)
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
              logger.warn(`${context} onDownloadProgress() error:`, error)
            }
          }),
          /*
          dispatcher: new Agent({
              bodyTimeout: 0,
              headersTimeout: 0,
          }),
          */
          signal: request.abortSignal,
      }
    ).text() 
    //logger.debug("final text", responseTextIgnored)

    if (errorFinal) {
      return errorFinal
    } else {
      return responseFinal
    }
  }

  /**
   * Optionally, provide additional context information/description
   * for logging and error messages.
   */
  getContextService(request?: Request): string | undefined {
    let contextService = super.getContextService() || 'AIsNetworkClient'
    contextService += `->${this.serviceProps?.url}->${this.serviceProps?.forward2ServiceProps?.serviceId}`
    return contextService
  }
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
