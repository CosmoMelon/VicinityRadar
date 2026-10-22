import type { NearbyDevelopment, Property } from '../types'

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function resultsCsv(property: Property, radiusMeters: number, items: NearbyDevelopment[]): string {
  const header = ['Selected property', 'Radius (m)', 'Development name', 'Address', 'Source project ID', 'Distance (m)', 'Stage', 'Development type', 'Residential units', 'Non-residential GFA (m2)', 'Source reference', 'Source URL', 'Source updated at']
  const rows = items.map(item => [property.name, radiusMeters, item.name, item.address, item.sourceProjectId, Math.round(item.distanceMeters), item.stage, item.developmentType, item.residentialUnits, item.nonResidentialGfaM2, item.applicationReference, item.sourceUrl, item.sourceUpdatedAt])
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function exportFilename(property: Property, radiusMeters: number): string {
  const slug = property.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return `vicinity-radar-${slug}-${radiusMeters < 1000 ? `${radiusMeters}m` : `${radiusMeters / 1000}km`}.csv`
}

export function downloadResults(property: Property, radiusMeters: number, items: NearbyDevelopment[]) {
  const blob = new Blob([resultsCsv(property, radiusMeters, items)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = exportFilename(property, radiusMeters)
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
