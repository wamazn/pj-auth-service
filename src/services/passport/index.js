import passport from 'passport'
import { Schema } from 'bodymen'
import { BasicStrategy } from 'passport-http'
import { Strategy as BearerStrategy } from 'passport-http-bearer'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import { jwtSecret, masterKey } from '../../config'
import * as facebookService from '../facebook'
import * as googleService from '../google'
import Member, { schema } from '../../api/member/model'

export const password = () => (req, res, next) =>
  passport.authenticate('password', { session: false }, (err, member, info) => {
    if (err && err.param) {
      return res.status(400).json(err)
    } else if (err || !member) {
      return res.status(401).end()
    }
    req.logIn(member, { session: false }, (err) => {
      if (err) return res.status(401).end()
      req.member = req.user
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

export const token = ({ required, roles = Member.roles } = {}) => (req, res, next) =>
  passport.authenticate('token', { session: false }, (err, member, info) => {
    if (err || (required && !member) || (required && !~roles.indexOf(member.role))) {
      return res.status(401).end()
    }
    req.logIn(member, { session: false }, (err) => {
      if (err) return res.status(401).end()
      req.member = req.user
      delete req.user
      next()
    })
  })(req, res, next)

passport.use('password', new BasicStrategy((membername, password, done) => {
  const userSchema = new Schema({ membername: schema.tree.membername, password: schema.tree.password })

  userSchema.validate({ membername, password }, (err) => {
    if (err) done(err)
  })

  Member.findOne({ membername }).then((member) => {
    if (!member) {
      done(true)
      return null
    }
    return member.authenticate(password, member.password).then((member) => {
      done(null, member)
      return null
    }).catch(done)
  })
}))

passport.use('facebook', new BearerStrategy((token, done) => {
  facebookService.getUser(token).then((member) => {
    return Member.createFromService(member)
  }).then((member) => {
    done(null, member)
    return null
  }).catch(done)
}))

passport.use('google', new BearerStrategy((token, done) => {
  googleService.getUser(token).then((member) => {
    return Member.createFromService(member)
  }).then((member) => {
    done(null, member)
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
  Member.findById(id).then((member) => {
    done(null, member)
    return null
  }).catch(done)
}))
