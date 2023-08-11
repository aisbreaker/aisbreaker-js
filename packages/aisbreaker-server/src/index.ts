import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'

import { apiPing, apiVersion } from './rest-api/controllers/apiGreetings.js'
import { apiProcess } from './rest-api/controllers/apiProcess.js'
import { oauthToken } from './rest-api/controllers/oauthToken.js'


//
// basic settings
//
const app = express()
const port = 3000
const version = process.env.npm_package_version || 'unknown version'

const basePathApiV1 = "/api/v1"
const basePathApiV1alpha1 = "/api/v1alpha1"
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
  
    /* Currently, this kind of JWT authentication is NOT USED HERE:
      import jwt from 'express-jwt'
      import jwksRsa from 'jwks-rsa'

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

    // deliver some (almost) static content (root webapp)
    app.get('/', cors(), (req, res) => {
        getInfoString().then(resultStr => {
          res.send(""+resultStr);
      })
    })
    /*
    app.get('/info', cors(), (req, res) => {
        getInfoString().then(resultStr => {
            res.send(""+resultStr);
        })
    })
    */


    /* Currently, this kind of authentication is NOT USED HERE:
      // the home page and more - with required authentication
      app.use(basePath+"/", [ensureAuthenticated, express.static(baseDir+"/webapps/root")]);
      app.get(basePath+"/hello", ensureAuthenticated, function (req, res) {
        console.log("req.sessionID=", req.sessionID);
        res.send("Hello Chris! ("+addFunc(1, 2)+", "+(new Date())+")");
      });
    */

    // API (all versions)
    const allApiBasesPaths = [ basePathApiV1, basePathApiV1alpha1 ]
    for (const apiBasePath of allApiBasesPaths) {
      app.get(apiBasePath + "/ping", cors(), (req, res) => {
          apiPing(req, res)
      })
      app.get(apiBasePath + '/version', cors(), (req, res) => {
          apiVersion(req, res, version)
      })
      app.post(apiBasePath + '/oauth/token', cors(), (req, res) => {
        oauthToken(req, res)
      })
      app.post(apiBasePath + '/process', cors(), (req, res) => {
        apiProcess(req, res)
      })
    }
  
    // TODO: Add alternative APIs 
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
        <a href="${basePathApiV1}/version" target="_blank">Version</a><br>
        <a href="https://aisbreaker.org/" target="_blank">AIsBreaker.org Website</a><br>

        <br><br>

        <br><br>

      </body>
    </html>
  `
}
