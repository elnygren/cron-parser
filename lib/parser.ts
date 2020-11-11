import {
  CronCell,
  CronAST,
  CronConfig,
} from './types'
import { validateCell, validateMonthAndDay } from './validation'

export type Token = { command?: string, time: CronCell[] }
export type Tokens = { variables: { [x in string]: string }, expressions: Array<Token> }
export const isNumber = (x: any): x is number => !isNaN(parseInt(x, 10))

const PREDEFINED = {
  '@yearly': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@hourly': '0 * * * *'
};

const ALIASES = {
  // weekdays
  sun: '0', mon: '1', tue: '2', wed: '3', thu: '4', fri: '5', sat: '6',
  // months
  jan: '1', feb: '2', mar: '3', apr: '4', may: '5', jun: '6',
  jly: '7', aug: '8', sep: '9', oct: '10', nov: '11', dec: '12',
}


const possibleSyntaxError = (i: number, s: string): boolean => {
  if (i < 5) {
    throw new Error(`invalid token detected in cron syntax: ${s}`)
  }
  return false
}

/**
 * Tokenize a single crontab line that is assumed to be preprocessed by the top level tokenizer
 *
 * @param cronString crontab line, eg. `1 2 3 4 5` preprocessed by tokenizer
 * @param errMsg suitable print to error message, e.g the original user input
 */
function singleRowTokenizer(cronString: string, errMsg: string): Token {

  let aliasesReplaced = cronString
  aliasesReplaced = Object.entries(PREDEFINED).reduce((acc, [predef, time]) =>
    cronString.startsWith(predef) ? time : acc, cronString
  )
  aliasesReplaced = Object.entries(ALIASES).reduce((acc, [match, time]) =>
    acc.replaceAll(match, time), aliasesReplaced
  )

  const values = aliasesReplaced.split(/\s+/).filter(x => x !== '')

  if (values.length < 5) {
    throw new Error(
      `invalid length detected in cron syntax: "${errMsg}" has length ${values.length} (5 or 6 expected)`
    )
  }

  let time: CronCell[] = []
  let command = ''

  for (let i = 0; i < values.length; i++) {
    let match; // regexp tricks
    const s = values[i];

    // wildcard case
    if (s === '*' || s === '?') time.push({ type: '*' })

    // step
    else if (match = s.match(/^\*\/(\d{1,2})$/)) {
      time.push({
        type: 'step',
        step: parseInt(match[1], 10)
      })
    }

    // stepfrom
    else if (match = s.match(/^(\d{1,2})\/(\d{1,2})$/)) {
      time.push({
        type: 'stepfrom',
        step: parseInt(match[2], 10),
        from: parseInt(match[1], 10)
      })
    }

    // steprange
    else if (match = s.match(/^(\d{1,2})-(\d{1,2})\/(\d{1,2})$/)) {
      time.push({
        type: 'steprange',
        from: parseInt(match[1], 10),
        to: parseInt(match[2], 10),
        step: parseInt(match[3], 10),
      })
    }

    // range, eg. 10-12
    else if (match = s.match(/^(\d{1,2})-(\d{1,2})$/)) {
      const a = parseInt(match[1], 10)
      const b = parseInt(match[2], 10)
      if (a < b) {
        time.push({ type: 'range', from: a, to: b })
      } else {
        possibleSyntaxError(i, s)
      }
    }

    // single or double digit number
    else if (match = s.match(/^\d{1,2}$/)) time.push({ type: 'number', value: parseInt(match[0], 10) })

    // list
    else if (s.includes(',') && s.split(',').every(x => isNumber(x))) {
      time.push({ type: 'list', values: s.split(',').map(x => parseInt(x, 10)) })
    }

    // it's an error except if we are at the 5th in which case we can start assuming it's part of the command
    else if (!possibleSyntaxError(i, s)) {
      command += `${s}`
    }
  }

  return { time, command: command.length === 0 ? undefined : command }
}


