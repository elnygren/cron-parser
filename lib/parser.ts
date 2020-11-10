import {
  CronCell,
  CronAST,
  CronConfig,
  isNumber,
  Token,
  Tokens,
} from './types'
import { ALIASES, PREDEFINED, validateCell, validateTime } from './validation'


const possibleSyntaxError = (i: number, s: string): boolean => {
  if (i < 5) {
    throw new Error(`invalid token detected in cron syntax: ${s}`)
  }
  return false
}


function singleRowTokenizer(cronString: string, original: string): Token {
  // replace aliases
  let aliasesReplaced = cronString
  aliasesReplaced = Object.entries(PREDEFINED).reduce((acc, [predef, time]) =>
    cronString.startsWith(predef) ? time : acc, cronString
  )
  aliasesReplaced = Object.entries(ALIASES).reduce((acc, [match, time]) =>
    acc.replaceAll(match, time), aliasesReplaced
  )

  const values = aliasesReplaced.split(/\s+/).filter(x => x !== '')
  if (values.length < 5) {
    throw new Error(`invalid length detected in cron syntax: "${original}" has length ${values.length} (5 or 6 expected)`)
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
 * These CronCells may still contains invalid numbers even though the syntax was correct.
 * We validate the CronCells in the parser when we create the CronAST.
 *
 * Note that we also support crontab file format so we need to check for ENVs, comments, commands.
 */
function tokenizer(cronString: string): Tokens {
  const blocks = cronString.split('\n')

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
 * We want this so we can normalize all input formats to CronConfig.
 */
function tokensToCronConfig(CronCells: CronCell[], { command, variables }: { command?: string, variables?: { [key in string]: string } }): CronConfig {
  if (CronCells.length === 5) {
    const [minutes, hour, dayOfMonth, month, dayOfWeek] = CronCells
    return { minutes, hour, dayOfMonth, month, dayOfWeek, command, variables }
  } else if (CronCells.length === 6) {
    const [seconds, minutes, hour, dayOfMonth, month, dayOfWeek] = CronCells
    return { seconds, minutes, hour, dayOfMonth, month, dayOfWeek, command, variables }
  }
  throw new Error(`Invalid length for cron input: ${CronCells} has length ${CronCells.length}, expected 5 or 6.`);
}

/** Validate data and create the CronAST. */
function toValidAST(input: CronConfig): CronAST {
  const cronFormat: CronAST = {
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
  return validateTime(cronFormat)
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
  if (typeof input === 'string') {
    const { expressions, variables } = tokenizer(input)
    _input = expressions.map(expr => tokensToCronConfig(expr.time, { command: expr.command, variables }))
  } else if (Array.isArray(input)) {
    _input = input
  } else {
    _input = [input]
  }

  return _input.map(x => toValidAST(x))
}
