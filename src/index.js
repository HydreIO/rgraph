import { map, concat, flatMap, concatMap, tap, toArray, reduce } from 'rxjs/operators'
import { from, zip, defer, of } from 'rxjs'
import { promisify } from 'util'
import { RESULT_TYPE, DATA_TYPE } from './constant'
const _transient = Symbol()
const debug = require('debug')('rgraph')
const respifyValue = v => {
  if (v === _transient) return ''
  else if (v === undefined || v === null) return 'NULL'
  switch (typeof v) {
    case 'boolean': return v ? 'true' : 'false'
    case 'number': return v % 1 === 0 ? Number.isSafeInteger(v) ? v : `'${v}'` : Number.parseFloat(v).toPrecision(15)
    case 'string':
    case 'bigint': return `'${v}'`
    case 'function':
    case 'symbol': return undefined
    case 'object':
      if (Array.isArray(v)) return `[${v.map(i => respifyValue(i))}]`
      else return `{${Object.entries(v).map(([key, value]) => key + ':' + respifyValue(value)).join(',')}}`
  }
}
export default client => {
  const sendCommand = promisify(:: client.send_command)
  // following caching optimization as described here https://oss.redislabs.com/redisgraph/client_spec/#procedure-calls
  const cachedKeys = procedure => graphId => {
    const monad = { keys: [] }
    const fetch = async () => {
      const toYield = procedure.slice(3, -3)
      const args = [graphId, `CALL ${procedure} YIELD ${toYield} RETURN ${toYield} SKIP ${monad.keys.length}`]
      const [, missing] = await sendCommand('graph.QUERY', args)
      if (missing.some(a => a.length > 1)) throw new Error('This version of the driver does not support multi labels on nodes :shrug:')
      monad.keys = [...monad.keys, ...missing.flat()]
    }
    return async index => {
      index >= monad.keys.length && await fetch()
      return monad.keys[index]
    }
  }
  const partialLabels = cachedKeys('db.labels()')
  const partialRelationsKeys = cachedKeys('db.relationshipTypes()')
  const partialPropertyKeys = cachedKeys('db.propertyKeys()')
  return graphId => {
    const labels = graphId |> partialLabels
    const relationsKeys = graphId |> partialRelationsKeys
    const propertyKeys = graphId |> partialPropertyKeys
    const parseScalar$ = ([type, value]) => {
      switch (type) {
        case DATA_TYPE.UNKNOWN:
        case DATA_TYPE.NULL: return of(undefined)
        case DATA_TYPE.DOUBLE: return of(+value)
        case DATA_TYPE.BOOLEAN: return of(value === 'true')
        case DATA_TYPE.ARRAY: return from(value).pipe(flatMap(parseScalar$))
        case DATA_TYPE.NODE: return parseNode$(value)
        case DATA_TYPE.EDGE: return parseEdge$(value)
        case DATA_TYPE.PATH: return parsePath$(value)
        default: return of(value)
      }
    }
    const parseProp$ = ([key, type, value]) => defer(async () => [await propertyKeys(key), await parseScalar$([type, value]).toPromise()])
    const parseProps$ = props => from(props).pipe(concatMap(parseProp$), toArray(), map(Object.fromEntries))
    const parseNode$ = ([id, nodeLabels, props]) => defer(async () => ({
      id,
      labels: await from(nodeLabels).pipe(concatMap(i => from(labels(i))), toArray()).toPromise(),
      properties: await parseProps$(props).toPromise()
    }))
    const parseEdge$ = ([id, type, srcNodeId, destNodeId, props]) => defer(async () => ({
      id,
      label: await relationsKeys(type),
      srcNodeId,
      destNodeId,
      properties: await parseProps$(props).toPromise()
    }))
    const parsePathRow$ = path => from(path).pipe(concatMap(parseScalar$), toArray())
    const parsePath$ = ([[, nodes], [, edges]]) => defer(async () => ({
      nodes: await parsePathRow$(nodes).toPromise(),
      edges: await parsePathRow$(edges).toPromise()
    }))
    return {
      delete: ~sendCommand('graph.DELETE', [graphId]), run: (...[raw, ...args]) => {
        args.push(_transient)
        return zip(from(raw), from(args).pipe(map(respifyValue)))
          .pipe(
            reduce((acc, [a, b]) => [...acc, a, b], []),
            map(a => a.join('')),
            tap(q => debug.extend('running')('%O', q)),
            flatMap(q => from(sendCommand('graph.QUERY', [graphId, q, '--compact']))),
            tap(([, , stats]) => stats.forEach(s => debug.extend('stats')(s))),
            flatMap(([header, [cell]]) => zip(from(header), from(cell))),
            concatMap(([[cellType, label], cell]) => defer(async () => {
              switch (cellType) {
                case RESULT_TYPE.NODE: return [label, await parseNode$(cell).toPromise()]
                case RESULT_TYPE.RELATION: return [label, await parseEdge$(cell).toPromise()]
                case RESULT_TYPE.SCALAR: return [label, await parseScalar$(cell).toPromise()]
                case RESULT_TYPE.UNKNOWN: throw new Error(`The cell of type ${cellType} is unkown billy, the end is near.. get cover!`)
              }
            })), toArray(), map(Object.fromEntries))
      }
    }
  }
}
