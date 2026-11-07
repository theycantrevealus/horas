export function pad(pad: string, str: string, padLeft: boolean) {
  if (typeof str === 'undefined') return pad
  if (padLeft) {
    return (pad + str).slice(-pad.length)
  } else {
    return (str + pad).substring(0, pad.length)
  }
}
