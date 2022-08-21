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

    // TODO
    st.end()
  })
})
