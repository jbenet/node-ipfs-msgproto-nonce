var fs = require('fs')
var msgproto = require('msgproto')
var Frame = msgproto.Frame

module.exports = NonceFrame

function NonceFrame(nonce, payload, payloadType) {
  if (!(this instanceof NonceFrame))
    return new NonceFrame(nonce, payload, payloadType)

  Frame.call(this, payload, payloadType)
  this.nonce = nonce
}

msgproto.Message.inherits(NonceFrame, Frame)

NonceFrame.prototype.toString = function() {
  var nonce = this.nonce.toString('hex')
  return "<NetworkFrame "+nonce+">"
}

NonceFrame.prototype.validate = function() {
  var err = Frame.prototype.validate.apply(this)
  if (err) return err

  if (!this.nonce || !(this.nonce instanceof Buffer))
    return new Error("no or invalid nonce")
}

NonceFrame.prototype.getEncodedData = function() {
  var data = Frame.prototype.getEncodedData.apply(this)
  data.nonce = this.nonce
  return data
}

NonceFrame.prototype.setDecodedData = function(data) {
  Frame.prototype.setDecodedData.apply(this, arguments)
  this.nonce = data.nonce
}

var src = fs.readFileSync(__dirname + '/nonce.proto', 'utf-8')
var protos = msgproto.ProtobufCodec.fromProtoSrc(src)
NonceFrame.codec = protos.NonceFrame
