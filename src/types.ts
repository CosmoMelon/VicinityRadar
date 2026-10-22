export type Stage = 'proposed' | 'approved' | 'under_construction' | 'built' | 'unknown'
export type DevelopmentType = 'residential' | 'commercial' | 'mixed_use' | 'other' | 'unknown'

export interface Property {
  id: string
  name: string
  address: string
  city: string
  province: string
  latitude: number | null
  longitude: number | null
  propertyType: string | null
  sizeSqft: number | null
  description: string | null
  hinesRoles: string[]
  sourceUrl: string
  coordinateSourceUrl: string | null
  retrievedAt: string
}

export interface Development {
  id: string
  sourceProjectId: string | null
  name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  stage: Stage
  originalStage: string | null
  developmentType: DevelopmentType
  originalDevelopmentType: string | null
  residentialUnits: number | null
  nonResidentialGfaM2: number | null
  applicationReference: string | null
  sourceUrl: string | null
  sourceUpdatedAt: string | null
  dateReceived?: string | null
}

export interface Metadata {
  project: string
  dataMode: 'verified' | 'unavailable' | 'synthetic'
  properties: { count: number; source: string; retrievedAt: string | null }
  developments: {
    count: number
    geocodedCount: number
    excludedNoCoordinates: number
    rawCount: number
    duplicateCount: number
    source: string
    sourceUrl: string
    sourceVersion: string | null
    resourceUrl: string | null
    addressSourceUrl: string | null
    preparedAt: string | null
    notes: string
  }
}

export interface NearbyDevelopment extends Development { distanceMeters: number }
export type SortMode = 'nearest' | 'farthest' | 'units' | 'area'
