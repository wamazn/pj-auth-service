import crypto from 'crypto'
import { Member } from '.'

let member

beforeEach(async () => {
  member = await Member.create({ name: 'member', email: 'a@a.com', password: '123456' })
})

describe('set email', () => {
  it('sets name automatically', () => {
    member.name = ''
    member.email = 'test@example.com'
    expect(member.name).toBe('test')
  })

  it('sets picture automatically', () => {
    const hash = crypto.createHash('md5').update(member.email).digest('hex')
    expect(member.picture).toBe(`https://gravatar.com/avatar/${hash}?d=identicon`)
  })

  it('changes picture when it is gravatar', () => {
    member.email = 'b@b.com'
    const hash = crypto.createHash('md5').update(member.email).digest('hex')
    expect(member.picture).toBe(`https://gravatar.com/avatar/${hash}?d=identicon`)
  })

  it('does not change picture when it is already set and is not gravatar', () => {
    member.picture = 'not_gravatar.jpg'
    member.email = 'c@c.com'
    expect(member.picture).toBe('not_gravatar.jpg')
  })
})

describe('view', () => {
  it('returns simple view', () => {
    const view = member.view()
    expect(view).toBeDefined()
    expect(view.id).toBe(member.id)
    expect(view.name).toBe(member.name)
    expect(view.picture).toBe(member.picture)
  })

  it('returns full view', () => {
    const view = member.view(true)
    expect(view).toBeDefined()
    expect(view.id).toBe(member.id)
    expect(view.name).toBe(member.name)
    expect(view.email).toBe(member.email)
    expect(view.picture).toBe(member.picture)
    expect(view.createdAt).toEqual(member.createdAt)
  })
})

describe('authenticate', () => {
  it('returns the member when authentication succeed', async () => {
    expect(await member.authenticate('123456')).toBe(member)
  })

  it('returns false when authentication fails', async () => {
    expect(await member.authenticate('blah')).toBe(false)
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

      it('updates member when email is already registered', async () => {
        const updatedUser = await Member.createFromService({ ...serviceUser, email: 'a@a.com' })
        // keep
        expect(updatedUser.id).toBe(member.id)
        expect(updatedUser.email).toBe(member.email)
        // update
        expect(updatedUser.name).toBe(serviceUser.name)
        expect(updatedUser.services[service]).toBe(serviceUser.id)
        expect(updatedUser.picture).toBe(serviceUser.picture)
      })

      it('updates member when service id is already registered', async () => {
        await member.set({ services: { [service]: serviceUser.id } }).save()
        const updatedUser = await Member.createFromService(serviceUser)
        // keep
        expect(updatedUser.id).toBe(member.id)
        expect(updatedUser.email).toBe(member.email)
        // update
        expect(updatedUser.name).toBe(serviceUser.name)
        expect(updatedUser.services[service]).toBe(serviceUser.id)
        expect(updatedUser.picture).toBe(serviceUser.picture)
      })

      it('creates a new member when neither service id and email was found', async () => {
        const createdUser = await Member.createFromService(serviceUser)
        expect(createdUser.id).not.toBe(member.id)
        expect(createdUser.services[service]).toBe(serviceUser.id)
        expect(createdUser.name).toBe(serviceUser.name)
        expect(createdUser.email).toBe(serviceUser.email)
        expect(createdUser.picture).toBe(serviceUser.picture)
      })
    })
  })
})
