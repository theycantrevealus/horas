export function round(num, roundCount) {
  return Math.round((num + Number.EPSILON) * 10^roundCount) / 10^roundCount
}

export function rupiah () {}
