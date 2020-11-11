/**
 * Wrapping for our Cron implementation that can be used in coner's tests.
 */

import { loadOne } from "../../lib";
import { CronGenerator } from "../../lib/types";

class MyWrapper {
  private _gen: CronGenerator
  private _s: string

  constructor(s: string, opts: any = {}) {
    this._s = s

    const options = { ...opts, utc: false, zeroMS: true }
    if (opts.startAt) {
      options.startDate = opts.startAt ? opts.startAt : undefined

      // croner works so that if startAt is in past, we still start from "now"
      // which is why we set customState = now
      const now = new Date()
      if (!isNaN(opts.startAt) && opts.startAt.getTime() < now.getTime()) {
        options.customState = now
      }
    }

    if (opts.stopAt) {
      options.endDate = opts.stopAt
    }

    this._gen = loadOne(this._s, options)
  }

  next(): Date | null {
    return this._gen.next().value
  }

}


export function Cron(s: string, opts: any): MyWrapper {
  return new MyWrapper(s, opts)
}
