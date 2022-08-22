import * as tape from 'tape'

import { Trie /*decodeNode*/ } from '../../src'

/*async function dumpTrieNodes(trie: any) {
  const trieDB = trie.db._database
  for (const key of trieDB.keys()) {
    console.log(key)
    console.log(decodeNode(trieDB.get(key)))
  }
}*/

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

  // TODO

  it('should prune when keys are updated or deleted', async (st) => {
    const trie = new Trie({ pruneTrie: true })
    const keys: string[] = []
    for (let i = 0; i < 100; i++) {
      keys.push(i.toString(16))
    }
    const values: string[] = []
    for (let i = 0; i < 1000; i++) {
      let val = Math.floor(Math.random() * 16384)
      while (values.includes(val.toString(16))) {
        val = Math.floor(Math.random() * 16384)
      }
      values.push(val.toString(16))
    }
    for (let i = 0; i < keys.length; i++) {
      const idx = i < 100 ? i : Math.floor(Math.random() * 100)
      const key = keys[idx]
      await trie.put(Buffer.from(key), Buffer.from(values[i]))
    }
    st.equals((<any>trie.db)._database.size, 20, 'DB size correct')

    await trie.walkTrie(trie.root, (key) => {
      st.deepEqual(key, trie.root, 'Walk tree passed')
    })

    for (let i = 0; i < 20; i++) {
      await trie.del(Buffer.from(keys[i]))
    }
    st.equals((<any>trie.db)._database.size, 19, 'DB size correct')
    try {
      await trie.walkTrie(trie.root, (key) => {
        st.deepEqual(key, trie.root, 'Walk tree passed')
      })
      st.pass('Prune test passed')
    } catch {
      st.fail('Prune test failed')
    }
    st.end()
  })
})
