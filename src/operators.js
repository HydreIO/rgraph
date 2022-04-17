import { SYMBOLS } from './constant.js'
export const raw = statement => ({
  [SYMBOLS.OPERATOR]: () => ({
    keys: [],
    raw: statement,
  }),
})
