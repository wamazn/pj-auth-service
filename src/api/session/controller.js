import { success, notFound } from '../../services/response/'
import { Session } from '.'
import jwt from 'jsonwebtoken'
import { headers as SessionHeader, jwtIss } from '../../config'
import * as elliptic from 'elliptic'
import crypto from 'crypto'

import {
    rsaDecrypt, aesDecrypt, RSAKey,
    rsaVerify, hmacify, rsaEncrypt,
    rsaSign, aesEncrypt, aesDecryptAndRSAVerify, nextSecret
} from '../../services/encryption'

import { signAndSend, error } from '../../services/response'

const EC = elliptic.ec
const CURVE = new EC('curve25519')

// entry point for encryption and decryption of the session.
export const index = (req, res, next) => {
    //retreive information in headers
    var headers = JSON.parse(JSON.stringify(req.headers))
    var tag = headers[SessionHeader.tag]
    var clientToken = headers[SessionHeader.token]
    var data = headers[SessionHeader.seedData]
    var ivIdx = parseInt(headers[SessionHeader.next])
    var authHeader = headers[SessionHeader.authorization]

    // check for Basic Authorization Header.
    var basicAuth =  authHeader && authHeader.indexOf('Basic ') === 0 ? authHeader.split('Basic ')[1] : null

    // at least a token, seed data, or a tag to an existing session
    // is needed. NEVER token w/o tag nor No Token AND No seed Data
    if ((!clientToken && !data) || (clientToken && !tag))
        return res.status(401).send("NOT_AUTHORIZED")
    
    // seeding data can only be sent with POST for a new handshake 
    // or PUT to reset an existing session.
    if (data && !(req.method === 'POST' || req.method === 'PUT'))
        return res.status(401).send("NOT_AUTHORIZED")

    if (data) // data with the seed for a new handshake in base64 format
        req.seedData = Buffer.from(data, 'base64').toString('binary')
    console.log('check 2', req.seedData)
    if (tag) { // there is an existing session
        console.log('secret exist', tag)
        // retrieve the existing session
        return Session.findById(tag)
            .then((session) => {
                if (session) {
                    req.sessionKey = session.view()
                    if (clientToken) {
                        // decrypt the JWT with RSA
                        let tokenArray = clientToken.split('.')
                        let decryptedClientToken = rsaDecrypt(tokenArray[0]) + '.' + rsaDecrypt(tokenArray[1]) + '.' + tokenArray[2]
                        tokenArray = null
                        req.headers.authorization = 'Bearer ' + decryptedClientToken
                        res.setHeader(SessionHeader.seedData, '')
                        console.log(session)
                        console.log(req.query)
                        console.log(req.body)
                        // calculate the correct secret key
                        let ivc = session.ivClient.splice(ivIdx, 1)[0]
                        const clientIv = nextSecret(session.key, ivc)

                        console.log('ivc found - idx', clientIv, clientIv.length )

                        // Decrypt the data passed in query string
                        if (Object.keys(req.query).length > 0 ) {
                            try {
                                console.log('decrypt query')
                                req.query = aesDecryptAndRSAVerify(req.query, session, clientIv)
                            } catch (err) {
                                return res.status(401).send('NOT_AUTHORIZED')
                            }
                        }
                        // Decrypt the data passed in the body
                        if (Object.keys(req.body).length > 0) {
                            try {
                                console.log('decrypt body')
                                req.body.load = aesDecryptAndRSAVerify(req.body, session, clientIv)
                             } catch (err) {
                                return res.status(401).send('NOT_AUTHORIZED')
                            }
                        }
                        // Decrypt the data passed in Authorization Basic header
                        if (basicAuth) {
                            try {
                                basicAuth = aesDecrypt(basicAuth, session, clientIv)
                                res.setHeader(SessionHeader.authorization, 'Basic ' + basicAuth)
                            } catch (err) {
                                return res.status(401).send('NOT_AUTHORIZED')
                            }
                        }

                        // generate the encryption key for the response
                        return session.ratchetFoward(req, res).then((savedSession) => {

                                res.setHeader(SessionHeader.token, clientToken)
                                res.setHeader(SessionHeader.tag, savedSession._id)
                                return next(null, req, res)
                            })
                            .catch((err) => res.status(403).send("SESSION_INVALID"))
                    } // should get here only if the client wants to reset the session
                    return next(null, req, res)
                } else
                    return res.status(401).send("NOT_AUTHORIZED")
            })
            .catch(() => res.status(401).send("SESSION_NOT_FOUND"))
    } else
        return next(null, req, res)
}
/**
 * Init or reset the handshake.
 * @param {*} req
 * @param {*} res 
 */
