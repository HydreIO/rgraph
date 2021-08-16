<h1 align=center>@hydre/rgraph</h1>
<p align=center>
  <img src="https://img.shields.io/github/license/hydreio/rgraph.svg?style=for-the-badge" />
  <img src="https://img.shields.io/codecov/c/github/hydreio/rgraph/edge?logo=codecov&style=for-the-badge"/>
  <a href="https://www.npmjs.com/package/@hydre/rgraph">
    <img src="https://img.shields.io/npm/v/@hydre/rgraph.svg?logo=npm&style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/npm/dw/@hydre/rgraph?logo=npm&style=for-the-badge" />
  <img src="https://img.shields.io/github/workflow/status/hydreio/rgraph/CI?logo=Github&style=for-the-badge" />
</p>

<h3 align=center>A high performance Node.js
  <a href="https://github.com/RedisGraph/RedisGraph" target="_blank">RedisGraph</a>
  client.
</h3>

> **Redisgraph `>2.10`**

- Light & Fast
- Easy to use
- Functionnal nature
- Procedures caching
- Parameterized queries _(since `4.3.0`)_
- Multi graph
- **BigInt support**
- Tagged templates literals
- Es modules
- Side effects free
- Loved by ladies
- On the blockchain
- Less than 0.1% gluten
- I'm out off buzzwords

Rgraph use tagged templates in order to seamlessly serialize any inputs
while keeping a nice flow which looks like simple interpolation.

## Install

```
npm i @hydre/rgraph
```

> Node >16
```
node index.js
```

## TL;DR

![](https://i.imgur.com/JiG19RH.png)

```js
import Rgraph from '@hydre/rgraph'
import Redis  from 'ioredis'
import Events from 'events'

const client = new Redis()
const Graph  = Rgraph(client)
const foo    = Graph('foo')
const user   = { uuid: 'xxxx-xxxx-xxxx', name: 'Tony' }

await Events.once(client, 'ready')
await foo.run`MERGE (tony:User ${ user }) RETURN tony`
await foo.delete()
```

## Debug

allow debug logs with the `DEBUG='rgraph*'` env variable

## Usage

Get yourself some tea and meat by providing your redis client

```js
import Rgraph from '@hydre/rgraph'
import Redis  from 'ioredis'

const redis_client = new Redis()
const use_graph    = Rgraph(redis_client)
```

Wow now you can get as much graphs as you want 💃 !
go ahead don't be afraid it's redis, not neo4j 🦐

```js
const my_first_graph = use_graph('myFirstGraph')
const foo            = use_graph('anotherGraph')
const thanos         = use_graph('hail-hydra')
const bar            = use_graph('barGraph')
```

Run any [Cypher](https://neo4j.com/docs/cypher-manual/current/) query with a tag template or delete your poor graph
```js
await foo.run`MATCH (n) RETURN n`
await thanos.delete()
```

Let me show you the result structure for each type, with the visible properties
you also have access to some internals infos like ids and labels etc..

```js
import { Internals } from '@hydre/rgraph'

[
  // each object is a sequence of the results
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
]
```

## Operators

The library provide some additional operators

```js
import { raw } from '@hydre/rgraph/operators'

const maybe = false ? 'AND 1 = 2' : ''
const conditionnal = `WHERE 1 = 1 ${ raw(maybe) }`
```

Welcome to the era of fast graphs..

![](https://forthebadge.com/images/badges/certified-snoop-lion.svg)

```js
await myFirstGraph.run/* cypher */`
MERGE (foo:User ${ user })-[:Knows]->(thanos { name: 'Thanos', age: ${5 + 5}, a: ${true}, c: ${51.000000000016} })
WITH foo, thanos
MATCH path = ()-[]-()
RETURN path`
```
![](https://i.imgur.com/oTrFy25.png)

## Comments

> new in 4.2.0

When writting long queries you might want to help your team to understand it
by adding comments. Every _trimmed_ new line starting with `//` will be ignored

```js
await graph.run/* cypher */`
  MATCH (u:User)
  WHERE (
    u.name = 'pepeg' AND
    u.age > 30
  )
  // hey i'm a comment
  RETURN u AS goog_pepeg
`
```

## FAQ

**Can i use nested objects ?**

No, a Graph database use Nodes, not documents. A node is a hash of key value pairs
and edges (relations) to other nodes

**Commonjs support**

I don't plan to support commonjs as i don't plan to ask tesla to use fuel.
If you're still using commonjs, it will be better if you shutdown your computer right now

**Edit me**
