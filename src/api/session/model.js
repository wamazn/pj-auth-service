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
  resetRatchet(shared, clientPubKey) {
    if(!shared || !clientPubKey)
        return Promise.reject(new Error("DATA_MISSING"))

        this.key = shared
        this.expire = Date.now() + 5*60*1000 // 5mn valid time
        this.version = 1
        this.ivClient.push(clientPubKey)
        this.ivServer.push(getRandom())
        this.active = true
        this.updatedAt = Date.now()
      return this.save()
  },

  ratchetFoward(req, res) {
      if(!this.active || this.expire <= Date.now()) {
        this.remove().exec()
        return Promise.reject(new Error("SESSION_INVALID"))
      }

      const nextIVIdx = this.ivServer.length === 1 ? 0 : getRandomInRange(this.ivServer.length);
      res.setHeader(SessionHeader.next, nextIVIdx)
      // USE this with the key to encrypt

      req.sessionKey.currentIv = nextSecret(this.key, this.ivServer.splice(nextIVIdx, 1)[0])
      // expira en 5 mn
      this.expire = Date.now() + 5*60*1000
      this.version++
      this.updatedAt = Date.now()
      return this.save()
  },

  extendsKeys(keys, currentIv) {
    let ivBuffer = []
    keys.map((key) => {
      ivBuffer.push(Buffer.from(key, 'hex'))
    })
    this.ivClient = this.ivClient.concat(ivBuffer)
    this.ivServer = this.ivServer.concat(generateIvArray(keys.length))
    // convert all to hex
    let ivUtf8 = '';
    this.ivServer.map((iv) => {
        ivUtf8 += iv.toString('hex') + '.'
    })
    ivUtf8 = ivUtf8.slice(0,-1)
    let encriptedIv = aesEncrypt(ivUtf8, this.key, currentIv)
    return this.save()
          .then((session) => {
            return encriptedIv.toString('hex')
          })
          .catch(err => {
            console.log('extendsKeys', err)
          })
  }
}

const model = mongoose.model('Session', sessionSchema)

export const schema = model.schema
export default model
