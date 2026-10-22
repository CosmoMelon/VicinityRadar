import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Stage } from '../types'

export default function StageChart({ data }: { data: { stage: Stage; label: string; count: number }[] }) {
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 12, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#e9eef1" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={105} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="#B70021" radius={[0, 4, 4, 0]} maxBarSize={14} /></BarChart></ResponsiveContainer>
}
