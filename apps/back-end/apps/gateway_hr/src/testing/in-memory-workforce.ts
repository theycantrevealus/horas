import {
  REPOSITORY_CODE_CONCEPT,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION,
  REPOSITORY_ORGANIZATION_UNIT,
} from '@repository/token'
import { CodeConceptEntity } from '@repository/mongo/schema/code-concept'
import { FacilityEntity } from '@repository/mongo/schema/facility'
import { OrganizationEntity } from '@repository/mongo/schema/organization'
import { OrganizationUnitEntity } from '@repository/mongo/schema/organization-unit'
import {
  InMemoryCodeConcepts,
  InMemoryFacilities,
  InMemoryOrganizations,
  InMemoryOrganizationUnits,
} from '@workforce/testing/in-memory'
import { type HrGatewayOptions } from './hr-gateway'

/**
 * In-memory repositories for every collection `WorkforceModule` uses, and the harness options
 * that plug them in. Each HR group adds its repository here, so a gateway test never needs
 * to know which repositories the module holds.
 *
 * @property organizations - Organization repository.
 * @property facilities - Facility repository.
 * @property codeConcepts - Code concept repository.
 * @property units - Organization unit repository.
 * @property options - `entities` and `repositories` for `createHrGateway`.
 */
export interface InMemoryWorkforce {
  organizations: InMemoryOrganizations
  facilities: InMemoryFacilities
  codeConcepts: InMemoryCodeConcepts
  units: InMemoryOrganizationUnits
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
  const codeConcepts = new InMemoryCodeConcepts()
  const units = new InMemoryOrganizationUnits()
  return {
    organizations,
    facilities,
    codeConcepts,
    units,
    options: {
      entities: [
        OrganizationEntity,
        FacilityEntity,
        CodeConceptEntity,
        OrganizationUnitEntity,
      ],
      repositories: [
        [REPOSITORY_ORGANIZATION, organizations],
        [REPOSITORY_FACILITY, facilities],
        [REPOSITORY_CODE_CONCEPT, codeConcepts],
        [REPOSITORY_ORGANIZATION_UNIT, units],
      ],
    },
  }
}
