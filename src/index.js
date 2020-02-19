import { from, zip, empty } from 'rxjs'
import { flatMap, map, reduce, tap, switchMap } from 'rxjs/operators'

import { SYMBOLS } from './constant'
import { graphParser, respParser } from './parsing'
import redisGraph from './redis'

const debug = require('debug')('rgraph')

const { TRANSIENT, ...OtherSymbols } = SYMBOLS

export const Internals = OtherSymbols
export default client => {
  const partialGraph = redisGraph(client)
  return graphId => {
    const { deleteGraph, queryGraph, ...procedures } = partialGraph(graphId)
    const parseResult$ = graphParser(procedures)
    const graphDebug = debug.extend(graphId)
    return {
      delete: deleteGraph,
      run: (...[raw, ...queryArguments]) => {
        queryArguments.push(TRANSIENT)
        return zip(from(raw), from(queryArguments).pipe(map(respParser))).pipe(
          reduce((accumulator, [a, b]) => [...accumulator, a, b], []),
          map(a => a.join('')),
          tap(cypherQuery => graphDebug(cypherQuery)),
          flatMap(cypherQuery => cypherQuery |> queryGraph |> from),
          // in case there is no return operation, the stats will be result[0] instead of result[2]
          tap(result => (result[2] || result[0]).forEach(s => s |> graphDebug)),
          // we only parse if there is actually a result
          switchMap(result => result[2] ? parseResult$(result) : empty()),
        )
      },
    }
  }
}
