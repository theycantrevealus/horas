import {
  getRequestContext,
  runWithRequestContext,
} from '@utility/logger/context'
import { systemActor, toActorRef } from './actor'
import { uuidv7 } from './id'
import { withChangeReason } from './reason'

describe('toActorRef', () => {
  it('builds an account actor from request.user', () => {
    expect(toActorRef({ id: 'a1', display_name: 'Siti' })).toEqual({
      account_id: 'a1',
      display_name: 'Siti',
      kind: 'account',
    })
  })

  it('returns undefined without an identifier', () => {
    expect(toActorRef(undefined)).toBeUndefined()
    expect(toActorRef({ name: 'x' })).toBeUndefined()
  })

  it('keeps a valid kind and the on-behalf-of account', () => {
    expect(
      toActorRef({
        account_id: 's1',
        kind: 'service',
        on_behalf_of_account_id: 'a1',
      }),
    ).toEqual({
      account_id: 's1',
      display_name: 's1',
      kind: 'service',
      on_behalf_of_account_id: 'a1',
    })
  })
})

describe('systemActor', () => {
  it('has no account', () => {
    expect(systemActor('license-expiry-job')).toEqual({
      account_id: null,
      display_name: 'license-expiry-job',
      kind: 'system',
    })
  })
})

describe('withChangeReason', () => {
  it('adds the reason and keeps the rest of the context', () => {
    const actor = systemActor('job')
    const inner = runWithRequestContext({ correlationId: 'c1', actor }, () =>
      withChangeReason('why', () => getRequestContext()),
    )
    expect(inner).toEqual({ correlationId: 'c1', actor, reason: 'why' })
  })

  it('starts a context with a new correlation identifier outside a request', () => {
    const inner = withChangeReason('why', () => getRequestContext())
    expect(inner?.reason).toBe('why')
    expect(inner?.correlationId).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('uuidv7', () => {
  it('sorts by creation time', () => {
    const earlier = uuidv7(1_700_000_000_000)
    const later = uuidv7(1_700_000_000_001)
    expect(earlier < later).toBe(true)
    expect(earlier[14]).toBe('7')
  })
})
