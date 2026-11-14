import {
  REPOSITORY_CODE_CONCEPT,
  REPOSITORY_COMMITTEE_MEMBERSHIP,
  REPOSITORY_CPD_RECORD,
  REPOSITORY_CPD_SUMMARY,
  REPOSITORY_EMPLOYEE,
  REPOSITORY_EMPLOYEE_PRIVATE_PROFILE,
  REPOSITORY_EMPLOYMENT_CONTRACT,
  REPOSITORY_FACILITY,
  REPOSITORY_HR_PARAMETER,
  REPOSITORY_ORGANIZATION,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_POSITION,
  REPOSITORY_POSITION_ASSIGNMENT,
  REPOSITORY_PROFESSIONAL_LICENSE,
} from '@repository/token'
import { CodeConceptEntity } from '@repository/mongo/schema/code-concept'
import { CommitteeMembershipEntity } from '@repository/mongo/schema/committee-membership'
import { CpdRecordEntity } from '@repository/mongo/schema/cpd-record'
import { CpdSummaryEntity } from '@repository/mongo/schema/cpd-summary'
import { EmployeePrivateProfileEntity } from '@repository/mongo/schema/employee-private-profile'
import { EmploymentContractEntity } from '@repository/mongo/schema/employment-contract'
import { EmployeeEntity } from '@repository/mongo/schema/employee'
import { FacilityEntity } from '@repository/mongo/schema/facility'
import { HrParameterEntity } from '@repository/mongo/schema/hr-parameter'
import { OrganizationEntity } from '@repository/mongo/schema/organization'
import { OrganizationUnitEntity } from '@repository/mongo/schema/organization-unit'
import { PositionEntity } from '@repository/mongo/schema/position'
import { PositionAssignmentEntity } from '@repository/mongo/schema/position-assignment'
import { ProfessionalLicenseEntity } from '@repository/mongo/schema/professional-license'
import {
  InMemoryCodeConcepts,
  InMemoryCommitteeMemberships,
  InMemoryCpdRecords,
  InMemoryCpdSummaries,
  InMemoryEmployeePrivateProfiles,
  InMemoryEmployees,
  InMemoryEmploymentContracts,
  InMemoryFacilities,
  InMemoryHrParameters,
  InMemoryOrganizations,
  InMemoryOrganizationUnits,
  InMemoryPositionAssignments,
  InMemoryProfessionalLicenses,
  InMemoryPositions,
} from '@workforce/testing/in-memory'
import { createTestFieldCipher } from '@utility/testing/test-field-cipher'
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
 * @property employees - Employee repository.
 * @property contracts - Employment contract repository.
 * @property privateProfiles - Employee private profile repository.
 * @property assignments - Position assignment repository.
 * @property committeeMemberships - Committee membership repository.
 * @property licenses - Professional license repository.
 * @property cpdRecords - CPD record repository.
 * @property cpdSummaries - CPD summary repository.
 * @property options - `entities` and `repositories` for `createHrGateway`.
 */
export interface InMemoryWorkforce {
  organizations: InMemoryOrganizations
  facilities: InMemoryFacilities
  codeConcepts: InMemoryCodeConcepts
  units: InMemoryOrganizationUnits
  positions: InMemoryPositions
  parameters: InMemoryHrParameters
  employees: InMemoryEmployees
  contracts: InMemoryEmploymentContracts
  privateProfiles: InMemoryEmployeePrivateProfiles
  assignments: InMemoryPositionAssignments
  committeeMemberships: InMemoryCommitteeMemberships
  licenses: InMemoryProfessionalLicenses
  cpdRecords: InMemoryCpdRecords
  cpdSummaries: InMemoryCpdSummaries
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
  const employees = new InMemoryEmployees()
  const contracts = new InMemoryEmploymentContracts()
  const privateProfiles = new InMemoryEmployeePrivateProfiles(
    createTestFieldCipher(),
  )
  const assignments = new InMemoryPositionAssignments()
  const committeeMemberships = new InMemoryCommitteeMemberships()
  const licenses = new InMemoryProfessionalLicenses()
  const cpdRecords = new InMemoryCpdRecords()
  const cpdSummaries = new InMemoryCpdSummaries()
  return {
    organizations,
    facilities,
    codeConcepts,
    units,
    positions,
    parameters,
    employees,
    contracts,
    privateProfiles,
    assignments,
    committeeMemberships,
    licenses,
    cpdRecords,
    cpdSummaries,
    options: {
      entities: [
        OrganizationEntity,
        FacilityEntity,
        CodeConceptEntity,
        OrganizationUnitEntity,
        PositionEntity,
        HrParameterEntity,
        EmployeeEntity,
        EmploymentContractEntity,
        EmployeePrivateProfileEntity,
        PositionAssignmentEntity,
        CommitteeMembershipEntity,
        ProfessionalLicenseEntity,
        CpdRecordEntity,
        CpdSummaryEntity,
      ],
      repositories: [
        [REPOSITORY_ORGANIZATION, organizations],
        [REPOSITORY_FACILITY, facilities],
        [REPOSITORY_CODE_CONCEPT, codeConcepts],
        [REPOSITORY_ORGANIZATION_UNIT, units],
        [REPOSITORY_POSITION, positions],
        [REPOSITORY_HR_PARAMETER, parameters],
        [REPOSITORY_EMPLOYEE, employees],
        [REPOSITORY_EMPLOYMENT_CONTRACT, contracts],
        [REPOSITORY_EMPLOYEE_PRIVATE_PROFILE, privateProfiles],
        [REPOSITORY_POSITION_ASSIGNMENT, assignments],
        [REPOSITORY_COMMITTEE_MEMBERSHIP, committeeMemberships],
        [REPOSITORY_PROFESSIONAL_LICENSE, licenses],
        [REPOSITORY_CPD_RECORD, cpdRecords],
        [REPOSITORY_CPD_SUMMARY, cpdSummaries],
      ],
    },
  }
}
