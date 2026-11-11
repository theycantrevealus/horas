import {
  REPOSITORY_CODE_CONCEPT,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION,
} from '@repository/token'
import { CodeConceptEntity } from '@repository/mongo/schema/code-concept'
import { FacilityEntity } from '@repository/mongo/schema/facility'
import { OrganizationEntity } from '@repository/mongo/schema/organization'
import {
  InMemoryCodeConcepts,
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
 * @property codeConcepts - Code concept repository.
 * @property options - `entities` and `repositories` for `createHrGateway`.
 */
export interface InMemoryWorkforce {
  organizations: InMemoryOrganizations
  facilities: InMemoryFacilities
  codeConcepts: InMemoryCodeConcepts
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
  return {
    organizations,
    facilities,
    codeConcepts,
    options: {
      entities: [OrganizationEntity, FacilityEntity, CodeConceptEntity],
      repositories: [
        [REPOSITORY_ORGANIZATION, organizations],
        [REPOSITORY_FACILITY, facilities],
        [REPOSITORY_CODE_CONCEPT, codeConcepts],
      ],
    },
  }
}
