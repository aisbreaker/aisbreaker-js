import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'

import { ping, version as getVersion } from './rest-api/controllers/greeting.js'
import { process as processService } from './rest-api/controllers/ais.js'

/*
import jwt from 'express-jwt'
import jwksRsa from 'jwks-rsa'
*/

//
// basic settings
//
const app = express()
const port = 3000
const version = process.env.npm_package_version || 'unknown version'

const basePath = "/api/v1"
const basePath2 = "/api/v1alpha1"
const alternativesBasePath = "/alternative-api"

//
// start server (async)
//
async function startServer() {
    //
    // init expressjs
    //
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(cors())
  
    // enable logging (https://github.com/expressjs/morgan)
    app.use(morgan('combined'))
  
    /*
    const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://your-auth0-domain.auth0.com/.well-known/jwks.json'
    }),

    audience: 'your-audience',
    issuer: 'https://your-auth0-domain.auth0.com/',
    algorithms: ['RS256']
    })
    */

    //
    // define routes (expressjs)
    //

    // deliver some static content (root webapp)
    app.get('/', cors(), (req, res) => {
        res.send('Hello from AIsBreaker Server ... Details on AIsBreaker.org ...')
    })

    app.get('/info', cors(), (req, res) => {
        getInfoString().then(resultStr => {
            res.send(""+resultStr);
        })
    })


    /*
    // the home page and more - with required authentication
    app.use(basePath+"/", [ensureAuthenticated, express.static(baseDir+"/webapps/root")]);
    app.get(basePath+"/hello", ensureAuthenticated, function (req, res) {
      console.log("req.sessionID=", req.sessionID);
      res.send("Hello Chris! ("+addFunc(1, 2)+", "+(new Date())+")");
    });
    */

    // API
    app.get(basePath + "/ping", cors(), (req, res) => {
        ping(req, res)
    })
    app.get(basePath + '/version', cors(), (req, res) => {
        getVersion(req, res, version)
    })
    app.post(basePath + '/process', cors(), /*checkJwt,*/(req, res) => {
      processService(req, res)
    })

    // API (different version)
    app.get(basePath2 + "/ping", cors(), (req, res) => {
        ping(req, res)
    })
    app.get(basePath2 + '/version', cors(), (req, res) => {
        getVersion(req, res, version)
    })
    app.post(basePath2 + '/process', cors(), /*checkJwt,*/(req, res) => {
      processService(req, res)
    })
  
    // TODO: alternative APIs 
    // Example: /alternative[-api]/[api.]openai.com/v1/chat/completions
    /*
    app.post(alternativesBasePath + '/process', cors(), (req, res) => {
        task(req, res)
    })
    */

    //
    // start the web server now
    //
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    })

}
startServer()


//
// experiments
//

export async function getInfoString(): Promise<string>{
  return `<!DOCTYPE html>
    <html>
      <head>
        <title>AIsBreaker Server</title>
      </head>
      <body>

        Links:<br>
        <a href="/api/v1/version" target="_blank">Version</a><br>

        <br><br>

        <br><br>

      </body>
    </html>
  `
}
