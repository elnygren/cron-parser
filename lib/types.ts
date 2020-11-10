export type WildcardValue = { type: '*' } // *
export type NumberValue = { type: 'number', value: number } // 1
export type StepValue = { type: 'step', step: number } // */5
export type StepRangeValue = { type: 'steprange', step: number, from: number } // */5
export type RangeValue = { type: 'range', from: number, to: number } // 1-5
export type ListValue = { type: 'list', values: number[] } // 1,2,3
export type CronCell = NumberValue | WildcardValue | StepValue | RangeValue | StepRangeValue | ListValue

/** Cron strings and CronConfigs are parsed to the AST. */
export type CronAST = {
  time: {
    seconds: CronCell,
    minutes: CronCell,
    hour: CronCell,
    dayOfMonth: CronCell,
    month: CronCell,
    dayOfWeek: CronCell,
  },
  command?: string,
  variables?: { [key in string]: string }
}

export type CronGenerator = Generator<Date, null, unknown>

export type CronGeneratorSet = {
  expressions: CronGenerator[],
  variables?: { [key in string]: string },
}


/**
 * Alternative JS/TS format for Cron.
 * The Cron string format is mapped to this so it's a feature complete substitute.
 */
export type CronConfig = {
  seconds?: CronCell,
  minutes?: CronCell,
  hour?: CronCell,
  dayOfMonth?: CronCell,
  month?: CronCell,
  dayOfWeek?: CronCell,
  command?: string,
  variables?: { [key in string]: string }
}


/* Type guards */

export const isNumber = (x: any): x is number => !isNaN(parseInt(x, 10))

export type Token = { command?: string, time: CronCell[] }
export type Tokens = { variables: { [x in string]: string }, expressions: Array<Token> }
