export const RESULT_TYPE = {
  UNKNOWN: 0,
  SCALAR: 1,
  NODE: 2,
  RELATION: 3,
}

export const DATA_TYPE = {
  UNKNOWN: 0,
  NULL: 1,
  STRING: 2,
  INTEGER: 3,
  BOOLEAN: 4,
  DOUBLE: 5,
  ARRAY: 6,
  EDGE: 7,
  NODE: 8,
  PATH: 9,
}

export const SYMBOLS = {
  TRANSIENT: Symbol('transient'),
  ID: Symbol('id'),
  NODE_LABELS: Symbol('nodeLabels'),
  EDGE_LABEL: Symbol('edgeLabel'),
  SOURCE_NODE_ID: Symbol('sourceNodeId'),
  DESTINATION_NODE_ID: Symbol('destinationNodeId'),
  OPERATOR: Symbol('operator'),
}
