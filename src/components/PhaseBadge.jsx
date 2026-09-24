const phaseConfig = {
  field_prep: { label: 'Bay Prep', color: 'bg-gray-400', textColor: 'text-gray-700', bgLight: 'bg-gray-100' },
  planting: { label: 'Planting', color: 'bg-yellow-400', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  growing: { label: 'Growing', color: 'bg-green-400', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  harvest_ready: { label: 'Harvest Ready', color: 'bg-orange-400', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  harvesting: { label: 'Harvesting', color: 'bg-red-400', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  complete: { label: 'Complete', color: 'bg-blue-400', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
}

export default function PhaseBadge({ phase }) {
  const config = phaseConfig[phase] || phaseConfig.field_prep

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgLight} ${config.textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`}></span>
      {config.label}
    </span>
  )
}
