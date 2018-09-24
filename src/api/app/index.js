import { Router } from 'express'
import { middleware as query } from 'querymen'
import { middleware as body } from 'bodymen'
import { password as passwordAuth, master, token } from '../../services/passport'
import { index, showMe, show, exist, create, update, updatePassword, destroy } from './controller'
import { schema } from './model'
export App, { schema } from './model'

const router = new Router()
const { email, password, membername, dateOfBirth, picture, role } = schema.tree

/**
 * @api {get} /apps Retrieve apps
 * @apiName Retrievemembers
 * @apiGroup App
 * @apiPermission admin
 * @apiParam {String} access_token App access_token.
 * @apiUse listParams
 * @apiSuccess {Object[]} apps List of apps.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Admin access only.
 */
router.get('/',
  token({ required: true, roles: ['admin'] }),
  query(/* {
    after: {
      type: Date,
      paths: ['updatedAt'],
      operator: '$gte'
    }
  } */),
  index)

/**
 * @api {get} /apps/me Retrieve current app
 * @apiName RetrieveCurrentmember
 * @apiGroup App
 * @apiPermission app
 * @apiParam {String} access_token App access_token.
 * @apiSuccess {Object} app App's data.
 */
router.get('/me',
  token({ required: true }),
  showMe)


  /**
 * @api {get} /apps/me Retrieve current app
 * @apiName RetrieveCurrentmember
 * @apiGroup App
 * @apiPermission app
 * @apiParam {String} access_token App access_token.
 * @apiSuccess {Object} app App's data.
 */
router.get('/exist',
/* master(), */
query({ 
      term :{
              type: String,
              paths: ['membername', 'email']
            }
        }),
exist)

/**
 * @api {get} /apps/:id Retrieve app
 * @apiName Retrievemember
 * @apiGroup App
 * @apiPermission public
 * @apiSuccess {Object} app App's data.
 * @apiError 404 App not found.
 */
router.get('/:id',
  show)

/**
 * @api {post} /apps Create app
 * @apiName Createmember
 * @apiGroup App
 * @apiPermission master
 * @apiParam {String} access_token Master access_token.
 * @apiParam {String} email App's email.
 * @apiParam {String{6..}} password App's password.
 * @apiParam {String} [name] App's name.
 * @apiParam {String} [picture] App's picture.
 * @apiParam {String=app,admin} [role=app] App's role.
 * @apiSuccess (Sucess 201) {Object} app App's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Master access only.
 * @apiError 409 Email already registered.
 */
router.post('/',
  master(),
  body({ email, password, membername, picture, dateOfBirth, role }),
  create)

/**
 * @api {put} /apps/:id Update app
 * @apiName Updatemember
 * @apiGroup App
 * @apiPermission app
 * @apiParam {String} access_token App access_token.
 * @apiParam {String} [name] App's name.
 * @apiParam {String} [picture] App's picture.
 * @apiSuccess {Object} app App's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Current app or admin access only.
 * @apiError 404 App not found.
 */
router.put('/:id',
  token({ required: true }),
  body({ membername, picture }),
  update)

/**
 * @api {put} /apps/:id/password Update password
 * @apiName UpdatePassword
 * @apiGroup App
 * @apiHeader {String} Authorization Basic authorization with email and password.
 * @apiParam {String{6..}} password App's new password.
 * @apiSuccess (Success 201) {Object} app App's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Current app access only.
 * @apiError 404 App not found.
 */
router.put('/:id/password',
  passwordAuth(),
  body({ password }),
  updatePassword)

/**
 * @api {delete} /apps/:id Delete app
 * @apiName Deletemember
 * @apiGroup App
 * @apiPermission admin
 * @apiParam {String} access_token App access_token.
 * @apiSuccess (Success 204) 204 No Content.
 * @apiError 401 Admin access only.
 * @apiError 404 App not found.
 */
router.delete('/:id',
  token({ required: true, roles: ['admin'] }),
  destroy)

export default router
