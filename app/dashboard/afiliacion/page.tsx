'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { affiliateUserByUsernameAction } from '@/lib/affiliate'
import styles from './afiliacion.module.css'

type SelfProfile = {
  username: string
  is_approved: boolean
}

type MessageType = 'idle' | 'ok' | 'error'

export default function AfiliacionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [canAccess, setCanAccess] = useState(false)
  const [myUserId, setMyUserId] = useState('')
  const [username, setUsername] = useState('')
  const [myUsername, setMyUsername] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<MessageType>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    const id = requestAnimationFrame(() => {
      void (async () => {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return
        if (error || !user) {
          router.replace('/login')
          return
        }

        const { data: me, error: meError } = await supabase
          .from('profiles')
          .select('username, is_approved')
          .eq('id', user.id)
          .maybeSingle<SelfProfile>()

        if (!mounted) return
        if (meError || !me || !me.is_approved) {
          router.replace('/dashboard')
          return
        }

        setMyUserId(user.id)
        setMyUsername(me.username || '')
        setCanAccess(true)
        setIsLoading(false)
      })()
    })

    return () => {
      mounted = false
      cancelAnimationFrame(id)
    }
  }, [router])

  async function handleAffiliate() {
    const target = username.trim()
    if (!target) {
      setMsgType('error')
      setMsg('Escribe un username para afiliar.')
      return
    }
    if (!myUserId) {
      setMsgType('error')
      setMsg('No se pudo validar tu sesion para afiliar.')
      return
    }

    setIsSubmitting(true)
    setMsg('')

    const result = await affiliateUserByUsernameAction({
      supabase,
      referrerUserId: myUserId,
      referrerUsername: myUsername,
      targetUsername: target,
    })

    if (result.code === 'OK') {
      setMsgType('ok')
      setMsg('Usuario afiliado y aprobado correctamente.')
      setUsername('')
      setIsSubmitting(false)
      return
    }

    setMsgType('error')
    switch (result.code) {
      case 'USER_NOT_FOUND':
        setMsg('El username no existe.')
        break
      case 'CANNOT_SELF_AFFILIATE':
        setMsg('No puedes afiliarte a ti mismo.')
        break
      case 'ALREADY_AFFILIATED':
        setMsg('Ese usuario ya fue afiliado antes.')
        break
      case 'NOT_AUTHENTICATED':
        setMsg('Tu sesion expiro. Cierra sesion y vuelve a entrar.')
        break
      case 'PERMISSION_DENIED':
        setMsg('No tienes permisos para afiliar en este momento. Avisa al owner.')
        break
      case 'INVALID_INPUT':
        setMsg('Ingresa un username valido.')
        break
      default:
        setMsg('Error del sistema. Intenta otra vez.')
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.helper}>Cargando afiliacion...</p>
        </div>
      </main>
    )
  }

  if (!canAccess) {
    return null
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <p className={styles.kicker}>Dashboard</p>
          <h1>Afiliacion por username</h1>
          <p className={styles.helper}>
            Tu usuario: <strong>{myUsername || '-'}</strong>
          </p>
        </header>

        <div className={styles.formRow}>
          <label htmlFor='target-username' className={styles.label}>
            Username exacto del usuario a afiliar
          </label>
          <div className={styles.inputRow}>
            <input
              id='target-username'
              type='text'
              value={username}
              onChange={event => setUsername(event.target.value)}
              placeholder='ejemplo_usuario'
              autoComplete='off'
            />
            <button type='button' onClick={handleAffiliate} disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Afiliar'}
            </button>
          </div>
        </div>

        {msg && (
          <p className={msgType === 'ok' ? styles.ok : styles.error}>
            {msg}
          </p>
        )}

        <section className={styles.rules}>
          <h2>Reglas</h2>
          <ul>
            <li>Solo por username exacto.</li>
            <li>Una afiliacion por usuario.</li>
            <li>No se permite auto-afiliacion.</li>
          </ul>
        </section>

        <Link href='/dashboard' className={styles.back}>
          Volver al dashboard
        </Link>
      </div>
    </main>
  )
}

