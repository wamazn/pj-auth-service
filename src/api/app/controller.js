import { success, notFound, error } from '../../services/response/'
import { App } from '.'
import { sign } from '../../services/jwt'

export const index = ({ querymen: { query, select, cursor } }, res, next) =>
  App.count(query)
    .then(count => App.find(query, select, cursor)
      .then(apps => ({
        rows: apps.map((app) => app.view()),
        count
      }))
    )
    .then(success(res))
    .catch(error(res))

export const show = ({ params }, res, next) =>
  App.findById(params.id)
    .then(notFound(res))
    .then((app) => app ? app.view() : null)
    .then(success(res))
    .catch(next)

export const exist = ({ querymen: { query } }, res, next) =>
  {
    if(query['$or'][0].email || query['$or'][0].membername)
        App.count(query)
          .then( count => ({ memberExist: count > 0 }))
          .then(success(res))
          .catch(error(res))
    else
        return res.status(400).json({
          valid: false,
          param: 'email, membername',
          message: 'email or membername is missing'
        })
  }

export const showMe = ({ app }, res) =>
  res.json(app.view(true))

export const create = ({ bodymen: { body } }, res, next) =>
  {
    App.create(body)
    .then(app => {
      sign(app.id)
        .then((token) => ({ token, app: app.view(true) }))
        .then(success(res, 201))
    })
    .catch((err) => {
      /* istanbul ignore else */
      if (err.name === 'MongoError' && err.code === 11000) {
        res.status(409).json({
          valid: false,
          param: 'email',
          message: 'email already registered'
        })
      } else {
        error(res)(err)
      }
    })
  }

export const update = ({ bodymen: { body }, params, app }, res, next) =>
  App.findById(params.id === 'me' ? app.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isAdmin = app.role === 'admin'
      const isSelfUpdate = app.id === result.id
      if (!isSelfUpdate && !isAdmin) {
        res.status(401).json({
          valid: false,
          message: 'You can\'t change other app\'s data'
        })
        return null
      }
      return result
    })
    .then((app) => app ? Object.assign(app, body).save() : null)
    .then((app) => app ? app.view(true) : null)
    .then(success(res))
    .catch(error(res))

export const updatePassword = ({ bodymen: { body }, params, app }, res, next) =>
  App.findById(params.id === 'me' ? app.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isSelfUpdate = app.id === result.id
      if (!isSelfUpdate) {
        res.status(401).json({
          valid: false,
          param: 'password',
          message: 'You can\'t change other app\'s password'
        })
        return null
      }
      return result
    })
    .then((app) => app ? app.set({ password: body.password }).save() : null)
    .then((app) => app ? app.view(true) : null)
    .then(success(res))
    .catch(error(res))

export const destroy = ({ params }, res, next) =>
  App.findById(params.id)
    .then(notFound(res))
    .then((app) => app ? app.delete() : null)
    .then(success(res, 204))
    .catch(error(res))
