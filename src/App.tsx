import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Building2, ChevronDown, Download, ExternalLink, Info, Layers3, MapPin, Radar, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { filterAndSort, stageLabels, summarize, typeLabels } from './lib/analytics'
import { downloadResults } from './lib/export'
import { nearbyDevelopments } from './lib/geo'
import { loadDevelopments, loadMetadata, loadProperties } from './services/dataService'
import type { DevelopmentType, NearbyDevelopment, Property, SortMode, Stage } from './types'

const radiusOptions = [{ value: 500, label: '500 m' }, { value: 1000, label: '1 km' }, { value: 2000, label: '2 km' }]
const stageOptions: { value: Stage | 'all'; label: string }[] = [
  { value: 'all', label: 'All stages' }, { value: 'proposed', label: 'Proposed' }, { value: 'approved', label: 'Approved' },
  { value: 'under_construction', label: 'Under construction' }, { value: 'built', label: 'Built' }, { value: 'unknown', label: 'Unknown' },
]
const typeOptions: { value: DevelopmentType | 'all' | 'other_unknown'; label: string }[] = [
  { value: 'all', label: 'All types' }, { value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed-use' }, { value: 'other_unknown', label: 'Other / Unknown' },
]
const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'nearest', label: 'Nearest first' }, { value: 'farthest', label: 'Farthest first' },
  { value: 'units', label: 'Most residential units' }, { value: 'area', label: 'Largest non-residential area' },
]
const numberFormat = new Intl.NumberFormat('en-CA')
const formatNumber = (value: number) => numberFormat.format(Math.round(value))
const formatDistance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`
const sourceFallback = 'https://open.toronto.ca/dataset/development-pipeline/'
const MapPanel = lazy(() => import('./components/MapPanel').then(module => ({ default: module.MapPanel })))
const StageChart = lazy(() => import('./components/StageChart'))

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">{children}<ExternalLink size={14} aria-hidden="true" /></a>
}

function PropertySearch({ properties, onSelect, compact = false }: { properties: Property[]; onSelect: (property: Property) => void; compact?: boolean }) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const listId = useId()
  const matches = properties.filter(property => `${property.name} ${property.address} ${property.propertyType ?? ''}`.toLowerCase().includes(term.toLowerCase()))
  return <div onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }} className={`relative ${compact ? 'w-full max-w-sm' : 'w-full max-w-2xl'}`}>
    <div className="flex items-center rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <Search size={19} className="ml-4 shrink-0 text-slate-500" aria-hidden="true" />
      <input role="combobox" aria-autocomplete="list" aria-label="Search a property in Toronto" aria-expanded={open} aria-controls={listId} value={term} onChange={event => { setTerm(event.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={event => {
        if (event.key === 'Escape') setOpen(false)
        if (event.key === 'Enter' && matches[0]) { onSelect(matches[0]); setTerm(''); setOpen(false) }
      }} placeholder="Search a property in Toronto..." className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-ink outline-none placeholder:text-slate-500" />
      <ChevronDown size={17} className="mr-4 text-slate-400" aria-hidden="true" />
    </div>
    {open && <div id={listId} role="listbox" aria-label="Property suggestions" className="absolute z-[1000] mt-2 max-h-80 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
      {matches.length ? matches.map(property => <button type="button" role="option" aria-selected="false" key={property.id} onClick={() => { onSelect(property); setTerm(''); setOpen(false) }} className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Building2 size={18} aria-hidden="true" /></span>
        <span className="min-w-0"><span className="block font-semibold text-ink">{property.name}</span><span className="block text-sm text-slate-500">{property.address} · {property.propertyType ?? 'Property'}</span></span>
      </button>) : <p className="p-4 text-sm text-slate-500">No matching properties.</p>}
    </div>}
  </div>
}

function StageBadge({ stage }: { stage: Stage }) { return <span className={`stage-badge stage-${stage}`}>{stageLabels[stage]}</span> }

function DetailPanel({ item, onClose }: { item: NearbyDevelopment; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const fields = [
    ['Application / project ID', item.applicationReference || item.sourceProjectId],
    ['Straight-line distance', formatDistance(item.distanceMeters)],
    ['Development stage', stageLabels[item.stage]],
    ['City source status', item.originalStage],
    ['Development type', typeLabels[item.developmentType]],
    ['Proposed residential units', item.residentialUnits === null ? null : formatNumber(item.residentialUnits)],
    ['Proposed non-residential area', item.nonResidentialGfaM2 === null ? null : `${formatNumber(item.nonResidentialGfaM2)} m²`],
    ['Date received', item.dateReceived],
    ['Source updated', item.sourceUpdatedAt],
  ]
  return <div className="fixed inset-0 z-[2000]" role="presentation">
    <button className="absolute inset-0 h-full w-full bg-ink/45" aria-label="Close development details" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-labelledby="detail-title" className="detail-panel absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
        <div className="pr-4"><p className="eyebrow">Development record</p><h2 id="detail-title" className="mt-1 text-xl font-normal text-ink">{item.name || item.address || 'Unnamed development'}</h2></div>
        <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}><X size={20} /></Button>
      </div>
      <div className="overflow-y-auto px-6 py-6">
        {item.address && item.name && <p className="mb-5 flex gap-2 text-slate-600"><MapPin size={17} className="mt-0.5 shrink-0" />{item.address}</p>}
        <StageBadge stage={item.stage} />
        <dl className="mt-6 divide-y divide-slate-100 border-y border-slate-100">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-4 py-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-ink">{value ?? 'Not reported'}</dd></div>)}</dl>
        <p className="mt-5 text-xs leading-5 text-slate-500">Location is an official municipal address point. Distances are straight line approximations. Source data may not reflect current site conditions.</p>
        <div className="mt-6"><SourceLink href={item.sourceUrl || sourceFallback}>{item.sourceUrl ? 'Open official application' : 'Open official dataset'}</SourceLink></div>
      </div>
    </section>
  </div>
}

export default function App() {
  const propertiesQuery = useQuery({ queryKey: ['properties'], queryFn: loadProperties, staleTime: Infinity, retry: 1 })
  const developmentsQuery = useQuery({ queryKey: ['developments'], queryFn: loadDevelopments, staleTime: Infinity, retry: 1 })
  const metadataQuery = useQuery({ queryKey: ['metadata'], queryFn: loadMetadata, staleTime: Infinity, retry: 1 })
  const [propertyId, setPropertyId] = useState(() => new URLSearchParams(window.location.search).get('property'))
  const [radius, setRadius] = useState(1000)
  const [stage, setStage] = useState<Stage | 'all'>('all')
  const [type, setType] = useState<DevelopmentType | 'all' | 'other_unknown'>('all')
  const [sort, setSort] = useState<SortMode>('nearest')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const properties = propertiesQuery.data ?? []
  const property = properties.find(item => item.id === propertyId) ?? null
  const dataReady = !!(metadataQuery.data?.dataMode === 'verified' && developmentsQuery.isSuccess && metadataQuery.data.developments.count === developmentsQuery.data.length)
  const withinRadius = useMemo(() => property && dataReady ? nearbyDevelopments(property, developmentsQuery.data ?? [], radius) : [], [property, dataReady, developmentsQuery.data, radius])
  const filtered = useMemo(() => filterAndSort(withinRadius, stage, type, sort), [withinRadius, stage, type, sort])
  const summary = useMemo(() => summarize(filtered), [filtered])
  const selected = filtered.find(item => item.id === selectedId) ?? null
  const selectDevelopment = useCallback((id: string) => setSelectedId(id), [])
  useEffect(() => { if (selectedId && !filtered.some(item => item.id === selectedId)) setSelectedId(null) }, [filtered, selectedId])

  function selectProperty(next: Property) {
    setPropertyId(next.id); setRadius(1000); setStage('all'); setType('all'); setSort('nearest'); setSelectedId(null)
    window.history.replaceState(null, '', `${window.location.pathname}?property=${encodeURIComponent(next.id)}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function backHome() { setPropertyId(null); setSelectedId(null); window.history.replaceState(null, '', window.location.pathname) }
  function resetFilters() { setStage('all'); setType('all'); setSort('nearest') }
  const loading = propertiesQuery.isPending || developmentsQuery.isPending || metadataQuery.isPending

  return <div className="min-h-screen bg-mist text-ink">
    <header className="relative z-[1100] border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 lg:px-8">
        <button onClick={backHome} className="flex shrink-0 items-center gap-3" aria-label="Vicinity Radar home"><span className="brand-mark shadow-sm"><Radar size={25} strokeWidth={2.4} aria-hidden="true" /></span><span className="brand-wordmark"><img src={`${import.meta.env.BASE_URL}img/Vicinity%20Radar.png`} alt="" /></span></button>
        {property && <div className="hidden flex-1 justify-center md:flex"><PropertySearch properties={properties} onSelect={selectProperty} compact /></div>}
        <nav className="ml-auto flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6"><a href="#about" className="hover:text-brand">About</a><a href="#data-sources" className="hover:text-brand">Data sources</a></nav>
      </div>
    </header>

    {loading && <main className="mx-auto max-w-7xl px-5 py-24 text-center"><div className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" /><p role="status">Loading properties and development data…</p></main>}
    {!loading && propertiesQuery.isError && <main className="mx-auto max-w-3xl px-5 py-24 text-center"><h1 className="text-2xl font-normal">Property data unavailable</h1><p className="mt-3 text-slate-600">The property catalogue could not be loaded. Check the bundled data files and try again.</p></main>}
    {!loading && propertiesQuery.isSuccess && !property && <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-24">
        <div><p className="eyebrow mb-5">Toronto development intelligence</p><h1 className="max-w-3xl text-4xl font-normal leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">What's developing around your property?</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Explore nearby development activity across Toronto using publicly available planning and construction data.</p><div className="mt-9"><PropertySearch properties={properties} onSelect={selectProperty} /></div><p className="mt-4 text-sm text-slate-500">Choose one of {properties.length} Toronto properties to start exploring.</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(26,41,48,.08)] sm:p-8"><div className="flex items-center justify-between"><p className="eyebrow">Start with a property</p><MapPin size={19} className="text-brand" /></div><div className="mt-5 divide-y divide-slate-100">{properties.map(item => <button key={item.id} onClick={() => selectProperty(item)} className="group flex w-full items-center justify-between gap-4 py-4 text-left"><span><span className="block text-base font-semibold group-hover:text-brand">{item.name}</span><span className="mt-1 block text-sm text-slate-500">{item.address} · {item.propertyType ?? 'Property'}</span></span><ArrowRight size={18} className="shrink-0 text-slate-400 group-hover:text-brand" /></button>)}</div><div className="mt-5 rounded-xl bg-brand/5 p-4 text-sm leading-6 text-slate-600">Select a property, set a radius, and inspect source linked records on the map.</div></div>
      </section>
    </main>}
    {!loading && property && <main className="mx-auto max-w-[1600px] px-5 pb-20 pt-6 lg:px-8">
      <div className="mb-5 md:hidden"><PropertySearch properties={properties} onSelect={selectProperty} /></div>
      <button onClick={backHome} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand"><ArrowLeft size={16} /> All properties</button>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Property radar</p><h1 className="mt-1 text-3xl font-normal tracking-tight sm:text-4xl">{property.name}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={15} />{property.address}, {property.city}</p><p className="mt-2 text-sm text-slate-600">{property.propertyType ?? 'Property'}{property.hinesRoles.length ? ` · Hines: ${property.hinesRoles.join(', ')}` : ''}</p><div className="mt-2 text-sm"><SourceLink href={property.sourceUrl}>Hines property page</SourceLink></div></div><div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm"><span className="sr-only" id="radius-label">Search radius</span><div role="group" aria-labelledby="radius-label" className="flex gap-1">{radiusOptions.map(option => <button key={option.value} type="button" aria-pressed={radius === option.value} onClick={() => setRadius(option.value)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${radius === option.value ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{option.label}</button>)}</div></div></section>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5"><div className="flex flex-wrap items-center gap-3"><span className="mr-1 inline-flex items-center gap-2 text-sm font-bold"><SlidersHorizontal size={17} className="text-brand" /> Filters</span><label className="sr-only" htmlFor="stage-filter">Development stage</label><select id="stage-filter" value={stage} onChange={event => setStage(event.target.value as Stage | 'all')} className="filter-select">{stageOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><label className="sr-only" htmlFor="type-filter">Development type</label><select id="type-filter" value={type} onChange={event => setType(event.target.value as DevelopmentType | 'all' | 'other_unknown')} className="filter-select">{typeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><label className="sr-only" htmlFor="sort-filter">Sort results</label><select id="sort-filter" value={sort} onChange={event => setSort(event.target.value as SortMode)} className="filter-select">{sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-600"><RotateCcw size={15} /> Reset filters</Button></div></section>
      {!dataReady && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950"><strong>Development dataset unavailable.</strong> Nearby counts cannot be determined. {developmentsQuery.isError ? 'The bundled development file could not be loaded.' : metadataQuery.isError ? 'The data metadata could not be loaded.' : 'The official dataset has not been prepared or does not match its metadata.'}</div>}
      {dataReady && <p className="mb-4 flex items-start gap-2 text-sm text-slate-600"><Info size={16} className="mt-0.5 shrink-0 text-brand" /><span>Showing {formatNumber(filtered.length)} source records within {radiusOptions.find(option => option.value === radius)?.label} · straight-line distance. {formatNumber(metadataQuery.data!.developments.excludedNoCoordinates)} city records have no unambiguous address point and are excluded.</span></p>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,1fr)]"><section aria-label="Development map" className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="absolute left-12 top-4 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold shadow">{property.name} · {radiusOptions.find(option => option.value === radius)?.label} radius</div><div className="h-[480px] lg:h-[650px]"><Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-500">Loading map…</div>}><MapPanel property={property} radiusMeters={radius} items={dataReady ? filtered : []} selected={selected} onSelect={selectDevelopment} /></Suspense></div><div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"><span className="font-bold text-ink">Map key</span><span className="flex items-center gap-1.5"><i className="legend-dot property" />Selected property</span>{stageOptions.slice(1).map(option => <span key={option.value} className="flex items-center gap-1.5"><i className={`legend-dot ${option.value}`} />{option.label}</span>)}</div></section>
        <div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="eyebrow">At a glance</p><h2 className="mt-1 text-xl font-normal">Nearby activity</h2></div><span className="rounded-full bg-brand/10 p-2 text-brand"><Layers3 size={20} /></span></div>{dataReady ? <><div className="mt-5 grid grid-cols-2 gap-3"><Metric value={formatNumber(summary.count)} label="Nearby development records" /><Metric value={summary.unitsCoverage ? formatNumber(summary.residentialUnits) : '—'} label="Proposed pipeline units" note={`${summary.unitsCoverage}/${summary.count} records report units`} /><Metric value={summary.areaCoverage ? `${formatNumber(summary.nonResidentialGfaM2)} m²` : '—'} label="Non-residential area" note={`${summary.areaCoverage}/${summary.count} records report area`} /><Metric value={summary.underConstruction ? formatNumber(summary.underConstruction) : '—'} label="Under construction" note="Not identified by this source" /></div><div className="mt-6"><h3 className="text-sm font-normal">Developments by stage</h3><p className="mt-1 text-xs text-slate-500">Based on the same filtered records</p><div className="mt-3 h-36"><Suspense fallback={<div className="text-xs text-slate-500">Loading chart…</div>}><StageChart data={summary.stages} /></Suspense></div></div></> : <p className="mt-5 text-sm text-slate-500">Metrics appear when verified development data is available.</p>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><p className="eyebrow">Within the selected radius</p><h2 className="mt-1 text-xl font-normal">Development records {dataReady && <span className="text-slate-400">({filtered.length})</span>}</h2></div><Button variant="outline" size="sm" disabled={!dataReady || filtered.length === 0} onClick={() => downloadResults(property, radius, filtered)}><Download size={16} /> Export results</Button></div><div className="max-h-[680px] overflow-y-auto" aria-live="polite">{dataReady && filtered.length ? filtered.map(item => <div key={item.id} className={`border-b border-slate-100 p-5 last:border-b-0 ${selectedId === item.id ? 'bg-brand/5' : ''}`}><div className="flex items-start justify-between gap-3"><h3 className="font-normal leading-snug">{item.name || item.address || 'Unnamed development'}</h3><span className="shrink-0 text-sm font-bold text-brand">{formatDistance(item.distanceMeters)}</span></div>{item.name && item.address && <p className="mt-1 text-sm text-slate-500">{item.address}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><StageBadge stage={item.stage} /><span className="text-xs text-slate-500">{typeLabels[item.developmentType]}</span>{item.residentialUnits !== null && <span className="text-xs text-slate-500">· {formatNumber(item.residentialUnits)} units</span>}{item.nonResidentialGfaM2 !== null && <span className="text-xs text-slate-500">· {formatNumber(item.nonResidentialGfaM2)} m² non-res.</span>}</div><div className="mt-3 flex items-center gap-5 text-sm"><button onClick={() => setSelectedId(item.id)} className="font-semibold text-brand hover:underline">View details</button><SourceLink href={item.sourceUrl || sourceFallback}>Official source</SourceLink></div></div>) : <div className="p-8 text-center text-sm text-slate-600">{!dataReady ? 'Verified development records are not available.' : withinRadius.length === 0 ? 'No geocoded developments are recorded within this radius.' : 'No developments match these filters. Try resetting them.'}</div>}</div></section>
        </div></div>
    </main>}
    <footer className="site-footer">
      <div className="mx-auto grid max-w-[1600px] gap-10 px-5 py-12 text-sm lg:grid-cols-2 lg:px-8">
        <section id="about">
          <h2 className="font-headline text-2xl font-normal">About Vicinity Radar</h2>
          <p className="mt-3 max-w-xl leading-6">A property-centric research prototype for exploring significant development activity in Toronto. Distances are straight-line estimates from Hines property reference points to municipal development address points, not travel distances or parcel boundaries.</p>
          <p className="mt-3 text-xs leading-5">Vicinity Radar is an independent research prototype using publicly available information. It is not affiliated with or endorsed by Hines or the City of Toronto.</p>
        </section>
        <section id="data-sources">
          <h2 className="font-headline text-2xl font-normal">Data sources</h2>
          <p className="mt-3 leading-6"><SourceLink href="https://www.hines.com/properties">Hines property directory</SourceLink> · property details checked {metadataQuery.data?.properties.retrievedAt || 'date unavailable'}.</p>
          <p className="mt-2 leading-6"><SourceLink href={sourceFallback}>City of Toronto Development Pipeline</SourceLink> · source updated {metadataQuery.data?.developments.sourceVersion?.slice(0, 10) || 'date unavailable'}; prepared {metadataQuery.data?.developments.preparedAt?.slice(0, 10) || 'not prepared'}.</p>
          <p className="mt-2 leading-6"><SourceLink href="https://open.toronto.ca/dataset/address-points-municipal-toronto-one-address-repository/">Toronto One Address Repository</SourceLink> provides location points. Contains information licensed under the <SourceLink href="https://open.toronto.ca/open-data-licence/">Open Government Licence – Toronto</SourceLink>. Map tiles © OpenStreetMap contributors.</p>
        </section>
      </div>
    </footer>
    {selected && <DetailPanel item={selected} onClose={() => setSelectedId(null)} />}
  </div>
}

function Metric({ value, label, note }: { value: string; label: string; note?: string }) { return <div className="min-h-28 rounded-xl bg-mist p-4"><strong className="block text-2xl font-bold tracking-tight text-ink">{value}</strong><span className="mt-1 block text-xs font-semibold text-slate-600">{label}</span>{note && <span className="mt-1 block text-[11px] text-slate-500">{note}</span>}</div> }
