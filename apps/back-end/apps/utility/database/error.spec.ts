import { isReadOperation } from './error'

describe('isReadOperation', () => {
  it.each([
    'LovRepository.findAll',
    'LovRepository.findOne',
    'LovRepository.findByGroup',
    'AccountRoleBindingRepository.findInForce',
    'AccountRepository.findByLoginIdentifier',
  ])('treats %s as a read', (operation) => {
    expect(isReadOperation(operation)).toBe(true)
  })

  it.each([
    'LovRepository.create',
    'LovRepository.update',
    'LovRepository.delete',
    'LovRepository.deleteSoft',
    'AccountSessionRepository.revokeFamily',
    'AccountSessionRepository.consume',
    'AccountCredentialRepository.registerFailedAttempt',
    'transaction:main',
    'ChangeOutbox.markPublished',
    'finder',
    '',
  ])('treats %s as a write or unknown', (operation) => {
    expect(isReadOperation(operation)).toBe(false)
  })
})
