export const success = (res, status) => (entity) => {
  if (entity) {
    res.status(status || 200).json(entity)
  }
  return null
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

export const authorOrAdmin = (res, member, userField) => (entity) => {
  if (entity) {
    const isAdmin = member.role === 'admin'
    const isAuthor = entity[userField] && entity[userField].equals(member.id)
    if (isAuthor || isAdmin) {
      return entity
    }
    res.status(401).end()
  }
  return null
}
