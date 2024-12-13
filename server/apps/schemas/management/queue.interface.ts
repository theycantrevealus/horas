import { ILOV } from '@schemas/lov/lov.interface'

export interface IQueue {
  id: string
  code: string
  queue_number: number
  type: ILOV
}
