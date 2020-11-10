import { expect } from 'chai';
import { parser } from '../lib';

const p = (s: string) => parser(s)[0].time


describe('parser & tokenizer', function () {

  it('valid inputs', () => {
    expect(p('* * * * * *')).to.deep.eq({
      seconds: { type: '*' },
      minutes: { type: '*' },
      hour: { type: '*' },
      dayOfMonth: { type: '*' },
      month: { type: '*' },
      dayOfWeek: { type: '*' },
    })

    // note: we don't mind a little extra whitespace
    expect(p(' *  *  *  *  * ')).to.deep.eq({
      seconds: { type: 'number', value: 0 },
      minutes: { type: '*' },
      hour: { type: '*' },
      dayOfMonth: { type: '*' },
      month: { type: '*' },
      dayOfWeek: { type: '*' },
    })

    expect(p('1 2 3 4 5 6')).to.deep.eq({
      seconds: { type: 'number', value: 1 },
      minutes: { type: 'number', value: 2 },
      hour: { type: 'number', value: 3 },
      dayOfMonth: { type: 'number', value: 4 },
      month: { type: 'number', value: 5 },
      dayOfWeek: { type: 'number', value: 6 },
    })

    expect(p('1,2,3 2-3 */2 * 5 6')).to.deep.eq({
      seconds: { type: 'list', values: [1, 2, 3] },
      minutes: { type: 'range', from: 2, to: 3 },
      hour: { type: 'step', step: 2 },
      dayOfMonth: { type: '*' },
      month: { type: 'number', value: 5 },
      dayOfWeek: { type: 'number', value: 6 },
    })

    expect(p('1,2,3 2-30 */10 * 5 6')).to.deep.eq({
      seconds: { type: 'list', values: [1, 2, 3] },
      minutes: { type: 'range', from: 2, to: 30 },
      hour: { type: 'step', step: 10 },
      dayOfMonth: { type: '*' },
      month: { type: 'number', value: 5 },
      dayOfWeek: { type: 'number', value: 6 },
    })

  })

  it('invalid inputs', function () {
    expect(() => p('')).to.throw(
      `invalid length detected in cron syntax: "" has length 0 (5 or 6 expected)`)
    expect(() => p('* * * *')).to.throw(
      `invalid length detected in cron syntax: "* * * *" has length 4 (5 or 6 expected)`)

    // invalid steps
    expect(() => p('* */* 1 2 * *')).to.throw(
      `invalid token detected in cron syntax: */*`)
    expect(() => p('*/1/2 * * * *')).to.throw(
      `invalid token detected in cron syntax: */1/2`)
    expect(() => p('* * 2/-1 * *')).to.throw(
      `invalid token detected in cron syntax: 2/-1`)

    // invalid lists
    expect(() => p('* * 1, 2,3 * *')).to.throw(
      `invalid token detected in cron syntax: 1,`)
    expect(() => p('* * * 1,2 ,3 *')).to.throw(
      `invalid token detected in cron syntax: ,3`)

    // invalid ranges
    expect(() => p('* * 1- 2-3 * *')).to.throw(
      `invalid token detected in cron syntax: 1-`)
    expect(() => p('* * * 1-2 -3 *')).to.throw(
      `invalid token detected in cron syntax: -3`)
    expect(() => p('* * * 2-1 -3 *')).to.throw(
      `invalid token detected in cron syntax: 2-1`)

    // correct format, wrong values
    expect(() => p('* 66 * * *')).to.throw(
      `Invalid value for hour (66)`)
    expect(() => p('* * 66 * * *')).to.throw(
      `Invalid value for hour (66)`)
    expect(() => p('* * * * * 8')).to.throw(
      `Invalid value for dayOfWeek (8)`)
  });
});
