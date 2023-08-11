import * as express from 'express'
import {extractHttpAuthHeaderSecret, getClientIP, writeJsonResponse, writeJsonResponseHeaders} from '../../utils/expressHelper.js'
//import { ProxyServiceAPI } from '../services/aisService.js'
import logger from '../../utils/logger.js'
import { api as api0, services as services0 } from 'aisbreaker-api-js'
import { api, services } from 'aisbreaker-core-nodejs'
import { getAuthForServiceId, checkRequest } from './webRequestQuotasController.js'

const DEBUG = true

export async function apiProcess(req: express.Request, res: express.Response): Promise<void> {
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
    const request = aisNetworkRequest.request

    // get auth for the requested service
    const serviceId = serviceProps.serviceId
    const auth = getAuthForServiceId(requestAuthAndQuotas, requestSecret, serviceId)

    // get/create requested service
    const aisService: api.AIsService = api.AIsBreaker.getInstance().getAIsService(serviceProps, auth)

    // special handling for streaming
    const isStreamingRequested = (request as any).stream ? true : false
    if (isStreamingRequested) {
      // "install" event handler
      request.streamProgressFunction = createStreamProgressFunction(req, res)

      // send HTTP response headers (before streaming)
      writeJsonResponseHeaders(res, 200)
    }

    // call requested service
    const response = await aisService.process(request)

    // send (final) HTTP response
    const skipWriteHeaders = isStreamingRequested
    writeJsonResponse(res, 200, response, skipWriteHeaders)

  } catch (err) {
    logger.error(`apiProcess() - error: ${err}`, err)
    writeJsonResponse(res, 500, {error: {type: 'server_error', message: `Server Error (sendMessageViaProxy): ${err}`}})
  }
}

function createStreamProgressFunction(req: express.Request, res: express.Response): api.StreamProgressFunction {
  return (responseEvent: api.ResponseEvent): void => {
    console.log(`streamProgressFunction() - responseEvent=${JSON.stringify(responseEvent)}`)

    const data = `data: ${JSON.stringify(responseEvent)}\n\n`
    res.write(data)
  }
}
