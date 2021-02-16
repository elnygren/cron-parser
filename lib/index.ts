import { dateGen } from './generator'
import { parser } from './parser'
import {
  CronConfig,
  CronGenerator,
  CronGeneratorSet,
  CronGenOptions,
} from './types'

export { parser }

export function load(
  s: string | CronConfig | CronConfig[],
  opts?: CronGenOptions,
): CronGeneratorSet {
  return parser(s).reduce<CronGeneratorSet>(
    (acc, ast) => {
      acc.expressions.push(dateGen(ast, opts || {}))
      if (ast.command !== undefined) acc.commands.push(ast.command)
      acc.variables = ast.variables
      return acc
    },
    {
      expressions: [],
      commands: [],
    },
  )
}

export function loadOne(
  s: string | CronConfig,
  opts?: CronGenOptions,
): CronGenerator {
  return dateGen(parser(s)[0], opts || {})
}
