import { arrToBufArr } from '@ethereumjs/util'
import { keccak256 } from 'ethereum-cryptography/keccak'
import * as tape from 'tape'

import { BranchNode, ExtensionNode, Trie /*decodeNode*/ } from '../../src'
import { isTerminator } from '../../src/util/hex'

const crypto = require('crypto')

function mulberry32(a: any) {
  return function () {
    var t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const _rand = mulberry32(1353502818)
const rand = function () {
  const x = _rand()
  const buf = Buffer.from(x.toString())
  return arrToBufArr(keccak256(buf))
}

/*async function dumpTrieNodes(trie: any) {
  const trieDB = trie.db._database
  for (const key of trieDB.keys()) {
    console.log(key)
    console.log(decodeNode(trieDB.get(key)))
  }
}*/

// This method verifies if all keys in DB are reachable
async function verifyPrunedTrie(trie: Trie, tester: tape.Test, unprunedTrie: Trie) {
  const root = trie.root.toString('hex')
  let ok = true
  for (const dbkey of (<any>trie.db)._database.keys()) {
    if (dbkey === root) {
      continue
    }

    let found = false
    try {
      await trie.walkTrie(trie.root, async function (nodeRef, node, key, controller) {
        if (found) {
          return
        }
        if (node instanceof BranchNode) {
          for (const item of node._branches) {
            if (item && item.toString('hex') === dbkey) {
              found = true
              return
            }
          }
          controller.allChildren(node, key)
        }
        if (node instanceof ExtensionNode) {
          if (node.value.toString('hex') === dbkey) {
            found = true
            return
          }
          controller.allChildren(node, key)
        }
      })
    } catch (e: any) {
      tester.fail(`WalkTrie error: ${e.message}`)
      ok = false
    }
    if (!found) {
      tester.fail(`key not reachable in trie: ${dbkey}`)
      ok = false
    }
  }
  if (!ok) {
    tester.fail('failed to verify trie')
  }
}

tape('Pruned trie tests', function (tester) {
  const it = tester.test

  it('should prune simple trie', async function (st) {
    const trie = new Trie({ pruneTrie: true })
    const key = Buffer.from('test')
    await trie.put(key, Buffer.from('1'))
    await trie.put(key, Buffer.from('2'))
    await trie.put(key, Buffer.from('3'))
    await trie.put(key, Buffer.from('4'))
    await trie.put(key, Buffer.from('5'))
    await trie.put(key, Buffer.from('6'))

    st.equals((<any>trie.db)._database.size, 1, 'DB size correct')
  })

  it('should prune simple trie', async function (st) {
    const trie = new Trie({ pruneTrie: true })
    const key = Buffer.from('test')
    await trie.put(key, Buffer.from('1'))
    st.equals((<any>trie.db)._database.size, 1, 'DB size correct')

    await trie.del(key)
    st.equals((<any>trie.db)._database.size, 0, 'DB size correct')

    await trie.put(key, Buffer.from('1'))
    st.equals((<any>trie.db)._database.size, 1, 'DB size correct')
  })

  it('should prune trie with depth = 2', async function (st) {
    const trie = new Trie({ pruneTrie: true })
    // Create a Trie with
    const keys = ['01', '02', '0103', '0104', '0105']
    const values = ['00', '02', '03', '04', '05']

    for (let i = 0; i < keys.length; i++) {
      await trie.put(Buffer.from(keys[i], 'hex'), Buffer.from(values[i], 'hex'))
    }

    for (let i = 0; i < keys.length; i++) {
      //console.log(await trie.get(Buffer.from(keys[i], 'hex')))
    }
    st.end()
  })

  it('should prune when keys are updated or deleted', async (st) => {
    for (let testID = 0; testID < 1; testID++) {
      const trie = new Trie({ pruneTrie: true })
      const unpruned = new Trie()
      const keys: Buffer[] = []
      for (let i = 0; i < 100; i++) {
        keys.push(rand())
      }
      const values: string[] = []
      for (let i = 0; i < 1000; i++) {
        let val = Math.floor(_rand() * 16384)
        while (values.includes(val.toString(16))) {
          val = Math.floor(_rand() * 16384)
        }
        values.push(val.toString(16))
      }
      for (let i = 0; i < keys.length; i++) {
        console.log('put ' + i)
        const idx = Math.floor(_rand() * keys.length)
        const key = keys[idx]
        console.log('pkey', key.toString('hex'))
        await trie.put(Buffer.from(key), Buffer.from(values[i]))
        //await unpruned.put(Buffer.from(key), Buffer.from(values[i]))
        if (i === 62) {
          break
        }
        if (
          await trie.db.get(
            Buffer.from('b8a26708addba60814910d1cfbefe217b478a546e587d66267c9520eae3641ed', 'hex')
          )
        ) {
          console.log(i)
          console.log('IN')
          const x = Buffer.from(key)
          const y = Buffer.from(values[i])
          console.log('key', x.toString('hex'))
          console.log('val', y.toString('hex'))
          console.log('root', trie.root.toString('hex'))
          break
        }
      }

      //await verifyPrunedTrie(trie, st, unpruned)

      console.log('!!DELETE')
      for (let i = 0; i < 1; i++) {
        const idx = Math.floor(_rand() * keys.length)
        console.log('delme:', keys[idx].toString('hex'))
        await trie.del(Buffer.from(keys[idx]))
        await unpruned.del(Buffer.from(keys[idx]))
      }
      console.log('!!DONE')

      await verifyPrunedTrie(trie, st, unpruned)
    }
  })
})
