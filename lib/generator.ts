import { CronAST, CronGenerator, CronGenOptions } from './types'
import { assertUnreachable, range } from './utils'
import { DAYS_IN_MONTH, isLeapYear, MAX_DATE, toDate } from './validation'

/**
 * 'clock' is an array of TIMES.length slots
 * We use an array instead of an object as our algorithm increments i, i+1, i+2, i+3 i+4
 */
type TimeState = number[]
type TimeStateIndex = number

/** Aliases for TimeState indexes */
const TIMES = {
  SECOND: 0,
  MINUTE: 1,
  HOUR: 2,
  DAY_OF_MONTH: 3,
  MONTH: 4,
  YEAR: 5,
}

/**
 * Structure for storing valid times for each CronAST['time'] field
 * - `true` means wilcard i.e. all times are OK
 * - `dayOfMonth` matrix is M[month][days]
 */
type ValidTimes = {
  basic: {
    seconds: true | Array<number>
    minutes: true | Array<number>
    hour: true | Array<number>
    month: true | Array<number>
    year: true | Array<number>
  }
  day: {
    dayOfMonth: true | Array<Array<number>>
    dayOfWeek: true | Array<number>
  }
}

/** Max and min values for TIMES (0-4) */
const maxMinValues = [
  { from: 0, to: 59 },
  { from: 0, to: 59 },
  { from: 0, to: 23 },
  { from: 1, to: 31 },
  { from: 0, to: 11 },
  { from: 1970, to: MAX_DATE.getUTCFullYear() },
]

/**
 * Calculate all valid values for a CronAST['time'] field.
 * True means everything goes (= wildcard).
 */
function validDataForField(
  field: keyof CronAST['time'],
  ast: CronAST,
  reversed: boolean,
): true | number[] {
  const cell = ast.time[field]
  const { from, to } = {
    seconds: maxMinValues[0],
    minutes: maxMinValues[1],
    hour: maxMinValues[2],
    dayOfMonth: maxMinValues[3],
    month: { from: 1, to: 12 },
    dayOfWeek: { from: 0, to: 6 },
  }[field]

  const sorted = (v: number[]) =>
    reversed ? v.sort((a, b) => b - a) : v.sort((a, b) => a - b)

  switch (cell.type) {
    case '*':
      return true
    case 'number':
      return [cell.value]
    case 'step':
      return sorted(
        range(from, to + 1).filter((time) => (time - from) % cell.step === 0),
      )
    case 'stepfrom':
      // we match every cell.step from cell.from, eg. every 5th minute from 6 to 59
      const normalizedTime1 = (time: number) => time - from - cell.from
      return sorted(
        range(Math.max(cell.from, from), to + 1).filter(
          (time) =>
            normalizedTime1(time) >= 0 &&
            normalizedTime1(time) % cell.step === 0,
        ),
      )
    case 'steprange':
      const normalizedTime2 = (time: number) => time - from - cell.from
      const stepFromTo = sorted(
        range(Math.max(cell.from, from), Math.min(cell.to, to) + 1),
      )
      return stepFromTo.filter(
        (time) =>
          normalizedTime2(time) >= 0 && normalizedTime2(time) % cell.step === 0,
      )
    case 'range':
      return sorted(range(Math.max(cell.from, from), Math.min(cell.to, to) + 1))
    case 'list':
      return sorted(cell.values)
    default:
      return assertUnreachable(cell)
  }
}

/** Build ValidTimes data for each CronAST['time'] field */
function validTimesForAST(ast: CronAST, reversed: boolean): ValidTimes {
  const dayOfWeek = validDataForField('dayOfWeek', ast, reversed)
  const month = validDataForField('month', ast, reversed)
  const dayOfMonth = validDataForField('dayOfMonth', ast, reversed)
  return {
    basic: {
      minutes: validDataForField('minutes', ast, reversed),
      hour: validDataForField('hour', ast, reversed),
      month: Array.isArray(month) ? month.map((d) => d - 1) : month,
      seconds:
        ast.time.seconds !== undefined
          ? validDataForField('seconds', ast, reversed)
          : [0],
      year: true,
    },
    day: {
      dayOfMonth: Array.isArray(dayOfMonth)
        ? DAYS_IN_MONTH.map((diM) => dayOfMonth.filter((doM) => doM <= diM))
        : true,
      dayOfWeek: Array.isArray(dayOfWeek)
        ? dayOfWeek.map((d) => (d === 7 ? 0 : d))
        : dayOfWeek,
    },
  }
}

