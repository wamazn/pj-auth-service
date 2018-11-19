import { PasswordReset } from '.'
import { Identity } from '../identity'

let passwordReset

beforeEach(async () => {
  const identity = await Identity.create({ email: 'a@a.com', password: '123456' })
  passwordReset = await PasswordReset.create({ identity })
})

describe('view', () => {
  it('returns simple view', () => {
    const view = passwordReset.view()
    expect(view.token).toBe(passwordReset.token)
    expect(typeof view.identity).toBe('object')
  })

  it('returns full view', () => {
    const view = passwordReset.view(true)
    expect(view.token).toBe(passwordReset.token)
    expect(view.identity).toEqual(passwordReset.identity.view(true))
  })
})
