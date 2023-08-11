import * as express from 'express'
import {writeJsonResponse} from '../../utils/expressHelper.js'
 
export function apiPing(req: express.Request, res: express.Response): void {
  writeJsonResponse(res, 200, {"message": `api-pong`})
}

export function apiVersion(req: express.Request, res: express.Response, version: string): void {
  const name = req.query.name || 'stranger'
  writeJsonResponse(res, 200, 
    {
      "version": version,
      "message": `Hello ${name}, ... I'm AIsBreaker.org server version ${version} !`
    }
  )
}
