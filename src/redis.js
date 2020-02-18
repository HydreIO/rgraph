import { promisify } from 'util'

// Provide utility function to access redis graph and cache procedures
export default client => {
  const call = promisify(:: client.send_command)
  return graphId => {
    const query = queryArguments => call('graph.QUERY', [graphId, ...queryArguments])
    // following caching optimization as described here https://oss.redislabs.com/redisgraph/client_spec/#procedure-calls
    const cacheProcedure = procedure => {
      const monad = { keys: [] }
      const fetch = async () => {
        const toYield = procedure.slice(3, -3)
        const [, missing] = await query([`CALL ${procedure} YIELD ${toYield} RETURN ${toYield} SKIP ${monad.keys.length}`])
        if (missing.some(a => a.length > 1)) throw new Error('This version of the driver does not support multi labels on nodes :shrug:')
        monad.keys = [...monad.keys, ...missing.flat()]
      }
      return async index => {
        if (index >= monad.keys.length) await fetch()
        return monad.keys[index]
      }
    }
    return {
      deleteGraph: ~call('graph.DELETE', [graphId]),
      queryGraph: queryString => query([queryString, '--compact']),
      cachedLabels: cacheProcedure('db.labels()'),
      cachedRelationKeys: cacheProcedure('db.relationshipTypes()'),
      cachedPropertyKeys: cacheProcedure('db.propertyKeys()'),
    }
  }
}
