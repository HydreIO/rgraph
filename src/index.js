import { from, zip } from 'rxjs'
import { flatMap, map, reduce, tap } from 'rxjs/operators'

import parser from './parser'
import redisGraph from './redis'

const transient = Symbol('transient')
const debug = require('debug')('rgraph')

/**
 * Ensure that redis graph understand the value we provide (https://oss.redislabs.com/redisgraph/result_structure/)
 * @param {Any} v value to transform
 */
const respifyValue = v => {
  if (v === transient) return ''
  if (v === undefined || v === null) return 'NULL'
  switch (typeof v) {
    case 'boolean': return v ? 'true' : 'false'

    case 'number': return v % 1 === 0 ? (Number.isSafeInteger(v) ? v : `'${v}'`) : Number.parseFloat(v).toPrecision(15)

    case 'string':
    case 'bigint': return `'${v}'`

    case 'function':
    case 'symbol': return undefined

    case 'object':
      if (Array.isArray(v)) return `[${v.map(i => respifyValue(i))}]`
      return `{${Object.entries(v).map(([key, value]) => `${key}:${respifyValue(value)}`).join(',')}}`
    // skip default
  }
}

export default client => {
  const partialGraph = redisGraph(client)
  return graphId => {
    const { deleteGraph, queryGraph, ...procedures } = partialGraph(graphId)
    const parseResult$ = parser(procedures)
    return {
      delete: deleteGraph,
      run: (...[raw, ...queryArguments]) => {
        queryArguments.push(transient)
        return zip(from(raw), from(queryArguments).pipe(map(respifyValue))).pipe(
          reduce((accumulator, [a, b]) => [...accumulator, a, b], []),
          map(a => a.join('')),
          tap(q => debug.extend('running')('%O', q)),
          flatMap(cypherQuery => cypherQuery |> queryGraph |> from),
          tap(([, , stats]) => stats.forEach(s => s |> debug.extend('stats'))),
          flatMap(parseResult$),
        )
      },
    }
  }
}
