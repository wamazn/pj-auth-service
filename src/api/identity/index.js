import { Router } from 'express'
import { middleware as query } from 'querymen'
import { middleware as body } from 'bodymen'
import { password as passwordAuth, master, token } from '../../services/passport'
import { index, 
  showMe, show, 
  exist, preview, 
  create, update, 
  updatePassword, 
  destroy } from './controller'
import { schema } from './model'
export Identity, { schema } from './model'

const router = new Router()
const { email, password, key, membername, thumbnail} = schema.tree

/**
 * @api {get} /identities/me Retrieve current identity
 * @apiName RetrieveCurrentmember
 * @apiGroup Identity
 * @apiPermission identity
 * @apiParam {String} access_token Identity access_token.
 * @apiSuccess {Object} identity Identity's data.
 */
router.get('/me',
  token({ required: true }),
  showMe)


/**
* @api {get} /identities/exist Retrieve current identity
* @apiName RetrieveCurrentmember
* @apiGroup Identity
* @apiPermission identity
* @apiParam {String} access_token Identity access_token.
* @apiSuccess {Object} identity Identity's data.
*/
router.get('/exist',
  /* master(), */
  query({
    enabled: true,
    term: {
      type: String,
      paths: ['membername', 'email']
    }
  }),
  exist)


/**
* @api {get} /identities/preview Retrieve current identity
* @apiName RetrieveCurrentmember
* @apiGroup Identity
* @apiPermission identity
* @apiParam {String} access_token Identity access_token.
* @apiSuccess {Object} identity Identity's data.
*/
router.get('/preview',
  /* master(), */
  query({
    enabled: true,
    term: {
      type: String,
      paths: ['membername', 'email']
    }
  }),
  preview)

/**
 * @api {get} /identities/:id Retrieve identity
 * @apiName Retrievemember
 * @apiGroup Identity
 * @apiPermission public
 * @apiSuccess {Object} identity Identity's data.
 * @apiError 404 Identity not found.
 */
router.get('/:id',
  show)

/**
 * @api {post} /identities Create identity
 * @apiName Createmember
 * @apiGroup Identity
 * @apiPermission master
 * @apiParam {String} access_token Master access_token.
 * @apiParam {String} email Identity's email.
 * @apiParam {String{6..}} password Identity's password.
 * @apiParam {String} [name] Identity's name.
 * @apiParam {String} [picture] Identity's picture.
 * @apiParam {String=identity,admin} [role=identity] Identity's role.
 * @apiSuccess (Sucess 201) {Object} identity Identity's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Master access only.
 * @apiError 409 Email already registered.
 */
router.post('/',
  master(),
  body({ email, password, membername, thumbnail, key }),
  create)

/**
 * @api {put} /identities/:id Update identity
 * @apiName Updatemember
 * @apiGroup Identity
 * @apiPermission identity
 * @apiParam {String} access_token Identity access_token.
 * @apiParam {String} [name] Identity's name.
 * @apiParam {String} [picture] Identity's picture.
 * @apiSuccess {Object} identity Identity's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Current identity or admin access only.
 * @apiError 404 Identity not found.
 */
router.put('/:id',
  token({ required: true }),
  body({ membername, email, thumbnail, key }),
  update)

/**
 * @api {put} /identities/:id/password Update password
 * @apiName UpdatePassword
 * @apiGroup Identity
 * @apiHeader {String} Authorization Basic authorization with email and password.
 * @apiParam {String{6..}} password Identity's new password.
 * @apiSuccess (Success 201) {Object} identity Identity's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Current identity access only.
 * @apiError 404 Identity not found.
 */
router.put('/:id/password',
  passwordAuth(),
  body({ password }),
  updatePassword)

/**
 * @api {delete} /identities/:id Delete identity
 * @apiName Deletemember
 * @apiGroup Identity
 * @apiPermission admin
 * @apiParam {String} access_token Identity access_token.
 * @apiSuccess (Success 204) 204 No Content.
 * @apiError 401 Admin access only.
 * @apiError 404 Identity not found.
 */
router.delete('/:id',
  token({ required: true }),
  destroy)

export default router
