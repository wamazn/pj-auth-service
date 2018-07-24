import mongoose, { Schema } from 'mongoose'
import { getRandom, nextSecret} from '../../services/encryption'

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
  initRatchet(shared, clientPubKey) {
    if(!shared || !clientPubKey)
        return Promise.reject(new Error("DATA_MISSING"))
        let hss = new this()
        hss.key = shared
        hss.expire = Date.now() + 5*60*1000 // 5mn valid time
        hss.version = 1
        hss.ivClient.push(clientPubKey)
        hss.ivServerpush(getRandom('hex'))
        hss.active = true
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
        this.updatedAt = Date.now() + 5*60*1000
      return this.save()
  },
  // TODO create encrypt key separated from decrypt key
  ratchetFoward(req) {
      if(!req || !req.query || !req.query.n || !req.query.d)
        return Promise.reject( new Error("DATA_MISSING"))
      if(!this.active || this.expire <= Date.now()) {
        this.remove().exec()
        return Promise.reject(new Error("SESSION_INVALID"))
      }

      req.sessionKey.encryptKey = nextSecret(this.key, this.ivClient)
      this.key = nextSecret(req.sessionKey.encryptKey, this.ivServer)
      this.ivClient = req.query.n
      this.ivServer = getRandom('hex')
      this.expire = Date.now() + 5*60*1000
      this.version++
      this.updatedAt = Date.now() + 5*60*1000
      return this.save()
  }
}

const model = mongoose.model('Session', sessionSchema)

export const schema = model.schema
export default model
