import { describe, expect, it } from 'vitest'
import { validateDevelopments, validateMetadata, validateProperties } from '../src/services/dataService'
import { csvCell, resultsCsv } from '../src/lib/export'
import type { Development } from '../src/types'

const validProperty = { id: 'p', name: 'Test property', address: '1 Test St', city: 'Toronto', province: 'Ontario', latitude: 43.65, longitude: -79.38, propertyType: null, sizeSqft: null, description: null, hinesRoles: [], sourceUrl: 'https://example.org', coordinateSourceUrl: null, retrievedAt: '2026-01-01' }
const validDevelopment: Development = { id: 'd', sourceProjectId: 'd', name: null, address: '2 Test St', latitude: 43.651, longitude: -79.38, stage: 'unknown', originalStage: 'Active', developmentType: 'unknown', originalDevelopmentType: null, residentialUnits: null, nonResidentialGfaM2: 0, applicationReference: 'd', sourceUrl: null, sourceUpdatedAt: null }

describe('data validation and CSV', () => {
  it('accepts missing fields and unknown classification without turning null into zero', () => {
    expect(validateProperties([validProperty])).toHaveLength(1)
    expect(validateDevelopments([validDevelopment])[0].residentialUnits).toBeNull()
    expect(validateDevelopments([validDevelopment])[0].stage).toBe('unknown')
  })
  it('rejects duplicate ids and invalid coordinates', () => {
    expect(() => validateDevelopments([validDevelopment, validDevelopment])).toThrow('Invalid development')
    expect(() => validateDevelopments([{ ...validDevelopment, latitude: 999 }])).toThrow('Invalid development')
  })
  it('rejects malformed metadata', () => expect(() => validateMetadata({ project: 'Vicinity Radar', dataMode: 'verified' })).toThrow())
  it('escapes CSV fields and formula prefixes', () => {
    expect(csvCell('a"b')).toBe('"a""b"')
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    const csv = resultsCsv(validProperty, 1000, [{ ...validDevelopment, address: '=1+1', distanceMeters: 12 }])
    expect(csv).toContain('"\'=1+1"')
    expect(csv).toContain('"Test property"')
  })
})
