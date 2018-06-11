import { success, notFound, error } from '../../services/response/'
import { Member } from '.'
import { sign } from '../../services/jwt'

export const index = ({ querymen: { query, select, cursor } }, res, next) =>
  Member.count(query)
    .then(count => Member.find(query, select, cursor)
      .then(members => ({
        rows: members.map((member) => member.view()),
        count
      }))
    )
    .then(success(res))
    .catch(next)

export const show = ({ params }, res, next) =>
  Member.findById(params.id)
    .then(notFound(res))
    .then((member) => member ? member.view() : null)
    .then(success(res))
    .catch(next)

export const exist = ({ querymen: { query } }, res, next) => 
  {
    if(query['$or'][0].email || query['$or'][0].membername)
        Member.count(query)
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

export const showMe = ({ member }, res) => 
  res.json(member.view(true))

export const create = ({ bodymen: { body } }, res, next) =>
  {
    Member.create(body)
    .then(member => {
      sign(member.id)
        .then((token) => ({ token, member: member.view(true) }))
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
        next(err)
      }
    })
  }

export const update = ({ bodymen: { body }, params, member }, res, next) =>
  Member.findById(params.id === 'me' ? member.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isAdmin = member.role === 'admin'
      const isSelfUpdate = member.id === result.id
      if (!isSelfUpdate && !isAdmin) {
        res.status(401).json({
          valid: false,
          message: 'You can\'t change other member\'s data'
        })
        return null
      }
      return result
    })
    .then((member) => member ? Object.assign(member, body).save() : null)
    .then((member) => member ? member.view(true) : null)
    .then(success(res))
    .catch(error(res))

export const updatePassword = ({ bodymen: { body }, params, member }, res, next) =>
  Member.findById(params.id === 'me' ? member.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isSelfUpdate = member.id === result.id
      if (!isSelfUpdate) {
        res.status(401).json({
          valid: false,
          param: 'password',
          message: 'You can\'t change other member\'s password'
        })
        return null
      }
      return result
    })
    .then((member) => member ? member.set({ password: body.password }).save() : null)
    .then((member) => member ? member.view(true) : null)
    .then(success(res))
    .catch(error(res))

export const destroy = ({ params }, res, next) =>
  Member.findById(params.id)
    .then(notFound(res))
    .then((member) => member ? member.remove() : null)
    .then(success(res, 204))
    .catch(error(res))
