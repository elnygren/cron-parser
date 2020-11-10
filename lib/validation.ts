import {
  CronCell,
  CronAST,
} from './types'
import { assertUnreachable, prettyPrint, range } from './utils';

export const MAX_DATE = new Date(8640000000000000);

/** Amount of days in Jan...Dec, with 29 in February ((non) leap years must be handled explicitly) */
export const DAYS_IN_MONTH = [ 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];


/** The classic leap year validator */
export function isLeapYear(year: number): boolean {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)
}


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
      case 'stepfrom':
        return validator(val.step) && val.step !== 0 && validator(val.from)
      case 'steprange':
        return validator(val.step) && val.step !== 0 && validator(val.from) && validator(val.to)
      case 'range':
        return validator(val.from) && validator(val.to)
      case 'list':
        return val.values.every(validator)
      default:
        return assertUnreachable(val)
    }
  }
  if (validate(val)) return val
  throw new Error(`Invalid value for ${field} (${prettyPrint(val)})`)
}

const dayValueForDoMValidation = (val: CronCell): number => {
  switch (val.type) {
    case '*':
      return -1
    case 'number':
      return val.value
    case 'step':
      return val.step
    case 'stepfrom':
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

export const validateMonthAndDay = (ast: CronAST): boolean => {
  const month = ast.time.month
  const dayOfMonth = dayValueForDoMValidation(ast.time.dayOfMonth)
  switch (month.type) {
    case '*':
      return true
    case 'number':
      return dayOfMonth <= DAYS_IN_MONTH[month.value - 1]
    case 'step':
      return range(0, 12).filter(m => m % month.step === 0).some(m => dayOfMonth <= DAYS_IN_MONTH[m])
    case 'stepfrom':
      return range(0, 12).filter(m => m % month.step === 0).some(m => dayOfMonth <= DAYS_IN_MONTH[m])
    case 'steprange':
      return range(month.from, month.to).filter(m => m % month.step === 0).some(m => dayOfMonth <= DAYS_IN_MONTH[m])
    case 'range':
      return range(month.from, month.to + 1).some(month => dayOfMonth <= DAYS_IN_MONTH[month - 1])
    case 'list':
      return month.values.some(month => dayOfMonth <= DAYS_IN_MONTH[month - 1])
    default:
      return assertUnreachable(month)
  }
}
