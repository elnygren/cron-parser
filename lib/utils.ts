import { CronAST, CronCell } from "./types"

export function assertUnreachable(x: never): never {
  throw new Error("assertUnreachable");
}

export function range(start: number, end: number): number[] {
  return new Array(end - start).fill(0).map((d, i) => i + start);
}


/**
 * Replace all the occerencess of $find by $replace in $originalString
 * https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string/54414146
 * @param  {originalString} input - Raw string.
 * @param  {find} input - Target key word or regex that need to be replaced.
 * @param  {replace} input - Replacement key word
 * @return {String}       Output string
 */
export function replaceAll(originalString: string, find: string, replace: string): string {
  return originalString.replace(new RegExp(find, 'g'), replace);
};


/** prettyPrint helper */
const pp = (val: CronCell): string => {
  switch (val.type) {
    case '*':
      return '*'
    case 'number':
      return `${val.value}`
    case 'step':
      return `*/${val.step}`
    case 'stepfrom':
      return `${val.from}/${val.step}`
    case 'steprange':
      return `${val.from}-${val.to}/${val.step}`
    case 'range':
      return `${val.from}-${val.to}`
    case 'list':
      return val.values.join(',')
    default:
      return assertUnreachable(val)
  }
}


/** Pretty print the AST and some intermediary formats */
export function prettyPrint(x: string[] | CronCell[] | CronCell | CronAST): string {
  if (Array.isArray(x)) return x.join(' ')

  if (typeof (x as CronCell).type === 'string') {
    return pp(x as CronCell)
  }

  const t = (x as CronAST).time
  const out = `${pp(t.minutes)} ${pp(t.hour)} ${pp(t.dayOfMonth)} ${pp(t.month)} ${pp(t.dayOfWeek)}`
  if (t.seconds === undefined) {
    return out
  }
  return `${pp(t.seconds)} ${out}`
}

