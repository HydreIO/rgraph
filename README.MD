![][licence] [![][npm]][npmlink] [![][travis]][travislink] [![][npmdl]][npmlink]

<h1 align=center>@hydre/rgraph</h1>

[![][discord]][discordlink] [![][twitter]][twitterlink]

[licence]: https://img.shields.io/github/license/HydreIO/rgraph.svg?style=for-the-badge
[npm]: https://img.shields.io/npm/v/@hydre/rgraph.svg?logo=npm&style=for-the-badge
[npmlink]: https://www.npmjs.com/package/@hydre/rgraph
[travis]: https://img.shields.io/travis/com/HydreIO/rgraph.svg?logo=travis&style=for-the-badge
[travislink]: https://travis-ci.com/HydreIO/rgraph
[twitter]: https://img.shields.io/badge/follow-us-blue.svg?logo=twitter&style=for-the-badge
[twitterlink]: https://twitter.com/hydreio
[discord]: https://img.shields.io/discord/398114799776694272.svg?logo=discord&style=for-the-badge
[discordlink]: https://discord.gg/bRSpRpD
[npmdl]: https://img.shields.io/npm/dw/@hydre/rgraph.svg?color=%239C27B0&style=for-the-badge

A high performance Node.js reactive RedisGraph client. Built on RxJS

## Install

```
npm i @hydre/rgraph
```

## TL;DR

```js
import rgraph from '@hydre/rgraph'
import redis from 'redis'

const debug = require('debug')('test')
void async function () {
  const graph = rgraph(redis.createClient('redis://127.0.0.1:6379/'))('myGraph')
  const user = { uuid: 'xxx-xx-xxx', name: 'Tony' }
  debug('%O', await graph.run`MERGE (tony:User ${user}) RETURN tony`.toPromise())
  await graph.delete()
  debug('Graph deleted!')
}()
```

![](https://i.imgur.com/V9dTbFi.png)