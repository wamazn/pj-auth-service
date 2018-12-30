/* eslint-disable no-unused-vars */
import path from 'path'
import fs from 'fs'

const keyData = fs.readFileSync(path.join(path.normalize(`${__dirname} + '/..`), 'pajuani.auth.key'));
/* istanbul ignore next */
const requireProcessEnv = (name) => {
  if (!process.env[name]) {
    throw new Error('You must set the ' + name + ' environment variable')
  }
  return process.env[name]
}

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv-safe')
  dotenv.load({
    path: path.join(__dirname, '../.env'),
    sample: path.join(__dirname, '../.env.example')
  })
}
const config = {
  all: {
    env: process.env.NODE_ENV || 'production',
    root: path.join(__dirname, '..'),
    port: process.env.PORT || 9000,
    ip: process.env.IP || '0.0.0.0',
    apiRoot: process.env.API_ROOT || '/auth/api',
    defaultEmail: 'no-reply@pajuani-oauth.com',
    sendgridKey: requireProcessEnv('SENDGRID_KEY'),
    masterKey: requireProcessEnv('MASTER_KEY'),
    jwtSecret: requireProcessEnv('JWT_SECRET'),
    jwtIss: 'pajuani.auth',
    mongo: {
      options: {
        db: {
          safe: true
        }
      }
    },
      // Secret for session, you will want to change this and make it an environment variable
    secrets: {
      session: 'server-secret',
      rsaPvK: keyData.toString()
    },
    headers: {
      tag: 'x-pajuani-tg',
      seedData: 'x-pajuani-sd',
      token: 'x-pajuani-tk',
      next: 'x-pajuani-nx'
    }
  },
  test: {
    mongo: {
      uri: 'mongodb://localhost/pajuani-oauth-test',
      options: {
        debug: false
      }
    }
  },
  development: {
    mongo: {
      /* uri: 'mongodb://localhost:27017/pajuani-oauth', */
      uri: 'mongodb://oauthservice:OauthPass139@ds251210.mlab.com:51210/pajuani',
      options: {
        debug: true
      }
    }
  },
  production: {
    ip: process.env.IP || '0.0.0.0',
    port: process.env.PORT || 9000,
    mongo: {
      options: {
        db: {
          safe: true
        }
      },
      uri: process.env.MONGODB_URI || 'mongodb://oauthservice:OauthPass139@ds251210.mlab.com:51210/pajuani',
    }
  }
}

module.exports = Object.assign(config.all, config[config.all.env])
export default module.exports
