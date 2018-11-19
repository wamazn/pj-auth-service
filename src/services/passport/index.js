import passport from 'passport'
import { Schema } from 'bodymen'
import { BasicStrategy } from 'passport-http'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { jwtSecret, masterKey } from '../../config'
import * as facebookService from '../facebook'
import * as googleService from '../google'
import Identity, { schema } from '../../api/identity/model'

export const password = () => (req, res, next) =>
  passport.authenticate('password', { session: false }, (err, identity, info) => {
    if (err && err.param) {
      return res.status(400).json(err)
    } else if (err || !identity) {
      return res.status(401).end()
    }
    req.logIn(identity, { session: false }, (err) => {
      if (err) return res.status(401).end()
      req.identity = req.user
      delete req.user
      next()
    })
  })(req, res, next)

export const facebook = () =>
  passport.authenticate('facebook', { session: false })

export const google = () =>
  passport.authenticate('google', { session: false })

export const master = () =>
  passport.authenticate('master', { session: false })

export const token = ({ required, roles = Identity.roles } = {}) => (req, res, next) =>
  passport.authenticate('token', { session: false }, (err, identity, info) => {
    if (err || (required && !identity) || (required && !~roles.indexOf(identity.role))) {
      return res.status(401).end()
    }
    req.logIn(identity, { session: false }, (err) => {
      if (err) return res.status(401).end()
      req.identity = req.user
      delete req.user
      next()
    })
  })(req, res, next)

passport.use('password', new BasicStrategy((membername, password, done) => {
  const userSchema = new Schema({ membername: schema.tree.membername, password: schema.tree.password })

  userSchema.validate({ membername, password }, (err) => {
    if (err) done(err)
  })

  Identity.findOne({ membername }).then((identity) => {
    if (!identity) {
      done(true)
      return null
    }
    return identity.authenticate(password, identity.password).then((identity) => {
      done(null, identity)
      return null
    }).catch(done)
  })
}))

passport.use('facebook', new BearerStrategy((token, done) => {
  facebookService.getUser(token).then((identity) => {
    return Identity.createFromService(identity) // TODO create profile here too
  }).then((identity) => {
    done(null, identity)
    return null
  }).catch(done)
}))

passport.use('google', new BearerStrategy((token, done) => {
  googleService.getUser(token).then((identity) => {
    return Identity.createFromService(identity) // TODO create profile here too
  }).then((identity) => {
    done(null, identity)
    return null
  }).catch(done)
}))

passport.use('master', new BearerStrategy((token, done) => {
  if (token === masterKey) {
    done(null, {})
  } else {
    done(null, false)
  }
}))

passport.use('token', new JwtStrategy({
  secretOrKey: jwtSecret,
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromUrlQueryParameter('access_token'),
    ExtractJwt.fromBodyField('access_token'),
    ExtractJwt.fromAuthHeaderAsBearerToken()
    //ExtractJwt.fromAuthHeaderWithScheme('bearer')
    //ExtractJwt.fromHeader('customHeader')
  ])
}, ({ id }, done) => {
  Identity.findById(id).then((identity) => {
    done(null, identity)
    return null
  }).catch(done)
}))
