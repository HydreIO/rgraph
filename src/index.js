import { SYMBOLS, LOG } from './constant.js'
import Parser from './Parser.js'
import Serializer from './Serializer.js'
import redis from './redis.js'

const { TRANSIENT, ...Internals } = SYMBOLS

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
      run   : async (raw, ...query_arguments) => {
        query_arguments.push(TRANSIENT)

        const zipped = raw
            .map((part, index) => {
              return `${ part }${ Serializer.value(query_arguments[index]) }`
            })
            .join('')
            .trim()

        log.extend('->')(zipped)

        const result = await query_graph(zipped)
        const [header_or_stats, rows, [stats] = header_or_stats] = result

        log_stats(stats)
        return rows ? parser.result_set(result) : undefined
      },
    }
  }
}
