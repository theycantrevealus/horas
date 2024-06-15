import type {
  MongooseDefaultQueryMiddleware,
  MongooseDocumentMiddleware,
  Schema,
} from 'mongoose'

type Model = {
  name: string
  schema: Schema
}

export function MongoSubscriber({ schema }: Model) {
  return function _MongoSubscriber<T extends { new (...args: any[]): object }>(
    constr: T
  ) {
    return class extends constr {
      schema: Schema
      constructor(...args: any[]) {
        super(...args)
        this.schema = schema
        const methods = Object.getOwnPropertyNames(constr.prototype).filter(
          (v) => v !== 'constructor'
        )
        methods.forEach((method) => this[method]())
      }
    }
  }
}

export function MongoMiddleware(
  type: 'pre' | 'post',
  middleware: MongooseDocumentMiddleware | MongooseDefaultQueryMiddleware
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    descriptor.value = function (...args: any[]) {
      const method = originalMethod.bind(this)
      this.schema[type](middleware, async function (document: any, next: any) {
        if (type === 'pre') {
          await method(this)
          return document()
        }
        await method(document)
        next()
      })
    }
  }
}
