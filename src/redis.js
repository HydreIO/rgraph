// Provide access to redis graph and cache procedures
export default client => graph_name => {
  // following caching optimization as described here https://oss.redislabs.com/redisgraph/client_spec/#procedure-calls
  const proceed = procedure => {
    const cache = { keys: [] }
    const refresh = async () => {
      const to_yield = procedure.slice(3, -3)
      const [, missing] = await client.call(
          'graph.QUERY',
          graph_name,
          [
            `CALL ${ procedure }`,
            `YIELD ${ to_yield }`,
            `RETURN ${ to_yield }`,
            `SKIP ${ cache.keys.length }`,
          ]
              .join(' ')
              .trim(),
      )

      if (missing.some(a => a.length > 1))
        throw new Error('Multi labels on nodes is not supported :shrug:')
      return [...cache.keys, ...missing.flat()]
    }

    return async index => {
      if (index >= cache.keys.length) {
        const most_recent = await refresh()

        // atomic update is okay here as the caller will
        // always get what he asked for anyway.
        // we sacrifice performance for consistency
        // eslint-disable-next-line require-atomic-updates
        cache.keys = most_recent
        return most_recent[index]
      }

      return cache.keys[index]
    }
  }

  return {
    query_graph(cypher) {
      return client.call('graph.QUERY', graph_name, cypher, '--compact')
    },
    delete_graph : () => client.call('graph.DELETE', graph_name),
    find_label   : proceed('db.labels()'),
    find_relation: proceed('db.relationshipTypes()'),
    find_property: proceed('db.propertyKeys()'),
  }
}
