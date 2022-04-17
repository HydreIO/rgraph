/* eslint-disable max-lines */
/* eslint-disable max-len */
import { pipeline, PassThrough } from 'stream'
import events from 'events'

import Doubt from '@hydre/doubt'
import reporter from 'tap-spec-emoji'
import Redis from 'ioredis'
import compose from 'docker-compose'

import Rgraph from '../src/index.js'
import { SYMBOLS } from '../src/constant.js'
import { raw } from '../src/operators.js'

const through = new PassThrough()
const cwd = process.cwd()

pipeline(through, reporter(), process.stdout, () => {})

const doubt = Doubt({
  stdout: through,
  title: 'Rgraph',
  calls: 11,
})

try {
  await compose.upAll({
    cwd,
    log: true,
    commandOptions: ['--build'],
  })

  const client = new Redis({
    retryStrategy: attempt => {
      if (attempt > 10)
        return new Error(`Can't connect to redis after ${attempt} tries..`)
      return 250 * 2 ** attempt
    },
  })

  await events.once(client, 'ready')

  const Graph = Rgraph(client)
  const graph = Graph('Rgraph_test')
  const user = {
    name: 'Paul',
    age: 8442424654262161621362n,
    age_small: 84654262161621362n,
    type: undefined,
    wicked: true,
    boomer: null,
    zoomer: false,
    drugs_count: 5,
    hey: () => 'listen',
  }

  await graph.run/* cypher */ `CREATE (a:User {origin: 'america'}) SET a += ${user}`
  await graph.run/* cypher */ `CREATE ()-[:FOO_BAR]->()`

  const [{ paul }] = await graph.run/* cypher */ `
  // this is a comment
  MATCH (paul:User) WHERE paul.name CONTAINS 'Pau' RETURN paul`

  doubt['A node can be created']({
    because: paul.name,
    is: 'Paul',
  })

  const [{ edge } = {}] = await graph.run/* cypher */ `
  // this is a comment
  MATCH (a)-[r:FOO_BAR]-() RETURN r AS edge`

  doubt['An edge can be created']({
    because: edge,
    is: {
      [SYMBOLS.ID]: 0,
      [SYMBOLS.EDGE_LABEL]: 'FOO_BAR',
      [SYMBOLS.SOURCE_NODE_ID]: 1,
      [SYMBOLS.DESTINATION_NODE_ID]: 2,
    },
  })

  await graph.run/* cypher */ `
  MATCH (a)-[:FOO_BAR]-(b)
  DELETE a, b
  `

  try {
    await graph.run/* cypher */ `CREATE (${{ a: { b: 1 } }})`
  } catch (error) {
    doubt['Nesting objects throws an error']({
      because: error.message,
      is: '{ b: 1 } is a nested object and thus not currently supported in redisgraph',
    })
  }

  doubt['Map projetions correctly work']({
    because: await graph.run/* cypher */ `
  CREATE (:Map { name: 'bob', surname: 'doe' }), (:Map { name: 'bob', surname: 'doe' })
  WITH null AS r
  MATCH (a:Map)
  RETURN a { .name, .surname } AS map
  `,
    is: [
      {
        map: {
          name: 'bob',
          surname: 'doe',
        },
      },
      {
        map: {
          name: 'bob',
          surname: 'doe',
        },
      },
    ],
  })

  try {
    await graph.run/* cypher */ `CREATE (a) SET a.hoes = ${[{ a: 1 }]}`
  } catch (error) {
    doubt['Nesting objects in an array throws an error']({
      because: error.message,
      is: '[ { a: 1 } ] is a nested object and thus not currently supported in redisgraph',
    })
  }

  try {
    await graph.run/* cypher */ `CREATE (a) += ${{ a: { b: 3 } }}`
  } catch (error) {
    doubt['Nesting objects in an operator also throws an error']({
      because: error.message,
      is: '{ b: 3 } is a nested object and thus not currently supported in redisgraph',
    })
  }

  doubt['Weird data types are covered']({
    because: await graph.run/* cypher */ `
      // this is a comment
      UNWIND ${[1, 2]} AS num
      MERGE (n)-[r:A { t: num}]-(b)
      RETURN collect(n) as debussy, r`.then(([{ debussy }]) => debussy),
    is: [
      {
        [SYMBOLS.ID]: 1,
        [SYMBOLS.NODE_LABELS]: [],
      },
    ],
  })

  doubt['A node can be deleted']({
    because: await graph.run/* cypher */ `MATCH (a:User) DELETE a`,
    is: undefined,
  })

  doubt['No result is a valid result']({
    because: await graph.run/* cypher */ `MATCH (a:Bird) RETURN a`,
    is: [],
  })

  try {
    await graph.run`${raw('MATCH (a:Birds) RETURN collect(b)')}`
  } catch (error) {
    doubt['Invalid cypher correctly throw']({
      because: error.message,
      is: 'b not defined',
    })
  }

  doubt['A path can be queried']({
    because: await graph.run/* cypher */ `
    MERGE (foo:User ${{
      name: 'sceat',
    }})-[:Knows]->(thanos { name: 'Thanos', age: ${
      5 + 5
    }, a: ${true}, b: ${922337203}, c: ${51.000000000016}, d: ${0} })
    WITH foo, thanos
    MATCH path = ()-[]-()
    RETURN path`,
    is: [
      {
        path: {
          nodes: [
            {
              name: 'sceat',
              [SYMBOLS.ID]: 0,
              [SYMBOLS.NODE_LABELS]: ['User'],
            },
            {
              name: 'Thanos',
              age: 10,
              a: true,
              b: 922337203,
              c: 51.000000000016,
              d: 0,
              [SYMBOLS.ID]: 5,
              [SYMBOLS.NODE_LABELS]: [],
            },
          ],
          edges: [
            {
              [SYMBOLS.ID]: 2,
              [SYMBOLS.EDGE_LABEL]: 'Knows',
              [SYMBOLS.SOURCE_NODE_ID]: 0,
              [SYMBOLS.DESTINATION_NODE_ID]: 5,
            },
          ],
        },
      },
      {
        path: {
          nodes: [
            {
              [SYMBOLS.ID]: 1,
              [SYMBOLS.NODE_LABELS]: [],
            },
            {
              [SYMBOLS.ID]: 2,
              [SYMBOLS.NODE_LABELS]: [],
            },
          ],
          edges: [
            {
              t: 2,
              [SYMBOLS.ID]: 0,
              [SYMBOLS.EDGE_LABEL]: 'A',
              [SYMBOLS.SOURCE_NODE_ID]: 1,
              [SYMBOLS.DESTINATION_NODE_ID]: 2,
            },
          ],
        },
      },
      {
        path: {
          nodes: [
            {
              [SYMBOLS.ID]: 2,
              [SYMBOLS.NODE_LABELS]: [],
            },
            {
              [SYMBOLS.ID]: 1,
              [SYMBOLS.NODE_LABELS]: [],
            },
          ],
          edges: [
            {
              t: 2,
              [SYMBOLS.ID]: 0,
              [SYMBOLS.EDGE_LABEL]: 'A',
              [SYMBOLS.SOURCE_NODE_ID]: 1,
              [SYMBOLS.DESTINATION_NODE_ID]: 2,
            },
          ],
        },
      },
      {
        path: {
          nodes: [
            {
              [SYMBOLS.ID]: 3,
              [SYMBOLS.NODE_LABELS]: [],
            },
            {
              [SYMBOLS.ID]: 4,
              [SYMBOLS.NODE_LABELS]: [],
            },
          ],
          edges: [
            {
              t: 1,
              [SYMBOLS.ID]: 1,
              [SYMBOLS.EDGE_LABEL]: 'A',
              [SYMBOLS.SOURCE_NODE_ID]: 3,
              [SYMBOLS.DESTINATION_NODE_ID]: 4,
            },
          ],
        },
      },
      {
        path: {
          nodes: [
            {
              [SYMBOLS.ID]: 4,
              [SYMBOLS.NODE_LABELS]: [],
            },
            {
              [SYMBOLS.ID]: 3,
              [SYMBOLS.NODE_LABELS]: [],
            },
          ],
          edges: [
            {
              t: 1,
              [SYMBOLS.ID]: 1,
              [SYMBOLS.EDGE_LABEL]: 'A',
              [SYMBOLS.SOURCE_NODE_ID]: 3,
              [SYMBOLS.DESTINATION_NODE_ID]: 4,
            },
          ],
        },
      },
      {
        path: {
          nodes: [
            {
              name: 'Thanos',
              age: 10,
              a: true,
              b: 922337203,
              c: 51.000000000016,
              d: 0,
              [SYMBOLS.ID]: 5,
              [SYMBOLS.NODE_LABELS]: [],
            },
            {
              name: 'sceat',
              [SYMBOLS.ID]: 0,
              [SYMBOLS.NODE_LABELS]: ['User'],
            },
          ],
          edges: [
            {
              [SYMBOLS.ID]: 2,
              [SYMBOLS.EDGE_LABEL]: 'Knows',
              [SYMBOLS.SOURCE_NODE_ID]: 0,
              [SYMBOLS.DESTINATION_NODE_ID]: 5,
            },
          ],
        },
      },
    ],
  })
  await graph.delete()
  await client.quit()
} catch (error) {
  console.error(error)
} finally {
  await compose.down({
    cwd,
    log: true,
  })
}
