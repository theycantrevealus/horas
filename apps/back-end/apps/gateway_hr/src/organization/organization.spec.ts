import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import { createInMemoryWorkforce } from '../testing/in-memory-workforce'
import { OrganizationManagementModule } from './organization-management.module'

describe('organization endpoints (in-memory repositories)', () => {
  const workforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string

  /**
   * Creates an organization through the API as the writer.
   *
   * @param code - Organization code.
   * @returns The created organization.
   */
  async function createOrganization(
    code: string,
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/organizations', writerToken, {
      code,
      legalName: `PT ${code}`,
      country: 'ID',
      currency: 'IDR',
    })
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [OrganizationManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    writerToken = await seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
    ])
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
    ])
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('answers the health check without a token', async () => {
    const reply = await call('GET', '/v1/health')

    expect(reply.status).toBe(200)
    expect(reply.body).toEqual({ status: 'ok' })
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    expect((await call('GET', '/v1/organizations')).status).toBe(401)
    expect(
      (await call('POST', '/v1/organizations', undefined, {})).status,
    ).toBe(401)
    expect(
      (
        await call('POST', '/v1/organizations', readerToken, {
          code: 'denied',
          legalName: 'X',
          country: 'ID',
          currency: 'IDR',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await call(
          'PATCH',
          `/v1/organizations/${new Types.ObjectId().toHexString()}`,
          readerToken,
          { status: 'inactive' },
        )
      ).status,
    ).toBe(403)
  })

  it('creates, reads, lists and edits an organization', async () => {
    const created = await createOrganization('rs-sehat')
    expect(created).toMatchObject({
      code: 'rs-sehat',
      legal_name: 'PT rs-sehat',
      country: 'ID',
      currency: 'IDR',
      status: 'active',
      identifiers: [],
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')

    const read = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ id: created.id, code: 'rs-sehat' })

    const list = await call('GET', '/v1/organizations?limit=100', readerToken)
    expect(list.status).toBe(200)
    expect(
      list.body?.data.map((item: { code: string }) => item.code),
    ).toContain('rs-sehat')

    const edited = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {
        legalName: 'PT Rumah Sakit Sehat Tbk',
        identifiers: [
          { system: 'id.npwp-badan', value: '01.234.567.8-901.000' },
        ],
        reason: 'Name change',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      legal_name: 'PT Rumah Sakit Sehat Tbk',
      code: 'rs-sehat',
      identifiers: [{ system: 'id.npwp-badan', value: '01.234.567.8-901.000' }],
    })
  })

  it("answers 404 for a malformed id, a missing id and another tenant's organization", async () => {
    const created = await createOrganization('tenant-one-org')

    expect(
      (await call('GET', '/v1/organizations/not-an-id', readerToken)).status,
    ).toBe(404)
    expect(
      (
        await call(
          'GET',
          `/v1/organizations/${new Types.ObjectId().toHexString()}`,
          readerToken,
        )
      ).status,
    ).toBe(404)
    const foreign = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      otherTenantToken,
    )
    expect(foreign.status).toBe(404)
    expect(foreign.body).toMatchObject({ code: 'organization_not_found' })
    expect(
      (
        await call(
          'PATCH',
          `/v1/organizations/${created.id}`,
          otherTenantToken,
          { status: 'inactive' },
        )
      ).status,
    ).toBe(404)
    const mine = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(mine.body).toMatchObject({ status: 'active' })
  })

  it("lists only the signed-in tenant's organizations", async () => {
    await createOrganization('only-mine')
    const foreignReply = await call(
      'POST',
      '/v1/organizations',
      otherTenantToken,
      {
        code: 'only-theirs',
        legalName: 'PT Theirs',
        country: 'SG',
        currency: 'SGD',
      },
    )
    expect(foreignReply.status).toBe(201)

    const mine = await call('GET', '/v1/organizations?limit=100', readerToken)
    const theirs = await call(
      'GET',
      '/v1/organizations?limit=100',
      otherTenantToken,
    )

    const mineCodes = mine.body?.data.map((item: { code: string }) => item.code)
    const theirCodes = theirs.body?.data.map(
      (item: { code: string }) => item.code,
    )
    expect(mineCodes).toContain('only-mine')
    expect(mineCodes).not.toContain('only-theirs')
    expect(theirCodes).toEqual(['only-theirs'])
  })

  it('answers 409 for a duplicate code, and allows the same code in another tenant', async () => {
    await createOrganization('shared-code')

    const duplicate = await call('POST', '/v1/organizations', writerToken, {
      code: 'shared-code',
      legalName: 'Again',
      country: 'ID',
      currency: 'IDR',
    })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'organization_exists' })

    const otherTenant = await call(
      'POST',
      '/v1/organizations',
      otherTenantToken,
      {
        code: 'shared-code',
        legalName: 'Same code elsewhere',
        country: 'ID',
        currency: 'IDR',
      },
    )
    expect(otherTenant.status).toBe(201)
  })

  it('answers 409 stale_version for an edit based on an old version', async () => {
    const created = await createOrganization('versioned')
    await call('PATCH', `/v1/organizations/${created.id}`, writerToken, {
      legalName: 'Second',
    })

    const stale = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {
        legalName: 'Third',
        version: created.version,
      },
    )

    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    const read = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(read.body?.legal_name).toBe('Second')
  })

  it.each([
    ['unknown country', { country: 'XX' }, 422, 'invalid_country'],
    ['unknown currency', { currency: 'ABC' }, 422, 'invalid_currency'],
    ['code with capitals', { code: 'RS-Sehat' }, 422, 'invalid_code'],
    ['lower-case country', { country: 'id' }, 400, undefined],
    ['missing legal name', { legalName: '' }, 400, undefined],
    [
      '21 identifiers',
      {
        identifiers: Array.from({ length: 21 }, (_, i) => ({
          system: `s${i}`,
          value: 'v',
        })),
      },
      400,
      undefined,
    ],
  ])('rejects a create with %s', async (_name, override, status, code) => {
    const reply = await call('POST', '/v1/organizations', writerToken, {
      code: 'bad-input',
      legalName: 'PT Bad',
      country: 'ID',
      currency: 'IDR',
      ...override,
    })

    expect(reply.status).toBe(status)
    if (code) {
      expect(reply.body).toMatchObject({ code })
    }
  })

  it('rejects an empty edit and ignores code and country in an edit body', async () => {
    const created = await createOrganization('immutable')

    const empty = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {},
    )
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })

    const onlyImmutable = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {
        code: 'changed',
        country: 'SG',
      },
    )
    expect(onlyImmutable.status).toBe(422)
    const read = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(read.body).toMatchObject({ code: 'immutable', country: 'ID' })
  })

  it.each(['limit=0', 'limit=101', 'limit=-1', 'offset=-1', 'status=archived'])(
    'rejects the list query %s instead of clamping it',
    async (query) => {
      expect(
        (await call('GET', `/v1/organizations?${query}`, readerToken)).status,
      ).toBe(400)
    },
  )

  it('keeps an inactive organization listed and readable', async () => {
    const created = await createOrganization('goes-inactive')
    const edited = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      { status: 'inactive' },
    )
    expect(edited.status).toBe(200)

    const listed = await call(
      'GET',
      '/v1/organizations?status=inactive&limit=100',
      readerToken,
    )
    expect(
      listed.body?.data.map((item: { code: string }) => item.code),
    ).toContain('goes-inactive')
    expect(
      (await call('GET', `/v1/organizations/${created.id}`, readerToken)).body,
    ).toMatchObject({
      status: 'inactive',
    })
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = await createOrganization('read-only-check')
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    try {
      const replies = [
        await call('GET', '/v1/organizations?limit=10', readerToken),
        await call('GET', `/v1/organizations/${created.id}`, readerToken),
        await call('GET', '/v1/organizations/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual(
        [],
      )
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
  })

  it("logs one entry per write, without the organization's values", async () => {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    try {
      await call('POST', '/v1/organizations', writerToken, {
        code: 'log-check',
        legalName: 'PT Secret Name',
        country: 'ID',
        currency: 'IDR',
        identifiers: [
          { system: 'id.npwp-badan', value: '99.999.999.9-999.999' },
        ],
      })
      await vi.waitFor(() =>
        expect(written.some((entry) => entry.event === 'http_request')).toBe(
          true,
        ),
      )

      const writes = written.filter(
        (entry) => entry.event === 'organization_create',
      )
      expect(writes).toHaveLength(1)
      expect(writes[0]).toMatchObject({
        outcome: 'success',
        operation: 'OrganizationService.create',
      })
      expect(JSON.stringify(written)).not.toContain('Secret Name')
      expect(JSON.stringify(written)).not.toContain('99.999')
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
  })
})
