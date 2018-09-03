import crypto from 'crypto'
import { default as NodeRSA} from 'node-rsa'
import { secrets as configSecret } from '../../config'
console.log(NodeRSA)
export const RSAKey = NodeRSA(configSecret.rsaPvK)
console.log(configSecret.rsaPvK)
console.log('server RSA Pub', RSAKey.exportKey('public'))

export const getRandomInRange = (max, min) => {
    min = min ? min : 0;
    return min + Math.floor(Math.random() * Math.floor(max));
}

export const getRandom = (format, keylen) => {
    let random = crypto.randomBytes(keylen ? keylen : 16)
    return random.toString(format)
}
// ??????? 32???????
export const nextSecret = (secret, publicKey) => {
    secret = crypto.pbkdf2Sync(secret, publicKey, 10000, 32, 'sha512')
    return secret.toString('hex')
}

export const aesEncrypt = (data, secret, iv) => {
    let cipher = crypto.createCipheriv('aes256', secret, iv)
    let encrypted
    if (typeof data === 'string')
        encrypted = cipher.update(data, 'utf8', 'hex')
    else {
        data = JSON.stringify(data)
        encrypted = cipher.update(data, 'utf8', 'hex')
    }
    return encrypted += cipher.final('hex')
}

export const aesDecryptAndRSAVerify = (load, session, iv) => {
    let decryptedData = aesDecrypt(load.data, session.key, iv)
    try {
        decryptedData = JSON.parse(decryptedData)
    } catch (err) {
        // not a json object
    }
    const isVerified = rsaVerify(load.data, load.sig, session.clientRsaPublicKey)
    if (isVerified)
        return decryptedData;
    else
        throw new Error('CLIENT_AUTHENTICATION_FAILED')
}

export const aesDecrypt = (data, secret, iv) => {
    const cipher = crypto.createDecipheriv('aes256', secret, iv)
    cipher.setAutoPadding(false)
    let decrypted
    console.log(typeof data)
    decrypted = cipher.update(data, 'hex', 'utf8')
    decrypted += cipher.final('utf8')
    return decrypted;
}

export const aesDecryptObject = (data, secret, iv) => {
let result = aesDecrypt (data, secret, iv)
    try {
        return JSON.parse(result)
    } catch(err) {
        throw new Error('BAD_DATA_FORMAT')
    }
}

export const aesDecryptNumber = (data, secret, iv) => {
    let result = aesDecrypt (data, secret, iv)
        try {
            return parseInt(result)
        } catch(err) {
            throw new Error('BAD_DATA_FORMAT')
        }
    }

export const rsaVerify = (data, signature, pubKey) => {
    let rsa = RSAKey
    if (pubKey) {
        rsa = new NodeRSA()
        rsa.importKey(pubKey, 'public')
    }
    let result = rsa.verify(data, signature, 'utf8', 'base64')
    console.log(result)
    return result
}

export const rsaSign = (data) => RSAKey.sign(data, 'base64')


export const hmacVerify = (secret, signature, data) => signature === hmacify(secret, data)


export const hmacify = (secret, data) => {
    let hmac = crypto.createHmac('sha256', secret)
    console.log('type datye:', typeof data.d)
    if (typeof data === 'string')
        hmac.update(data)
    else {
        data = JSON.stringify(data)
        hmac.update(data)
    }
    return hmac.digest('hex')
}

export const rsaEncrypt = (data, key) => {
    let rsa = RSAKey
    if (key) {
        rsa = new NodeRSA()
        rsa.importKey(key, 'public')
    }
    return rsa.encrypt(data, 'base64')
}

export const rsaDecrypt = (data) => RSAKey.decrypt(data, 'utf8')


export const createRsa = () => {
    // RSAKey = RSAKey || new NodeRSA(config.secrets.rsaPvK)
    return RSAKey
}
