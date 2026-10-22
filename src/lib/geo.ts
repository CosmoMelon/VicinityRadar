import type { Development, NearbyDevelopment, Property } from '../types'

export function validCoordinates(lat: unknown, lon: unknown): lat is number {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180
}

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!validCoordinates(lat1, lon1) || !validCoordinates(lat2, lon2)) return NaN
  const radians = Math.PI / 180
  const dLat = (lat2 - lat1) * radians
  const dLon = (lon2 - lon1) * radians
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) ** 2
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearbyDevelopments(property: Property, developments: Development[], radiusMeters: number): NearbyDevelopment[] {
  if (!validCoordinates(property.latitude, property.longitude)) return []
  return developments.flatMap(development => {
    if (!validCoordinates(development.latitude, development.longitude)) return []
    const distanceMeters = calculateDistanceMeters(property.latitude!, property.longitude!, development.latitude, development.longitude!)
    return distanceMeters <= radiusMeters ? [{ ...development, distanceMeters }] : []
  })
}
