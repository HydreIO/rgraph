import { respParser } from '../parsing'
import { SYMBOLS } from '../constant'

export default (label, object) => ({
  [SYMBOLS.OPERATOR]: Object.entries(object)
    .filter(([key, value]) => typeof key !== 'symbol')
    .map(([key, value]) => `${label}.${key}=${respParser(value)}`)
    .join(',')
})