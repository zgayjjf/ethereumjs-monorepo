# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
(modification: no type change headlines) and this project adheres to
[Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 2.0.3 - 2023-02-21

Maintenance release with dependency updates, PR [#2521](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2521)

## 2.0.2 - 2022-12-09

Maintenance release with dependency updates, PR [#2445](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2445)

## 2.0.1 - 2022-10-18

- Updated `@ethereumjs/block` dependency version to `v4.0.1`

## 2.0.0 - 2022-09-06

Final release - tada 🎉 - of a wider breaking release round on the [EthereumJS monorepo](https://github.com/ethereumjs/ethereumjs-monorepo) libraries, see the Beta 1 release notes for the main long change set description as well as the Beta 2, Beta 3 and Release Candidate (RC) 1 release notes for notes on some additional changes ([CHANGELOG](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/tx/CHANGELOG.md)).

### Changes

- Internal refactor: removed ambiguous boolean checks within conditional clauses, PR [#2253](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2253)

## 2.0.0-rc.1 - 2022-08-29

Release candidate 1 for the upcoming breaking release round on the [EthereumJS monorepo](https://github.com/ethereumjs/ethereumjs-monorepo) libraries, see the Beta 1 release notes for the main long change set description as well as the Beta 2 and 3 release notes for notes on some additional changes ([CHANGELOG](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/ethash/CHANGELOG.md)).

### Maintenance Updates

- Added `engine` field to `package.json` limiting Node versions to v14 or higher, PR [#2164](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2164)
- Replaced `nyc` (code coverage) configurations with `c8` configurations, PR [#2192](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2192)
- Code formats improvements by adding various new linting rules, see Issue [#1935](https://github.com/ethereumjs/ethereumjs-monorepo/issues/1935)

## 2.0.0-beta.3 - 2022-08-10

Beta 3 release for the upcoming breaking release round on the [EthereumJS monorepo](https://github.com/ethereumjs/ethereumjs-monorepo) libraries, see the Beta 1 release notes for the main long change set description as well as the Beta 2 release notes for notes on some additional changes ([CHANGELOG](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/ethash/CHANGELOG.md)).

### Merge Hardfork Default

Since the Merge HF is getting close we have decided to directly jump on the `Merge` HF (before: `Istanbul`) as default in the underlying `@ethereumjs/common` library and skip the `London` default HF as we initially intended to set (see Beta 1 CHANGELOG), see PR [#2087](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2087).

This change should not directly affect this library but might be relevant since it is not recommended to use different Common library versions between the different EthereumJS libraries.

## 2.0.0-beta.2 - 2022-07-15

Beta 2 release for the upcoming breaking release round on the [EthereumJS monorepo](https://github.com/ethereumjs/ethereumjs-monorepo) libraries, see the Beta 1 release notes ([CHANGELOG](https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/ethash/CHANGELOG.md)) for the main change set description.

### Removed Default Exports

The change with the biggest effect on UX since the last Beta 1 releases is for sure that we have removed default exports all accross the monorepo, see PR [#2018](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2018), we even now added a new linting rule that completely disallows using.

Default exports were a common source of error and confusion when using our libraries in a CommonJS context, leading to issues like Issue [#978](https://github.com/ethereumjs/ethereumjs-monorepo/issues/978).

Now every import is a named import and we think the long term benefits will very much outweigh the one-time hassle of some import adoptions.

#### Common Library Import Updates

Since our [@ethereumjs/common](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common) library is used all accross our libraries for chain and HF instantiation this will likely be the one being the most prevalent regarding the need for some import updates.

So Common import and usage is changing from:

```typescript
import Common, { Chain, Hardfork } from '@ethereumjs/common'

const common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Merge })
```

to:

```typescript
import { Common, Chain, Hardfork } from '@ethereumjs/common'

const common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Merge })
```

### Removed Default Imports in this Library

The main `Ethash` class import has been updated, so import changes from:

```typescript
import Ethash from '@ethereumjs/ethash'
```

to:

```typescript
import { Ethash } from '@ethereumjs/ethash'
```

## Other Changes

- Added `ESLint` strict boolean expressions linting rule, PR [#2030](https://github.com/ethereumjs/ethereumjs-monorepo/pull/2030)

## 2.0.0-beta.1 - 2022-06-30

This release is part of a larger breaking release round where all [EthereumJS monorepo](https://github.com/ethereumjs/ethereumjs-monorepo) libraries (VM, Tx, Trie, other) get major version upgrades. This round of releases has been prepared for a long time and we are really pleased with and proud of the result, thanks to all team members and contributors who worked so hard and made this possible! 🙂 ❤️

We have gotten rid of a lot of technical debt and inconsistencies and removed unused functionality, renamed methods, improved on the API and on TypeScript typing, to name a few of the more local type of refactoring changes. There are also broader structural changes like a full transition to native JavaScript `BigInt` values as well as various somewhat deep-reaching refactorings, both within a single package as well as some reaching beyond the scope of a single package. Also two completely new packages - `@ethereumjs/evm` (in addition to the existing `@ethereumjs/vm` package) and `@ethereumjs/statemanager` - have been created, leading to a more modular Ethereum JavaScript VM.

We are very much confident that users of the libraries will greatly benefit from the changes being introduced. However - along the upgrade process - these releases require some extra attention and care since the changeset is both so big and deep reaching. We highly recommend to closely read the release notes, we have done our best to create a full picture on the changes with some special emphasis on delicate code and API parts and give some explicit guidance on how to upgrade and where problems might arise!

So, enjoy the releases (this is a first round of Beta releases, with final releases following a couple of weeks after if things go well)! 🎉

The EthereumJS Team

### BigInt Introduction / ES2020 Build Target

With this round of breaking releases the whole EthereumJS library stack removes the [BN.js](https://github.com/indutny/bn.js/) library and switches to use native JavaScript [BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt) values for large-number operations and interactions.

This makes the libraries more secure and robust (no more BN.js v4 vs v5 incompatibilities) and generally comes with substantial performance gains for the large-number-arithmetic-intense parts of the libraries (particularly the VM).

To allow for BigInt support our build target has been updated to [ES2020](https://262.ecma-international.org/11.0/). We feel that some still remaining browser compatibility issues on the edges (old Safari versions e.g.) are justified by the substantial gains this step brings along.

See [#1671](https://github.com/ethereumjs/ethereumjs-monorepo/pull/1671) and [#1771](https://github.com/ethereumjs/ethereumjs-monorepo/pull/1771) for the core `BigInt` transition PRs.

### Disabled esModuleInterop and allowSyntheticDefaultImports TypeScript Compiler Options

The above TypeScript options provide some semantic sugar like allowing to write an import like `import React from "react"` instead of `import * as React from "react"`, see [esModuleInterop](https://www.typescriptlang.org/tsconfig#esModuleInterop) and [allowSyntheticDefaultImports](https://www.typescriptlang.org/tsconfig#allowSyntheticDefaultImports) docs for some details.

While this is convenient, it deviates from the ESM specification and forces downstream users into using these options, which might not be desirable, see [this TypeScript Semver docs section](https://www.semver-ts.org/#module-interop) for some more detailed argumentation.

Along with the breaking releases we have therefore deactivated both of these options and you might therefore need to adapt some import statements accordingly. Note that you still can activate these options in your bundle and/or transpilation pipeline (but now you also have the option _not_ to, which you didn't have before).

### Level DB Upgrade / Browser Compatibility

The internal Level DB code has been reworked to now be based and work with the latest Level [v8.0.0](https://github.com/Level/level/releases/tag/v8.0.0) major Level DB release, see PR [#1949](https://github.com/ethereumjs/ethereumjs-monorepo/pull/1949). This allows to use ES6-style `import` syntax to import the `Level` instance and allows for better typing when working with Level DB.

Because of the upgrade, any `level` implementation compliant with the `abstract-level` interface can be use, including `classic-level`, `browser-level` and `memory-level`. This now makes it a lot easier to use the package in browsers without polyfills for `level`. For some context it is worth to mention that the `level` package itself is starting with the v8 release just a proxy for these other packages and has no functionality itself.

## 1.1.0 - 2021-09-24

### PoW Ethash CPU Miner

There is now a new simple CPU miner added to the `Ethash` package which can be used for testing purposes.

See the following example on how to use the new `Miner` class:

```typescript
import { Block } from '@ethereumjs/block'
import Ethash from '@ethereumjs/ethash'
import Common from '@ethereumjs/common'
import { BN } from 'ethereumjs-util'
const level = require('level-mem')

const cacheDB = level()
const block = Block.fromBlockData({
  header: {
    difficulty: new BN(100),
    number: new BN(1),
  },
})

const e = new Ethash(cacheDB)
const miner = e.getMiner(block.header)
const solution = await miner.iterate(-1) // iterate until solution is found
```

### Included Source Files

Source files from the `src` folder are now included in the distribution build, see PR [#1301](https://github.com/ethereumjs/ethereumjs-monorepo/pull/1301). This allows for a better debugging experience in debug tools like Chrome DevTools by having working source map references to the original sources available for inspection.

## 1.0.0 - 2020-11-24

### New Package Name

**Attention!** This new version is part of a series of EthereumJS releases all moving to a new scoped package name format. In this case the library is renamed as follows:

- `ethashjs` -> `@ethereumjs/ethash`

Please update your library references accordingly or install with:

```shell
npm i @ethereumjs/ethash
```

### Library Promisification

The `Ethash` library has been promisified and callbacks have been removed along PR [#833](https://github.com/ethereumjs/ethereumjs-monorepo/pull/833) and preceding PR [#779](https://github.com/ethereumjs/ethereumjs-monorepo/pull/779).

Old API:

```typescript
ethash.verifyPOW(validblock, (result) => {
  console.log(result)
})
```

New API:

```typescript
const result = await ethash.verifyPOW(validBlock)
console.log(result) // => true
```

See `Ethash` [README](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/ethash#usage) for a complete example.

[1.0.0]: https://github.com/ethereumjs/ethereumjs-monorepo/releases/tag/%40ethereumjs%2Fethash%401.0.0

### Dual ES5 and ES2017 Builds

We significantly updated our internal tool and CI setup along the work on PR [#913](https://github.com/ethereumjs/ethereumjs-monorepo/pull/913) with an update to `ESLint` from `TSLint` for code linting and formatting and the introduction of a new build setup.

Packages now target `ES2017` for Node.js builds (the `main` entrypoint from `package.json`) and introduce a separate `ES5` build distributed along using the `browser` directive as an entrypoint, see PR [#921](https://github.com/ethereumjs/ethereumjs-monorepo/pull/921). This will result in performance benefits for Node.js consumers, see [here](https://github.com/ethereumjs/merkle-patricia-tree/pull/117) for a releated discussion.

### Other Changes

- Updated Block dependency to `@ethereumjs/block` `v3.0.0`, PR [#883](https://github.com/ethereumjs/ethereumjs-monorepo/pull/883)
- Removed `async` dependency, PR [#779](https://github.com/ethereumjs/ethereumjs-monorepo/pull/779)

## 1.0.0-rc.1 - 2020-11-19

This is the first release candidate towards a final library release, see [beta.1](https://github.com/ethereumjs/ethereumjs-monorepo/releases/tag/%40ethereumjs%2Fethash%401.0.0-beta.1) release notes for an overview on the full changes since the last publicly released version.

No changes since `beta.1` release.

## 1.0.0-beta.1 - 2020-10-22

### New Package Name

**Attention!** This new version is part of a series of EthereumJS releases all moving to a
new scoped package name format. In this case the library is renamed as follows:

- `ethashjs` -> `@ethereumjs/ethash`

Please update your library references accordingly or install with:

```shell
npm i @ethereumjs/ethash
```

### Library Promisification

The `Ethash` library has been promisified and callbacks have been removed along
PR [#833](https://github.com/ethereumjs/ethereumjs-monorepo/pull/833) and preceding PR
[#779](https://github.com/ethereumjs/ethereumjs-monorepo/pull/779).

Old API:

```typescript
ethash.verifyPOW(validblock, (result) => {
  console.log(result)
})
```

New API:

```typescript
const result = await ethash.verifyPOW(validBlock)
console.log(result) // => true
```

See `Ethash` [README](https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/ethash#usage)
for a complete example.

[1.0.0]: https://github.com/ethereumjs/ethereumjs-monorepo/releases/tag/%40ethereumjs%2Fethash%401.0.0

### Dual ES5 and ES2017 Builds

We significantly updated our internal tool and CI setup along the work on
PR [#913](https://github.com/ethereumjs/ethereumjs-monorepo/pull/913) with an update to `ESLint` from `TSLint`
for code linting and formatting and the introduction of a new build setup.

Packages now target `ES2017` for Node.js builds (the `main` entrypoint from `package.json`) and introduce
a separate `ES5` build distributed along using the `browser` directive as an entrypoint, see
PR [#921](https://github.com/ethereumjs/ethereumjs-monorepo/pull/921). This will result
in performance benefits for Node.js consumers, see [here](https://github.com/ethereumjs/merkle-patricia-tree/pull/117) for a releated discussion.

### Other Changes

- Updated Block dependency to `@ethereumjs/block` `v3.0.0`,
  PR [#883](https://github.com/ethereumjs/ethereumjs-monorepo/pull/883)
- Removed `async` dependency,
  PR [#779](https://github.com/ethereumjs/ethereumjs-monorepo/pull/779)

## [0.0.8] - 2020-05-27

This is a maintenance release with dependency updates, CI improvements, and some code modernization.

Changes from PR [#23](https://github.com/ethereumjs/ethashjs/pull/23):

- Upgraded CI from travis to GH Actions
- Node versions tested updated from [4, 5] to [10, 12, 13, 14]
- Upgraded dev deps (ethereumjs-block, nyc, standard)
- Added `ethash_tests.json` to test dir and removes ethereumjs-testing dep
- Use single imports for ethereumjs-util, upgrades to v7.0.2
- Modernizes buffer init syntax

Further/preceding dependency updates in
PR [#19](https://github.com/ethereumjs/ethashjs/pull/19),
PR [#11](https://github.com/ethereumjs/ethashjs/pull/11),
PR [#8](https://github.com/ethereumjs/ethashjs/pull/8) and
PR [#7](https://github.com/ethereumjs/ethashjs/pull/7)

[0.0.8]: https://github.com/ethereumjs/ethashjs/compare/v0.0.7...v0.0.8

## Older releases:

- [0.0.7](https://github.com/ethereumjs/ethashjs/compare/v0.0.6...v0.0.7) - 2016-05-01
- [0.0.6](https://github.com/ethereumjs/ethashjs/compare/v0.0.5...v0.0.6) - 2016-01-08
- [0.0.5](https://github.com/ethereumjs/ethashjs/compare/v0.0.4...v0.0.5) - 2015-11-27
- 0.0.4 - 2015-10-01
