import { success, notFound } from '../../services/response/'
import { sendMail } from '../../services/sendgrid'
import { PasswordReset } from '.'
import { Identity } from '../identity'

export const create = ({ bodymen: { body: { email, link } } }, res, next) =>
  Identity.findOne({ email })
    .then(notFound(res))
    .then((identity) => identity ? PasswordReset.create({ identity }) : null)
    .then((reset) => {
      if (!reset) return null
      const { identity, token } = reset
      link = `${link.replace(/\/$/, '')}/${token}`
      const content = `
        Hey, ${identity.name}.<br><br>
        You requested a new password for your Pajuani Oauth account.<br>
        Please use the following link to set a new password. It will expire in 1 hour.<br><br>
        <a href="${link}">${link}</a><br><br>
        If you didn't make this request then you can safely ignore this email. :)<br><br>
        &mdash; Pajuani Oauth Team
      `
      return sendMail({ toEmail: email, subject: 'Pajuani Oauth - Password Reset', content })
    })
    .then((response) => response ? res.status(response.statusCode).end() : null)
    .catch(next)

export const show = ({ params: { token } }, res, next) =>
  PasswordReset.findOne({ token })
    .populate('identity')
    .then(notFound(res))
    .then((reset) => reset ? reset.view(true) : null)
    .then(success(res))
    .catch(next)

export const update = ({ params: { token }, bodymen: { body: { password } } }, res, next) => {
  return PasswordReset.findOne({ token })
    .populate('identity')
    .then(notFound(res))
    .then((reset) => {
      if (!reset) return null
      const { identity } = reset
      return identity.set({ password }).save()
        .then(() => PasswordReset.remove({ identity }))
        .then(() => identity.view(true))
    })
    .then(success(res))
    .catch(next)
}
