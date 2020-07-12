import { SYMBOLS } from '../constant.js'
import Serializer from '../Serializer.js'

export default (label, object) => ({
  [SYMBOLS.OPERATOR]: Object.entries(object)
      .filter(([key]) => typeof key !== 'symbol')
      .map(([key, value]) => `${ label }.${ key }=${ Serializer.value(value) }`)
      .join(),
})
