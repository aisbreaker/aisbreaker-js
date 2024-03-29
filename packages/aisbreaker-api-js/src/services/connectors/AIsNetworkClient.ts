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
import { AIsServiceDefaults } from '../../base/AIsServiceDefaults.js'


//
// AIsNetworkClient: Service (client) to access a remote AIsBreaker (proxy) server.
//

export interface AIsNetworkClientDefaults extends AIsServiceDefaults { }

const defaultServiceId = 'aisbreaker:network'
const serviceDefaults: AIsNetworkClientDefaults = {
  url: 'http://localhost:3000/api/v1/process', // https://api.demo.aisbreaker.org/api/v1/process
}

const DEBUG = true

export interface AIsNetworkClientProps extends AIsServiceProps {
  /** access this AIsBreaker server */
  url: string

  /** the actual service; this filter will forward to this service */
  forward2ServiceProps: AIsServiceProps
}


export class AIsNetworkClientService extends BaseAIsService<AIsNetworkClientProps, AIsNetworkClientDefaults> {
  constructor(serviceProps: AIsNetworkClientProps, serviceDefaults: AIsNetworkClientDefaults, auth?: Auth) {
    super(serviceProps, serviceDefaults, auth)
  }
 
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
    // prepare remote access
    const isStreamingRequested = (request.streamProgressFunction !== undefined) ? true : false
    if (isStreamingRequested) {
      (request as any).stream = true
    }
    const aisNetworkRequest: AIsNetworkRequest = {
      service: this.serviceProps?.forward2ServiceProps,
      request,
    }
    const abortController = utils.createSecondAbortControllerFromAbortController(request.abortSignal)

    if (!isStreamingRequested) {
      // no streaming (simple)
      return await this.processNonStreamingRequest(this.url, request, aisNetworkRequest, abortController, context)
    } else {
      // streaming (more complex)
      return await this.processStreamingRequest(this.url, request, aisNetworkRequest, abortController, context)
    }
  }

  /** process non-streaming */
  async processNonStreamingRequest(
    url: string,
    request: Request,
    aisNetworkRequest: AIsNetworkRequest,
    abortController: AbortController,
    context: string
  ): Promise<ResponseFinal | AIsError> {
    const responseJsonPromise =  ky.post(
      url,
      {
        headers: this.getHttpRequestHeaders('application/json', this.auth?.secret),
        json: aisNetworkRequest,
        hooks: utils.kyHooksToReduceLogging(),
        throwHttpErrors: true,
        signal: abortController.signal,
      }
    ).json()
    const responseJson = await responseJsonPromise

    return responseJson as ResponseFinal
  }

  /** process streaming */
  async processStreamingRequest(
    url: string,
    request: Request,
    aisNetworkRequest: AIsNetworkRequest,
    abortController: AbortController,
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
        headers: this.getHttpRequestHeaders('text/event-stream', this.auth?.secret),
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
              return
            }
            if (message.data === '[DONE]') {
              // streamProgressFunc('[DONE]')  // don't call streamProgressFunc() at the end; the return will resolve the Promise
              abortController.abort()
              return
            }
            if (message.event === 'final') {
              // final data received
              const dataObj = JSON.parse(message.data)
              // disabled, because it cause AbortError in aisbreaker-chat-web browser app:
              //abortController.abort()
              responseFinal = dataObj
              return
            } else {
              // normal data received
              const dataObj = JSON.parse(message.data)
              streamProgressFunction(dataObj)
              return
            }
          } catch (error) {
            logger.warn(`${context} onDownloadProgress() error:`, error)
          }
        }),
        signal: abortController.signal,
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

  getHttpRequestHeaders(accept: string, secret: string | undefined): any {
    if (secret) {
      return {
        'Content-Type': 'application/json', // optional because set automatically
        'Accept': accept,
        'Authorization': `Bearer ${secret}`,
      }
    } else {
      return {
        'Content-Type': 'application/json', // optional because set automatically
        'Accept': accept,
        // 'Authorization': `Bearer ${this.auth?.secret || 'NoAuthProvided-in-AIsNetworkClientService'}`,
      }
    }
  }
}


//
// factory
//
export class AIsNetworkClientFactory
 implements AIsAPIFactory<AIsNetworkClientProps, AIsNetworkClientService> {
    createAIsService(props: AIsNetworkClientProps, auth?: Auth): AIsNetworkClientService {
        return new AIsNetworkClientService(props, serviceDefaults, auth)
    }
}


//
// register this service/connector
//
AIsBreaker.getInstance().registerFactory({serviceId: defaultServiceId, factory: new AIsNetworkClientFactory()})
