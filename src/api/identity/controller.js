import { success, notFound, error } from '../../services/response/'
import { Identity } from '.'
import { sign } from '../../services/jwt'

export const index = ({ querymen: { query, select, cursor } }, res, next) => {
  query = { ...query, enabled: true }
  return Identity.count(query)
    .then(count => Identity.find(query, select, cursor)
      .then(identities => ({
        rows: identities.map((identity) => identity.view()),
        count
      }))
    )
    .then(success(res))
    .catch(error(res))
}

export const show = ({ params }, res, next) =>
  Identity.findById(params.id)
    .then(notFound(res))
    .then((identity) => identity && identity.enabled ? identity.view() : null)
    .then(success(res))
    .catch(next)

export const exist = ({ querymen: { query } }, res, next) => {
  delete query.enabled
  console.log('exist???', query)
  if (query['$or'] && (query['$or'][0].email || query['$or'][0].membername))
    return Identity.countDocuments(query)
      .then(count => ({ memberExist: count > 0 }))
      .then(success(res))
      .catch(error(res))
  else
    return res.status(400).json({
      valid: false,
      param: 'email, membername',
      message: 'email or membername is missing'
    })
}

export const preview = ({ querymen: { query } }, res, next) => {
  const hasSerachTerm = query['$or'] && (query['$or'][0].email || query['$or'][0].membername) 
  console.log(query)
  if (query.enabled && hasSerachTerm)
    return Identity.findOne(query)
      .then(notFound(res))
      .then(identity => identity && identity.view())
      .then(success(res))
      .catch(/* error(res) */err => console.log(err))
  else if(!query.enabled)
    return res.status(401).json({
      valid: false,
      param: 'enabled',
      message: 'Need special authorization'
    })
  else if(!hasSerachTerm)
    return res.status(400).json({
      valid: false,
      param: 'q',
      message: 'query term is missing'
    })
}

export const showMe = ({ identity }, res) =>
  res.json(identity.view(true))

export const create = ({ bodymen: { body } }, res, next) => {
  console.log(body)
  /* res.status(200).json(body) */
  return Identity.create(body)
    .then(identity => {
      console.log(identity)
      sign(identity.id)
        .then((token) => ({ token, identity: identity.view(true) }))
        .then(success(res, 201))
    })
    .catch((err) => {
      console.log(err)
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

export const updateAvatar = (req, res, next) => { 
  let data = new Buffer('')
  req.on('data', (chunk) => {
    data = Buffer.concat([data, chunk])
    console.log('request data', chunk)
  })
  req.on('end', () => {
    console.log('ended')
    req.identity.save()
    return res.send({ good: true})
  })
}

export const update = ({ bodymen: { body }, params, identity }, res, next) =>
  Identity.findById(params.id === 'me' ? identity.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isAdmin = identity.role === 'admin'
      const isSelfUpdate = identity.id === result.id
      if (!isSelfUpdate && !isAdmin) {
        res.status(401).json({
          valid: false,
          message: 'You can\'t change other identity\'s data'
        })
        return null
      }
      return result
    })
    .then((identity) => identity ? Object.assign(identity, body).save() : null)
    .then((identity) => identity ? identity.view(true) : null)
    .then(success(res))
    .catch(error(res))

export const updatePassword = ({ bodymen: { body }, params, identity }, res, next) =>
  Identity.findById(params.id === 'me' ? identity.id : params.id)
    .then(notFound(res))
    .then((result) => {
      if (!result) return null
      const isSelfUpdate = identity.id === result.id
      if (!isSelfUpdate) {
        res.status(401).json({
          valid: false,
          param: 'password',
          message: 'You can\'t change other\'s password'
        })
        return null
      }
      return result
    })
    .then((identity) => identity ? identity.set({ password: body.password }).save() : null)
    .then((identity) => identity ? identity.view() : null)
    .then(success(res))
    .catch(error(res))

export const destroy = ({ params }, res, next) =>
  Identity.findById(params.id)
    .then(notFound(res))
    .then((identity) => identity ? identity.delete() : null)
    .then(success(res, 204))
    .catch(error(res))
