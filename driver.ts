import { parser } from "./lib"
import { dateGen } from "./lib/generator"
import { range } from "./lib/utils"

// const startDate = new Date(Date.parse("2020-01-01T00:00:00.000Z"))
// const endDate = new Date(Date.parse("2020-01-01T01:00:00.000Z"))
// const s= '* * * * *'

const startDate = new Date('Wed, 26 Dec 2012 14:38:53')
const endDate = new Date('Wed, 26 Dec 2012 20:38:53')
// const s = '1 2 3 * *'
// const s = '10 2 12 8 0'
const s = '10 2 12 8 6,0'
// const s = '* * * * 2 *'
// const s = '0 9,11,1 * * *'

// console.log(startDate, endDate)

// const ast = parser('1 19 1 1 1')
const ast = parser(s)
// const g = dateGen(ast[0], { startDate, endDate })
// const g = dateGen(ast[0], { startDate: new Date('2020-11-06T16:00:00.000Z') })
// const g = dateGen(ast[0], {startDate})
// const g = dateGen(parser('10-30 2 12 8 0')[0], { startDate: new Date(2020, 0, 1) })
const g = dateGen(parser('0 * * * *')[0], {
  startDate: new Date('2019-06-01T11:00:00.000Z'),
  endDate: new Date('2019-06-05T11:00:00.000Z'),
  reverse: true
});

// for (const d of g) {
//   console.log(d.toUTCString())
// }

let res = []
for (let i = 0; i < range(0, 20).length; i++) {
  res.push(g.next().value)
}

console.error(res)
