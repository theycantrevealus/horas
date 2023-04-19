export class TimestampFirst {
  private enabled = true
  constructor(enabled = true) {
    this.enabled = enabled
  }
  transform(obj) {
    if (this.enabled) {
      return Object.assign(
        {
          timestamp: obj.timestamp,
        },
        obj
      )
    }
    return obj
  }
}
