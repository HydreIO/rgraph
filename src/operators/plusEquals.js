import { SYMBOLS } from '../constant'
import { respParser } from '../parsing'

export default (label, object) => ({
  [SYMBOLS.OPERATOR]: Object.entries(object)
    .filter(([key]) => typeof key !== 'symbol')
    .map(([key, value]) => `${label}.${key}=${respParser(value)}`)
    .join(','),
})
