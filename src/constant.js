import Debug from 'debug'

const debug = Debug('rgraph')

// 👇 this should be verified according to https://github.com/RedisGraph/RedisGraph/issues/1387
// export const RESULT_TYPE = {
//   UNKNOWN : 0,
//   SCALAR  : 1,
//   NODE    : 2,
//   RELATION: 3,
// }

export const DATA_TYPE = {
  UNKNOWN: 0,
  NULL   : 1,
  STRING : 2,
  INTEGER: 3,
  BOOLEAN: 4,
  DOUBLE : 5,
  ARRAY  : 6,
  EDGE   : 7,
  NODE   : 8,
  PATH   : 9,
}

export const SYMBOLS = {
  ID                 : Symbol('id'),
  NODE_LABELS        : Symbol('node labels'),
  EDGE_LABEL         : Symbol('edge label'),
  SOURCE_NODE_ID     : Symbol('source_node id'),
  DESTINATION_NODE_ID: Symbol('destination_node id'),
  OPERATOR           : Symbol('operator'),
}

export const LOG = {
  rgraph: debug,
  parser: debug.extend('parser'),
}
