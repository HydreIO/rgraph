import { from, zip } from 'rxjs'
import { flatMap, map, reduce, tap } from 'rxjs/operators'

import { SYMBOLS } from './constant'
import parser from './parser'
import redisGraph from './redis'

const debug = require('debug')('rgraph')

const { TRANSIENT, ...OtherSymbols } = SYMBOLS

/**
 * Ensure that redis graph understand the value we provide (https://oss.redislabs.com/redisgraph/result_structure/)
 * @param {Any} v value to transform
 */
const respifyValue = v => {
  if (v === TRANSIENT) return ''
  if (v === undefined || v === null) return 'NULL'
  switch (typeof v) {
    case 'boolean': return v ? 'true' : 'false'

    case 'number': return v % 1 === 0 ? (Number.isSafeInteger(v) ? v : `'${v}'`) : Number.parseFloat(v).toPrecision(15)

    case 'string':
    case 'bigint': return `'${v}'`

    case 'function':
    case 'symbol': return undefined

    // eslint-disable-next-line no-use-before-define
    case 'object': return respifyObject(v)

    // skip default
  }
}

const respifyObject = object => {
  if (Array.isArray(object)) return `[${object.filter(value => typeof value !== 'symbol').map(respifyValue)}]`
  const filteredObject = Object.fromEntries(Object.entries(object).filter(([key]) => typeof key !== 'symbol'))
  return `{${Object.entries(filteredObject).map(([key, value]) => `${key}:${respifyValue(value)}`).join(',')}}`
}

export const Internals = OtherSymbols
export default client => {
  const partialGraph = redisGraph(client)
  return graphId => {
    const { deleteGraph, queryGraph, ...procedures } = partialGraph(graphId)
    const parseResult$ = parser(procedures)
    const graphDebug = debug.extend(graphId)
    return {
      delete: deleteGraph,
      run: (...[raw, ...queryArguments]) => {
        queryArguments.push(TRANSIENT)
        return zip(from(raw), from(queryArguments).pipe(map(respifyValue))).pipe(
          reduce((accumulator, [a, b]) => [...accumulator, a, b], []),
          map(a => a.join('')),
          tap(cypherQuery => graphDebug(cypherQuery)),
          flatMap(cypherQuery => cypherQuery |> queryGraph |> from),
          tap(([, , stats]) => stats.forEach(s => s |> graphDebug)),
          flatMap(parseResult$),
        )
      },
    }
  }
}
