import { SYMBOLS as Internals, LOG } from './constant.js'
import Parser from './Parser.js'
import Serializer from './Serializer.js'
import redis from './redis.js'
import util from 'util'

// used to group queries while logging
let query_log_counter = 0

export { Internals }
export default client => {
  const graph = redis(client)

  return graph_name => {
    if (!graph_name) throw new Error('Missing graph name')

    const { query_graph, delete_graph, ...procedures } = graph(graph_name)
    const parser = Parser(procedures)
    const log = LOG.rgraph.extend(graph_name)

    return {
      delete: delete_graph,
      run   : async (query_string, ...query_arguments) => {
        query_log_counter++

        const zipped = query_string
            .map((part, index) => {
              const key = `a_${ index }`
              const parameter = query_arguments[index]
              const { keys = [], raw = '' } = Serializer.value(parameter, key)
              const has_parameter = index < query_arguments.length

              return {
                keys: has_parameter ? keys : [],
                raw : has_parameter ? `${ part }${ raw }` : part,
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
                    raw : `${ result_raw }${ next_raw }`,
                  }
                },
                {
                  keys: [],
                  raw : '',
                },
            )
        const { keys, raw } = zipped
        const cypher = raw
            .split('\n')
            .map(x => x.trim())
            .filter(x => !x.startsWith('//'))
            .join(' ')
        const query = `CYPHER ${ keys.join(' ').trim() } ${ cypher }`
        const ice_log = log.extend(`📝 [${ query_log_counter }]`)
        const parameter_log = log.extend(`⚙️  [${ query_log_counter }]`)
        const comment_log = ice_log.extend(`💡 [${ query_log_counter }]`)
        const log_stats = log.extend(`⚡️ [${ query_log_counter }]`)
        const try_log = log.extend(`try it yourself [${ query_log_counter }]`)

        parameter_log(
            ` CYPHER %O`,
            Object.fromEntries(keys.flat().map(x => x.split('='))),
        )
        raw
            .split('\n')
            .map(x => x.trim())
            .forEach(x => {
              if (x.startsWith('//'))
                comment_log('%O', x.slice(x.indexOf('//') + 3))
              else ice_log(x)
            })

        try_log(query)

        try {
          const result = await query_graph(query)
          const [header_or_stats, rows, stats = header_or_stats] = result

          if (stats instanceof Error) throw stats
          stats.forEach(stat => log_stats(stat))
          if (rows) {
            const parsed_result = await parser.result_set(result)
            const inspected = util.inspect(parsed_result, {
              depth : Infinity,
              colors: true,
            })

            log.extend(`📦 [${ query_log_counter }]`)(inspected)
            return parsed_result
          }

          return undefined
        } catch (error) {
          log.extend(`☠️  [${ query_log_counter }]`)('\u001B[31m%O', error)
          throw error
        }
      },
    }
  }
}
