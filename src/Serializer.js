import { SYMBOLS } from './constant.js'

const { TRANSIENT, OPERATOR } = SYMBOLS
const Serializer = {
  // Ensure that redis graph understand the value we provide (https://oss.redislabs.com/redisgraph/result_structure/)
  // eslint-disable-next-line complexity, consistent-return
  value: value => {
    if (value === TRANSIENT) return ''
    if (value === undefined || value === null) return 'NULL'
    switch (typeof value) {
      case 'boolean':
        return value ? 'true' : 'false'

      case 'bigint':
        if (value > 9223372036854775807n) return `${ value }`
        return value

      case 'number':
        if (value % 1) return Number.parseFloat(value).toPrecision(15)
        return value

      case 'string':
        return `'${ value }'`

      // eslint-disable-next-line no-use-before-define
      case 'object':
        return Serializer.object(value)

      case 'function':

      case 'symbol':
        return 'NULL'

      // no default
    }
  },
  object: object => {
    if (Array.isArray(object)) return `[${ object.map(Serializer.value) }]`

    const { [OPERATOR]: custom_input } = object

    // a value may be a custom input like the += operator which
    // is manually supported in this lib and not yet in redisgraph
    // so we return the operator output
    if (custom_input) return custom_input

    const entries = Object.entries(object)
        .map(([key, value]) => `${ key }:${ Serializer.value(value) }`)
        .join()

    return `{${ entries }}`
  },
}

export default Serializer
