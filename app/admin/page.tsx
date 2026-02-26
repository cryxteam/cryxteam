'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type UserRow = {
  id: string
  username: string
  role: string
  is_approved: boolean
  balance: number
  created_at: string | null
}

type SelfProfileRow = {
  role: string
  is_approved: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [msg, setMsg] = useState('')
  const [canAccess, setCanAccess] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, role, is_approved, balance, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setMsg(error.message)
      return
    }
    setUsers(data || [])
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void (async () => {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          router.push('/login')
          return
        }

        const { data: me, error: meError } = await supabase
          .from('profiles')
          .select('role, is_approved')
          .eq('id', user.id)
          .maybeSingle<SelfProfileRow>()

        if (meError || !me) {
          router.push('/login')
          return
        }

        if (!me.is_approved) {
          await supabase.auth.signOut()
          router.push('/login')
          return
        }

        const normalizedRole = (me.role ?? '').trim().toLowerCase()
        if (normalizedRole !== 'owner') {
          router.push('/dashboard')
          return
        }

        setCanAccess(true)
        await load()
      })()
    })
    return () => cancelAnimationFrame(id)
  }, [load, router])

  async function approve(id: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', id)

    if (error) {
      setMsg(error.message)
      return
    }
    await load()
  }

  if (!canAccess && !msg) {
    return (
      <div className="card card-wide">
        <p className="card-subtitle">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="card card-wide">
      <div className="card-header">
        <h1 className="card-title">Panel de owner</h1>
        <p className="card-subtitle">Revisa perfiles y aprueba usuarios nuevos.</p>
      </div>

      {msg && <p className="message message-error">{msg}</p>}

      <div className="user-list">
        {users.map(u => (
          <div key={u.id} className="user-row">
            <div className="user-main">
              <b>@{u.username}</b> | Rol: {u.role} | Aprobado:{' '}
              {u.is_approved ? 'Si' : 'No'} | Balance: {u.balance}
            </div>
            <div className="user-actions">
              <button className="button-secondary" onClick={() => approve(u.id)}>
                Aprobar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
