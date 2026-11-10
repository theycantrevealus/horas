/**
 * Identifier given by another system, such as a regulator or registry. Not secret.
 *
 * @property system - Issuing system, for example `id.satusehat-ihs` or `us.npi`.
 * @property value - The identifier.
 */
export interface ExternalId {
  system: string
  value: string
}
