import { Router } from 'express'
import { login, logout } from './controller'
import { password, master, facebook, google, token } from '../../services/passport'

const router = new Router()

/**
 * @api {post} /auth Authenticate
 * @apiName Authenticate
 * @apiGroup Auth
 * @apiPermission master
 * @apiHeader {String} Authorization Basic authorization with email and password.
 * @apiParam {String} access_token Master access_token.
 * @apiSuccess (Success 201) {String} token Identity `access_token` to be passed to other requests.
 * @apiSuccess (Success 201) {Object} identity Current identity's data.
 * @apiError 401 Master access only or invalid credentials.
 */
router.post('/',
  master(),
  password(),
  login)

/**
 * @api {post} /auth/facebook Authenticate with Facebook
 * @apiName AuthenticateFacebook
 * @apiGroup Auth
 * @apiParam {String} access_token Facebook identity accessToken.
 * @apiSuccess (Success 201) {String} token Identity `access_token` to be passed to other requests.
 * @apiSuccess (Success 201) {Object} identity Current identity's data.
 * @apiError 401 Invalid credentials.
 */
router.post('/facebook',
  facebook(),
  login)

/**
 * @api {post} /auth/google Authenticate with Google
 * @apiName AuthenticateGoogle
 * @apiGroup Auth
 * @apiParam {String} access_token Google identity accessToken.
 * @apiSuccess (Success 201) {String} token Identity `access_token` to be passed to other requests.
 * @apiSuccess (Success 201) {Object} identity Current identity's data.
 * @apiError 401 Invalid credentials.
 */
router.post('/google',
  google(),
  login)

  /**
 * @api {delete} /auth Logout
 * @apiName Logout
 * @apiGroup Auth
 * @apiPermission token
 * @apiHeader {String} Logout .
 * @apiSuccess (Success 201) {String} token Identity `access_token` to be passed to other requests.
 * @apiSuccess (Success 201) {Object} identity Current identity's data.
 * @apiError 401 authenticated access only or invalid credentials.
 */
router.delete('/',
//token({ required: true }),
logout)

export default router
