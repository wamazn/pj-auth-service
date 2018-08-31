import { Router } from 'express'
import { middleware as query } from 'querymen'
import { middleware as body } from 'bodymen'
import { token } from '../../services/passport'
import { create, seeding, extendKeys, show, update, destroy } from './controller'
import { schema } from './model'
export Session, { schema } from './model'

const router = new Router()
const { key, expire, version, ivServer, ivClient, active, createdAt, updatedAt } = schema.tree

/**
 * @api {post} /session Create session
 * @apiName CreateSession
 * @apiGroup Session
 * @apiParam key Session's key.
 * @apiParam expire Session's expire.
 * @apiParam version Session's version.
 * @apiParam ivServer Session's ivServer.
 * @apiParam ivClient Session's ivClient.
 * @apiParam active Session's active.
 * @apiParam createdAt Session's createdAt.
 * @apiParam updatedAt Session's updatedAt.
 * @apiSuccess {Object} session Session's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 404 Session not found.
 */
router.post('/session',
  seeding)

/**
 * @api {get} /session Retrieve sessions
 * @apiName RetrieveSessions
 * @apiGroup Session
 * @apiPermission admin
 * @apiParam {String} access_token admin access token.
 * @apiUse listParams
 * @apiSuccess {Object[]} sessions List of sessions.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 admin access only.
 */
router.all('/',
  index)

/**
 * @api {put} /session/:id Update session
 * @apiName UpdateSession
 * @apiGroup Session
 * @apiPermission user
 * @apiParam {String} access_token user access token.
 * @apiParam key Session's key.
 * @apiParam expire Session's expire.
 * @apiParam version Session's version.
 * @apiParam ivServer Session's ivServer.
 * @apiParam ivClient Session's ivClient.
 * @apiParam active Session's active.
 * @apiParam createdAt Session's createdAt.
 * @apiParam updatedAt Session's updatedAt.
 * @apiSuccess {Object} session Session's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 404 Session not found.
 * @apiError 401 user access only.
 */
router.put('/session/:id',
  seeding)

/**
 * @api {delete} /session/:id Delete session
 * @apiName DeleteSession
 * @apiGroup Session
 * @apiPermission user
 * @apiParam {String} access_token user access token.
 * @apiSuccess (Success 204) 204 No Content.
 * @apiError 404 Session not found.
 * @apiError 401 user access only.
 */
router.delete('/session/:id',
  token({ required: true }),
  destroy)

router.post('/session/keys',
extendKeys)

router.put('/session/keys',
extendKeys)

export default router
