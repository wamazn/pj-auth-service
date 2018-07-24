import request from 'supertest'
import { apiRoot } from '../../config'
import { signSync } from '../../services/jwt'
import express from '../../services/express'
import { User } from '../user'
import routes, { Session } from '.'

const app = () => express(apiRoot, routes)

let userSession, adminSession, session

beforeEach(async () => {
  const user = await User.create({ email: 'a@a.com', password: '123456' })
  const admin = await User.create({ email: 'c@c.com', password: '123456', role: 'admin' })
  userSession = signSync(user.id)
  adminSession = signSync(admin.id)
  session = await Session.create({})
})

test('POST /session 201', async () => {
  const { status, body } = await request(app())
    .post(`${apiRoot}`)
    .send({ key: 'test', expire: 'test', version: 'test', ivServer: 'test', ivClient: 'test', active: 'test', createdAt: 'test', updatedAt: 'test' })
  expect(status).toBe(201)
  expect(typeof body).toEqual('object')
  expect(body.key).toEqual('test')
  expect(body.expire).toEqual('test')
  expect(body.version).toEqual('test')
  expect(body.ivServer).toEqual('test')
  expect(body.ivClient).toEqual('test')
  expect(body.active).toEqual('test')
  expect(body.createdAt).toEqual('test')
  expect(body.updatedAt).toEqual('test')
})

test('GET /session 200 (admin)', async () => {
  const { status, body } = await request(app())
    .get(`${apiRoot}`)
    .query({ access_token: adminSession })
  expect(status).toBe(200)
  expect(Array.isArray(body)).toBe(true)
})

test('GET /session 401 (user)', async () => {
  const { status } = await request(app())
    .get(`${apiRoot}`)
    .query({ access_token: userSession })
  expect(status).toBe(401)
})

test('GET /session 401', async () => {
  const { status } = await request(app())
    .get(`${apiRoot}`)
  expect(status).toBe(401)
})

test('GET /session/:id 200 (user)', async () => {
  const { status, body } = await request(app())
    .get(`${apiRoot}/${session.id}`)
    .query({ access_token: userSession })
  expect(status).toBe(200)
  expect(typeof body).toEqual('object')
  expect(body.id).toEqual(session.id)
})

test('GET /session/:id 401', async () => {
  const { status } = await request(app())
    .get(`${apiRoot}/${session.id}`)
  expect(status).toBe(401)
})

test('GET /session/:id 404 (user)', async () => {
  const { status } = await request(app())
    .get(apiRoot + '/123456789098765432123456')
    .query({ access_token: userSession })
  expect(status).toBe(404)
})

test('PUT /session/:id 200 (user)', async () => {
  const { status, body } = await request(app())
    .put(`${apiRoot}/${session.id}`)
    .send({ access_token: userSession, key: 'test', expire: 'test', version: 'test', ivServer: 'test', ivClient: 'test', active: 'test', createdAt: 'test', updatedAt: 'test' })
  expect(status).toBe(200)
  expect(typeof body).toEqual('object')
  expect(body.id).toEqual(session.id)
  expect(body.key).toEqual('test')
  expect(body.expire).toEqual('test')
  expect(body.version).toEqual('test')
  expect(body.ivServer).toEqual('test')
  expect(body.ivClient).toEqual('test')
  expect(body.active).toEqual('test')
  expect(body.createdAt).toEqual('test')
  expect(body.updatedAt).toEqual('test')
})

test('PUT /session/:id 401', async () => {
  const { status } = await request(app())
    .put(`${apiRoot}/${session.id}`)
  expect(status).toBe(401)
})

test('PUT /session/:id 404 (user)', async () => {
  const { status } = await request(app())
    .put(apiRoot + '/123456789098765432123456')
    .send({ access_token: userSession, key: 'test', expire: 'test', version: 'test', ivServer: 'test', ivClient: 'test', active: 'test', createdAt: 'test', updatedAt: 'test' })
  expect(status).toBe(404)
})

test('DELETE /session/:id 204 (user)', async () => {
  const { status } = await request(app())
    .delete(`${apiRoot}/${session.id}`)
    .query({ access_token: userSession })
  expect(status).toBe(204)
})

test('DELETE /session/:id 401', async () => {
  const { status } = await request(app())
    .delete(`${apiRoot}/${session.id}`)
  expect(status).toBe(401)
})

test('DELETE /session/:id 404 (user)', async () => {
  const { status } = await request(app())
    .delete(apiRoot + '/123456789098765432123456')
    .query({ access_token: userSession })
  expect(status).toBe(404)
})
