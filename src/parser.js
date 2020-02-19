import { defer, from, of, zip } from 'rxjs'
import { flatMap, map, toArray, tap } from 'rxjs/operators'
import { inspect } from 'util'

import { DATA_TYPE, RESULT_TYPE, SYMBOLS } from './constant'

const debug = require('debug')('rgraph').extend('parser')

// Provide parsing observables
export default ({ cachedLabels, cachedPropertyKeys, cachedRelationKeys }) => {
  const parseScalar$ = ([type, value]) => {
    switch (type) {
      case DATA_TYPE.UNKNOWN:
      case DATA_TYPE.NULL: return of(undefined)

      case DATA_TYPE.DOUBLE: return of(+value)

      case DATA_TYPE.BOOLEAN: return of(value === 'true')

      case DATA_TYPE.ARRAY: return from(value).pipe(flatMap(parseScalar$), toArray())

      // as i don't wan't to declare mutable variables it's preferable to disable linting for this particular recursive case
      // eslint-disable-next-line no-use-before-define
      case DATA_TYPE.NODE: return parseNode$(value)

      // eslint-disable-next-line no-use-before-define
      case DATA_TYPE.EDGE: return parseEdge$(value)

      // eslint-disable-next-line no-use-before-define
      case DATA_TYPE.PATH: return parsePath$(value)

      default: return of(value)
    }
  }

  const parseProperty$ = ([key, type, value]) => defer(async () => [await cachedPropertyKeys(key), await parseScalar$([type, value]).toPromise()])
  const parseProperties$ = properties => from(properties).pipe(flatMap(parseProperty$), toArray(), map(Object.fromEntries))
  const parseNode$ = ([id, nodeLabels, properties]) => defer(async () => ({
    [SYMBOLS.ID]: id,
    [SYMBOLS.NODE_LABELS]: await from(nodeLabels).pipe(flatMap(i => from(cachedLabels(i))), toArray()).toPromise(),
    ...(await parseProperties$(properties).toPromise()),
  }))

  const parseEdge$ = ([id, type, sourceNodeId, destinationNodeId, properties]) => defer(async () => ({
    [SYMBOLS.ID]: id,
    [SYMBOLS.EDGE_LABEL]: await cachedRelationKeys(type),
    [SYMBOLS.SOURCE_NODE_ID]: sourceNodeId,
    [SYMBOLS.DESTINATION_NODE_ID]: destinationNodeId,
    ...(await parseProperties$(properties).toPromise()),
  }))

  const parsePathRow$ = path => from(path).pipe(flatMap(parseScalar$), toArray())
  const parsePath$ = ([[, nodes], [, edges]]) => defer(async () => ({
    nodes: await parsePathRow$(nodes).toPromise(),
    edges: await parsePathRow$(edges).toPromise(),
  }))

  return ([header, [rawCell]]) => {
    if (!header || !rawCell) return of(undefined).pipe(tap(() => debug('no result found')))
    return zip(header |> from, rawCell |> from).pipe(
      flatMap(([[cellType, label], cell]) => defer(async () => {
        switch (cellType) {
          case RESULT_TYPE.NODE: return [label, await parseNode$(cell).toPromise()]

          case RESULT_TYPE.RELATION: return [label, await parseEdge$(cell).toPromise()]

          case RESULT_TYPE.SCALAR: return [label, await parseScalar$(cell).toPromise()]

          case RESULT_TYPE.UNKNOWN: throw new Error(`The cell of type ${cellType} is unkown billy, the end is near.. get cover!`)
          // skip default
        }
      })),
      toArray(),
      map(Object.fromEntries),
      tap(result => debug('%s', inspect(result, false, null, true)))
    )
  }
}
