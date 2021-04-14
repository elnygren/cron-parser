
# How does it work?

## Overview

We follow a lightweight interpreter structure: we have a tokenizer and a parser that create an AST. This AST is then executed by our generator.

* `parser.ts`
  * **Parser** signature: `parser = (input: string | CronConfig | CronConfig[]) -> CronAST[]` 
    * we support many crontab expressions, that's why it's an array `CronAST[]`
    * we support different inputs, but quite often you'll want to pass something like `"* * * * *"`
  * **Tokenizer** can be used to map a string input into `CronCofig`

* `generator.ts`
  * start generating correct timestamps based on `CronAST`
  * `export function* dateGen(ast: CronAST, _opts: CronGenOptions): CronGenerator`

## How does the parsing work?

* Tokenizer's job is to map strings into CronConfig, Parser turns CronConfig into CronAST
  * Tokenizer handles aliases like `@weekly` or `jan` (same as `1` if in the correct position)
* `CronConfig` is already quite close to the `CronAST`, with the difference that `CronAST` should only contain valid, legal values
  * see `toValidAST` and `validation.ts`
  * this allows our generator to not worry too much about certain values being legal (eg. we can assume months are 1-12)


## How does the generator work?

In pseudocode the algorithm could be described like this:

```
let timeState = {starting state}

for timeUnit in [seconds, minutes, hours, dayOfMonth, month]
  timeState = jump_to_next_valid_time(timeState, timeUnit)
  yield timeState
```

However we need to deal with several corner cases and additional features
* Day of Week matching is not handled by just going from seconds to months so it has to be handled during DayOfMonth checking
* when changing month, we might "break" the dayOfMonth or dayOfWeek match so might need to "jump_to_next_valid_time" again
* "jump_to_next_valid_time" is quite complex due to:
  * different crontab rules like `10-30/2` (every second day between 10th and 30th)
  * leap years
  * months have different amount of days
  * simultaneous dayOfMonth and dayOfWeek matching
  * funky timezone issues (not sure I have even solved all of these...)
