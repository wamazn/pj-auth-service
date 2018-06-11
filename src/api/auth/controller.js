import { sign } from '../../services/jwt'
import { success } from '../../services/response/'

export const login = ({ member }, res, next) =>
  sign(member.id)
    .then((token) => ({ token, member: member.view(true) }))
    .then(success(res, 201))
    .catch(next)

export const logout = ({ member }, res, next ) => {
  res.send({message: 'loged out' })
}