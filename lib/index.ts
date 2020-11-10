import type { CronGenOptions } from './generator'
import { dateGen } from './generator'
import { parser } from './parser'
import { CronGenerator, CronGeneratorSet } from './types'

export { parser }

export function load(s: string, opts: CronGenOptions): CronGeneratorSet {
  return parser(s).reduce<CronGeneratorSet>((acc, ast) => {
    acc.expressions.push(dateGen(ast, opts))
    acc.variables = ast.variables
    return acc
  }, {
    expressions: [],
  })
}

export function loadOne(s: string, opts: CronGenOptions): CronGenerator {
  return dateGen(parser(s)[0], opts)
}
