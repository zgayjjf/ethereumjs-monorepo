/**
 * Libp2p Bundle
 * @memberof module:net/peer
 */

import { Noise } from '@chainsafe/libp2p-noise'
import { Bootstrap } from '@libp2p/bootstrap'
import { KadDHT } from '@libp2p/kad-dht'
import { Mplex } from '@libp2p/mplex'
import { TCP } from '@libp2p/tcp'
import { WebSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { createLibp2pNode } from 'libp2p/libp2p'

import type { PeerId } from '@libp2p/interface-peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface Libp2pNodeOptions {
  /* Peer id */
  peerId: PeerId

  /* Addresses */
  addresses?: {
    listen: string[]
    announce: string[]
    announceFilter: (ma: Multiaddr[]) => Multiaddr[]
    noAnnounce: string[]
  }

  /* Bootnodes */
  bootnodes?: Multiaddr[]
}

export const Libp2pNode = (options: Libp2pNodeOptions) => {
  options.bootnodes = options.bootnodes ?? []
  options.addresses = options.addresses ?? {
    listen: [],
    announce: [],
    noAnnounce: [],
    announceFilter: (multiaddrs: Multiaddr[]) => {
      return multiaddrs
    },
  }
  return createLibp2pNode({
    peerId: options.peerId,
    addresses: options.addresses,
    transports: [new TCP(), new WebSockets({ filter: all })],
    streamMuxers: [new Mplex()],
    connectionEncryption: [new Noise()],
    peerDiscovery: [
      new Bootstrap({
        interval: 2000,
        list: options.bootnodes.map((ma) => ma.toString()),
      }),
    ],
    dht: new KadDHT({ kBucketSize: 20 }),
    connectionManager: {
      autoDial: false,
    },
  })
}
