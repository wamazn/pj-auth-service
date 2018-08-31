import mongoose, { Schema } from 'mongoose'
import { getRandom, getRandomInRange, nextSecret} from '../../services/encryption'
import { headers as SessionHeader } from '../../config'

const sessionSchema = new Schema({
  key: {
    type: String,
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
    type: [String]
  },
  ivClient: {
    type: [String]
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
    if(!shared || !clientPubKey)
        return Promise.reject(new Error("DATA_MISSING"))
        let hss = new this()
        hss.key = shared
        hss.expire = Date.now() + 5*60*1000 // 5mn valid time
        hss.version = 1
        hss.ivClient.push(clientPubKey)
        hss.ivServer.push(getRandom('hex'))
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
      key: this.key,
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
      ...view
      // add properties for a full view
    } : view
  },
  resetRatchet(shared, clientPubKey) {
    if(!shared || !clientPubKey)
        return Promise.reject(new Error("DATA_MISSING"))

        this.key = shared
        this.expire = Date.now() + 5*60*1000 // 5mn valid time
        this.version = 1
        this.ivClient.push(clientPubKey)
        this.ivServer.push(getRandom('hex'))
        this.active = true
        this.updatedAt = Date.now()
      return this.save()
  },

  ratchetFoward(req, res) {
      if(!this.active || this.expire <= Date.now()) {
        this.remove().exec()
        return Promise.reject(new Error("SESSION_INVALID"))
      }

      const nextIVIdx = getRandomInRange(this.ivServer.length);
      // USE this with the key to encrypt
      res.setHeader(SessionHeader.next, nextIVIdx)
      req.sessionKey.currentIv = nextSecret(this.key, this.ivClient.splice(nextIVIdx, 1))
      // expira en 5 mn
      this.expire = Date.now() + 5*60*1000
      this.version++
      this.updatedAt = Date.now()
      return this.save()
  }
}

const model = mongoose.model('Session', sessionSchema)

export const schema = model.schema
export default model
