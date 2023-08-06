import * as express from 'express'
import {writeJsonResponse} from '../../utils/expressHelper.js'
 
export function ping(req: express.Request, res: express.Response): void {
    writeJsonResponse(res, 200, {"message": `api-pong`})
}

export function version(req: express.Request, res: express.Response, version: string): void {
    const name = req.query.name || 'stranger'
    writeJsonResponse(res, 200, {"message": `Hello ${name}, ... I'm AIsBrreaker Proxy version ${version}!`})
}
