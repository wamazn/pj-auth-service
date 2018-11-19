import crypto from 'crypto'
import { Identity } from '.'

let identity

beforeEach(async () => {
  identity = await Identity.create({ name: 'identity', email: 'a@a.com', password: '123456' })
})

describe('set email', () => {
  it('sets name automatically', () => {
    identity.name = ''
    identity.email = 'test@example.com'
    expect(identity.name).toBe('test')
  })

  it('sets picture automatically', () => {
    const hash = crypto.createHash('md5').update(identity.email).digest('hex')
    expect(identity.picture).toBe(`https://gravatar.com/avatar/${hash}?d=identicon`)
  })

  it('changes picture when it is gravatar', () => {
    identity.email = 'b@b.com'
    const hash = crypto.createHash('md5').update(identity.email).digest('hex')
    expect(identity.picture).toBe(`https://gravatar.com/avatar/${hash}?d=identicon`)
  })

  it('does not change picture when it is already set and is not gravatar', () => {
    identity.picture = 'not_gravatar.jpg'
    identity.email = 'c@c.com'
    expect(identity.picture).toBe('not_gravatar.jpg')
  })
})

describe('view', () => {
  it('returns simple view', () => {
    const view = identity.view()
    expect(view).toBeDefined()
    expect(view.id).toBe(identity.id)
    expect(view.name).toBe(identity.name)
    expect(view.picture).toBe(identity.picture)
  })

  it('returns full view', () => {
    const view = identity.view(true)
    expect(view).toBeDefined()
    expect(view.id).toBe(identity.id)
    expect(view.name).toBe(identity.name)
    expect(view.email).toBe(identity.email)
    expect(view.picture).toBe(identity.picture)
    expect(view.createdAt).toEqual(identity.createdAt)
  })
})

describe('authenticate', () => {
  it('returns the identity when authentication succeed', async () => {
    expect(await identity.authenticate('123456')).toBe(identity)
  })

  it('returns false when authentication fails', async () => {
    expect(await identity.authenticate('blah')).toBe(false)
  })
})

describe('createFromService', () => {
  let serviceUser

  beforeEach(() => {
    serviceUser = {
      id: '123',
      name: 'Test Name',
      email: 'test@test.com',
      picture: 'test.jpg'
    }
  })

  ;['facebook', 'google'].forEach((service) => {
    describe(service, () => {
      beforeEach(() => {
        serviceUser.service = service
      })

      it('updates identity when email is already registered', async () => {
        const updatedUser = await Identity.createFromService({ ...serviceUser, email: 'a@a.com' })
        // keep
        expect(updatedUser.id).toBe(identity.id)
        expect(updatedUser.email).toBe(identity.email)
        // update
        expect(updatedUser.name).toBe(serviceUser.name)
        expect(updatedUser.services[service]).toBe(serviceUser.id)
        expect(updatedUser.picture).toBe(serviceUser.picture)
      })

      it('updates identity when service id is already registered', async () => {
        await identity.set({ services: { [service]: serviceUser.id } }).save()
        const updatedUser = await Identity.createFromService(serviceUser)
        // keep
        expect(updatedUser.id).toBe(identity.id)
        expect(updatedUser.email).toBe(identity.email)
        // update
        expect(updatedUser.name).toBe(serviceUser.name)
        expect(updatedUser.services[service]).toBe(serviceUser.id)
        expect(updatedUser.picture).toBe(serviceUser.picture)
      })

      it('creates a new identity when neither service id and email was found', async () => {
        const createdUser = await Identity.createFromService(serviceUser)
        expect(createdUser.id).not.toBe(identity.id)
        expect(createdUser.services[service]).toBe(serviceUser.id)
        expect(createdUser.name).toBe(serviceUser.name)
        expect(createdUser.email).toBe(serviceUser.email)
        expect(createdUser.picture).toBe(serviceUser.picture)
      })
    })
  })
})
