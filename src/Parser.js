import { DATA_TYPE, RESULT_TYPE, SYMBOLS, LOG } from './constant.js'

export default ({ find_label, find_relation, find_property }) => {
  const Parser = {
    // eslint-disable-next-line complexity, consistent-return
    async scalar([type, value]) {
      switch (type) {
        case DATA_TYPE.STRING:
          return value

        case DATA_TYPE.INTEGER:
          const number_value = BigInt(value)

          if (number_value <= Number.MAX_SAFE_INTEGER) return +value
          return number_value

        case DATA_TYPE.DOUBLE:
          return +value

        case DATA_TYPE.BOOLEAN:
          return value === 'true'

        case DATA_TYPE.ARRAY:
          const result = []

          for (const sub_value of value)
            result.push(await Parser.scalar(sub_value))
          return result

        case DATA_TYPE.NODE:
          return Parser.node(value)

        case DATA_TYPE.EDGE:
          return Parser.edge(value)

        case DATA_TYPE.PATH:
          return Parser.path(value)

        // no default
      }

      return undefined
    },
    async property([key, type, value]) {
      return [await find_property(key), await Parser.scalar([type, value])]
    },
    async properties(properties = []) {
      const entries = []

      // using a loop instead of promise.all here
      // to avoid spaming possible procedure refresh
      for (const property of properties)
        entries.push(await Parser.property(property))

      return Object.fromEntries(entries)
    },
    async node([id, node_labels, properties]) {
      const labels = []

      // same here we reduce async one by one
      for (const label of node_labels) labels.push(await find_label(label))

      return {
        [SYMBOLS.ID]         : id,
        [SYMBOLS.NODE_LABELS]: labels,
        ...await Parser.properties(properties),
      }
    },
    async edge([id, type, source_node_id, destination_node_id, properties]) {
      return {
        [SYMBOLS.ID]                 : id,
        [SYMBOLS.EDGE_LABEL]         : await find_relation(type),
        [SYMBOLS.SOURCE_NODE_ID]     : source_node_id,
        [SYMBOLS.DESTINATION_NODE_ID]: destination_node_id,
        ...await Parser.properties(properties),
      }
    },
    async row(path) {
      const rows = []

      for (const row of path) rows.push(await Parser.scalar(row))
      return rows
    },
    async path([[, nodes], [, edges]]) {
      return {
        nodes: await Parser.row(nodes),
        edges: await Parser.row(edges),
      }
    },
    async result_set([header, raw_cells = []]) {
      if (!header || !raw_cells.length) {
        LOG.parser('no result found')
        return []
      }

      const results = []
      const map_header = raw_cell =>
        header.map((x, index) => [x, raw_cell[index]])
      const sequences = raw_cells.map(map_header)

      // and also here we sequencially parse results
      // instead of concurrently. Again to avoid possible procedure spam
      for (const sequence of sequences) {
        const sub_result = []

        for (const [[cell_type, label], cell] of sequence) {
          switch (cell_type) {
            case RESULT_TYPE.NODE:
              sub_result.push([label, await Parser.node(cell)])
              break

            case RESULT_TYPE.RELATION:
              sub_result.push([label, await Parser.edge(cell)])
              break

            case RESULT_TYPE.SCALAR:
              sub_result.push([label, await Parser.scalar(cell)])
              break

            /* c8 ignore next 4 */
            // hardly testable
            case RESULT_TYPE.UNKNOWN:
              throw new Error(`Cell of type ${ cell_type } is unkown`)

            // no default
          }
        }

        results.push(Object.fromEntries(sub_result))
      }

      return results
    },
  }

  return Parser
}
