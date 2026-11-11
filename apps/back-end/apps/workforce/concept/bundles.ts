import { type Coding } from '@repository/model/common/coding'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { INDONESIA_CONCEPTS } from './bundle-id'

/**
 * One concept of a ready-made bundle.
 *
 * @property system - Code system.
 * @property code - Code inside the system.
 * @property display - Text per language.
 * @property properties - Attributes that rules read.
 * @property mappings - Equivalent codes in universal systems.
 */
export interface BundleConcept {
  system: string
  code: string
  display: LocalizedText[]
  properties: Record<string, unknown>
  mappings: Coding[]
}

/**
 * Bundles a tenant can import (HR plan C10). They are code, versioned with the application.
 */
export const BUNDLES: Readonly<Record<string, readonly BundleConcept[]>> = {
  id: INDONESIA_CONCEPTS,
}

/**
 * Returns a bundle by name.
 *
 * @param name - Bundle name, for example `id`.
 * @returns The concepts of the bundle, or `undefined` for an unknown name.
 */
export function findBundle(name: string): readonly BundleConcept[] | undefined {
  return Object.prototype.hasOwnProperty.call(BUNDLES, name)
    ? BUNDLES[name]
    : undefined
}

/**
 * Names of the bundles that exist.
 */
export const BUNDLE_NAMES: readonly string[] = Object.keys(BUNDLES)
