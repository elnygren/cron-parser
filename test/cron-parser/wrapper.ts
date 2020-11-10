/**
 * Wrapping for our Cron implementation that can be used in cron-parser's tests.
 * It does not provide an exact 1:1 API so some changes in the tests were required.
 */
import { loadOne, load } from '../../lib'
import { CronGenerator } from '../../lib/types'

class MyWrapper {
  private _opts: any
  private _gen: CronGenerator
  private _s: string

  constructor(s: string, opts: any) {
    this._s = s
    this._opts = { startDate: opts?.currentDate || opts?.startDate, endDate: opts?.endDate, reverse: opts?.reverse, customState: opts?.customState || undefined }
    this._gen = loadOne(this._s, this._opts)
  }

  reset(customState?: Date) {
    this._opts = { ...this._opts, reverse: false, customState: (customState === undefined) ? this._opts.customState : customState }
    this._gen = loadOne(this._s, this._opts)
  }

  resetReverse() {
    this._opts = { ...this._opts, reverse: true }
    this._gen = loadOne(this._s, this._opts)
  }

  iterate(n: number): Date[] {
    if (n < 0) this._opts = { ...this._opts, reverse: true }
    else this._opts = { ...this._opts, reverse: false }

    this._gen = loadOne(this._s, this._opts)

    let results = []
    for (let i = 0; i < Math.abs(n); i++) {
      results.push(this._gen.next().value)
    }

    return results.filter(x => x !== null && x !== undefined) as Date[]
  }

  next(): Date | null {
    return this._gen.next().value
  }

  hasNext(): boolean {
    // yup this will ruin the state, but that's fine for cron-parser tests
    return !!!this._gen.next().done
  }

  prev(): Date | null {
    if (this._opts.reverse !== true) {
      throw new Error("Please pass `reverse: true` as an option if calling .prev");
    }
    return this._gen.next().value
  }
}

const parseWrapper = (s: string, opts: any): MyWrapper => {
  return new MyWrapper(s, opts)
}

export function addMinute(d: Date): Date {
  d.setUTCMinutes(d.getUTCMinutes() + 1)
  return d
}

export function addYear(d: Date): Date {
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d
}

/**
 * The actual wrapper.
 *
 * Usage:
 *
 *      const CronExpression = require('./wrapper').CronExpression;
 *      const generator = CronExpression.parse('* * * * *')
 */
export const CronExpression = {
  parse: parseWrapper,
  parseExpression: parseWrapper,
  parseFile: (s: string, callback: (err: any, result: any) => void) => {
    const result = load(s, {})
    callback(null, { expressions: result.expressions, variables: result.variables === undefined ? {} : result.variables, errors: {} })
  }
}
