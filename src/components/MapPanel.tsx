import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import type { NearbyDevelopment, Property, Stage } from '../types'
import { stageLabels } from '../lib/analytics'

const stageClass: Record<Stage, string> = {
  proposed: 'proposed', approved: 'approved', under_construction: 'under-construction', built: 'built', unknown: 'unknown',
}
const propertyIcon = L.divIcon({ className: 'property-pin', html: '<span class="property-pin-core"></span>', iconSize: [28, 28], iconAnchor: [14, 14] })

function MapController({ property, radiusMeters, selected }: { property: Property; radiusMeters: number; selected: NearbyDevelopment | null }) {
  const map = useMap()
  useEffect(() => {
    if (property.latitude === null || property.longitude === null) return
    map.fitBounds(L.latLng(property.latitude, property.longitude).toBounds(radiusMeters * 2.55), { animate: false, maxZoom: 16, padding: [24, 24] })
  }, [map, property.id, property.latitude, property.longitude, radiusMeters])
  useEffect(() => {
    if (selected?.latitude != null && selected.longitude != null) map.panTo([selected.latitude, selected.longitude], { animate: true })
  }, [map, selected?.id])
  return null
}

function ClusterMarkers({ items, selectedId, onSelect }: { items: NearbyDevelopment[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const map = useMap()
  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false, maxClusterRadius: 42, spiderfyOnMaxZoom: true,
      iconCreateFunction: cluster => L.divIcon({ className: 'radar-cluster', html: `<span>${cluster.getChildCount()}</span>`, iconSize: [40, 40] }),
    })
    let selectedMarker: L.Marker | null = null
    for (const item of items) {
      if (item.latitude === null || item.longitude === null) continue
      const marker = L.marker([item.latitude, item.longitude], {
        icon: L.divIcon({
          className: `development-pin ${stageClass[item.stage]} ${item.id === selectedId ? 'selected' : ''}`,
          html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11],
        }),
        title: `${item.address || item.name || 'Development'} — ${stageLabels[item.stage]}`,
        alt: item.address || item.name || 'Development',
      })
      marker.on('click', () => onSelect(item.id))
      if (item.id === selectedId) selectedMarker = marker
      group.addLayer(marker)
    }
    map.addLayer(group)
    if (selectedMarker) group.zoomToShowLayer(selectedMarker)
    return () => { map.removeLayer(group); group.clearLayers() }
  }, [map, items, selectedId, onSelect])
  return null
}

export function MapPanel({ property, radiusMeters, items, selected, onSelect }: { property: Property; radiusMeters: number; items: NearbyDevelopment[]; selected: NearbyDevelopment | null; onSelect: (id: string) => void }) {
  const center = useMemo<[number, number]>(() => [property.latitude ?? 43.644, property.longitude ?? -79.38], [property.latitude, property.longitude])
  if (property.latitude === null || property.longitude === null) {
    return <div className="flex h-full min-h-[400px] items-center justify-center bg-slate-100 p-8 text-center text-slate-600">This property has no verified location yet.</div>
  }
  return <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="h-full min-h-[400px] w-full" aria-label="Map of nearby developments">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Circle center={center} radius={radiusMeters} pathOptions={{ color: '#B70021', weight: 2, fillColor: '#B70021', fillOpacity: 0.07 }} />
    <Marker position={center} icon={propertyIcon} title={property.name} />
    <ClusterMarkers items={items} selectedId={selected?.id ?? null} onSelect={onSelect} />
    <MapController property={property} radiusMeters={radiusMeters} selected={selected} />
  </MapContainer>
}
