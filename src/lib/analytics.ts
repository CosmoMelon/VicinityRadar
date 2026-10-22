import type { DevelopmentType, NearbyDevelopment, SortMode, Stage } from '../types'

export const stageOrder: Stage[] = ['proposed', 'approved', 'under_construction', 'built', 'unknown']
export const stageLabels: Record<Stage, string> = {
  proposed: 'Proposed', approved: 'Approved', under_construction: 'Under construction', built: 'Built', unknown: 'Unknown',
}
export const typeLabels: Record<DevelopmentType, string> = {
  residential: 'Residential', commercial: 'Commercial', mixed_use: 'Mixed-use', other: 'Other', unknown: 'Unknown',
}

export function filterAndSort(developments: NearbyDevelopment[], stage: Stage | 'all', type: DevelopmentType | 'all' | 'other_unknown', sort: SortMode): NearbyDevelopment[] {
  const filtered = developments.filter(item => (stage === 'all' || item.stage === stage) &&
    (type === 'all' || (type === 'other_unknown' ? item.developmentType === 'other' || item.developmentType === 'unknown' : item.developmentType === type)))
  return filtered.sort((a, b) => {
    if (sort === 'nearest') return a.distanceMeters - b.distanceMeters
    if (sort === 'farthest') return b.distanceMeters - a.distanceMeters
    const field = sort === 'units' ? 'residentialUnits' : 'nonResidentialGfaM2'
    const first = a[field], second = b[field]
    if (first === null) return second === null ? a.distanceMeters - b.distanceMeters : 1
    if (second === null) return -1
    return second - first || a.distanceMeters - b.distanceMeters
  })
}

export function summarize(developments: NearbyDevelopment[]) {
  const unitsWithValues = developments.filter(item => item.residentialUnits !== null)
  const areaWithValues = developments.filter(item => item.nonResidentialGfaM2 !== null)
  return {
    count: developments.length,
    residentialUnits: unitsWithValues.reduce((sum, item) => sum + item.residentialUnits!, 0),
    unitsCoverage: unitsWithValues.length,
    nonResidentialGfaM2: areaWithValues.reduce((sum, item) => sum + item.nonResidentialGfaM2!, 0),
    areaCoverage: areaWithValues.length,
    underConstruction: developments.filter(item => item.stage === 'under_construction').length,
    stages: stageOrder.map(stage => ({ stage, label: stageLabels[stage], count: developments.filter(item => item.stage === stage).length })),
  }
}
