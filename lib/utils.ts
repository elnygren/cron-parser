import { CronAST, CronCell } from "./types"

export function assertUnreachable(x: never): never {
  throw new Error("assertUnreachable");
}

const pp = (val: CronCell): string => {
  switch (val.type) {
    case '*':
      return '*'
    case 'number':
      return `${val.value}`
    case 'step':
      return `*/${val.step}`
    case 'steprange':
      return `${val.from}/${val.step}`
    case 'range':
      return `${val.from}-${val.to}`
    case 'list':
      return val.values.join(',')
    default:
      return assertUnreachable(val)
  }
}

export function prettyPrintCell(x: CronCell) {
  return pp(x)
}

/** Pretty print the AST and some intermediary formats */
export function prettyPrint(x: string[] | CronCell[] | CronAST): string {
  if (Array.isArray(x)) return x.join(' ')

  const t = (x as CronAST).time
  const out = `${pp(t.minutes)} ${pp(t.hour)} ${pp(t.dayOfMonth)} ${pp(t.month)} ${pp(t.dayOfWeek)}`
  if (t.seconds === undefined) {
    return out
  }
  return `${pp(t.seconds)} ${out}`
}

export function range(start: number, end: number) {
  return new Array(end - start).fill(0).map((d, i) => i + start);
}
