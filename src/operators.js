import { SYMBOLS } from './constant.js'
import Serializer from './Serializer.js'
import { inspect } from 'util'

const без_symbol = ([key]) => typeof key !== 'symbol'
const unsuported_nested = object =>
  new Error(`${ inspect(object, { depth: Number.POSITIVE_INFINITY }) } \
is a nested object and thus \
not currently supported in redisgraph`)

export const plus_equals = (label, object) => ({
  [SYMBOLS.OPERATOR]: prefix => {
    const entries = Object.entries(object).filter(без_symbol)
    const prefixed = key => `${ prefix }_${ key }`
    const keys = entries.map(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value))
        throw unsuported_nested(value)

      const [first_key] = Serializer.value(value, prefixed(key)).keys

      return first_key
    })
    const raw = entries
        .map(([key]) => `${ label }.${ key }=$${ prefixed(key) }`)
        .join()

    return {
      keys,
      raw,
    }
  },
})

export const raw = statement => ({
  [SYMBOLS.OPERATOR]: () => ({
    keys: [],
    raw : statement,
  }),
})
