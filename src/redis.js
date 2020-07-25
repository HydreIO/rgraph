const PROCEDURES = {
  LABELS    : 'db.labels()',
  RELATIONS : 'db.relationshipTypes()',
  PROPERTIES: 'db.propertyKeys()',
}

// Provide access to redis graph and cache procedures
export default client => graph_name => {
  const cache = new Map()
  const reset_cache = () => {
    Object.values(PROCEDURES).forEach(x => {
      cache.set(x, [])
    })
  }

  reset_cache()

  // following caching optimization as described here https://oss.redislabs.com/redisgraph/client_spec/#procedure-calls
  const proceed = procedure => {
    const to_yield = procedure.slice(3, -3)
    const refresh = async current_keys => {
      const [, missing] = await client.call(
          'graph.QUERY',
          graph_name,
          [
            `CALL ${ procedure }`,
            `YIELD ${ to_yield }`,
            `RETURN ${ to_yield }`,
            `SKIP ${ cache.get(procedure).length }`,
          ]
              .join(' ')
              .trim(),
      )

      if (missing.some(a => a.length > 1))
        throw new Error('Multi labels on nodes is not supported :shrug:')
      return [...current_keys, ...missing.flat()]
    }

    return async index => {
      if (index >= cache.get(procedure).length) {
        const most_recent = await refresh(cache.get(procedure))

        // this is atomic update is okay as we gave a copy of the keys
        // to the refresh function in order to avoid duplication
        // eslint-disable-next-line require-atomic-updates
        cache.set(procedure, most_recent)
        return most_recent[index]
      }

      return cache.get(procedure)[index]
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
    delete_graph: () => {
      client.call('graph.DELETE', graph_name)
      reset_cache()
    },
    find_label   : proceed(PROCEDURES.LABELS),
    find_relation: proceed(PROCEDURES.RELATIONS),
    find_property: proceed(PROCEDURES.PROPERTIES),
  }
}
