const jwt = require("jwt-simple")

module.exports = (req, res, next) => {
  const token = req.get("authorization")

  try {
    req.token = jwt.decode(token, secret)
  } catch(err) {
    return res.error(err, 403)
  }

  next()
}