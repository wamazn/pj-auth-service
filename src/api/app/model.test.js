import crypto from 'crypto'
import { App } from '.'

let app

beforeEach(async () => {
  app = await App.create({ name: 'app', email: 'a@a.com', password: '123456' })
})

describe('set email', () => {
  it('sets name automatically', () => {
    app.name = ''
    app.email = 'test@example.com'
    expect(app.name).toBe('test')
  })

  it('sets picture automatically', () => {
    const hash = crypto.createHash('md5').update(app.email).digest('hex')
    expect(app.picture).toBe(`https://gravatar.com/avatar/${hash}?d=identicon`)
  })

  it('changes picture when it is gravatar', () => {
    app.email = 'b@b.com'
    const hash = crypto.createHash('md5').update(app.email).digest('hex')
    expect(app.picture).toBe(`https://gravatar.com/avatar/${hash}?d=identicon`)
  })

  it('does not change picture when it is already set and is not gravatar', () => {
    app.picture = 'not_gravatar.jpg'
    app.email = 'c@c.com'
    expect(app.picture).toBe('not_gravatar.jpg')
  })
})

describe('view', () => {
  it('returns simple view', () => {
    const view = app.view()
    expect(view).toBeDefined()
    expect(view.id).toBe(app.id)
    expect(view.name).toBe(app.name)
    expect(view.picture).toBe(app.picture)
  })

  it('returns full view', () => {
    const view = app.view(true)
    expect(view).toBeDefined()
    expect(view.id).toBe(app.id)
    expect(view.name).toBe(app.name)
    expect(view.email).toBe(app.email)
    expect(view.picture).toBe(app.picture)
    expect(view.createdAt).toEqual(app.createdAt)
  })
})

describe('authenticate', () => {
  it('returns the app when authentication succeed', async () => {
    expect(await app.authenticate('123456')).toBe(app)
  })

  it('returns false when authentication fails', async () => {
    expect(await app.authenticate('blah')).toBe(false)
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

      it('updates app when email is already registered', async () => {
        const updatedUser = await App.createFromService({ ...serviceUser, email: 'a@a.com' })
        // keep
        expect(updatedUser.id).toBe(app.id)
        expect(updatedUser.email).toBe(app.email)
        // update
        expect(updatedUser.name).toBe(serviceUser.name)
        expect(updatedUser.services[service]).toBe(serviceUser.id)
        expect(updatedUser.picture).toBe(serviceUser.picture)
      })

      it('updates app when service id is already registered', async () => {
        await app.set({ services: { [service]: serviceUser.id } }).save()
        const updatedUser = await App.createFromService(serviceUser)
        // keep
        expect(updatedUser.id).toBe(app.id)
        expect(updatedUser.email).toBe(app.email)
        // update
        expect(updatedUser.name).toBe(serviceUser.name)
        expect(updatedUser.services[service]).toBe(serviceUser.id)
        expect(updatedUser.picture).toBe(serviceUser.picture)
      })

      it('creates a new app when neither service id and email was found', async () => {
        const createdUser = await App.createFromService(serviceUser)
        expect(createdUser.id).not.toBe(app.id)
        expect(createdUser.services[service]).toBe(serviceUser.id)
        expect(createdUser.name).toBe(serviceUser.name)
        expect(createdUser.email).toBe(serviceUser.email)
        expect(createdUser.picture).toBe(serviceUser.picture)
      })
    })
  })
})
