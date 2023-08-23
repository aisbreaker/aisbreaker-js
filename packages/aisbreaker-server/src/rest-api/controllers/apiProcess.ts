import * as express from 'express'
import {extractHttpAuthHeaderSecret, getClientIP, writeEventStreamResponseHeaders, writeJsonResponse, writeJsonResponseAIsErrorAndEnd, writeJsonResponseHeaders, writeJsonServerSideEventAIsErrorResponseAndEnd, writeJsonServerSideEventErrorResponseAndEnd, writeJsonServerSideEventFinalResponseAndEnd, writeJsonServerSideEventProgressResponse} from '../../utils/expressHelper.js'
//import { ProxyServiceAPI } from '../services/aisService.js'
import logger from '../../utils/logger.js'
import { api, api as api0, services as services0, utils } from 'aisbreaker-api-js'
import { api as api99, services as services99 } from 'aisbreaker-core-nodejs'
import { getAuthForServiceId, checkRequest } from './webRequestQuotasController.js'

const DEBUG = true

// setup module aisbreaker-core-nodejs
// ??
api99.isAIsServiceProps(undefined)



export async function apiProcess(req: express.Request, res: express.Response): Promise<void> {
  try {
    apiProcessIntern(req, res)
  } catch (err) {
    logger.error(`apiProcess extern() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (apiProcess): ${err}`}})
    return
  }
}

async function apiProcessIntern(req: express.Request, res: express.Response): Promise<void> {
  let request: api0.Request
  let aisService: api.AIsService

  logger.debug(`apiProcess() - started`)
  
  // abort handling
  const abortController = new AbortController()
  res.on('close', (data: any) => {
    logger.warn(`apiProcess() - response close:`, data)
    abortController.abort()
  })

  try {
    // check and use authentication (bearer header)
    const requestSecret = extractHttpAuthHeaderSecret(req)
    if (DEBUG) {
      console.log(`apiProcess() - requestSecret='${requestSecret}'`)
    }

    // check quotas
    const clientIp = getClientIP(req)
    const quotasResult = await checkRequest(clientIp, req.hostname, requestSecret)
    if (quotasResult.errorMsg) {
      const e = new api.AIsError(quotasResult.errorMsg, utils.ERROR_429_Too_Many_Requests)
      return writeJsonResponseAIsErrorAndEnd(res, e)     
    }
    const requestAuthAndQuotas = quotasResult.requestAuthAndQuotas
    if (!requestAuthAndQuotas) {
      const e = new api.AIsError(`Server Error (process): invalid CheckRequestQuotasResult`, utils.ERROR_400_Bad_Request)
      return writeJsonResponseAIsErrorAndEnd(res, e)
    }

    // get aisNetworkRequest
    const json = req.body
    logger.debug(`apiProcess() - json=${JSON.stringify(json)}`)
    const aisNetworkRequest: services0.AIsNetworkRequest = json
    const serviceProps = aisNetworkRequest.service
    request = aisNetworkRequest.request

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
        const e = new api.AIsError(`Could get requested service (apiProcess): ${err}`, utils.ERROR_400_Bad_Request)
        return writeJsonResponseAIsErrorAndEnd(res, e)
      }
    }
  } catch (err) {
    logger.error(`apiProcess() - error: ${err}`, err)
    if (err instanceof api.AIsError) {
      return writeJsonResponseAIsErrorAndEnd(res, err)
    } else {
      const e = new api.AIsError(`Server Error (apiProcess): ${err}`, utils.ERROR_500_Internal_Server_Error)
      return writeJsonResponseAIsErrorAndEnd(res, e)
    }
  }

  // special handling for streaming
  const isStreamingRequested = (request as any).stream ? true : false
  if (!isStreamingRequested) {
    // simple/non-streaming request
    try {
      // call requested service
      request.abortSignal = abortController.signal
      const response = await aisService.process(request)
      writeJsonResponse(res, 200, response)
  
    } catch (err) {
      logger.error(`apiProcess() - error for non-streaming: ${err}`, err)
      abortController.abort()
      if (err instanceof api.AIsError || api.isAIsErrorData(err)) {
        err.message = `Server Error (apiProcess non-streaming): ${err.message}`
        return writeJsonResponseAIsErrorAndEnd(res, err)
      } else {
        const e = new api.AIsError(`Server Error (apiProcess non-streaming*): ${err}`, utils.ERROR_503_Service_Unavailable)
        return writeJsonResponseAIsErrorAndEnd(res, e)
      }
    }

  } else {
    // streaming request with server-side events
    // Attention: header may not be sent twice, otherwise the server can crash
    //            (e.g. https://stackoverflow.com/questions/70308696/nodemon-app-crashed-after-logging-in-with-false-credentials )

    try {
      // prepare event handler
      request.streamProgressFunction = createStreamProgressFunction(req, res, abortController)

      // send HTTP response headers (before streaming)
      //writeJsonResponseHeaders(res, 200)
      writeEventStreamResponseHeaders(res, 200)

      // call requested service
      request.abortSignal = abortController.signal
      const response = await aisService.process(request)

      // send final event
      return writeJsonServerSideEventFinalResponseAndEnd(res, response)

    } catch (err) {
      logger.error(`apiProcess() - error for streaming: ${err}`, err)
      abortController.abort()
      if (err instanceof api.AIsError || api.isAIsErrorData(err)) {
        err.message = `Server Error (apiProcess streaming): ${err.message}`
        return writeJsonServerSideEventAIsErrorResponseAndEnd(res, err)
      } else {
        const e = new api.AIsError(`Server Error (apiProcess streaming*): ${err}`, utils.ERROR_500_Internal_Server_Error)
        return writeJsonServerSideEventErrorResponseAndEnd(res, e)
      }
    }
  }
}

function createStreamProgressFunction(
  req: express.Request,
  res: express.Response,
  abortController: AbortController
): api.StreamProgressFunction {
  return (responseEvent: api.ResponseEvent): void => {
    try {
      console.log(`streamProgressFunction() - responseEvent=${JSON.stringify(responseEvent)}`)
      writeJsonServerSideEventProgressResponse(res, responseEvent)
    } catch (err) {
      logger.error(`createStreamProgressFunction() - error for streaming progress: ${err}`, err)
      abortController.abort()
      writeJsonServerSideEventErrorResponseAndEnd(res, {error: {type: 'server_error', status: 500, message: `Server Error (apiProcess): ${err}`}})
    }
  }
}
