# cron-parser

Crontab parser for TypeScript
Provides a generator for accessing Date objects.

No dependencies, just strict TypeScript.

Some JS can be found from tests as I use tests from other projects (MIT licensed) to verify the implementation.

## Basic usage

```typescript
import * as Cron from "./lib"

const gen = Cron.loadOne('5 4 * * *', { startDate: new Date('2020-11-11') })
gen.next().value // => Date('2020-11-11T04:05:00.000Z')
gen.next().value // => Date('2020-11-12T04:05:00.000Z')
```

Where the options is defined as:

```typescript
export type CronGenOptions = {
  startDate?: Date | string     // startDate for generator
  endDate?: Date | string       // endDate for generator, null is returned when done===true
  reverse?: boolean             // go back in time instead of forward
  utc?: boolean                 // use UTC methods for all Date operations (default true)
  zeroMS?: boolean              // set milliseconds to zero (default false)
  debug?: boolean               // debug prints
  customState?: Date | string   // provide a custom starting state for the generator
}
```

## Supported format

```
*    *    *    *    *    *    <command>
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    |
│    │    │    │    │    └ day of week (0 - 7, Mon-Sun)
│    │    │    │    └───── month (1 - 12, Jan-Dec)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, optional)

    *   any value
    ,   value list separator
    -   range of values
    /   step values
    @yearly  (non-standard)
    @monthly (non-standard)
    @weekly  (non-standard)
    @daily   (non-standard)
    @hourly  (non-standard)
```
## Tests

We have tests from other Crontab related projects (under MIT) in `tests/`.
See `package.json` for running individual test suites.

```bash
# run all tests
npm run test
```

## Examples

### Generate timestamps from a cron syntax

`loadOne` returns a TS generator that yields timestamps

```typescript
import * as Cron from "./lib"

// "At minute 0 past every hour from 3 through 4 on day-of-month 1 and 2 and on Monday in every 2nd month."
const g = Cron.loadOne('0 3-4 1,2 */2 1')
const times = Array.from({ length: 10 }, () => g.next().value)

console.log(times)
/* =>
[
  2020-11-16T03:00:00.000Z,
  2020-11-16T04:00:00.000Z,
  2020-11-23T03:00:00.000Z,
  2020-11-23T04:00:00.000Z,
  2020-11-30T03:00:00.000Z,
  2020-11-30T04:00:00.000Z,
  2021-01-01T03:00:00.000Z,
  2021-01-01T04:00:00.000Z,
  2021-01-02T03:00:00.000Z,
  2021-01-02T04:00:00.000Z
]
*/
```

### Generate Date objects from a crontab file

`load` can handle anything from `loadOne`'s input to entire crontab files

```typescript
import * as Cron from "./lib"

const crontabFile = `
# Comment line (ignore)
ENV1="test1"
ENV2="test2"

*/10 * * * * /path/to/exe
*/10 * * * * /path/to/exe
0 09-18 * * 1-5 /path/to/exe
`

const res = Cron.load(crontabFile)
const times = res.expressions.map(g => Array.from({ length: 2 }, () => g.next().value))

console.log(times)
/*
  [
    [ 2020-11-11T00:20:00.000Z, 2020-11-11T00:30:00.000Z ],
    [ 2020-11-11T00:20:00.000Z, 2020-11-11T00:30:00.000Z ],
    [ 2020-11-11T09:00:00.000Z, 2020-11-11T10:00:00.000Z ]
  ]
*/

const timesWithCommands = res.expressions.map(g =>
  Array.from({ length: 2}, (_,i) => [g.next().value, res.commands[i], res.variables])
)
console.log(timesWithCommands)
/*
[
  [
    [ 2020-11-11T00:50:00.000Z, '/path/to/exe', { env1: '"test1"', env2: '"test2"' } ],
    [ 2020-11-11T01:00:00.000Z, '/path/to/exe', { env1: '"test1"', env2: '"test2"' } ]
  ],
  [
    [ 2020-11-11T00:50:00.000Z, '/path/to/exe', { env1: '"test1"', env2: '"test2"' } ],
    [ 2020-11-11T01:00:00.000Z, '/path/to/exe', { env1: '"test1"', env2: '"test2"' } ]
  ],
  [
    [ 2020-11-11T11:00:00.000Z, '/path/to/exe', { env1: '"test1"', env2: '"test2"' } ],
    [ 2020-11-11T12:00:00.000Z, '/path/to/exe', { env1: '"test1"', env2: '"test2"' } ]
  ]
]
*/
```
