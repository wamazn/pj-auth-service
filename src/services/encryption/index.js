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

export const getRandom = (keylen) => {
    return crypto.randomBytes(keylen ? keylen : 16)
}

export const generateIvArray = (length) => {
    console.log('generateIvArray', length);
    const ivs = [];
    for (let i = 0; i < length; i++) {
        ivs.push(getRandom());
    }
    return ivs
}
// ??????? 32???????
export const nextSecret = (secret, publicKey) => {
    return crypto.pbkdf2Sync(secret, publicKey, 10000, 16, 'sha512')
}

export const aesEncrypt = (data, secret, iv) => {
    let cipher = crypto.createCipheriv('aes256', secret, iv)
    let encrypted
    if (typeof data === 'string')
        encrypted = cipher.update(data, 'utf8')
    else {
        data = JSON.stringify(data)
        encrypted = cipher.update(data, 'utf8')
    }
    return Buffer.concat([encrypted, cipher.final()])
}

export const aesDecryptAndRSAVerify = (load, session, iv) => {
    let decryptedData = aesDecrypt(load.data, session.key, iv)
    try {
        console.log('aesDecryptAndRSAVerify - decreyptd data', decryptedData)
        decryptedData = JSON.parse(decryptedData)
    } catch (err) {
        // not a json object
        console.log('aesDecryptAndRSAVerify - error', decryptedData)
    }
    const isVerified = rsaVerify(load.data, load.sig, session.clientRsaPublicKey)
    console.log('aesDecryptAndRSAVerify - isVerified', isVerified)
    if (isVerified)
        return decryptedData;
    else
        throw new Error('CLIENT_AUTHENTICATION_FAILED')
}

export const aesDecrypt = (data, secret, iv) => {
    console.log('aesDecrypt - create decipher', secret, secret.length)
    console.log('aesDecrypt - create decipher', iv, iv.length)
    const cipher = crypto.createDecipheriv('aes256', secret, iv)
    console.log('aesDecrypt - create cipher')
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

export const rsaVerify = (data, signature, pubKey, format) => {
    format = format || 'utf8';
    let rsa = RSAKey
    if (pubKey) {
        console.log('has rsa pub key', pubKey)
        rsa = new NodeRSA()
        rsa.importKey(pubKey, 'public')
    }
    let result = rsa.verify(data, signature, format, 'base64')
    console.log(result)
    return result
}

export const rsaSign = (data) => RSAKey.sign(data, 'base64')


export const hmacVerify = (secret, signature, data) => signature === hmacify(secret, data)


export const hmacify = (secret, data) => {
    let hmac = crypto.createHmac('sha256', secret)
    console.log('type date:', typeof data.d)
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
