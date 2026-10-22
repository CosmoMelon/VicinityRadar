import type { Development, Metadata, Property, Stage, DevelopmentType } from '../types'
import { validCoordinates } from '../lib/geo'

const stages: Stage[] = ['proposed', 'approved', 'under_construction', 'built', 'unknown']
const types: DevelopmentType[] = ['residential', 'commercial', 'mixed_use', 'other', 'unknown']

async function loadJson(path: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`)
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`)
  return response.json()
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function nullableString(value: unknown): value is string | null { return value === null || typeof value === 'string' }
function nullableNumber(value: unknown): value is number | null { return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0) }
function coordinatePair(value: Record<string, unknown>): boolean {
  return (value.latitude === null && value.longitude === null) || validCoordinates(value.latitude, value.longitude)
}

export function validateProperties(value: unknown): Property[] {
  if (!Array.isArray(value)) throw new Error('Property data is not an array')
  const ids = new Set<string>()
  return value.map((row, index) => {
    if (!object(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id) ||
        typeof row.name !== 'string' || !row.name || typeof row.address !== 'string' || !row.address ||
        typeof row.city !== 'string' || typeof row.province !== 'string' || !coordinatePair(row) ||
        !nullableString(row.propertyType) || !nullableNumber(row.sizeSqft) || !nullableString(row.description) ||
        !Array.isArray(row.hinesRoles) || !row.hinesRoles.every((role: unknown) => typeof role === 'string') ||
        typeof row.sourceUrl !== 'string' || !row.sourceUrl.startsWith('https://') ||
        !nullableString(row.coordinateSourceUrl) || typeof row.retrievedAt !== 'string') {
      throw new Error(`Invalid property record at index ${index}`)
    }
    ids.add(row.id)
    return row as unknown as Property
  })
}

export function validateDevelopments(value: unknown): Development[] {
  if (!Array.isArray(value)) throw new Error('Development data is not an array')
  const ids = new Set<string>()
  return value.map((row, index) => {
    if (!object(row) || typeof row.id !== 'string' || !row.id || ids.has(row.id) ||
        !nullableString(row.sourceProjectId) || !nullableString(row.name) || !nullableString(row.address) ||
        !coordinatePair(row) || !stages.includes(row.stage as Stage) || !types.includes(row.developmentType as DevelopmentType) ||
        !nullableString(row.originalStage) || !nullableString(row.originalDevelopmentType) ||
        !nullableNumber(row.residentialUnits) || !nullableNumber(row.nonResidentialGfaM2) ||
        !nullableString(row.applicationReference) || !nullableString(row.sourceUrl) || !nullableString(row.sourceUpdatedAt)) {
      throw new Error(`Invalid development record at index ${index}`)
    }
    ids.add(row.id)
    return row as unknown as Development
  })
}

export function validateMetadata(value: unknown): Metadata {
  if (!object(value) || value.project !== 'Vicinity Radar' || !['verified', 'unavailable', 'synthetic'].includes(String(value.dataMode)) ||
      !object(value.properties) || !object(value.developments) ||
      typeof value.properties.count !== 'number' || typeof value.developments.count !== 'number' ||
      typeof value.developments.geocodedCount !== 'number' || typeof value.developments.excludedNoCoordinates !== 'number') {
    throw new Error('Invalid data metadata')
  }
  return value as unknown as Metadata
}

export const loadProperties = async () => validateProperties(await loadJson('properties.json'))
export const loadDevelopments = async () => validateDevelopments(await loadJson('developments.json'))
export const loadMetadata = async () => validateMetadata(await loadJson('metadata.json'))