export const seeding = ({ seedData, sessionKey, method }, res) => {

    let data = parseSeedingData(seedData)

    console.log('Seeding', data.load.ecdh)
    if (seedData) {
        try {
            let clientRSAPublicKey = data.load.rsa
            // verify the rsa signature and the request method.
            if (!rsaVerify(data.rawLoad, data.signature, clientRSAPublicKey) || data.load.method !== method) // || data.load.time < (Date.now() - 60 * 1000))
                return res.status(401).send("NOT_AUTHORIZED")
            console.log('payload verified')
            // generate the shared ECDH secret from the ECDH 
            // public key received
            let selfServerECDHKeyPair = CURVE.genKeyPair()
            let remoteK = CURVE.keyFromPublic(data.load.ecdh, 'hex')
            let sharedBN = selfServerECDHKeyPair.derive(remoteK.getPublic())
            let shared = sharedBN.toString('hex')
            //shared = String.fromCharCode(...shared)
            // shared = Buffer.from(shared)
            // shared = shared.toString('base64')
            remoteK = null
            console.log('shared calculated: ', shared)
            // force the key length to be 64
            shared = normalizeKey(shared)
            // save secreet
            let promise = null

            if (sessionKey) {
                promise = sessionKey.resetRatchet(shared, data.load.niv)
            } else {
                promise = Session.initRatchet(shared, data.load.niv, clientRSAPublicKey)
            }
            data = null
            // shared = null
            sharedBN = null
            let serverPubEcdh = selfServerECDHKeyPair.getPublic().encode('hex')
            console.log('serverPubEcdh', serverPubEcdh)
            return promise.then((newSecret) => {
                // compose the string with the info for the generation
                // the shaared secret on the client side.
                let keys = RSAKey.exportKey('public') + '@' +
                    serverPubEcdh + '@' +
                    method + '@' +
                    newSecret.ivServer[0].toString('hex') + '@' + // ? utf8?????
                    newSecret.updatedAt.getTime()

                selfServerECDHKeyPair = null
                console.log('calculated secret: ', newSecret.key)
                
                // add the HMAC with the calculated secret
                keys = keys + '@' + hmacify(shared, keys)

                // rsa sign the previous load and append the signature to it
                let data2Encrypt = keys + '@' + rsaSign(keys)
                // encrypt with RSA for the client.
                let encrypted = rsaEncrypt(data2Encrypt, clientRSAPublicKey)
                console.log(encrypted);
                // convert to base64, set the headers and send.
                encrypted = Buffer.from(encrypted, 'binary').toString('base64')
                res.setHeader(SessionHeader.seedData, encrypted)
                res.setHeader(SessionHeader.tag, newSecret._id)
                // sing the token and set it to the headers.
                singAndSet(newSecret._id, jwtIss, res)
                newSecret = null
                return res.status(200).json({result: 'ok'})
            })
                .catch(function (err) {
                    console.log(err)
                    return res.status(500).end("HANDSHAKE_ERROR")
                })
        }
        catch (err) {
            console.log(err)
            return res.status(500).end("HANDSHAKE_ERROR")
        }
    } else {
        return res.status(403).send("BAD_REQUEST")
    }
}
// extends the IVS for a session
export const extendKeys = ({ body: { load }, sessionKey}, res) => {
    let keys = load.split('.')
    console.log('extendKeys', sessionKey, load )
    return Session.findById(sessionKey.id)
        .then((session) => {
            if (session) {
                    return session.extendKeys(keys, sessionKey.currentIv)
                            .then(signAndSend(res))
                            .catch(error(res))
            } else 
                return res.status(401).end("NOT_AUTHORIZED")
        })
        .catch(err => res.status(401).end("NOT_AUTHORIZED"))
}
// end a session
export const destroy = ({ sessionKey }, res) => {
    if (sessionKey) {
        Session.findById(sessionKey.id)
                .then((session) => session ? session.delete() : null)
                .then(success(res, 204))
                .catch(error(res))
    }
    return res.status(204).send()
}
/**
 * give the key a legnth of 64 by truncating it 
 * or adding leading 0s
 * @param {*} key 
 */
const normalizeKey = (key)  => {
    let zeros = '0000'
    if(key.length > 64 ) {
        key = key.slice(0, 64)
    } else if(key.length < 64) {
        key = zeros.slice(0, 64 % key.length) + key
    }
    console.log('key normalized', key)
    return key
}
/**
 * convert seed data from string format to object.
 * returs an object with the load, the signature
 * and the receive seedData string
 * @param {*} seedData 
 */
const parseSeedingData = (seedData) => {
    let partArr = seedData.split('@')
    if (partArr.length !== 6)
        return null
    let data =  {
        load: {
            rsa: partArr[0],
            ecdh: partArr[1],
            method: partArr[2],
            niv: partArr[3],
            time: partArr[4]
        },
        signature: partArr[5]
    }
    partArr.splice(partArr.length -1, 1);
    data.rawLoad = partArr.join('@')
    return data
}
// generate a JWT sign it and set it in the header.
const singAndSet = (id, iss, res) => {
    console.log("SignAndSet")
    // TODO change the jwt key to specific one
    var token = jwt.sign({
        tid: id,
        iss: iss,
        role: 'BASIC'
    }, RSAKey.exportKey('public'))

    let arrTok = token.split('.')
    // encrypt each part of the token
    token = rsaEncrypt(arrTok[0]) + '.' + rsaEncrypt(arrTok[1]) + '.' + arrTok[2]
    res.setHeader(SessionHeader.token, token)
}