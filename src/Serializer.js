import { SYMBOLS } from './constant.js'
import { inspect } from 'util'

/*
 * The serializer take as input any javascript type
 * and output an object which include
 * - an array of keys as cypher parameters: foo=1 bar=2
 * - a raw string of a query semgent: "SET n.name=$foo"
 */

const { OPERATOR } = SYMBOLS
const unsuported_nested = object =>
  new Error(`${ inspect(object, { depth: Number.POSITIVE_INFINITY }) } \
is a nested object and thus \
not currently supported in redisgraph`)
const Serializer = {
  // Ensure that redis graph understand the value we provide (https://oss.redislabs.com/redisgraph/result_structure/)
  // eslint-disable-next-line complexity, consistent-return
  value: (value, prefix) => {
    const with_value = x => ({
      keys: [`${ prefix }=${ x }`],
      raw : `$${ prefix }`,
    })

    if (value === undefined || value === null) return with_value('NULL')

    switch (typeof value) {
      case 'boolean':
        return with_value(value ? 'true' : 'false')

      case 'bigint':
        if (value > 9223372036854775807n) return with_value(`${ value }`)
        return with_value(value)

      case 'number':
        if (value % 1)
          return with_value(Number.parseFloat(value).toPrecision(15))

        return with_value(value)

      case 'string':
        return with_value(`'${ value.replace('\'', '\\$&') }'`)

      // eslint-disable-next-line no-use-before-define
      case 'object':
        return Serializer.object(value, prefix)

      case 'function':

      case 'symbol':
        return with_value('NULL')

      // no default
    }
  },
  object: (object, prefix) => {
    if (Array.isArray(object)) {
      if (object.some(x => x && typeof x === 'object' && !Array.isArray(x)))
        throw unsuported_nested(object)

      const value = `[${ object
          .map(Serializer.value)
      // the serializer would return an already formatted key
      // since we are in a array we extract the value the ugly way
      // this allows to keep the whole design simple elsewhere
          .map(({ keys }) => keys[0].split('=')[1])
          .join(',') }]`

      return {
        keys: [`${ prefix }=${ value }`],
        raw : `$${ prefix }`,
      }
    }

    // a value may be a custom input like the += operator which
    // is manually supported in this lib and not yet in redisgraph
    // so we return the operator output
    if (OPERATOR in object) return object[OPERATOR](prefix)

    const prefixed = key => `${ prefix }_${ key }`
    const keys = Object.entries(object).map(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value))
        throw unsuported_nested(value)

      const { keys: serialized } = Serializer.value(value, prefixed(key))

      return serialized
    })
    const raw = Object.entries(object)
        .map(([key]) => `${ key }:$${ prefixed(key) }`)
        .join()

    return {
      keys,
      raw: `{${ raw }}`,
    }
  },
}

export default Serializer
