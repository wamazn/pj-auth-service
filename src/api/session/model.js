import mongoose, { Schema } from 'mongoose'
import { aesEncrypt, getRandom, generateIvArray, getRandomInRange, nextSecret} from '../../services/encryption'
import { headers as SessionHeader } from '../../config'

const sessionSchema = new Schema({
  key: {
    type: Buffer,
    required: true
  },
  expire: {
    type : Date, 
    required: true,
    default: Date.now() + 5*60*1000
  },
  version: {
    type: Number
  },
  ivServer: {
    type: [Buffer]
  },
  ivClient: {
    type: [Buffer]
  },
  clientRsaPublicKey: {
    type: String,
    required: true
  },
  active: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (obj, ret) => { delete ret._id }
  }
})


sessionSchema.statics = {
  /**
   * 
   * @param {*} shared calculated shared secret.
   * @param {*} clientNextIv the next iv, needed to extend the keys or any succeeding request
   * @param {*} clientRSAPublicKey the client RSA public key to encrypt any answer to this client.
   */
  initRatchet(shared, clientNextIv, clientRSAPublicKey) {
    if(!shared || !clientNextIv || !clientRSAPublicKey)
        return Promise.reject(new Error("DATA_MISSING"))
        let hss = new this()
        hss.key = Buffer.from(shared, "hex") 
        hss.expire = Date.now() + 5*60*1000 // 5mn valid time
        hss.version = 1
        hss.ivClient.push(Buffer.from(clientNextIv, "hex"))
        hss.ivServer.push(getRandom())
        hss.active = true
        hss.clientRsaPublicKey = clientRSAPublicKey
      return hss.save()
  }
}

sessionSchema.methods = {
  view (full) {
    const view = {
      // simple view
      id: this.id,
      expire: this.expire,
      version: this.version,
      ivServer: this.ivServer,
      ivClient: this.ivClient,
      clientRsaPublicKey: this.clientRsaPublicKey,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }

    return full ? {
      ...view,
      // add properties for a full view
      key: this.key
    } : view
  },
  /**
   * reset an existing session.
   * @param {*} shared the calculated shared secret
   * @param {*} clientNextIv the next iv, needed to extend the keys or any succeeding request
   */
  resetRatchet(shared, clientNextIv) {
    if(!shared || !clientNextIv)
        return Promise.reject(new Error("DATA_MISSING"))

        this.key = Buffer.from(shared, "hex")
        this.expire = Date.now() + 5*60*1000 // 5mn valid time
        this.version = 1
        this.ivClient.push(Buffer.from(clientNextIv, "hex"))
        this.ivServer.push(getRandom()) // generate a random iv
        this.active = true
        this.updatedAt = Date.now()
      return this.save()
  },

  /**
   * generate the encryption key for the response and 
   * set the index of the iv in the heder. extends the TTL of the session
   * and increment the version
   * @param {*} req the request
   * @param {*} res the response
   */
  ratchetFoward(req, res) {
    // session must be active and not expired
      if(!this.active || this.expire <= Date.now()) {
        this.remove().exec()
        return Promise.reject(new Error("SESSION_INVALID"))
      }

      // randomly choose an IV
      const nextIVIdx = this.ivServer.length === 1 ? 0 : getRandomInRange(this.ivServer.length);
      // so the client can know whitch iv to use to decrypt
      res.setHeader(SessionHeader.next, nextIVIdx)

      // USE this with the key to encrypt
      req.sessionKey.currentIv = nextSecret(this.key, this.ivServer.splice(nextIVIdx, 1)[0])
      // expira en 5 mn
      this.expire = Date.now() + 5*60*1000
      this.version++
      this.updatedAt = Date.now()
      return this.save()
  },

  /**
   * generate more ivs for both sides and return 
   * the newly generated ones for the server
   * @param {*} keys arrays of key string in hex
   * @param {*} currentIv the encryption iv
   */
  extendKeys(keys, currentIv) {
    let ivBuffer = []
    keys.map((key) => {
      ivBuffer.push(Buffer.from(key, 'hex'))
    })
    this.ivClient = this.ivClient.concat(ivBuffer)
    let newserverIvs = generateIvArray(keys.length)
    this.ivServer = this.ivServer.concat(newserverIvs)
    // convert all to hex
    let ivUtf8 = '';
    // convert the ivs to string and concat them: key1.key2.key3
    newserverIvs.map((iv) => {
        ivUtf8 += iv.toString('hex') + '.'
    })
    ivUtf8 = ivUtf8.slice(0,-1)
    console.log('currentIV', currentIv)
    // encrypt the keys
    let encriptedIv = aesEncrypt(ivUtf8, this.key, currentIv)
    console.log('encriptedIv', encriptedIv.toString('hex'))
    return this.save()
          .then((session) => {
            return encriptedIv.toString('hex')
          })
          .catch(err => {
            console.log('extendKeys', err)
          })
  }
}

const model = mongoose.model('Session', sessionSchema)

export const schema = model.schema
export default model
