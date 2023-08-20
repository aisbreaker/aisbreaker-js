import * as express from 'express'
import {extractHttpAuthHeaderSecret, getClientIP, writeJsonResponse, writeJsonResponseHeaders, writeJsonServerSideEventErrorResponse, writeJsonServerSideEventFinalResponse, writeJsonServerSideEventProgressResponse} from '../../utils/expressHelper.js'
//import { ProxyServiceAPI } from '../services/aisService.js'
import logger from '../../utils/logger.js'
import { api as api0, services as services0 } from 'aisbreaker-api-js'
import { api, services } from 'aisbreaker-core-nodejs'
import { getAuthForServiceId, checkRequest } from './webRequestQuotasController.js'

const DEBUG = true

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
  try {
    logger.debug(`apiProcess() - started`)

    // check and use authentication (bearer header)
    const requestSecret = extractHttpAuthHeaderSecret(req)
    if (DEBUG) {
      console.log(`apiProcess() - requestSecret='${requestSecret}'`)
    }

    // check quotas
    const clientIp = getClientIP(req)
    const quotasResult = await checkRequest(clientIp, req.hostname, requestSecret)
    if (quotasResult.errorMsg) {
      writeJsonResponse(res, 429, {error: {type: 'too_many_requests', message: quotasResult.errorMsg}})
      return
    }
    const requestAuthAndQuotas = quotasResult.requestAuthAndQuotas
    if (!requestAuthAndQuotas) {
      writeJsonResponse(res, 400, {error: {type: 'server_error', message: `Server Error (process): invalid CheckRequestQuotasResult`}})
      return
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
      writeJsonResponse(res, 400, {error: {type: 'server_error', message: `Could get requested service (apiProcess): ${err}`}})
      return
    }
  } catch (err) {
    logger.error(`apiProcess() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (apiProcess): ${err}`}})
    return
  }

  // special handling for streaming
  const isStreamingRequested = (request as any).stream ? true : false
  if (!isStreamingRequested) {
    // simple/non-streaming request
    try {
      // call requested service
      const response = await aisService.process(request)
      writeJsonResponse(res, 200, response)
  
    } catch (err) {
      logger.error(`apiProcess() - error for non-streaming: ${err}`, err)
      writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (apiProcess): ${err}`}})
    }

  } else {
    // streaming request with server-side events
    // Attention: header may not be sent twice, otherwise the server can crash
    //            (e.g. https://stackoverflow.com/questions/70308696/nodemon-app-crashed-after-logging-in-with-false-credentials )

    try {
      // prepare event handler
      request.streamProgressFunction = createStreamProgressFunction(req, res)

      // send HTTP response headers (before streaming)
      writeJsonResponseHeaders(res, 200)

      // call requested service
      const response = await aisService.process(request)

      // send final event
      writeJsonServerSideEventFinalResponse(res, response)

    } catch (err) {
      logger.error(`apiProcess() - error for streaming: ${err}`, err)
      writeJsonServerSideEventErrorResponse(res, {error: {type: 'server_error', status: 500, message: `Server Error (apiProcess): ${err}`}})
    }
  }
}

function createStreamProgressFunction(req: express.Request, res: express.Response): api.StreamProgressFunction {
  return (responseEvent: api.ResponseEvent): void => {
    try {
      console.log(`streamProgressFunction() - responseEvent=${JSON.stringify(responseEvent)}`)
      writeJsonServerSideEventProgressResponse(res, responseEvent)
    } catch (err) {
      logger.error(`createStreamProgressFunction() - error for streaming progress: ${err}`, err)
      writeJsonServerSideEventErrorResponse(res, {error: {type: 'server_error', status: 500, message: `Server Error (apiProcess): ${err}`}})
    }
  }
}
