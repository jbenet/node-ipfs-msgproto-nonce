# ifps-msgproto-nonce

[msgproto](http://github.com/jbenet/node-ipfs-msgproto) nonce frame. Adds nonces to messages.

- `ReplayProtocol` filters messages based on seeing the same nonce twice.
- `RequestProtocol` registers callbacks based on request ids.
