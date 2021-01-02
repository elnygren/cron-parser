type WildcardValue = { type: '*' } // *
type NumberValue = { type: 'number', value: number } // 1
type StepValue = { type: 'step', step: number } // */5
type StepFromValue = { type: 'stepfrom', step: number, from: number } // 5/5
type StepRangeValue = { type: 'steprange', step: number, from: number, to: number } // 20-40/5
type RangeValue = { type: 'range', from: number, to: number } // 1-5
type ListValue = { type: 'list', values: number[] } // 1,2,3
export type CronCell =
  NumberValue | WildcardValue | StepValue | StepFromValue | StepRangeValue | RangeValue | ListValue

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
  commands: string[],
}

/** Generator's options */
export type CronGenOptions = {
  startDate?: Date | string     // startDate for generator
  endDate?: Date | string       // endDate for generator, null is returned when done===true
  reverse?: boolean             // go back in time instead of forward
  utc?: boolean                 // use UTC methods for all Date operations (default true)
  zeroMS?: boolean              // set milliseconds to zero (default false)
  debug?: boolean               // debug prints
  customState?: Date | string   // provide a custom starting state for the generator
}


/**
 * Alternative JS/TS format for Cron.
 * The Cron string format is mapped to this so it's a feature complete substitute.
 */
export type CronConfig = {
  seconds?: CronCell
  minutes?: CronCell
  hour?: CronCell
  dayOfMonth?: CronCell
  month?: CronCell
  dayOfWeek?: CronCell
  command?: string
  variables?: { [key in string]: string }
}

/**
 * JS/TS format for our WeekMode "Cron" generator.
 *
 * Instead of matching Month,Day of Month / Day of Week,
 * we match with week number and day of week.
 */
export type WeekModeCronAST = {
  time: {
    seconds: CronCell
    minutes: CronCell
    hour: CronCell
    dayOfWeek: CronCell
    week: CronCell
  }
  command?: string
  variables?: { [key in string]: string }
}
