import { expect, it, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import L from 'leaflet'
import { MapPanel } from '../src/components/MapPanel'
import type { NearbyDevelopment, Property } from '../src/types'

const property: Property = { id: 'p', name: 'Test property', address: '1 Test St', city: 'Toronto', province: 'Ontario', latitude: 43.64, longitude: -79.38, propertyType: null, sizeSqft: null, description: null, hinesRoles: [], sourceUrl: 'https://example.org', coordinateSourceUrl: null, retrievedAt: '2026-01-01' }
const item: NearbyDevelopment = { id: 'd', sourceProjectId: 'd', name: null, address: '2 Test St', latitude: 43.641, longitude: -79.381, stage: 'proposed', originalStage: 'Under Review', developmentType: 'residential', originalDevelopmentType: null, residentialUnits: 12, nonResidentialGfaM2: 0, applicationReference: 'd', sourceUrl: null, sourceUpdatedAt: null, distanceMeters: 150 }

it('renders an actual Leaflet marker and routes its click to the record selection', async () => {
  Object.defineProperty(L.Browser, 'svg', { value: true, configurable: true }) // jsdom has SVG elements; Leaflet's probe ran before this test.
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 })
  const onSelect = vi.fn()
  const { container } = render(<MapPanel property={property} radiusMeters={1000} items={[item]} selected={null} onSelect={onSelect} />)
  const marker = await waitFor(() => {
    const element = container.querySelector('.development-pin')
    expect(element).not.toBeNull()
    return element!
  })
  fireEvent.click(marker)
  expect(onSelect).toHaveBeenCalledWith('d')
  expect(container.querySelector('.leaflet-interactive')).not.toBeNull()
})
