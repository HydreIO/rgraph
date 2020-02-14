![][licence]

<h1 align=center>@hydre/rgraph</h1>

[![][discord]][discordlink] [![][twitter]][twitterlink]

[licence]: https://img.shields.io/github/license/HydreIO/doubt.svg?style=for-the-badge
[twitter]: https://img.shields.io/badge/follow-us-blue.svg?logo=twitter&style=for-the-badge
[twitterlink]: https://twitter.com/hydreio
[discord]: https://img.shields.io/discord/398114799776694272.svg?logo=discord&style=for-the-badge
[discordlink]: https://discord.gg/bRSpRpD

A high performance Node.js reactive RedisGraph client. Written on top of RxJS in 100 lines

## Install

```
npm i @hydre/rgraph
```

## :book: Documentation

> This doc is a work in progress

```js
import rgraph from '@hydre/rgraph'
import redis from 'redis'

const graph = rgraph(redis.createClient('redis://127.0.0.1:6379/'))('test')
const user = { uuid: 'xxx-xx-xxx', name: 'Tony' }

void async function () {
  const { foo: { uuid, name } } = await graph.run`MERGE (foo:User ${user}) RETURN foo`.toPromise()
  await graph.delete()
}()
```
