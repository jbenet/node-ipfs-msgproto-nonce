var segment = require('pipe-segment')
var filterSegment = require('pipe-segment-filter')
var duplexer2 = require('duplexer2.jbenet')
var through2 = require('through2')
var msgproto = require('msgproto')
var extend = require('xtend')
var crypto = require('crypto')
var Frame = require('./frame')
var NotNetFrameErr = new Error('msg not a NetworkFrame')

module.exports = ReplayProtocol


// replay-protocol
// - outgoing packets get a random nonce
// - incoming packet nonces may only be used once
//   ----------- wrap ------- encode --->
//   <---- unwrap -- check -- decode ----
function ReplayProtocol(opts) {
  opts = extend(ReplayProtocol.defaults, opts || {})

  var noncesSeen = {} // this should be bounded with a fixed size cache

  var wire = msgproto.WireProtocol(Frame)
  var wraps = through2.obj(wrap)
  var unwraps = through2.obj(unwrap)
  var checks = filterSegment(checkNonce)

  // wire up the pipes
  wraps.pipe(wire.messages).pipe(checks.input)
  checks.output.pipe(unwraps)

  var seg = segment({
    wire: wire, // expose wire, for packing errors
    frames: wire.buffers,
    filtered: checks.filtered,
    payloads: duplexer2({objectMode: true}, wraps, unwraps),
  })
  seg.opts = opts
  seg.noncesSeen = noncesSeen
  return seg

  function randomNonce() {
    return crypto.randomBytes(opts.nonceSize) // handle callback err?
  }

  function wrap(msg, enc, next) {
    msg = Frame(randomNonce(), msg, opts.payloadType)
    this.push(msg)
    next()
  }

  function unwrap(msg, enc, next) {

    // if not NonceFrame, bail
    if (!(msg instanceof Frame)) {
      this.emit('replay-error', {error: NotNonceFrameErr, message: msg})
      return next()
    }

    // if not valid, bail
    var err = msg.validate()
    if (err) {
      this.emit('replay-error', {error: err, message: msg})
      return next()
    }

    // ok seems legit
    noncesSeen[msg.nonce] = true
    msg = msg.getDecodedPayload()
    this.push(msg)
    next()
  }

  function checkNonce(msg) {
    return !noncesSeen[msg.nonce]
  }
}

ReplayProtocol.defaults = {
  nonceSize: 8, // 64bit
  filterIncoming: true,
}
