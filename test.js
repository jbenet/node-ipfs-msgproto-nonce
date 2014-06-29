var test = require('tape')
var map = require('lodash.map')
var multiDgrams = require('multi-dgram-stream')
var msgproto = require('msgproto')
var mpNonce = require('./')
var duplicate = require('./duplicate')

function setupReplayStreams(addrs) {
  addrs = map(addrs, function(a) {
    return 'localhost:' + a
  })

  return map(addrs, function (addr) {
    var wire = multiDgrams(addr, addrs)
    wire = duplicate(wire) // duplicates all messages. both outgoing + incoming.

    // wire things up
    var proto = mpNonce.ReplayProtocol()
    wire.pipe(proto.frames).pipe(wire)
    proto.addr = addr
    return proto
  })
}


test('test replay', function(t) {
  var numMessages = 10
  t.plan((numMessages * (3 * 2 * 4 + 1)) + 1)

  var sent = {}
  var recv = {}
  function received(payload, s) {
    sent[payload]._received++
    if (sent[payload]._received == (streams.length * 4)) { // all got it.
      delete sent[payload]
      t.ok(!sent[payload], 'should be done with msg: ' + payload)
    }

    if (Object.keys(sent).length == 0) { // all done
      map(streams, function(s) {
        s.payloads.write(null)
        s.frames.write(null)
        s.payloads.end() // why doesn't s.end() work!?
      })
      t.ok(true, 'should be done')
    }
  }

  var streams = setupReplayStreams([1234, 2345, 3456])
  map(streams, function(s) {
    recv[s.addr] = {}
    s.payloads.on('data', function(msg) {
      t.ok(sent[msg], 'should have sent it')
      t.ok(!recv[s.addr][msg], 'should NOT have seen it before')
      recv[s.addr][msg] = 1
      received(msg, s)
    })

    s.filtered.on('data', function(msg) {
      msg = msg.payload
      t.ok(sent[msg], 'should have sent it (filtered)')
      t.ok(recv[s.addr][msg], 'should have seen it before')
      received(msg, s)
    })
  })

  for (var i = 0; i < numMessages; i++) {
    var payload = new Buffer('hello there #' + i)
    var sender = streams[(i + 1) % streams.length]
    payload._received = 0
    sent[payload] = payload
    sender.payloads.write(payload)
    console.log('sent: ' + payload)
  }
})
