import { Router } from 'express'
import { middleware as query } from 'querymen'
import { middleware as body } from 'bodymen'
import { password as passwordAuth, master, token } from '../../services/passport'
import { index, showMe, show, exist, create, update, updatePassword, destroy } from './controller'
import { schema } from './model'
export Member, { schema } from './model'

const router = new Router()
const { email, password, membername, dateOfBirth, picture, role } = schema.tree

/**
 * @api {get} /members Retrieve members
 * @apiName Retrievemembers
 * @apiGroup Member
 * @apiPermission admin
 * @apiParam {String} access_token Member access_token.
 * @apiUse listParams
 * @apiSuccess {Object[]} members List of members.
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
 * @api {get} /members/me Retrieve current member
 * @apiName RetrieveCurrentmember
 * @apiGroup Member
 * @apiPermission member
 * @apiParam {String} access_token Member access_token.
 * @apiSuccess {Object} member Member's data.
 */
router.get('/me',
  token({ required: true }),
  showMe)


  /**
 * @api {get} /members/me Retrieve current member
 * @apiName RetrieveCurrentmember
 * @apiGroup Member
 * @apiPermission member
 * @apiParam {String} access_token Member access_token.
 * @apiSuccess {Object} member Member's data.
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
 * @api {get} /members/:id Retrieve member
 * @apiName Retrievemember
 * @apiGroup Member
 * @apiPermission public
 * @apiSuccess {Object} member Member's data.
 * @apiError 404 Member not found.
 */
router.get('/:id',
  show)

/**
 * @api {post} /members Create member
 * @apiName Createmember
 * @apiGroup Member
 * @apiPermission master
 * @apiParam {String} access_token Master access_token.
 * @apiParam {String} email Member's email.
 * @apiParam {String{6..}} password Member's password.
 * @apiParam {String} [name] Member's name.
 * @apiParam {String} [picture] Member's picture.
 * @apiParam {String=member,admin} [role=member] Member's role.
 * @apiSuccess (Sucess 201) {Object} member Member's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Master access only.
 * @apiError 409 Email already registered.
 */
router.post('/',
  master(),
  body({ email, password, membername, picture, dateOfBirth, role }),
  create)

/**
 * @api {put} /members/:id Update member
 * @apiName Updatemember
 * @apiGroup Member
 * @apiPermission member
 * @apiParam {String} access_token Member access_token.
 * @apiParam {String} [name] Member's name.
 * @apiParam {String} [picture] Member's picture.
 * @apiSuccess {Object} member Member's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Current member or admin access only.
 * @apiError 404 Member not found.
 */
router.put('/:id',
  token({ required: true }),
  body({ membername, picture }),
  update)

/**
 * @api {put} /members/:id/password Update password
 * @apiName UpdatePassword
 * @apiGroup Member
 * @apiHeader {String} Authorization Basic authorization with email and password.
 * @apiParam {String{6..}} password Member's new password.
 * @apiSuccess (Success 201) {Object} member Member's data.
 * @apiError {Object} 400 Some parameters may contain invalid values.
 * @apiError 401 Current member access only.
 * @apiError 404 Member not found.
 */
router.put('/:id/password',
  passwordAuth(),
  body({ password }),
  updatePassword)

/**
 * @api {delete} /members/:id Delete member
 * @apiName Deletemember
 * @apiGroup Member
 * @apiPermission admin
 * @apiParam {String} access_token Member access_token.
 * @apiSuccess (Success 204) 204 No Content.
 * @apiError 401 Admin access only.
 * @apiError 404 Member not found.
 */
router.delete('/:id',
  token({ required: true, roles: ['admin'] }),
  destroy)

export default router
