![][licence] [![][npm]][npmlink] [![][travis]][travislink] [![][npmdl]][npmlink]

<h1 align=center>@hydre/rgraph</h1>

[![][discord]][discordlink] [![][twitter]][twitterlink]

[licence]: https://img.shields.io/github/license/HydreIO/rgraph?style=for-the-badge
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

- Light
- RxJS observables
- Procedures caching
- Multi graph with partial application
- Template literal parameters
- Extends redis client

> Hey ! i'm brand new, beware and be ready to fill some issues 📃

## Install

```
npm i @hydre/rgraph
```

## TL;DR

![](https://i.imgur.com/CHEHoWB.png)

```js
import rgraph from '@hydre/rgraph'
import redis from 'redis'

const debug = require('debug')('graph')
void async function () {
  const graph = rgraph(redis.createClient('redis://127.0.0.1:6379/'))('myGraph')
  const user = { uuid: 'xxx-xx-xxx', name: 'Tony' }
  debug('%O', await graph.run`MERGE (tony:User ${user}) RETURN tony`.toPromise())
  await graph.delete()
  debug('Graph deleted!')
}()
```

## Usage

Get yourself some tea and meat by providing your redis client

```js
import rgraph from '@hydre/rgraph'
import redis from 'redis'

const redisClient = redis.createClient(...)
const useGraph = rgraph(redisClient)
```

Wow now you can get as much graphs as you want 💃 !
go ahead don't be afraid it's redis, not neo4j 🦐

```js
const myFirstGraph = useGraph('myFirstGraph')
const foo = useGraph('anotherGraph')
const thanos = useGraph('hail-hydra')
const bar = useGraph('barGraph')
```

Run any [Cypher](https://neo4j.com/docs/cypher-manual/current/) query with a tag template or delete your poor graph
```js
await foo.run`MATCH (n) RETURN n`.toPromise()
await thanos.delete()
```

The run function give you an RxJS observable, you can do pretty neat powerful dank stuff
like querying a graph with the result of another damn easily.. yeah it's real

```js
foo.run`MATCH path = ()-[]-() RETURN path`
  // here we map the result to extract the nodes, then we flatMap with another query using the retrieved node
  .pipe(
    map(result => result.path.nodes[0]),
    flatMap(node => bar.run`MATCH (n ${node}) RETURN n`))
  .subscribe(({ n }))
```

Let me show you the result structure for each type, with the visible properties
you also have access to some internals infos like ids and labels etc..

```js
import { Internals } from '@hydre/rgraph'

{
  // For a scalar
  ['label in the RETURN statement']: 'value', // the returned value

  // For a node
  ['label in the RETURN statement']: {
    ['each']: ...,
    ['node']: ...,
    ['properties']: ...,
    [Internals.ID]: 0, // the node internal id
    [Internals.NODE_LABELS]: [], // the node labels
  },

  // For an edge
  ['label in the RETURN statement']: {
    ['each']: ...,
    ['node']: ...,
    ['properties']: ...,
    [Internals.ID]: 0, // the edge internal id
    [Internals.EDGE_LABEL]: 'label', // the edge label
    [Internals.SOURCE_NODE_ID]: 0, // the source node id
    [Internals.DESTINATION_NODE_ID]: 0 // the destination id
  },

  // For a path
  ['label in the RETURN statement']: {
    nodes: [], // an array of nodes (same representation as above but without the return label)
    edges: [] // an array of edges
  }
}
```

Welcome to the era of fast graphs..

```js
import { interval } from 'rxjs'
import { concatMapTo } from 'rxjs/operators'

const debug = require('debug')('graph')

const result$ = myFirstGraph.run`
MERGE (foo:User ${user})-[:Knows]->(thanos { name: 'Thanos', age: ${5 + 5}, a: ${true}, b: ${922337203}, c: ${51.000000000016} })
WITH foo, thanos
MATCH path = ()-[]-()
RETURN path`

interval(1000).pipe(concatMapTo(result$), map(({ path: { nodes } }) => `Found ${nodes.length} nodes`)).subscribe(debug)
```
![](https://i.imgur.com/s2wfP9y.png)

## FAQ

**Hey calling a function directly with a tag template literal is a bad practice!!**

Yes i know, feel free to tweet bad stuff about me!

**Can i use nested objects ?**

No, cypher doesn't support them so don't
```js
`MERGE (:User { foo: 5, bar: ${{ baz: 1 }})`
```

**Edit me**
