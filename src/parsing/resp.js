import { SYMBOLS } from '../constant'

const { TRANSIENT, OPERATOR } = SYMBOLS

/**
 * Ensure that redis graph understand the value we provide (https://oss.redislabs.com/redisgraph/result_structure/)
 * @param {Any} v value to transform
 *
 * note: Thinking about using util.inspect(obj, { compact: true, depth: 1, breakLength: Infinity, maxArrayLength: Infinity })
 * but we would have less control
 */
const respifyValue = v => {
  if (v === TRANSIENT) return ''
  if (v === undefined || v === null) return 'NULL'
  switch (typeof v) {
    case 'boolean': return v ? 'true' : 'false'

    case 'number': return v % 1 === 0 ? (Number.isSafeInteger(v) ? v : `'${v}'`) : Number.parseFloat(v).toPrecision(15)

    case 'string':
    case 'bigint': return `'${v}'`

    case 'function':
    case 'symbol': return undefined

    // eslint-disable-next-line no-use-before-define
    case 'object': return respifyObject(v)

    // skip default
  }
}

const respifyObject = object => {
  if (Array.isArray(object)) return `[${object.filter(value => typeof value !== 'symbol').map(respifyValue)}]`

  // this 2 lines is a temporary hack, it allow users to provide a single property object
  // { [Symbol(OPERATOR)]: value }
  // to passthrough a non formatted value
  // not liking too much the concept but as RedisGraph doesn't fully support cypher
  // i wanted a way to fake cypher operators like `SET object += $object`
  // and for that i need to be able to pass raw values into a query

  // TODO: improve the concept by rethinking the parser or simply wait for RedisGraph complete cypher support
  const operator = object[OPERATOR]
  if (operator) return operator

  const filteredObject = Object.fromEntries(Object.entries(object).filter(([key]) => typeof key !== 'symbol'))
  return `{${Object.entries(filteredObject).map(([key, value]) => `${key}:${respifyValue(value)}`).join(',')}}`
}

export default respifyValue
