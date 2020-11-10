import {
  CronAST,
} from './types'
import { assertUnreachable, range } from './utils';


const maxDate = new Date(8640000000000000);

const maxMinValues = {
  seconds: { from: 0, to: 59 },
  minutes: { from: 0, to: 59 },
  hour: { from: 0, to: 23 },
  dayOfMonth: { from: 1, to: 31 },
  month: { from: 1, to: 12 },
  dayOfWeek: { from: 0, to: 6, }
}

export type CronGenOptions = {
  startDate?: Date,
  endDate?: Date,
}


function validDataForField(field: keyof CronAST['time'], ast: CronAST,): true | Set<number> {
  const cell = ast.time[field]
  if (cell === undefined) throw new Error('seconds are undefined even though match was called for them')
  const { from, to } = maxMinValues[field]

  switch (cell.type) {
    case '*':
      return true
    case 'number':
      return new Set([cell.value])
    case 'step':
      return new Set(range(from, to+1).filter(time => ((time - from) % cell.step) === 0))
    case 'stepfrom':
      // we match every cell.step from cell.from, eg. every 5th minute from 6 to 59
      const normalizedTime = (time: number) => (time - from - cell.from)
      return new Set(range(cell.from, to+1).filter(time => ((normalizedTime(time) >= 0) && (normalizedTime(time) % cell.step) === 0)))
    case 'range':
      return new Set(range(Math.max(cell.from, from), Math.min(cell.to, to)+1))
    case 'list':
      return new Set(cell.values)
    default:
      return assertUnreachable(cell)
  }
}

type Foo = {
  seconds: true | Set<number>
  minutes: true | Set<number>
  hour: true | Set<number>
  dayOfMonth: true | Set<number>
  month: true | Set<number>
  dayOfWeek: true | Set<number>
}

function validTimesForAST(ast: CronAST): Foo {
  const dayOfWeek = validDataForField('dayOfWeek', ast)
  const cronFormat: Foo = {
      minutes: validDataForField('minutes', ast),
      hour: validDataForField('hour', ast),
      dayOfMonth: validDataForField('dayOfMonth', ast),
      month: validDataForField('month', ast),
      dayOfWeek: dayOfWeek instanceof Set ? new Set([...dayOfWeek].map(d => d === 7 ? 0 : d)) : dayOfWeek,
      seconds: true,
  }
  if (ast.time.seconds !== undefined) {
    return {
      ...cronFormat,
      seconds: validDataForField('seconds', ast),
    }
  }
  return cronFormat
}

function match2(data: Foo, time: number, ast: CronAST, field: keyof CronAST['time']) {
  const d = data[field]
  if (d === true) return d
  return d.has(time)
}



function incrementSmallestUnit(datePointer: Date, ast: CronAST) {
  if (ast.time.seconds !== undefined) {
    datePointer.setUTCSeconds(datePointer.getUTCSeconds() + 1)
  } else {
    datePointer.setUTCMinutes(datePointer.getUTCMinutes() + 1)
  }
}

export function* dateGen(ast: CronAST, options: CronGenOptions): Generator<Date, Date, unknown> {
  const startDate: Date = options.startDate || new Date()
  const endDate = options.endDate

  // mutable date time pointer that is used to find the next date
  let datePointer = new Date(startDate)
  datePointer.setUTCMilliseconds(0)
  if (ast.time.seconds === undefined) {
    datePointer.setSeconds(0)
  }
  const datePointerOriginal = new Date(datePointer)

  const validTimes = validTimesForAST(ast)
  const match = match2.bind(null, validTimes)

  // console.log("ast", ast, validTimes)
  while (true) {
    // console.log("loop:", datePointer, datePointer.getUTCDay())

    // if day does not match, move to next day (continue)
    // if month does not match, move to next month (continue)
    // if hour does not match, move to next hour (continue)
    // if minute does not match, move to next minute (continue)
    // if second does not match, move to next second (continue)
    // it matches!

    if (!match(datePointer.getUTCMonth() + 1, ast, 'month')) {
      datePointer.setUTCMonth(datePointer.getUTCMonth() + 1)
      datePointer.setUTCDate(1)
      datePointer.setUTCHours(0)
      datePointer.setUTCMinutes(0)
      datePointer.setUTCSeconds(0)
      // console.log('month')
      continue
    }


    // Day of month and week matching:
    //
    // "The day of a command's execution can be specified by two fields --
    // day of month, and day of week.  If  both	 fields	 are  restricted  (ie,
    // aren't  *),  the command will be run when either field matches the cur-
    // rent time.  For example, "30 4 1,15 * 5" would cause a command to be
    // run at 4:30 am on the  1st and 15th of each month, plus every Friday."
    //
    // http://unixhelp.ed.ac.uk/CGI/man-cgi?crontab+5
    //
    let dayOfWeekMatch = match(datePointer.getUTCDay(), ast, 'dayOfWeek')
    if (datePointer.getUTCDay() === 0) {
      dayOfWeekMatch = match(0, ast, 'dayOfWeek') || match(7, ast, 'dayOfWeek')
    }

    const dayOfMonthMatch = match(datePointer.getUTCDate(), ast, 'dayOfMonth')
    // both restricted
    if (ast.time.dayOfWeek.type !== '*' && ast.time.dayOfMonth.type !== '*') {
      if (!dayOfWeekMatch && !dayOfMonthMatch) {
        datePointer.setUTCDate(datePointer.getUTCDate() + 1)
        // console.log('dayof (mode: both)')
        datePointer.setUTCHours(0)
        datePointer.setUTCMinutes(0)
        datePointer.setUTCSeconds(0)
        continue
      }
    } else {
      if (!dayOfWeekMatch || !dayOfMonthMatch) {
        datePointer.setUTCDate(datePointer.getUTCDate() + 1)
        // console.log('dayof (mode: one or neither limited)')
        datePointer.setUTCHours(0)
        datePointer.setUTCMinutes(0)
        datePointer.setUTCSeconds(0)
        continue
      }
    }


    if (!match(datePointer.getUTCHours(), ast, 'hour')) {
      datePointer.setUTCHours(datePointer.getUTCHours() + 1)
      // console.log('hour')
      datePointer.setUTCMinutes(0)
      datePointer.setUTCSeconds(0)
      continue
    }

    if (!match(datePointer.getUTCMinutes(), ast, 'minutes')) {
      datePointer.setUTCMinutes(datePointer.getUTCMinutes() + 1)
      // console.log('minutes')
      datePointer.setUTCSeconds(0)
      continue
    }

    if (ast.time.seconds) {
      if (!match(datePointer.getUTCSeconds(), ast, 'seconds')) {
        datePointer.setUTCSeconds(datePointer.getUTCSeconds() + 1)
        // console.log('seconds')
        continue
      }
    }

    if (datePointerOriginal.getTime() === datePointer.getTime()) {
      incrementSmallestUnit(datePointer, ast)
      // console.log('not changed')
      continue
    }

    const output = new Date(datePointer)

    incrementSmallestUnit(datePointer, ast)
    // console.log('yield', output, datePointer)
    if (!(datePointer < (endDate || maxDate))) {
      return output
    } else {
      yield output
    }

  }
}
