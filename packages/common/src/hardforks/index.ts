export const hardforks = {
  chainstart: require('./chainstart.json'),
  homestead: require('./homestead.json'),
  dao: require('./dao.json'),
  tangerineWhistle: require('./tangerineWhistle.json'),
  spuriousDragon: require('./spuriousDragon.json'),
  byzantium: require('./byzantium.json'),
  constantinople: require('./constantinople.json'),
  petersburg: require('./petersburg.json'),
  istanbul: require('./istanbul.json'),
  muirGlacier: require('./muirGlacier.json'),
  berlin: require('./berlin.json'),
  london: require('./london.json'),
  // TODO CLEANUP:
  // Eof is a dummy hardfork for testing and running shandong testnet/eof testnet
  // However its harmless as it never will get scheduled in real and would be cleaned
  // up post eof testnets are no longer needed
  eof: require('./eof.json'),
  shanghaiTime: require('./shanghai.json'),
  arrowGlacier: require('./arrowGlacier.json'),
  grayGlacier: require('./grayGlacier.json'),
  mergeForkIdTransition: require('./mergeForkIdTransition.json'),
  merge: require('./merge.json'),
  shardingForkTime: require('./sharding.json'),
}