/** TimeState => Date */
function dateFromState(state: TimeState, utc: boolean): Date {
  return utc
    ? new Date(
        Date.UTC(state[5], state[4], state[3], state[2], state[1], state[0]),
      )
    : new Date(state[5], state[4], state[3], state[2], state[1], state[0])
}

function stateFromDate(date: Date, utc: boolean): TimeState {
  return [
    utc ? date.getUTCSeconds() : date.getSeconds(),
    utc ? date.getUTCMinutes() : date.getMinutes(),
    utc ? date.getUTCHours() : date.getHours(),
    utc ? date.getUTCDate() : date.getDate(),
    utc ? date.getUTCMonth() : date.getMonth(),
    utc ? date.getUTCFullYear() : date.getFullYear(),
  ]
}

/** Fails if it's February 29th on a non-leap year */
function leapYearCheck(state: TimeState, day: number): boolean {
  return !(
    !isLeapYear(state[TIMES.YEAR]) &&
    state[TIMES.MONTH] === 1 &&
    day === 29
  )
}

function canIncrementIndex(
  state: TimeState,
  i: TimeStateIndex,
  reversed: boolean,
): boolean {
  // not all months have same amount of days, so we can't rely on maxMinValues
  if (i === TIMES.DAY_OF_MONTH) {
    const m = state[TIMES.MONTH]

    let daysInMonth = DAYS_IN_MONTH[m]
    if (m == 1 && !isLeapYear(state[TIMES.YEAR])) {
      daysInMonth = 28
    }

    return reversed ? state[i] - 1 >= 1 : state[i] + 1 <= daysInMonth
  }

  return reversed
    ? state[i] - 1 >= maxMinValues[i].from
    : state[i] + 1 <= maxMinValues[i].to
}

function maxDay(state: TimeState, reversed: boolean): number {
  if (reversed) {
    if (isLeapYear(state[TIMES.YEAR]) && state[TIMES.MONTH] === 1) {
      return 28
    } else {
      return maxMinValues[TIMES.DAY_OF_MONTH].to
    }
  }
  return 1
}

/**
 * Recursively increment 'i'th time state and any that might be dependent on it.
 * Mutates the state array due to performance reasons.
 *
 * Example:
 *   if it's 23:30 and we increment by 1 hour, we must also increment the day
 *   ...and if it was february 28th on a leap year we need to bump it to 29th
 *   (otherwise we'd also need to bump month and reset sec/min/hour/day to May 1st, 00:00:00)
 *
 * Use
 *
 *    incrementState(times, state, 0)
 *    // or
 *    incrementState(times, state, TIMES.SECONDS)
 *
 * to increment timestate to next valid time.
 *
 */
