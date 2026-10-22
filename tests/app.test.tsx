import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../src/App'

vi.mock('../src/components/MapPanel', () => ({ MapPanel: ({ items, onSelect }: { items: { id: string }[]; onSelect: (id: string) => void }) => <div data-testid="map">Map markers: {items.map(item => <button key={item.id} onClick={() => onSelect(item.id)}>{item.id}</button>)}</div> }))
vi.mock('recharts', () => ({ ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, BarChart: () => <div>Chart</div>, Bar: () => null, CartesianGrid: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null }))

const properties = [{ id: 'test', name: 'Test Place', address: '1 Test Street', city: 'Toronto', province: 'Ontario', latitude: 43.64, longitude: -79.38, propertyType: 'Office', sizeSqft: null, description: null, hinesRoles: ['Developer'], sourceUrl: 'https://example.org/property', coordinateSourceUrl: 'https://example.org/map', retrievedAt: '2026-01-01' }]
const developments = [
  { id: 'near', sourceProjectId: 'near', name: null, address: '10 Near Street', latitude: 43.643, longitude: -79.38, stage: 'proposed', originalStage: 'Under Review', developmentType: 'residential', originalDevelopmentType: null, residentialUnits: 20, nonResidentialGfaM2: 0, applicationReference: 'near', sourceUrl: 'https://example.org/near', sourceUpdatedAt: null },
  { id: 'far', sourceProjectId: 'far', name: null, address: '20 Far Street', latitude: 43.655, longitude: -79.38, stage: 'built', originalStage: 'Built', developmentType: 'mixed_use', originalDevelopmentType: null, residentialUnits: 40, nonResidentialGfaM2: 500, applicationReference: 'far', sourceUrl: null, sourceUpdatedAt: null },
]
const metadata = { project: 'Vicinity Radar', dataMode: 'verified', properties: { count: 1, source: 'test', retrievedAt: '2026-01-01' }, developments: { count: 2, geocodedCount: 2, excludedNoCoordinates: 0, rawCount: 2, duplicateCount: 0, source: 'test', sourceUrl: 'https://example.org', sourceVersion: null, resourceUrl: null, addressSourceUrl: null, preparedAt: '2026-01-01', notes: 'Synthetic test fixture' } }

function mockData(mode: 'verified' | 'unavailable' = 'verified') {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const data = url.endsWith('properties.json') ? properties : url.endsWith('developments.json') ? developments : { ...metadata, dataMode: mode }
    return { ok: true, json: async () => data } as Response
  })
}
function mount() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><App /></QueryClientProvider>) }

describe('property radar integration with synthetic records', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); mockData() })
  it('selects a property, changes radius, filters, resets, and opens marker details', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: /Test Place.*1 Test Street/ }))
    expect(await screen.findByText('Map markers:')).toBeInTheDocument()
    expect(within(screen.getByTestId('map')).getByRole('button', { name: 'near' })).toBeInTheDocument()
    expect(within(screen.getByTestId('map')).queryByRole('button', { name: 'far' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '2 km' }))
    expect(await within(screen.getByTestId('map')).findByRole('button', { name: 'far' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Development stage'), { target: { value: 'built' } })
    expect(within(screen.getByTestId('map')).queryByRole('button', { name: 'near' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'far' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('20 Far Street')
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    fireEvent.click(screen.getByRole('button', { name: /Reset filters/ }))
    expect(screen.getByLabelText('Development stage')).toHaveValue('all')
    expect(within(screen.getByTestId('map')).getByRole('button', { name: 'near' })).toBeInTheDocument()
  })
  it('shows an honest unavailable state', async () => {
    mockData('unavailable'); mount()
    fireEvent.click(await screen.findByRole('button', { name: /Test Place.*1 Test Street/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Development dataset unavailable')
    expect(screen.getByText('Verified development records are not available.')).toBeInTheDocument()
  })
  it('shows no matches after filtering', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: /Test Place.*1 Test Street/ }))
    await screen.findByText('10 Near Street')
    fireEvent.change(screen.getByLabelText('Development type'), { target: { value: 'commercial' } })
    await waitFor(() => expect(screen.getByText('No developments match these filters. Try resetting them.')).toBeInTheDocument())
  })
  it('sorts the visible results and applies the type filter to the map and list', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: /Test Place.*1 Test Street/ }))
    fireEvent.click(screen.getByRole('button', { name: '2 km' }))
    await within(screen.getByTestId('map')).findByRole('button', { name: 'far' })
    fireEvent.change(screen.getByLabelText('Sort results'), { target: { value: 'farthest' } })
    const names = screen.getAllByRole('heading', { level: 3 }).map(element => element.textContent).filter(text => text?.includes('Street'))
    expect(names).toEqual(['20 Far Street', '10 Near Street'])
    fireEvent.change(screen.getByLabelText('Development type'), { target: { value: 'mixed_use' } })
    expect(screen.queryByRole('heading', { name: '10 Near Street' })).not.toBeInTheDocument()
    expect(within(screen.getByTestId('map')).queryByRole('button', { name: 'near' })).not.toBeInTheDocument()
  })
})
