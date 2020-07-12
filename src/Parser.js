import { DATA_TYPE, RESULT_TYPE, SYMBOLS, LOG } from './constant.js'

export default ({ find_label, find_relation, find_property }) => {
  const Parser = {
    // eslint-disable-next-line complexity, consistent-return
    async scalar([type, value]) {
      switch (type) {
        case DATA_TYPE.UNKNOWN:

        case DATA_TYPE.NULL:
          return undefined

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
    async result_set([header, [rawCell]]) {
      if (!header || !rawCell) {
        LOG.parser('no result found')
        return undefined
      }

      const results = []
      const zipped = header.map((x, index) => [x, rawCell[index]])

      for (const [[cell_type, label], cell] of zipped) {
        switch (cell_type) {
          case RESULT_TYPE.NODE:
            results.push([label, await Parser.node(cell)])
            break

          case RESULT_TYPE.RELATION:
            results.push([label, await Parser.edge(cell)])
            break

          case RESULT_TYPE.SCALAR:
            results.push([label, await Parser.scalar(cell)])
            break

          /* c8 ignore next 4 */
          // hardly testable
          case RESULT_TYPE.UNKNOWN:
            throw new Error(`Cell of type ${ cell_type } is unkown`)

          // no default
        }
      }

      return Object.fromEntries(results)
    },
  }

  return Parser
}
