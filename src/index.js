import { SYMBOLS as Internals, LOG } from './constant.js'
import Parser from './Parser.js'
import Serializer from './Serializer.js'
import redis from './redis.js'
import util from 'util'

export { Internals }
export default client => {
  const graph = redis(client)

  return graph_name => {
    if (!graph_name) throw new Error('Missing graph name')

    const { query_graph, delete_graph, ...procedures } = graph(graph_name)
    const parser = Parser(procedures)
    const log = LOG.rgraph.extend(graph_name)
    const log_stats = log.extend('⚡️')

    return {
      delete: delete_graph,
      run   : async (query_string, ...query_arguments) => {
        const zipped = query_string
            .map((part, index) => {
              const key = `a_${ index }`
              const parameter = query_arguments[index]

              if (parameter === undefined || parameter === null) {
                return {
                  keys: [],
                  raw : part,
                }
              }

              const { keys = [], raw = '' } = Serializer.value(parameter, key)

              return {
                keys: part ? keys : [],
                raw : `${ part }${ raw }`,
              }
            })
        // eslint-disable-next-line unicorn/no-reduce
            .reduce(
                (
                    { keys: result_keys, raw: result_raw },
                    { keys: next_keys, raw: next_raw },
                ) => {
                  return {
                    keys: [...result_keys, ...next_keys],
                    raw : `${ result_raw }${ next_raw }`.trim(),
                  }
                },
                {
                  keys: [],
                  raw : '',
                },
            )
        const { keys, raw } = zipped
        const query = `CYPHER ${ keys.join(' ').trim() } ${ raw }`

        log.extend('🧊')(query)

        try {
          const result = await query_graph(query)
          const [header_or_stats, rows, stats = header_or_stats] = result

          if (stats instanceof Error) throw stats
          stats.forEach(stat => log_stats(stat))
          if (rows) {
            const parsed_result = await parser.result_set(result)

            log.extend('📦')(util.inspect(parsed_result, {
              depth : Infinity,
              colors: true,
            }))
            return parsed_result
          }

          return undefined
        } catch (error) {
          log.extend('error')(error)
          throw error
        }
      },
    }
  }
}
