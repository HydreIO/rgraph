/* eslint-disable max-len */
import Doubt from '@hydre/doubt'
import reporter from 'tap-spec-emoji'
import { pipeline, PassThrough } from 'stream'
import Docker from 'dockerode'
import Redis from 'ioredis'
import events from 'events'
import Rgraph from '../src/index.js'
import { SYMBOLS } from '../src/constant.js'
import { plus_equals } from '../src/operators.js'

const through = new PassThrough()

pipeline(through, reporter(), process.stdout, () => {})

const docker = new Docker()
const container = await docker.createContainer({
  Image       : 'redislabs/redisgraph',
  AttachStdout: false,
  HostConfig  : {
    NetworkMode: 'host',
  },
})
const doubt = Doubt({
  stdout: through,
  title : 'Rgraph',
  calls : 5,
})

try {
  await container.start()
  await new Promise(resolve => setTimeout(resolve, 100))

  const client = new Redis({
    retryStrategy: attempt => {
      if (attempt > 10)
        return new Error(`Can't connect to redis after ${ attempt } tries..`)
      return 250 * 2 ** attempt
    },
  })

  await events.once(client, 'ready')

  const Graph = Rgraph(client)
  const graph = Graph('foo')
  const user = {
    name       : 'Paul',
    age        : 8442424654262161621362n,
    age_small  : 84654262161621362n,
    type       : undefined,
    wicked     : true,
    drugs_count: 5,
    hey        : () => 'listen',
  }

  await graph.run`CREATE (a:User {origin: 'america'}) SET ${ plus_equals(
      'a',
      user,
  ) }`

  const {
    paul,
  } = await graph.run`MATCH (paul:User) WHERE paul.name CONTAINS 'Pau' RETURN paul`

  doubt['A node can be created']({
    because: paul.name,
    is     : 'Paul',
  })

  doubt['Weird data types are covered']({
    because: await graph.run`
      UNWIND ${ [1, 2] } AS num
      MERGE (n)-[r:A { t: num}]-(b)
      RETURN collect(n) as debussy, r`.then(({ debussy }) => debussy),
    is: [
      {
        [SYMBOLS.ID]         : 1,
        [SYMBOLS.NODE_LABELS]: [],
      },
    ],
  })

  doubt['A node can be deleted']({
    because: await graph.run`MATCH (a:User) DELETE a`,
    is     : undefined,
  })

  doubt['No result is a valid result']({
    because: await graph.run`MATCH (a:Bird) RETURN a`,
    is     : undefined,
  })

  doubt['A path can be queried']({
    because: await graph.run`
    MERGE (foo:User ${ {
    name: 'sceat',
  } })-[:Knows]->(thanos { name: 'Thanos', age: ${ 5
      + 5 }, a: ${ true }, b: ${ 922337203 }, c: ${ 51.000000000016 } })
    WITH foo, thanos
    MATCH path = ()-[]-()
    RETURN path`,
    is: {
      path: {
        nodes: [
          {
            name                 : 'sceat',
            [SYMBOLS.ID]         : 0,
            [SYMBOLS.NODE_LABELS]: ['User'],
          },
          {
            name                 : 'Thanos',
            age                  : 10,
            a                    : true,
            b                    : 922337203,
            c                    : 51.000000000016,
            [SYMBOLS.ID]         : 1,
            [SYMBOLS.NODE_LABELS]: [],
          },
        ],
        edges: [
          {
            [SYMBOLS.ID]                 : 0,
            [SYMBOLS.EDGE_LABEL]         : 'Knows',
            [SYMBOLS.SOURCE_NODE_ID]     : 0,
            [SYMBOLS.DESTINATION_NODE_ID]: 1,
          },
        ],
      },
    },
  })

  // tests

  await client.quit()
} finally {
  await container.stop()
  await container.remove()
}
