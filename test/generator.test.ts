import { expect } from 'chai';
import { loadOne } from '../lib'
import { range } from '../lib/utils';

describe('generator', () => {

  it('expression using explicit month definition and */5 day of month step', () => {
    const firstIterator = loadOne('0 12 */5 6 *', {
      startDate: new Date('2019-06-01T11:00:00.000Z')
    });

    const firstExpectedDates = [
      new Date('2019-06-01T12:00:00.000Z'),
      new Date('2019-06-06T12:00:00.000Z'),
      new Date('2019-06-11T12:00:00.000Z'),
      new Date('2019-06-16T12:00:00.000Z'),
      new Date('2019-06-21T12:00:00.000Z'),
      new Date('2019-06-26T12:00:00.000Z'),
      new Date('2020-06-01T12:00:00.000Z')
    ];

    firstExpectedDates.forEach((expectedDate) => {
        expect(firstIterator.next().value?.toISOString()).to.eq(expectedDate.toISOString());
    });

    const secondIterator = loadOne('0 15 */5 5 *', {
      startDate: new Date('2019-05-01T11:00:00.000Z')
    });

    const secondExpectedDates = [
      new Date('2019-05-01T15:00:00.000Z'),
      new Date('2019-05-06T15:00:00.000Z'),
      new Date('2019-05-11T15:00:00.000Z'),
      new Date('2019-05-16T15:00:00.000Z'),
      new Date('2019-05-21T15:00:00.000Z'),
      new Date('2019-05-26T15:00:00.000Z'),
      new Date('2019-05-31T15:00:00.000Z'),
      new Date('2020-05-01T15:00:00.000Z')
    ];

    secondExpectedDates.forEach((expectedDate) => {
      expect(secondIterator.next().value?.toISOString()).to.eq(expectedDate.toISOString());
    });

  });


})


describe('generator-edge-cases', () => {
  it('range test with value and repeat (second)', () => {
    const gen = loadOne('0/30 * * * * ?', {
      startDate: new Date('Wed, 26 Dec 2012 14:38:53')
    });

    expect([
      gen.next().value,
      gen.next().value,
      gen.next().value,
    ]).to.deep.eq([
      new Date('2012-12-26T12:39:00.000Z'),
      new Date('2012-12-26T12:39:30.000Z'),
      new Date('2012-12-26T12:40:00.000Z'),
    ])
  });

  it('range test with iterator', () => {
    const interval = loadOne('10-30 2 12 8 0', {});

    expect(range(0, 21).map(_ => interval.next().value)).to.deep.eq([
      new Date('2021-08-01T02:10:00.000Z'),
      new Date('2021-08-01T02:11:00.000Z'),
      new Date('2021-08-01T02:12:00.000Z'),
      new Date('2021-08-01T02:13:00.000Z'),
      new Date('2021-08-01T02:14:00.000Z'),
      new Date('2021-08-01T02:15:00.000Z'),
      new Date('2021-08-01T02:16:00.000Z'),
      new Date('2021-08-01T02:17:00.000Z'),
      new Date('2021-08-01T02:18:00.000Z'),
      new Date('2021-08-01T02:19:00.000Z'),
      new Date('2021-08-01T02:20:00.000Z'),
      new Date('2021-08-01T02:21:00.000Z'),
      new Date('2021-08-01T02:22:00.000Z'),
      new Date('2021-08-01T02:23:00.000Z'),
      new Date('2021-08-01T02:24:00.000Z'),
      new Date('2021-08-01T02:25:00.000Z'),
      new Date('2021-08-01T02:26:00.000Z'),
      new Date('2021-08-01T02:27:00.000Z'),
      new Date('2021-08-01T02:28:00.000Z'),
      new Date('2021-08-01T02:29:00.000Z'),
      new Date('2021-08-01T02:30:00.000Z'),
    ])
  })

  it('dow 6,7 6,0 0,6 7,6 should be equivalent',() => {
    const expressions = [
      '30 16 * * 6,7',
      '30 16 * * 6,0',
      '30 16 * * 0,6',
      '30 16 * * 7,6'
    ];

    expressions.forEach(function (expression) {
      var interval = loadOne(expression, { startDate: new Date('Wed, 26 Dec 2012 14:38:53') });
      const data = range(0, 3).map(_ => interval.next().value)
      expect(data[0]?.getUTCDay()).to.eq(6, 'Day matches')
      expect(data[1]?.getUTCDay()).to.eq(0, 'Day matches')
      expect(data[2]?.getUTCDay()).to.eq(6, 'Day matches')
    });
  });

  it('changing month can break DoW match so must check days again if changing month', () => {
    // start from Dec 2012
    const startDate = new Date('Wed, 26 Dec 2012 14:38:53')

    // want dates from August (12th or monday/sunday)
    const gen = loadOne('10 2 12 8 6,0', { startDate })
    expect(range(0, 6).map(_ => gen.next().value)).to.deep.eq([
      new Date('2013-08-03T02:10:00.000Z'),
      new Date('2013-08-04T02:10:00.000Z'),
      new Date('2013-08-10T02:10:00.000Z'),
      new Date('2013-08-11T02:10:00.000Z'),
      new Date('2013-08-12T02:10:00.000Z'),
      new Date('2013-08-17T02:10:00.000Z'),
    ])

  })

  it('leap-year and non-leap-year february->march shift', () => {
    const gen1 = loadOne('* * * * * *', { startDate: new Date('2020-02-28T23:59:58.000Z')})
    expect(range(0, 4).map(_ => gen1.next().value)).to.deep.eq([
      new Date('2020-02-28T23:59:59.000Z'),
      new Date('2020-02-29T00:00:00.000Z'),
      new Date('2020-02-29T00:00:01.000Z'),
      new Date('2020-02-29T00:00:02.000Z'),
    ])

    const gen2 = loadOne('* * * * * *', { startDate: new Date('2021-02-28T23:59:58.000Z') })
    expect(range(0, 4).map(_ => gen2.next().value)).to.deep.eq([
       new Date('2021-02-28T23:59:59.000Z'),
       new Date('2021-03-01T00:00:00.000Z'),
       new Date('2021-03-01T00:00:01.000Z'),
       new Date('2021-03-01T00:00:02.000Z'),
    ])

    const gen1Reverse = loadOne('* * * * * *', { startDate: new Date('2020-02-29T00:00:02.001Z'), reverse: true })
    expect(range(0, 4).map(_ => gen1Reverse.next().value)).to.deep.eq([
      new Date('2020-02-29T00:00:02.000Z'),
      new Date('2020-02-29T00:00:01.000Z'),
      new Date('2020-02-29T00:00:00.000Z'),
      new Date('2020-02-28T23:59:59.000Z'),
    ])

    const gen2Reverse = loadOne('* * * * * *', { startDate: new Date('2021-03-01T00:00:02.001Z'), reverse: true })
    expect(range(0, 4).map(_ => gen2Reverse.next().value)).to.deep.eq([
      new Date('2021-03-01T00:00:02.000Z'),
      new Date('2021-03-01T00:00:01.000Z'),
      new Date('2021-03-01T00:00:00.000Z'),
      new Date('2021-02-28T23:59:59.000Z'),
    ])
  })

})
