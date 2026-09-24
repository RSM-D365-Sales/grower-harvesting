import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ─── Crops CRUD ─────────────────────────────────────────────

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

export function useCreateCrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (crop) => {
      const { data, error } = await supabase.from('crops').insert(crop).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crops'] }),
  })
}

export function useUpdateCrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('crops').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crops'] }),
  })
}

export function useDeleteCrop() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('crops').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crops'] }),
  })
}

// ─── Team Members CRUD ──────────────────────────────────────

export function useAllTeamMembers() {
  return useQuery({
    queryKey: ['all-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('team_members').select('*').order('full_name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (member) => {
      const { data, error } = await supabase.from('team_members').insert(member).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-team-members'] })
      qc.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

export function useUpdateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('team_members').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-team-members'] })
      qc.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

export function useDeleteTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-team-members'] })
      qc.invalidateQueries({ queryKey: ['team-members'] })
    },
  })
}

// ─── Fields CRUD ────────────────────────────────────────────

export function useAllFields() {
  return useQuery({
    queryKey: ['all-fields'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fields').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

export function useCreateField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (field) => {
      const { data, error } = await supabase.from('fields').insert(field).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-fields'] })
      qc.invalidateQueries({ queryKey: ['fields'] })
    },
  })
}

export function useUpdateField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('fields').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-fields'] })
      qc.invalidateQueries({ queryKey: ['fields'] })
    },
  })
}

export function useDeleteField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('fields').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-fields'] })
      qc.invalidateQueries({ queryKey: ['fields'] })
    },
  })
}

