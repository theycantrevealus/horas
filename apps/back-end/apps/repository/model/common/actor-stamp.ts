import { type ActorRef } from '@utility/history/actor'

/**
 * Who performed a business step that is part of the data (submission, approval,
 * publication), and when. Not a replacement for the change history.
 *
 * @property by - Who did it.
 * @property at - When it happened.
 */
export interface ActorStamp {
  by: ActorRef
  at: Date
}
