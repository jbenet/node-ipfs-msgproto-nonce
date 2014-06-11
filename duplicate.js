var transDuplex = require('duplex-transform')

module.exports = Duplicate
function Duplicate(stream) {

  return transDuplex.obj(dupe, stream, dupe)

  function dupe(msg, enc, next) {
    this.push(msg)
    this.push(msg)
    next()
  }
}
