import type { CronGenOptions } from './generator'
import { dateGen } from './generator'
import { parser } from './parser'
import { CronGenerator, CronGeneratorSet } from './types'

export { parser }

export function load(s: string, opts?: CronGenOptions): CronGeneratorSet {
  return parser(s).reduce<CronGeneratorSet>((acc, ast) => {
    acc.expressions.push(dateGen(ast, opts || {}))
    if (ast.command !== undefined) acc.commands.push(ast.command)
    acc.variables = ast.variables
    return acc
  }, {
    expressions: [],
    commands: [],
  })
}

export function loadOne(s: string, opts?: CronGenOptions): CronGenerator {
  return dateGen(parser(s)[0], opts || {})
}
