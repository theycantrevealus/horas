import { type Coding } from '@repository/model/common/coding'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type OrganizationUnit } from '@repository/model/organization-unit'

/**
 * One node of the organization chart as the tree endpoint returns it: a subset of the unit, not the
 * whole record.
 *
 * @property id - Unit identifier.
 * @property code - Unit code.
 * @property name - Name per language.
 * @property type - Unit type.
 * @property is_clinical - Patients are treated here.
 * @property status - Whether the unit is in use.
 * @property children - Units directly below, ordered like the input.
 */
export interface UnitTreeNode {
  id: string
  code: string
  name: LocalizedText[]
  type: Coding
  is_clinical: boolean
  status: OrganizationUnit['status']
  children: UnitTreeNode[]
}

/**
 * Builds the nested chart from a flat list. A unit whose parent is not in the list (a top unit, or
 * the root of a requested subtree) becomes a root. Children keep the order of the list, so a list
 * ordered by code gives a chart ordered by code at every level.
 *
 * @param units - Units of one facility, in the order the nodes should appear.
 * @param rootId - When given, only this unit's subtree is returned, as one root.
 * @returns The root nodes.
 */
export function buildUnitTree(
  units: OrganizationUnit[],
  rootId?: string,
): UnitTreeNode[] {
  const nodes = new Map<string, UnitTreeNode>()
  for (const unit of units) {
    nodes.set(unit.id, {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      type: unit.type,
      is_clinical: unit.is_clinical,
      status: unit.status,
      children: [],
    })
  }
  const roots: UnitTreeNode[] = []
  for (const unit of units) {
    const node = nodes.get(unit.id)
    const parent = unit.parent_id ? nodes.get(unit.parent_id) : undefined
    if (!node) {
      continue
    }
    if (parent && unit.id !== rootId) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  if (rootId === undefined) {
    return roots
  }
  return roots.filter((node) => node.id === rootId)
}
