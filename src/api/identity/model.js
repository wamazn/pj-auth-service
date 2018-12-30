import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import randtoken from 'rand-token'
import mongoose, { Schema } from 'mongoose'
import mongooseKeywords from 'mongoose-keywords'
import { env } from '../../config'

const roles = ['member', 'admin']

const identitySchema = new Schema({
  email: {
    type: String,
    match: /^\S+@\S+\.\S+$/,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  key: {
    type: String,
    required: true, // TODO change to true
    minlength: 4
  },
  is2WayAuth : {
    type: Boolean,
    default: false
  },
  membername: {
    type: String,
    index: true,
    trim: true,
    required: true,
    lowercase: true,
    unique: true
  },
  thumbnail: String,
  services: {
    facebook: String,
    google: String
  },
  role: {
    type: String,
    enum: roles,
    default: 'member'
  },
  lastloginDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastloginIp: {
    trim: true,
    type: String
  },
  enabled :  {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true
})

identitySchema.pre('save', function (next) {

  if (!this.isModified('password')) return next()

  /* istanbul ignore next */
  const rounds = env === 'test' ? 1 : 9
  console.log('prpresave', bcrypt)

  bcrypt.hash(this.password, rounds).then(hash => {
    this.password = hash
    return next()
  }).catch(next)
})

identitySchema.methods = {
  view (full) {
    let view = {}
    let fields = ['id', 'membername', 'thumbnail', 'email']

    if (full) {
      fields = [...fields,'lastloginDate', 'createdAt']
    }

    fields.forEach((field) => { view[field] = this[field] })

    return view
  },

  authenticate (password) {
    return bcrypt.compare(password, this.password).then((valid) => valid ? this : false)
  },

  delete() {
    this.enabled = false
    return this.save()
  }
}

identitySchema.statics = {
  roles,

  createFromService ({ service, id, email, name, picture }) {
    return this.findOne({ $or: [{ [`services.${service}`]: id }, { email }] }).then((identity) => {
      if (identity) {
        identity.services[service] = id
        identity.membername = name
        identity.thumbnail = picture
        return identity.save()
      } else {
        const password = randtoken.generate(16)
        return this.create({ services: { [service]: id }, email, password, thumbnail: picture, membername: name })
      }
    })
  }
}

identitySchema.plugin(mongooseKeywords, { paths: ['email', 'membername'] })

const model = mongoose.model('Identity', identitySchema)

export const schema = model.schema
export default model