const incrementState = (
  validTimes: ValidTimes,
  state: TimeState,
  i: TimeStateIndex,
  reversed: boolean,
  utc: boolean,
) => {
  if (i >= state.length) return

  // Day of month and week matching:
  //
  // "The day of a command's execution can be specified by two fields --
  // day of month, and day of week.  If  both	 fields	 are  restricted  (ie,
  // aren't  *),  the command will be run when either field matches the cur-
  // rent time.  For example, "30 4 1,15 * 5" would cause a command to be
  // run at 4:30 am on the  1st and 15th of each month, plus every Friday."
  //
  // http://unixhelp.ed.ac.uk/CGI/man-cgi?crontab+5

  // Day of Month is restricted (Day of Week is wildcard) OR both are wildcards
  //   => do nothing as our base cases handle these

  // Day of Week is restricted (Day of Month is wildcard) OR both are restrictired
  if (i === TIMES.DAY_OF_MONTH && Array.isArray(validTimes.day.dayOfWeek)) {
    // this is not an infinite loop because we change state until we have a valid DoW
    while (true) {
      // calculate next suitable weekday by incrementing DoM and coming back to this branch recursively
      if (canIncrementIndex(state, i, reversed)) {
        reversed ? (state[i] -= 1) : (state[i] += 1)
      } else {
        // overflow, gotta handle that first
        state[TIMES.DAY_OF_MONTH] = maxDay(state, reversed)
        incrementState(validTimes, state, i + 1, reversed, utc)
      }
      // is this a valid DoW ?
      if (utc) {
        if (
          validTimes.day.dayOfWeek.includes(
            dateFromState(state, utc).getUTCDay(),
          )
        )
          return
      } else {
        if (
          validTimes.day.dayOfWeek.includes(dateFromState(state, utc).getDay())
        )
          return
      }

      // if both are restricted, is this a valid Day of Month ?
      if (
        Array.isArray(validTimes.day.dayOfMonth) &&
        validTimes.day.dayOfMonth[state[4]].find((v) => v === state[i])
      ) {
        return
      }
    }
  }

  const valids = [
    validTimes.basic.seconds,
    validTimes.basic.minutes,
    validTimes.basic.hour,
    validTimes.day.dayOfMonth,
    validTimes.basic.month,
    validTimes.basic.year,
  ][i]

  // Wildcard case
  if (valids === true) {
    const nextVal = state[i] + (reversed ? -1 : 1)
    if (
      canIncrementIndex(state, i, reversed) ||
      (i === TIMES.DAY_OF_MONTH && leapYearCheck(state, nextVal))
    ) {
      state[i] = nextVal
    } else {
      // overflow
      state[i] = reversed ? maxMinValues[i].to : maxMinValues[i].from
      incrementState(validTimes, state, i + 1, reversed, utc)
    }
  }
  // non-wildcard case, find next valid value
  else {
    const validsNormalised =
      valids.length > 0 && Array.isArray(valids[0])
        ? (valids[state[TIMES.MONTH]] as number[])
        : (valids as number[])

    const predicate: (v: number) => boolean = reversed
      ? (v) => v < state[i]
      : (v) => v > state[i]
    const newState = validsNormalised.find(predicate)

    if (
      newState !== undefined &&
      (i !== TIMES.DAY_OF_MONTH || leapYearCheck(state, newState))
    ) {
      state[i] = newState
    } else {
      // overflow
      state[i] = validsNormalised[0]
      incrementState(validTimes, state, i + 1, reversed, utc)
    }
  }
}

/**
 * Handle incrementing TimeState to next valid time unless already valid,
 * returns true if state was shifted.
 */
function incrementStateUnlessValid(
  validTimes: ValidTimes,
  state: TimeState,
  i: TimeStateIndex,
  reversed: boolean,
  utc: boolean,
): boolean {
  const method = utc ? 'getUTCDay' : 'getDay'

  // shift days if neither matches OR if both are not wildcard
  if (i === TIMES.DAY_OF_MONTH) {
    if (
      !(
        validTimes.day.dayOfMonth === true && validTimes.day.dayOfWeek === true
      ) &&
      !(
        Array.isArray(validTimes.day.dayOfMonth) &&
        validTimes.day.dayOfMonth[state[TIMES.MONTH]].includes(
          state[TIMES.DAY_OF_MONTH],
        )
      ) &&
      !(
        Array.isArray(validTimes.day.dayOfWeek) &&
        validTimes.day.dayOfWeek.includes(dateFromState(state, utc)[method]())
      )
    ) {
      incrementState(validTimes, state, TIMES.DAY_OF_MONTH, reversed, utc)
      return true
    }
    return false
  }

  // shift basic times if they aren't in valids (or wildcards)
  const field = ['seconds', 'minutes', 'hour', undefined, 'month'][i] as
    | keyof ValidTimes['basic']
    | undefined
  if (field === undefined)
    throw Error(
      `invalid TimeStateIndex ${i} passed to incrementStateUnlessValid`,
    )

  const valids = validTimes.basic[field]
  if (!(valids === true || valids.includes(state[i]))) {
    incrementState(validTimes, state, i, reversed, utc)
    return true
  }
  return false
}

