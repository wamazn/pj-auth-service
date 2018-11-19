import { rsaSign } from "../encryption";

export const success = (res, status) => (entity) => {
  if (entity) {
    res.status(status || 200).json(entity)
  }
  return null
}

export const signAndSend =(res, status) => (data) => {
  if(typeof data !== 'string')
      data = JSON.stringify(data)
    let load = {
      data: data,
      sig: rsaSign(data)
    };
    return res.status(status || 200).json(load)
}


export const error = (res, code) => (err) => {
  if (!err) {
    return
  }
  res.status(code || 500).end()
  return null
}

export const notFound = (res) => (entity) => {
  if (entity) {
    return entity
  }
  res.status(404).end()
  return null
}

export const authorOrAdmin = (res, identity, userField) => (entity) => {
  if (entity) {
    const isAdmin = identity.role === 'admin'
    const isAuthor = entity[userField] && entity[userField].equals(identity.id)
    if (isAuthor || isAdmin) {
      return entity
    }
    res.status(401).end()
  }
  return null
}
