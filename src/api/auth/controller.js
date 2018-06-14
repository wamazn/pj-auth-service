import { sign } from '../../services/jwt'
import { success, error } from '../../services/response/'

export const login = ({ member }, res, next) =>
  sign(member.id)
    .then((token) => ({ token, member: member.view(true) }))
    .then(success(res, 201))
    .catch(error(res))

export const logout = ({ member }, res, next ) => {
  // delete token from redis.
  res.send({message: 'loged out' })
}
