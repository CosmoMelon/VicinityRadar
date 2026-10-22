import { describe, expect, it } from 'vitest'
import { calculateDistanceMeters, nearbyDevelopments, validCoordinates } from '../src/lib/geo'
import type { Development, Property } from '../src/types'

const property: Property = { id: 'p', name: 'Test', address: 'A', city: 'Toronto', province: 'Ontario', latitude: 43.6442, longitude: -79.3783, propertyType: null, sizeSqft: null, description: null, hinesRoles: [], sourceUrl: 'https://example.org', coordinateSourceUrl: null, retrievedAt: '2026-01-01' }
const development = (id: string, latitude: number | null, longitude: number | null): Development => ({ id, sourceProjectId: id, name: null, address: id, latitude, longitude, stage: 'unknown', originalStage: 'Active', developmentType: 'unknown', originalDevelopmentType: null, residentialUnits: null, nonResidentialGfaM2: null, applicationReference: id, sourceUrl: null, sourceUpdatedAt: null })

describe('geography', () => {
  it('returns zero for the same coordinate', () => expect(calculateDistanceMeters(43.64, -79.38, 43.64, -79.38)).toBe(0))
  it('calculates a known one-degree meridian distance', () => expect(calculateDistanceMeters(0, 0, 1, 0)).toBeCloseTo(111195.08, 0))
  it('rejects invalid coordinates', () => { expect(validCoordinates(91, 0)).toBe(false); expect(Number.isNaN(calculateDistanceMeters(91, 0, 0, 0))).toBe(true) })
  it('includes the boundary and excludes null locations', () => {
    const one = development('one', 43.6442, -79.3783)
    const two = development('two', 43.65, -79.3783)
    const missing = development('missing', null, null)
    const boundary = calculateDistanceMeters(property.latitude!, property.longitude!, two.latitude!, two.longitude!)
    expect(nearbyDevelopments(property, [one, two, missing], boundary).map(item => item.id)).toEqual(['one', 'two'])
    expect(nearbyDevelopments(property, [one, two, missing], boundary - 0.01).map(item => item.id)).toEqual(['one'])
  })
})
