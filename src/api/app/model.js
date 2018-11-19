import crypto from 'crypto'
import bcrypt from 'bcrypt'
import randtoken from 'rand-token'
import mongoose, { Schema } from 'mongoose'
import mongooseKeywords from 'mongoose-keywords'
import { env } from '../../config'

const types = ['host', 'guest', '3rdparty']

const memberSchema = new Schema({
    appId: {
        type: String,
        required: true,
        unique: true,
        default: genertateRandKey
    },
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    logo: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        match: /^\S+@\S+\.\S+$/,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    domain: {
        type: String,
        unique: true,
        trim: true
    },
    callbackUrl: {
        type: String,
        unique: true,
        trim: true
    },
    key: {
        type: String,
        required: true,
        minlength: 16,
        default: genertateRandKey
    },
    admin: {
        type: String,
        index: true,
        trim: true,
        required: true,
        lowercase: true,
        unique: true
    },
    type: {
        type: String,
        enum: types,
        default: 'host',
        required: true
    },
    modifiedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    enabled: {
        type: Boolean,
        default: true
    },
}, {
        timestamps: true
    })

memberSchema.path('email').set((email) => {
    if (!this.logo || this.logo.indexOf('https://gravatar.com') === 0) {
        const hash = crypto.createHash('md5').update(email).digest('hex')
        this.logo = `https://gravatar.com/avatar/${hash}?d=identicon&r=g`
    }

    if(!this.key) {
        this.key = genertateRandKey()
    }

    if(!this.appId) {
        this.appId = genertateRandKey()
    }

    return email
})

memberSchema.pre('save', (next) => {
    
    if(!this.key) {
        this.key = genertateRandKey()
    }

    if(!this.appId) {
        this.appId = genertateRandKey()
    }
    next()
})

memberSchema.methods = {
    view(full) {
        let view = {}
        let fields = ['email', 'name', 'logo', 'domain']

        if (full) {
            fields = [...fields, 'appId', 'admin', 'modifiedAt', 'createdAt']
        }

        fields.forEach((field) => { view[field] = this[field] })

        return view
    },

    authenticate(key) {
        return bcrypt.compare(key, this.key).then((valid) => valid ? this : false)
    },

    delete() {
        this.enabled = false
        return this.save()
    },

    renewKey() {
        this.key = genertateRandKey()
        return this.save()
    }
}

memberSchema.statics = {
    types
}

const genertateRandKey = () => {
    const id = randtoken.generate(16) + Date.now().toString('36')
    const keyHash = crypto.createHash('md5').update(key).digest('hex')
    return keyHash
}

memberSchema.plugin(mongooseKeywords, { paths: ['email', 'name'] })

const model = mongoose.model('App', memberSchema)

export const schema = model.schema
export default model
