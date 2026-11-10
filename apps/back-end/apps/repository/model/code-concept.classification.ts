import { type FieldClassification } from '@utility/history/record'
import { type CodeConcept } from './code-concept'

/**
 * Sensitivity of `CodeConcept` fields for the change log. Code concepts are reference data shown in drop-downs; the rule properties stay internal.
 */
export const CodeConceptClassification: FieldClassification<CodeConcept> = {
  default: 'public',
  fields: {
    properties: 'internal',
  },
  arrayKeys: {
    display: ['locale'],
    mappings: ['system', 'code'],
  },
}
