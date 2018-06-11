import { PasswordReset } from '.'
import { Member } from '../member'

let passwordReset

beforeEach(async () => {
  const member = await Member.create({ email: 'a@a.com', password: '123456' })
  passwordReset = await PasswordReset.create({ member })
})

describe('view', () => {
  it('returns simple view', () => {
    const view = passwordReset.view()
    expect(view.token).toBe(passwordReset.token)
    expect(typeof view.member).toBe('object')
  })

  it('returns full view', () => {
    const view = passwordReset.view(true)
    expect(view.token).toBe(passwordReset.token)
    expect(view.member).toEqual(passwordReset.member.view(true))
  })
})