/**
 * Tokenizer takes in a Cron string and outputs a list of CronCells.
 * Cron string can be a crontab file (as a string) or a single row crontab entry with or without a command.
 *
 * These CronCells may still contains invalid numbers even though the syntax was correct.
 * We validate the CronCells in the parser when we create the CronAST.
 *
 * We support ENVs, comments, commands from the crontab file format.
 */
function tokenizer(cronString: string): Tokens {
  const blocks = cronString.toString().split('\n')

  const response: Tokens = {
    variables: {},
    expressions: [],
  }

  blocks
    .map(block => block.trim().toLowerCase())
    // crontab comment
    .filter(block => !block.startsWith('#'))
    // skip empty lines if handling many lines
    .filter(block => blocks.length > 1 ? block.length !== 0 : true)
    .forEach((block) => {
      // crontab ENV variable
      const matches = block.match(/^(.*)=(.*)$/)
      if (matches) {
        response.variables[matches[1].trim()] = matches[2].trim();
      } else {
        // crontab expression
        response.expressions.push(singleRowTokenizer(block, cronString))
      }
    })

  return response
}


/**
 * Map tokens to a CronConfig.
 * Note that we normalize all input formats to CronConfig and then provide a CronConfig=>CronAST function.
 */
function tokensToCronConfig(cells: CronCell[], { command, variables }: { command?: string, variables?: { [key in string]: string } }): CronConfig {
  if (cells.length === 5) {
    const [minutes, hour, dayOfMonth, month, dayOfWeek] = cells
    return { minutes, hour, dayOfMonth, month, dayOfWeek, command, variables }
  } else if (cells.length === 6) {
    const [seconds, minutes, hour, dayOfMonth, month, dayOfWeek] = cells
    return { seconds, minutes, hour, dayOfMonth, month, dayOfWeek, command, variables }
  }
  throw new Error(`Invalid length for cron input: ${cells} has length ${cells.length}, expected 5 or 6.`);
}

/** Validate data and create the CronAST. */
function toValidAST(input: CronConfig): CronAST {
  const ast: CronAST = {
    time: {
      minutes: validateCell('minutes', input.minutes === undefined ? { type: '*' } : input.minutes),
      hour: validateCell('hour', input.hour === undefined ? { type: '*' } : input.hour),
      dayOfMonth: validateCell('dayOfMonth', input.dayOfMonth === undefined ? { type: '*' } : input.dayOfMonth),
      month: validateCell('month', input.month === undefined ? { type: '*' } : input.month),
      dayOfWeek: validateCell('dayOfWeek', input.dayOfWeek === undefined ? { type: '*' } : input.dayOfWeek),
      seconds: input.seconds !== undefined ? validateCell('seconds', input.seconds) : { type: 'number', value: 0 },
    },
    command: input.command,
    variables: input.variables,
  }

  if (!validateMonthAndDay(ast)) {
    throw new Error(`invalid dayOfMonth (${JSON.stringify(ast.time.dayOfMonth)}) for given month(s)`);
  }
  return ast
}

/**
 * Parse a Cron string or CronConfig into CronAST.
 *
 * Format:
 *
 *         *    *    *    *    *    *
 *         ┬    ┬    ┬    ┬    ┬    ┬
 *         │    │    │    │    │    |
 *         │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
 *         │    │    │    │    └───── month (1 - 12)
 *         │    │    │    └────────── day of month (1 - 31)
 *         │    │    └─────────────── hour (0 - 23)
 *         │    └──────────────────── minute (0 - 59)
 *         └───────────────────────── second (0 - 59, optional)
 *
 *        * any value
 *        , value list separator
 *        - range of values
 *        / step values
 *
 */
export function parser(input: string | CronConfig | CronConfig[]): CronAST[] {
  let _input: CronConfig[];
  if (typeof input === 'string' || input instanceof String) {
    const { expressions, variables } = tokenizer(input.toString())
    _input = expressions.map(expr => tokensToCronConfig(expr.time, { command: expr.command, variables }))
  } else if (Array.isArray(input)) {
    _input = input
  } else {
    _input = [input]
  }

  return _input.map(x => toValidAST(x))
}
