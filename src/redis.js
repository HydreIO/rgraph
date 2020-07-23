// Provide access to redis graph and cache procedures
export default client => graph_name => {
  // following caching optimization as described here https://oss.redislabs.com/redisgraph/client_spec/#procedure-calls
  const proceed = procedure => {
    const cache = { keys: [] }
    const refresh = async current_keys => {
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
      return [...current_keys, ...missing.flat()]
    }

    return async index => {
      if (index >= cache.keys.length) {
        const most_recent = await refresh(cache.keys)

        // this is atomic update is okay as we gave a copy of the keys
        // to the refresh function in order to avoid duplication
        // eslint-disable-next-line require-atomic-updates
        cache.keys = most_recent
        return most_recent[index]
      }

      return cache.keys[index]
    }
  }

  return {
    query_graph(cypher) {
      const normalized = cypher
          .split('\n')
          .map(x => x.trim())
          .join(' ')

      return client.call('graph.QUERY', graph_name, normalized, '--compact')
    },
    delete_graph : () => client.call('graph.DELETE', graph_name),
    find_label   : proceed('db.labels()'),
    find_relation: proceed('db.relationshipTypes()'),
    find_property: proceed('db.propertyKeys()'),
  }
}
