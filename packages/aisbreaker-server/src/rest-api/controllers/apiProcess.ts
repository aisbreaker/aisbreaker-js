import * as express from 'express'
import {extractHttpAuthHeaderSecret, getClientIP, writeEventStreamResponseHeaders, writeJsonResponse, writeJsonResponseAIsErrorAndEnd, writeJsonResponseHeaders, writeJsonServerSideEventAIsErrorResponseAndEnd, writeJsonServerSideEventErrorResponseAndEnd, writeJsonServerSideEventFinalResponseAndEnd, writeJsonServerSideEventProgressResponse} from '../../utils/expressHelper.js'
//import { ProxyServiceAPI } from '../services/aisService.js'
import logger from '../../utils/logger.js'
import { api, extern, services, utils } from 'aisbreaker-api-js'
import * as core from 'aisbreaker-core-nodejs'
import { getAuthForServiceId, checkRequest } from './webRequestQuotasController.js'


const DEBUG = true

// setup module aisbreaker-core-nodejs and its dependencies
core.init()


export async function apiProcess(req: express.Request, res: express.Response): Promise<void> {
  try {
    apiProcessUnprotected(req, res)
  } catch (err) {
    logger.warn(`apiProcess extern() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (apiProcess): ${err}`}})
    return
  }
}

async function apiProcessUnprotected(req: express.Request, res: express.Response): Promise<void> {
  let aisRequest: api.Request
  let aisService: api.AIsService

  logger.debug(`apiProcess() - started`)
  
  // abort handling
  const abortController = new AbortController()
  res.on('close', () => {
    //logger.debug(`apiProcess() - response closed`)
    abortController.abort()
  })

  try {
    // check and use authentication (bearer header)
    const requestSecret = extractHttpAuthHeaderSecret(req)
    if (DEBUG) {
      logger.debug(`apiProcess() - requestSecret='${requestSecret}'`)
    }

    // check quotas
    const clientIp = getClientIP(req)
    const quotasResult = await checkRequest(clientIp, req.hostname, requestSecret)
    if (quotasResult.errorMsg) {
      const e = new api.AIsError(quotasResult.errorMsg, extern.ERROR_429_Too_Many_Requests)
      return writeJsonResponseAIsErrorAndEnd(res, e)     
    }
    const requestAuthAndQuotas = quotasResult.requestAuthAndQuotas
    if (!requestAuthAndQuotas) {
      const e = new api.AIsError(`Server Error (process): invalid CheckRequestQuotasResult`, extern.ERROR_400_Bad_Request)
      return writeJsonResponseAIsErrorAndEnd(res, e)
    }

    // get aisNetworkRequest
    const json = req.body
    logger.debug(`apiProcess() - json=${JSON.stringify(json)}`)
    const aisNetworkRequest: services.AIsNetworkRequest = json
    const serviceProps = aisNetworkRequest.service
    aisRequest = aisNetworkRequest.request

    // get auth for the requested service
    const serviceId = serviceProps.serviceId
    const auth = getAuthForServiceId(requestAuthAndQuotas, requestSecret, serviceId)

    // get/create requested service
    try {
      aisService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)
    } catch (err) {
      logger.warn(`apiProcess() - error: ${err}`, err)
      if (err instanceof api.AIsError) {
        return writeJsonResponseAIsErrorAndEnd(res, err)
      } else {
        const e = new api.AIsError(`Could get requested service (apiProcess): ${err}`, extern.ERROR_400_Bad_Request)
        return writeJsonResponseAIsErrorAndEnd(res, e)
      }
    }
  } catch (err) {
    logger.warn(`apiProcess() - error: ${err}`, err)
    if (err instanceof api.AIsError) {
      return writeJsonResponseAIsErrorAndEnd(res, err)
    } else {
      const e = new api.AIsError(`Server Error (apiProcess): ${err}`, extern.ERROR_500_Internal_Server_Error)
      return writeJsonResponseAIsErrorAndEnd(res, e)
    }
  }

  // special handling for streaming
  const isStreamingRequested = (aisRequest as any).stream ? true : false
  if (!isStreamingRequested) {
    // simple/non-streaming request
    await processNonStreamingRequest(/*req,*/ res, aisService, aisRequest, abortController)
  } else {
    // streaming request with server-side events
    await processStreamingRequest(/*req,*/ res, aisService, aisRequest, abortController)
  }
}

/** simple/non-streaming request processing */
async function processNonStreamingRequest(
  //req: express.Request,
  res: express.Response,
  aisService: api.AIsService,
  aisRequest: api.Request,
  abortController: AbortController) {

  try {
    // call requested service
    aisRequest.abortSignal = abortController.signal
    const response = await aisService.process(aisRequest)
    writeJsonResponse(res, 200, response)

  } catch (err: any) {
    logger.warn(`apiProcess() - error (streaming=false): ${err}`, err)
    abortController.abort()
    if (err instanceof api.AIsError || api.isAIsErrorData(err)) {
      err.message = `Server Error (apiProcess streaming=false): ${err.message}`
      return writeJsonResponseAIsErrorAndEnd(res, err)
    } else {
      const e = new api.AIsError(`Server Error (apiProcess streaming=false*): ${err}`, extern.ERROR_503_Service_Unavailable)
      return writeJsonResponseAIsErrorAndEnd(res, e)
    }
  }
}

/** streaming request processing with server-side events */
async function processStreamingRequest(
  //req: express.Request,
  res: express.Response,
  aisService: api.AIsService,
  aisRequest: api.Request,
  abortController: AbortController) {
  
  // Attention: header may not be sent twice, otherwise the server can crash
  //            (e.g. https://stackoverflow.com/questions/70308696/nodemon-app-crashed-after-logging-in-with-false-credentials )
  try {
    // prepare event handler
    aisRequest.streamProgressFunction = createStreamProgressFunction(/*req,*/ res, abortController)

    // send HTTP response headers (before streaming)
    //writeJsonResponseHeaders(res, 200)
    writeEventStreamResponseHeaders(res, 200)

    // call requested service
    aisRequest.abortSignal = abortController.signal
    const response = await aisService.process(aisRequest)

    // send final event
    return writeJsonServerSideEventFinalResponseAndEnd(res, response)

  } catch (err: any) {
    logger.warn(`apiProcess() - error (streaming=true): ${err}`, err)
    abortController.abort()
    if (err instanceof api.AIsError || api.isAIsErrorData(err)) {
      err.message = `Server Error (apiProcess streaming=true): ${err.message}`
      return writeJsonServerSideEventAIsErrorResponseAndEnd(res, err)
    } else {
      const e = new api.AIsError(`Server Error (apiProcess streaming=true*): ${err}`, extern.ERROR_503_Service_Unavailable)
      return writeJsonServerSideEventAIsErrorResponseAndEnd(res, e)
    }
  }
}
function createStreamProgressFunction(
  //req: express.Request,
  res: express.Response,
  abortController: AbortController
): api.StreamProgressFunction {
  return (responseEvent: api.ResponseEvent): void => {
    try {
      logger.debug(`createStreamProgressFunction() - responseEvent=${JSON.stringify(responseEvent)}`)
      writeJsonServerSideEventProgressResponse(res, responseEvent)
    } catch (err) {
      logger.warn(`createStreamProgressFunction() - error for streaming progress: ${err}`, err)
      abortController.abort()
      writeJsonServerSideEventAIsErrorResponseAndEnd(
        res, new api.AIsError(`Server Error (createStreamProgressFunction): ${err}`, extern.ERROR_500_Internal_Server_Error)
      )
    }
  }
}
