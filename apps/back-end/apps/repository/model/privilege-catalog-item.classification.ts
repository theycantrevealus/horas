import { type FieldClassification } from '@utility/history/record'
import { type PrivilegeCatalogItem } from './privilege-catalog-item'

/**
 * Sensitivity of `PrivilegeCatalogItem` fields for the change log. The privilege catalog is public inside the hospital.
 */
export const PrivilegeCatalogItemClassification: FieldClassification<PrivilegeCatalogItem> =
  {
    default: 'public',
    arrayKeys: {
      name: ['locale'],
      description: ['locale'],
      required_evidence: ['mandatory'],
    },
  }
