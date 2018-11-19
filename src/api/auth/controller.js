import { sign } from '../../services/jwt'
import { success, error } from '../../services/response/'

export const login = ({ identity }, res, next) =>
  sign(identity.id)
    .then((token) => ({ token, identity: identity.view() }))
    .then(success(res, 201))
    .catch(error(res))

export const logout = ({ identity }, res, next ) => {
  // delete token from redis.
  res.send({message: 'loged out' })
}