/**
 * Generate Date objects in chronological order based on the CronAST['time'] rules.
 *
 * Usage:
 *
 *      dateGen(parser(1 2 * * 1,2), { startDate: Date(2020, 0, 1, 0, 0) })
 *
 * @param ast CronAST from our parser
 * @param opts Generator options
 */
export function* dateGen(ast: CronAST, _opts: CronGenOptions): CronGenerator {
  const opts = {
    startDate: toDate(_opts.startDate) || new Date(),
    endDate: toDate(_opts.endDate),
    reversed: _opts.reverse || false,
    customState: toDate(_opts.customState),
    debug: _opts.debug,
    utc: _opts.utc === undefined ? true : _opts.utc,
    zeroMS: _opts.zeroMS,
  }

  // swap dates if reverse and they need swappin to make a valid range
  const swapStartEnd =
    opts.reversed &&
    opts.endDate instanceof Date &&
    opts.endDate > opts.startDate
  const startDate = swapStartEnd && opts.endDate ? opts.endDate : opts.startDate
  const endDate = swapStartEnd ? opts.startDate : opts.endDate

  const validTimes = validTimesForAST(ast, opts.reversed)

  if (opts.zeroMS) {
    opts.customState?.setMilliseconds(0)
    startDate.setMilliseconds(0)
    endDate?.setMilliseconds(0)
  }

  const state: TimeState =
    opts.customState instanceof Date
      ? stateFromDate(opts.customState, opts.utc)
      : stateFromDate(startDate, opts.utc)

  if (opts.debug) {
    console.debug(`Running dateGen with AST:

    ${JSON.stringify(ast, null, 2)}

    and validTimes:

    ${JSON.stringify(ast, null, 2)}

    state:
    ${state}
    ${dateFromState(state, opts.utc)}

    opts:
    ${JSON.stringify(opts, null, 2)}
    `)
  }

  // Let's get down to business.
  // Handle times from smallest to largest, incrementing them to the next valid time if they're not valid.
  while (true) {
    incrementStateUnlessValid(
      validTimes,
      state,
      TIMES.SECOND,
      opts.reversed,
      opts.utc,
    )
    incrementStateUnlessValid(
      validTimes,
      state,
      TIMES.MINUTE,
      opts.reversed,
      opts.utc,
    )
    incrementStateUnlessValid(
      validTimes,
      state,
      TIMES.HOUR,
      opts.reversed,
      opts.utc,
    )
    incrementStateUnlessValid(
      validTimes,
      state,
      TIMES.DAY_OF_MONTH,
      opts.reversed,
      opts.utc,
    )
    const shifted = incrementStateUnlessValid(
      validTimes,
      state,
      TIMES.MONTH,
      opts.reversed,
      opts.utc,
    )
    if (shifted) {
      // we need to check days again as changing month can break DoM/DoW match
      if (opts.reversed)
        (state[0] = 59),
          (state[1] = 59),
          (state[2] = 23),
          (state[3] = maxDay(state, opts.reversed))
      else (state[0] = 0), (state[1] = 0), (state[2] = 0), (state[3] = 1)
      continue
    }

    // if we are still at startDate, we need to get the next one (due to spec)
    const stateMS = dateFromState(state, opts.utc).getTime()
    if (startDate.getTime() == stateMS)
      incrementState(validTimes, state, TIMES.SECOND, opts.reversed, opts.utc)

    // only yield allowed values
    if (!opts.reversed && endDate && stateMS > endDate.getTime()) return null
    if (
      opts.reversed &&
      endDate &&
      stateMS < Math.min(endDate.getTime(), startDate.getTime())
    )
      return null

    // yield & increment, start over
    yield dateFromState(state, opts.utc)
    incrementState(validTimes, state, TIMES.SECOND, opts.reversed, opts.utc)
  }
}
