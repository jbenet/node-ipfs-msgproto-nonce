var transDuplex = require('duplex-transform')
var msgproto = require('msgproto')
var extend = require('xtend')
var crypto = require('crypto')
var bufeq = require('buffer-equal')
var Frame = require('./frame')
var err = require('./errors')

module.exports = ReplayProtocol


// replay-protocol wraps a duplex packet stream
// with replay attack prevention nonces:
// - outgoing packets get a random nonce
// - incoming packet nonces may only be used once

function ReplayProtocol(stream, opts) {
  opts = extend(ReplayProtocol.defaults, opts || {})

  var noncesSeen = {} // this should be bounded with a fixed size cache
  var stream = transDuplex.obj(outgoing, stream, incoming)
  stream.opts = opts
  stream.noncesSeen = noncesSeen
  return stream

  function randomNonce() {
    return crypto.randomBytes(opts.nonceSize) // handle callback err?
  }

  function outgoing(msg, enc, next) {

    if (opts.wrap) {
      msg = Frame(randomNonce(), msg, opts.payloadType)
    }
    else if (!(msg instanceof Frame)) {
      this.emit('error', {error: err.NotNonceFrameErr, message: msg})
      return next()
    }
    else if (!msg.nonce) {
      msg.nonce = randomNonce()
    }

    this.push(msg)
    next()
  }

  function incoming(msg, enc, next) {

    // if not NonceFrame, bail
    if (!(msg instanceof Frame)) {
      this.emit('replay-error', {error: err.NotNonceFrameErr, message: msg})
      return next()
    }

    // if not valid, bail
    var err = msg.validate()
    if (err) {
      this.emit('replay-error', {error: err, message: msg})
      return next()
    }

    // if filtering, check addrs
    if (opts.filterIncoming && noncesSeen[msg.nonce]) {
      this.emit('filtered-incoming', msg)
      return next()
    }

    // ok seems legit
    noncesSeen[msg.nonce] = true
    if (opts.unwrap)
      msg = msg.getDecodedPayload()
    this.push(msg)
    next()
  }
}

ReplayProtocol.defaults = {
  wrap: true,
  unwrap: true,
  nonceSize: 8, // 64bit
  filterIncoming: true,
}
