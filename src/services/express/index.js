import express from 'express'
import forceSSL from 'express-force-ssl'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import filter  from 'content-filter'
import { errorHandler as queryErrorHandler } from 'querymen'
import { errorHandler as bodyErrorHandler } from 'bodymen'
import { env } from '../../config'

export default (apiRoot, routes) => {
  const app = express()

  /* istanbul ignore next */
  if (env === 'production') {
    app.set('forceSSLOptions', {
      enable301Redirects: false,
      trustXFPHeader: true
    })
    app.use(forceSSL)
  }

  /* istanbul ignore next */
  if (env === 'production' || env === 'development') {
    app.use(cors({
      exposedHeaders:[ 'x-pajuani-nx', 'x-pajuani-tk', 'x-pajuani-tg', 'x-pajuani-sd'],
      allowedHeaders: ['authorization', 'content-type','x-pajuani-nx', 'x-pajuani-tk', 'x-pajuani-tg', 'x-pajuani-sd']
    }))
    app.use(compression())
    app.use(morgan('dev'))
  }

  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  app.use(filter( { dispatchToErrorHandler: true, appendFound: true}))
  console.log('base route', apiRoot)
  app.use(apiRoot, routes)
  app.use(queryErrorHandler())
  app.use(bodyErrorHandler())

  return app
}
