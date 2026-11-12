import {
  REPOSITORY_CODE_CONCEPT,
  REPOSITORY_FACILITY,
  REPOSITORY_HR_PARAMETER,
  REPOSITORY_ORGANIZATION,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_POSITION,
} from '@repository/token'
import { CodeConceptEntity } from '@repository/mongo/schema/code-concept'
import { FacilityEntity } from '@repository/mongo/schema/facility'
import { HrParameterEntity } from '@repository/mongo/schema/hr-parameter'
import { OrganizationEntity } from '@repository/mongo/schema/organization'
import { OrganizationUnitEntity } from '@repository/mongo/schema/organization-unit'
import { PositionEntity } from '@repository/mongo/schema/position'
import {
  InMemoryCodeConcepts,
  InMemoryFacilities,
  InMemoryHrParameters,
  InMemoryOrganizations,
  InMemoryOrganizationUnits,
  InMemoryPositions,
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
 * @property positions - Position repository.
 * @property parameters - HR parameter repository.
 * @property options - `entities` and `repositories` for `createHrGateway`.
 */
export interface InMemoryWorkforce {
  organizations: InMemoryOrganizations
  facilities: InMemoryFacilities
  codeConcepts: InMemoryCodeConcepts
  units: InMemoryOrganizationUnits
  positions: InMemoryPositions
  parameters: InMemoryHrParameters
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
  const positions = new InMemoryPositions()
  const parameters = new InMemoryHrParameters()
  return {
    organizations,
    facilities,
    codeConcepts,
    units,
    positions,
    parameters,
    options: {
      entities: [
        OrganizationEntity,
        FacilityEntity,
        CodeConceptEntity,
        OrganizationUnitEntity,
        PositionEntity,
        HrParameterEntity,
      ],
      repositories: [
        [REPOSITORY_ORGANIZATION, organizations],
        [REPOSITORY_FACILITY, facilities],
        [REPOSITORY_CODE_CONCEPT, codeConcepts],
        [REPOSITORY_ORGANIZATION_UNIT, units],
        [REPOSITORY_POSITION, positions],
        [REPOSITORY_HR_PARAMETER, parameters],
      ],
    },
  }
}
