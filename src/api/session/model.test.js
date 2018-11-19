import { Session } from '.'

let session

beforeEach(async () => {
  session = await Session.create({ key: 'test', expire: 'test', version: 'test', ivServer: 'test', ivClient: 'test', active: 'test', createdAt: 'test', updatedAt: 'test' })
})

describe('view', () => {
  it('returns simple view', () => {
    const view = session.view()
    expect(typeof view).toBe('object')
    expect(view.id).toBe(session.id)
    expect(view.key).toBe(session.key)
    expect(view.expire).toBe(session.expire)
    expect(view.version).toBe(session.version)
    expect(view.ivServer).toBe(session.ivServer)
    expect(view.ivClient).toBe(session.ivClient)
    expect(view.active).toBe(session.active)
    expect(view.createdAt).toBe(session.createdAt)
    expect(view.updatedAt).toBe(session.updatedAt)
    expect(view.createdAt).toBeTruthy()
    expect(view.updatedAt).toBeTruthy()
  })

  it('returns full view', () => {
    const view = session.view(true)
    expect(typeof view).toBe('object')
    expect(view.id).toBe(session.id)
    expect(view.key).toBe(session.key)
    expect(view.expire).toBe(session.expire)
    expect(view.version).toBe(session.version)
    expect(view.ivServer).toBe(session.ivServer)
    expect(view.ivClient).toBe(session.ivClient)
    expect(view.active).toBe(session.active)
    expect(view.createdAt).toBe(session.createdAt)
    expect(view.updatedAt).toBe(session.updatedAt)
    expect(view.createdAt).toBeTruthy()
    expect(view.updatedAt).toBeTruthy()
  })
})
