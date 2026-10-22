import { describe, expect, it } from 'vitest'
import { filterAndSort, summarize } from '../src/lib/analytics'
import type { NearbyDevelopment } from '../src/types'

const item = (id: string, distanceMeters: number, stage: NearbyDevelopment['stage'], developmentType: NearbyDevelopment['developmentType'], residentialUnits: number | null, nonResidentialGfaM2: number | null): NearbyDevelopment => ({
  id, sourceProjectId: id, name: null, address: id, latitude: 43.64, longitude: -79.38, stage, originalStage: stage, developmentType, originalDevelopmentType: null, residentialUnits, nonResidentialGfaM2, applicationReference: id, sourceUrl: null, sourceUpdatedAt: null, distanceMeters,
})
const records = [item('a', 100, 'proposed', 'residential', 10, 0), item('b', 200, 'under_construction', 'mixed_use', 20, 500), item('c', 300, 'unknown', 'unknown', null, null)]

describe('analytics', () => {
  it('aggregates exactly the filtered records, preserving missing values', () => {
    expect(summarize(records)).toMatchObject({ count: 3, residentialUnits: 30, unitsCoverage: 2, nonResidentialGfaM2: 500, areaCoverage: 2, underConstruction: 1 })
    expect(summarize(filterAndSort(records, 'proposed', 'residential', 'nearest'))).toMatchObject({ count: 1, residentialUnits: 10, underConstruction: 0 })
    expect(summarize(filterAndSort(records, 'all', 'mixed_use', 'nearest'))).toMatchObject({ count: 1, residentialUnits: 20, nonResidentialGfaM2: 500 })
  })
  it('sorts distance and puts missing numerical values last', () => {
    expect(filterAndSort(records, 'all', 'all', 'farthest').map(item => item.id)).toEqual(['c', 'b', 'a'])
    expect(filterAndSort(records, 'all', 'all', 'units').map(item => item.id)).toEqual(['b', 'a', 'c'])
    expect(filterAndSort(records, 'all', 'all', 'area').map(item => item.id)).toEqual(['b', 'a', 'c'])
  })
  it('groups other and unknown types', () => expect(filterAndSort(records, 'all', 'other_unknown', 'nearest').map(item => item.id)).toEqual(['c']))
})
