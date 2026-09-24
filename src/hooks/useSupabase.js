import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ─── Dashboard KPIs ────────────────────────────────────────
export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const [
        { count: activeFields },
        { count: harvestReady },
        { data: yieldData },
        { count: pendingSync },
        { count: totalSchedules },
        { data: shortLeadCrops },
      ] = await Promise.all([
        supabase.from('fields').select('*', { count: 'exact', head: true }).neq('status', 'idle'),
        supabase.from('grow_cycles').select('*', { count: 'exact', head: true }).eq('phase', 'harvest_ready'),
        supabase.from('yield_records').select('quantity, unit_of_measure'),
        supabase.from('d365_sync_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('harvest_schedules').select('*', { count: 'exact', head: true }),
        supabase.from('crops').select('*').eq('is_short_lead_time', true),
      ])

      // Greenhouse crops are recorded in heads, lbs, or bunches — total per unit, never across.
      const yieldByUnit = {}
      yieldData?.forEach((r) => {
        const unit = r.unit_of_measure || 'lbs'
        yieldByUnit[unit] = (yieldByUnit[unit] || 0) + Number(r.quantity)
      })

      return {
        activeFields: activeFields || 0,
        harvestReady: harvestReady || 0,
        totalYield: yieldByUnit.lbs || 0,
        yieldByUnit,
        pendingSync: pendingSync || 0,
        totalSchedules: totalSchedules || 0,
        shortLeadCropCount: shortLeadCrops?.length || 0,
      }
    },
  })
}

// ─── Grow Cycles ───────────────────────────────────────────
export function useGrowCycles(filters = {}) {
  return useQuery({
    queryKey: ['grow-cycles', filters],
    queryFn: async () => {
      let query = supabase
        .from('grow_cycles')
        .select(`
          *,
          field:fields(*),
          crop:crops(*),
          harvest_schedules(*)
        `)
        .order('created_at', { ascending: false })

      if (filters.phase) query = query.eq('phase', filters.phase)
      if (filters.field_id) query = query.eq('field_id', filters.field_id)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useGrowCycle(id) {
  return useQuery({
    queryKey: ['grow-cycle', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grow_cycles')
        .select(`
          *,
          field:fields(*),
          crop:crops(*),
          harvest_schedules(
            *,
            harvest_schedule_members(
              *,
              team_member:team_members(*)
            )
          ),
          yield_records(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useUpdateGrowCyclePhase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, phase, extraFields = {} }) => {
      const { data, error } = await supabase
        .from('grow_cycles')
        .update({ phase, updated_at: new Date().toISOString(), ...extraFields })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grow-cycles'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}

export function useCreateGrowCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('grow_cycles')
        .insert(payload)
        .select(`*, field:fields(*), crop:crops(*)`)
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grow-cycles'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}

// ─── Harvest Schedules ─────────────────────────────────────
export function useHarvestSchedules(filters = {}) {
  return useQuery({
    queryKey: ['harvest-schedules', filters],
    queryFn: async () => {
      let query = supabase
        .from('harvest_schedules')
        .select(`
          *,
          grow_cycle:grow_cycles(
            *,
            field:fields(*),
            crop:crops(*)
          ),
          harvest_schedule_members(
            *,
            team_member:team_members(*)
          )
        `)
        .order('scheduled_date', { ascending: true })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.dateFrom) query = query.gte('scheduled_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('scheduled_date', filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useCreateHarvestSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ schedule, memberIds }) => {
      const { data: sched, error: schedError } = await supabase
        .from('harvest_schedules')
        .insert(schedule)
        .select()
        .single()
      if (schedError) throw schedError

      if (memberIds?.length) {
        const members = memberIds.map((mid) => ({
          harvest_schedule_id: sched.id,
          team_member_id: mid,
        }))
        const { error: memError } = await supabase
          .from('harvest_schedule_members')
          .insert(members)
        if (memError) throw memError
      }

      return sched
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-schedules'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}

export function useUpdateHarvestSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('harvest_schedules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-schedules'] })
    },
  })
}

// ─── Yield Records ─────────────────────────────────────────
export function useYieldRecords(filters = {}) {
  return useQuery({
    queryKey: ['yield-records', filters],
    queryFn: async () => {
      let query = supabase
        .from('yield_records')
        .select(`
          *,
          grow_cycle:grow_cycles(
            *,
            field:fields(*),
            crop:crops(*)
          )
        `)
        .order('recorded_at', { ascending: false })

      if (filters.grade) query = query.eq('grade', filters.grade)
      if (filters.grow_cycle_id) query = query.eq('grow_cycle_id', filters.grow_cycle_id)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useCreateYieldRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('yield_records')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['yield-records'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}

// ─── Reference Data ────────────────────────────────────────
export function useFields() {
  return useQuery({
    queryKey: ['fields'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fields').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCrops() {
  return useQuery({
    queryKey: ['crops'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crops').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*').eq('is_active', true).order('full_name')
      if (error) throw error
      return data
    },
  })
}

// ─── D365 Sync Queue ──────────────────────────────────────
export function useD365SyncQueue(filters = {}) {
  return useQuery({
    queryKey: ['d365-sync', filters],
    queryFn: async () => {
      let query = supabase
        .from('d365_sync_queue')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useQueueD365Sync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await supabase
        .from('d365_sync_queue')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['d365-sync'] })
      qc.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
  })
}

export function useRetryD365Sync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('d365_sync_queue')
        .update({ status: 'pending', last_error: null })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['d365-sync'] })
    },
  })
}
