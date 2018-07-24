import { success, notFound } from '../../services/response/'
import { Session } from '.'
import { headers as SessionHeader } from '../../config'
import * as elliptic from 'elliptic'

import { rsaDecrypt, aesDecrecrypt,
    rsaVerify, hmacify, rsaEncrypt,
    rsaSign, aesEncrypt
  } from '../../services/encryption'

const EC = elliptic.ec
const CURVE = new EC('curve25519')

export const create = (req, res, next) => {
  Session.create(body)
    .then((session) => session.view(true))
    .then(success(res, 201))
    .catch(next)
  }

export const index = (req, res, next) => {
    var headers     = JSON.parse(JSON.stringify(req.headers))
    var tag         = headers[SessionHeader.tag]
    var clientToken = headers[SessionHeader.token]
    var data        = headers[SessionHeader.seedData]

    if((!clientToken && !data) || clientToken && !tag)
        return res.status(403).send("NOT_AUTHORIZED")
    
    req.seedData = data

    if (tag) {
        console.log('secret exist',tag)
        return Session.findById(tag)
                .then((session) => {
                  if (session) {
                      req.sessionKey = session
                      if(clientToken) {
                        let tokenArray = clientToken.split('.')
                        let decryptedClientToken = rsaDecrypt(tokenArray[0]) + '.' + rsaDecrypt(tokenArray[1]) +'.'+ tokenArray[2]
                        tokenArray = null
                        req.headers.authorization = 'Bearer ' + decryptedClientToken
                        res.setHeader(SessionHeader.seedData, '');
                              console.log(session)
                            if (req.query) {
                              req.query = aesDecrecrypt(req.query, session.key, session.ivClient)
                            }
                            if(req.body) {
                              req.body = aesDecrecrypt(req.body, session.key, session.ivClient)
                            }
                            console.log(req.query)
                            // TODO check race conditions due to asynchronous requests
                            if(session.updatedAt !== req.query.d)
                                    return res.status(403).send('NOT_AUTHORIZED')
                            return session.ratchetFoward(req).then((savedSession) => {
                                let qr = {n: savedSession.ivs, d: savedSession.updatedAt}
                                let  qrHdr = aesEncrypt(qr, req.sessionKey.encryptKey, req.sessionKey.ivs)
                                res.setHeader(SessionHeader.next, qrHdr)
                                res.setHeader(SessionHeader.token, clientToken)
                                res.setHeader(SessionHeader.tag, savedSession._id)
                              next()
                            })
                            .catch((err) => {
                              return res.status(403).send("SESSION_INVALID")
                            })
                        } 
                        next()
                  } else 
                        return res.status(401).send("NOT_AUTHORIZED")
                })
                .catch(next)
    } else 
        next()
  }

export const show = ({ params }, res, next) =>
  Session.findById(params.id)
    .then(notFound(res))
    .then((session) => session ? session.view() : null)
    .then(success(res))
    .catch(next)

export const seeding = ({ seedData, sessionKey, method }, res) => {

    if ( seedData ) {
      try {
          const data = JSON.parse(seedData)
          let clientPubKey = data.p.rk
          if (!rsaVerify(data.p, data.s, clientPubKey) || data.p.m !== method || data.p.d < (Date.now() - 60*1000))
              return res.status(403).send("NOT_AUTHORIZED")
          console.log('payload verified')
          var selfServerECDHKeyPair = CURVE.genKeyPair()
          var remoteK = CURVE.keyFromPublic(data.p.ek, 'hex')
          let sharedBN = selfServerECDHKeyPair.derive(remoteK.getPublic())
          let shared = sharedBN.toString('hex')
          remoteK = null
          console.log('shared calculated: ', shared)
          // save secreet
          let promise;
            if ( sessionKey ) {
                promise = sessionKey.resetRatchet(shared, data.p.n);
            } else {
                promise = Session.initRatchet(shared, data.p.n);
            }
            data = null
            shared = null
            sharedBN =null
            promise.then((newSecret) => {
                              let keys = {
                                /* id: newSecret._id.toString(), */
                                rk: RSAKey.exportKey('public'),
                                eck: selfServerECDHKeyPair.getPublic().encode('hex'),
                                m: method,
                                n: newSecret.ivs,
                                d: newSecret.updatedAt // Date.now().toString()
                              }
                              selfServerECDHKeyPair = null
                              console.log('calculated secret: ', newSecret.key)
                              keys.h = hmacify(newSecret.key, keys)
                              let s = rsaSign(keys)
                              let paraEnc = JSON.stringify({p: keys, s: s})
                              let encrypted = rsaEncrypt(paraEnc, clientPubKey)
                              res.setHeader(SessionHeader.seedData, encrypted)
                              res.setHeader(SessionHeader.tag, newSecret._id)
                              newSecret = null
                              singAndSet(keys, config.MainIss ,res )
                              return res.status(200).json({})
                    })
                    .catch(function(err) {
                      console.log(err)
                      return res.status(500).end("HANDSHAKE_ERROR")
                    });
            }
            catch(err){
                console.log(err)
                return res.status(500).end("HANDSHAKE_ERROR")
            }
    } else {
      return res.status(403).send("BAD_REQUEST")
    }
  }

export const extendKeys = (req, res) => {
    
}

export const destroy = ({ sessionKey }, res) => {
    if( sessionKey ) {
      sessionKey.remove()
    }
    return res.status(204).send()
  }

const singAndSet = (tokession, iss, res) => {
      console.log("SignAndSet")
          var token = jwt.sign({
              tid: tokession._id,
              iss: iss,
              role: 'BASIC'
          }, config.secrets.rsaPvK)

          let arrTok = token.split('.')
          // encrypt each part of the token
          token = rsaEncrypt(arrTok[0]) + '.' + rsaEncrypt(arrTok[1]) + '.' + arrTok[2]
          res.setHeader(SessionHeader.token, token)
  }