import { REPOSITORY_FACILITY, REPOSITORY_ORGANIZATION } from '@repository/token'
import { FacilityEntity } from '@repository/mongo/schema/facility'
import { OrganizationEntity } from '@repository/mongo/schema/organization'
import {
  InMemoryFacilities,
  InMemoryOrganizations,
} from '@workforce/testing/in-memory'
import { type HrGatewayOptions } from './hr-gateway'

/**
 * In-memory repositories for every collection `WorkforceModule` uses, and the harness options
 * that plug them in. Each HR group adds its repository here, so a gateway test never needs
 * to know which repositories the module holds.
 *
 * @property organizations - Organization repository.
 * @property facilities - Facility repository.
 * @property options - `entities` and `repositories` for `createHrGateway`.
 */
export interface InMemoryWorkforce {
  organizations: InMemoryOrganizations
  facilities: InMemoryFacilities
  options: Pick<HrGatewayOptions, 'entities' | 'repositories'>
}

/**
 * Creates empty in-memory repositories for a gateway test.
 *
 * @returns The repositories and the harness options.
 */
export function createInMemoryWorkforce(): InMemoryWorkforce {
  const organizations = new InMemoryOrganizations()
  const facilities = new InMemoryFacilities()
  return {
    organizations,
    facilities,
    options: {
      entities: [OrganizationEntity, FacilityEntity],
      repositories: [
        [REPOSITORY_ORGANIZATION, organizations],
        [REPOSITORY_FACILITY, facilities],
      ],
    },
  }
}
