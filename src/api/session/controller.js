import { success, notFound } from '../../services/response/'
import { Session } from '.'
import { headers as SessionHeader } from '../../config'
import * as elliptic from 'elliptic'

import {
    rsaDecrypt, aesDecrypt,
    rsaVerify, hmacify, rsaEncrypt,
    rsaSign, aesEncrypt, aesDecryptAndRSAVerify, nextSecret
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
    var headers = JSON.parse(JSON.stringify(req.headers))
    var tag = headers[SessionHeader.tag]
    var clientToken = headers[SessionHeader.token]
    var data = headers[SessionHeader.seedData]
    var ivIdx = headers[SessionHeader.next]
    var authHeader = headers[SessionHeader.authorization]

    var basicAuth = authHeader.indexOf('Basic ') === 0 ? authHeader.split('Basic ')[1] : null

    if ((!clientToken && !data) || (clientToken && !tag) || !ivIdx)
        return res.status(401).send("NOT_AUTHORIZED")

    if (data && req.method !== 'POST' || req.method !== 'PUT')
        return res.status(401).send("NOT_AUTHORIZED")

    req.seedData = data

    if (tag) {
        console.log('secret exist', tag)
        return Session.findById(tag)
            .then((session) => {
                if (session) {
                    req.sessionKey = Object.assign({}, session)
                    if (clientToken) {
                        let tokenArray = clientToken.split('.')
                        let decryptedClientToken = rsaDecrypt(tokenArray[0]) + '.' + rsaDecrypt(tokenArray[1]) + '.' + tokenArray[2]
                        tokenArray = null
                        req.headers.authorization = 'Bearer ' + decryptedClientToken
                        res.setHeader(SessionHeader.seedData, '')
                        console.log(session)
                        console.log(req.query)
                        console.log(req.body)
                        const clientIv = nextSecret(session.key, session.ivClient.splice(ivIdx, 1))
                        if (req.query) {
                            try {
                                req.query = aesDecryptAndRSAVerify(req.query, session, clientIv)
                            } catch (err) {
                                return res.status(401).send('NOT_AUTHORIZED')
                            }
                        }
                        if (req.body) {
                            try {
                                req.body = aesDecryptAndRSAVerify(req.body, session, clientIv)
                            } catch (err) {
                                return res.status(401).send('NOT_AUTHORIZED')
                            }
                        }
                        if (basicAuth) {
                            try {
                                basicAuth = aesDecrypt(basicAuth, session, clientIv)
                                res.setHeader(SessionHeader.authorization, 'Basic ' + basicAuth)
                            } catch (err) {
                                return res.status(401).send('NOT_AUTHORIZED')
                            }
                        }

                        return session.ratchetFoward(req).then((savedSession) => {

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

export const seeding = ({ seedData, sessionKey, method }, res) => {
    const data = parseSeedingData(seedData)
    if (seedData) {
        try {
            let clientRSAPublicKey = data.load.rsa
            if (!rsaVerify(data.load, data.signature, clientRSAPublicKey) || data.load.method !== method || data.load.time < (Date.now() - 60 * 1000))
                return res.status(403).send("NOT_AUTHORIZED")
            console.log('payload verified')
            var selfServerECDHKeyPair = CURVE.genKeyPair()
            var remoteK = CURVE.keyFromPublic(data.load.ecdh, 'hex')
            let sharedBN = selfServerECDHKeyPair.derive(remoteK.getPublic())
            let shared = sharedBN.toString('hex')
            remoteK = null
            console.log('shared calculated: ', shared)
            // save secreet
            if (sessionKey) {
                let promise = sessionKey.resetRatchet(shared, data.load.niv)
            } else {
                let promise = Session.initRatchet(shared, data.load.niv, clientRSAPublicKey)
            }
            data = null
            shared = null
            sharedBN = null
            promise.then((newSecret) => {
                let keys = RSAKey.exportKey('public') + '@' +
                    selfServerECDHKeyPair.getPublic().encode('hex') + '@' +
                    method + '@' +
                    newSecret.ivs.join('.') + '@' +
                    newSecret.updatedAt

                selfServerECDHKeyPair = null
                console.log('calculated secret: ', newSecret.key)
                keys = keys + '@' + hmacify(newSecret.key, keys)

                let data2Encrypt = keys + '@' + rsaSign(keys)
                let encrypted = rsaEncrypt(data2Encrypt, clientRSAPublicKey)
                res.setHeader(SessionHeader.seedData, encrypted)
                res.setHeader(SessionHeader.tag, newSecret._id)
                singAndSet(newSecret._id, config.MainIss, res)
                newSecret = null
                return res.status(200).json({})
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

export const extendKeys = (req, res) => {

}

export const destroy = ({ sessionKey }, res) => {
    if (sessionKey) {
        sessionKey.remove()
    }
    return res.status(204).send()
}

const parseSeedingData = (seedData) => {
    let partArr = seedData.split('@')
    if (partArr.length !== 6)
        return null
    return {
        load: {
            rsa: partArr[0],
            ecdh: partArr[1],
            method: partArr[2],
            niv: partArr[3],
            time: partArr[4]
        },
        signature: partArr[5]
    }
}

const singAndSet = (id, iss, res) => {
    console.log("SignAndSet")
    var token = jwt.sign({
        tid: id,
        iss: iss,
        role: 'BASIC'
    }, config.secrets.rsaPvK)

    let arrTok = token.split('.')
    // encrypt each part of the token
    token = rsaEncrypt(arrTok[0]) + '.' + rsaEncrypt(arrTok[1]) + '.' + arrTok[2]
    res.setHeader(SessionHeader.token, token)
}