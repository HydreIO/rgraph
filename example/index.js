import Events from 'events'

import Redis from 'ioredis'

import Rgraph from '../src/index.js'

const client = new Redis()
const Graph = Rgraph(client)
const foo = Graph('foo_graph')
const user = {
  uuid: 'xxxx-xxxx-xxxx',
  name: 'Tony',
}

await Events.once(client, 'ready')
await foo.run/* cypher */ `MERGE (tony:User ${user})
// comments are supported yay! 🦆
RETURN tony`
await foo.delete()
