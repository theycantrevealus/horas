export const SUBSCRIBER_MAP = new Map()
export const SUBSCRIBER_OBJECT_MAP = new Map()
export const KAFKA_MODULE_OPTIONS = 'KAFKA_MODULE_OPTIONS'
export const SCHEMAS = new Map()

export function SubscribeTo(topic: string) {
  return (target, propertyKey, descriptor) => {
    const originalMethod = target[propertyKey]
    SUBSCRIBER_MAP.set(topic, originalMethod)
    return descriptor
  }
}
