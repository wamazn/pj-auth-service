import crypto from 'crypto'
import bcrypt from 'bcrypt'
import randtoken from 'rand-token'
import mongoose, { Schema } from 'mongoose'
import mongooseKeywords from 'mongoose-keywords'
import { env } from '../../config'

const roles = ['member', 'admin']

const memberSchema = new Schema({
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
    required: false, // TODO change to true
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
  dateOfBirth: {
    type: Date,
    required: true
  },
  modifiedAt: {
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

memberSchema.path('email').set(function (email) {
  if (!this.picture || this.picture.indexOf('https://gravatar.com') === 0) {
    const hash = crypto.createHash('md5').update(email).digest('hex')
    this.picture = `https://gravatar.com/avatar/${hash}?d=identicon`
  }

  return email
})

memberSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next()

  /* istanbul ignore next */
  const rounds = env === 'test' ? 1 : 9

  bcrypt.hash(this.password, rounds).then((hash) => {
    this.password = hash
    next()
  }).catch(next)
})

memberSchema.methods = {
  view (full) {
    let view = {}
    let fields = ['id', 'membername', 'picture']

    if (full) {
      fields = [...fields, 'email', 'createdAt']
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

memberSchema.statics = {
  roles,

  createFromService ({ service, id, email, name, picture }) {
    return this.findOne({ $or: [{ [`services.${service}`]: id }, { email }] }).then((identity) => {
      if (identity) {
        identity.services[service] = id
        identity.membername = name
        identity.picture = picture
        return identity.save()
      } else {
        const password = randtoken.generate(16)
        return this.create({ services: { [service]: id }, email, password, membername: name, picture })
      }
    })
  }
}

memberSchema.plugin(mongooseKeywords, { paths: ['email', 'membername'] })

const model = mongoose.model('Identity', memberSchema)

export const schema = model.schema
export default model
