import Rgraph from '../src/index.js'
import Redis from 'ioredis'
import Events from 'events'

const client = new Redis()
const Graph = Rgraph(client)
const foo = Graph('foo_graph')
const user = {
  uuid: 'xxxx-xxxx-xxxx',
  name: 'Tony',
}

await Events.once(client, 'ready')
await foo.run/* cypher */`MERGE (tony:User ${ user })
// comments are supported yay! 🦆
RETURN tony`
await foo.delete()
