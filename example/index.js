import Rgraph from '../src/index.js'
import Redis from 'ioredis'
import Events from 'events'
import Debug from 'debug'

const log = Debug('graph')
const client = new Redis()
const Graph = Rgraph(client)
const foo = Graph('foo')
const user = {
  uuid: 'xxxx-xxxx-xxxx',
  name: 'Tony',
}

await Events.once(client, 'ready')
log('%O', await foo.run`MERGE (tony:User ${ user }) RETURN tony`)
await foo.delete()
