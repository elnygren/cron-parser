import {
  CronCell,
  CronAST,
} from './types'
import { assertUnreachable, prettyPrint, prettyPrintCell, range } from './utils';

export const MAX_DATE = new Date(8640000000000000);

/** Amount of days in Jan...Dec, with 29 in February ((non) leap years must be handled explicitly) */
export const DAYS_IN_MONTH = [
  31,
  29,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31
];

export const PREDEFINED = {
  '@yearly': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@hourly': '0 * * * *'
};


/**
 * Numeric validations are as follows:
 * - day of week (0 - 7) (0 or 7 is Sun)
 * - month (1 - 12)
 * - day of month (1 - 31)
 * - hour (0 - 23)
 * - minute (0 - 59)
 * - second (0 - 59, optional)
 */
const numericValidators = {
  seconds: (v: number) => undefined || (0 <= v && v <= 59),
  minutes: (v: number) => 0 <= v && v <= 59,
  hour: (v: number) => 0 <= v && v <= 23,
  dayOfMonth: (v: number) => 1 <= v && v <= 31,
  month: (v: number) => 1 <= v && v <= 12,
  dayOfWeek: (v: number) => 0 <= v && v <= 7,
}

/** Validate any CronAST field+val with the correct numericValidator. */
export const validateCell = (field: keyof CronAST['time'], val: CronCell): CronCell => {
  const validator = numericValidators[field]
  const validate = (val: CronCell): boolean => {
    switch (val.type) {
      case '*':
        return true
      case 'number':
        return validator(val.value)
      case 'step':
        return validator(val.step) && val.step !== 0
      case 'steprange':
        return validator(val.step) && val.step !== 0 && validator(val.from)
      case 'range':
        return validator(val.from) && validator(val.to)
      case 'list':
        return val.values.every(validator)
      default:
        return assertUnreachable(val)
    }
  }
  if (validate(val)) return val
  throw new Error(`Invalid value for ${field} (${prettyPrintCell(val)})`)
}

// largest day for a dayOfMonth CronCell (that is relevant for validating DayOfMonth)
const maxDay = (val: CronCell): number => {
  switch (val.type) {
    case '*':
      return -1
    case 'number':
      return val.value
    case 'step':
      return val.step
    case 'steprange':
      return val.step
    case 'range':
      return val.to
    case 'list':
      return val.values[val.values.length - 1]
    default:
      return assertUnreachable(val)
  }
}

const validateMonth = (ast: CronAST): boolean => {
  const val = ast.time.month
  const time = ast.time
  const day = maxDay(time.dayOfMonth)
  switch (val.type) {
    case '*':
      return true
    case 'number':
      return day <= DAYS_IN_MONTH[val.value - 1]
    case 'step':
      return range(1, 13).filter(m => m - 1 % val.step === 0).some(month => day <= DAYS_IN_MONTH[month - 1])
    case 'steprange':
      return range(1, 13).filter(m => m - 1 % val.step === 0).some(month => day <= DAYS_IN_MONTH[month - 1])
    case 'range':
      return range(val.from, val.to + 1).some(month => day <= DAYS_IN_MONTH[month - 1])
    case 'list':
      return val.values.some(month => day <= DAYS_IN_MONTH[month - 1])
    default:
      return assertUnreachable(val)
  }
}

export const validateTime = (ast: CronAST): CronAST => {
  if (!validateMonth(ast)) {
    throw new Error(`invalid dayOfMonth (${JSON.stringify(ast.time.dayOfMonth)}) for given month(s)`);
  }
  return ast
}


export function isLeapYear(year: number): boolean {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)
}
