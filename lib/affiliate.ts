import type { SupabaseClient } from '@supabase/supabase-js'

export type AffiliateActionCode =
  | 'OK'
  | 'USER_NOT_FOUND'
  | 'CANNOT_SELF_AFFILIATE'
  | 'ALREADY_AFFILIATED'
  | 'NOT_AUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT'
  | 'SYSTEM_ERROR'

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAffiliateRpcCode(value: unknown): AffiliateActionCode | null {
  const text = toText(value)
  if (text === 'OK') return 'OK'
  if (text === 'USER_NOT_FOUND') return 'USER_NOT_FOUND'
  if (text === 'CANNOT_SELF_AFFILIATE') return 'CANNOT_SELF_AFFILIATE'
  if (text === 'ALREADY_AFFILIATED') return 'ALREADY_AFFILIATED'
  if (text === 'NOT_AUTHENTICATED') return 'NOT_AUTHENTICATED'
  return null
}

function isLikelySchemaError(messageRaw: string) {
  const message = messageRaw.toLowerCase()
  return (
    message.includes('does not exist') ||
    message.includes('does not have') ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('unknown relation')
  )
}

function isDuplicateError(messageRaw: string) {
  const message = messageRaw.toLowerCase()
  return message.includes('duplicate') || message.includes('unique')
}

function isPermissionError(messageRaw: string) {
  const message = messageRaw.toLowerCase()
  return (
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('not allowed')
  )
}

export async function affiliateUserByUsernameAction(params: {
  supabase: SupabaseClient
  referrerUserId: string
  referrerUsername?: string
  targetUsername: string
}): Promise<{ code: AffiliateActionCode; debugMessage?: string }> {
  const rawTarget = params.targetUsername.trim()
  const normalizedTarget = rawTarget.replace(/^@+/, '').trim()
  const usernameCandidates = Array.from(new Set([rawTarget, normalizedTarget].filter(Boolean)))
  const referrerUsername = toText(params.referrerUsername).replace(/^@+/, '').trim()
  if (usernameCandidates.length === 0 || !params.referrerUserId) return { code: 'INVALID_INPUT' }

  let latestMessage = ''
  let seenPermissionError = false
  let targetResolvedUsername = normalizedTarget

  for (const candidate of usernameCandidates) {
    const rpcResponse = await params.supabase.rpc('affiliate_user_by_username', {
      target_username: candidate,
    })

    if (!rpcResponse.error) {
      const rpcCode = normalizeAffiliateRpcCode(rpcResponse.data)
      if (
        rpcCode === 'OK' ||
        rpcCode === 'CANNOT_SELF_AFFILIATE' ||
        rpcCode === 'ALREADY_AFFILIATED' ||
        rpcCode === 'NOT_AUTHENTICATED'
      ) {
        return { code: rpcCode }
      }
      // Si el RPC devuelve USER_NOT_FOUND intentamos con otros candidatos
      // y luego usamos fallback de lectura directa.
      continue
    }

    latestMessage = rpcResponse.error.message
    if (isPermissionError(rpcResponse.error.message)) {
      seenPermissionError = true
    }
  }

  let targetId = ''
  let targetReferredBy = ''
  let hasReferredByColumn = false

  const targetLookupVariants = [
    'id, username, referred_by, is_approved',
    'id, username, is_approved',
    'id, username',
  ]

  for (const candidate of usernameCandidates) {
    for (const selectExpr of targetLookupVariants) {
      const { data, error } = await params.supabase
        .from('profiles')
        .select(selectExpr)
        .eq('username', candidate)
        .limit(1)

      if (error) {
        latestMessage = error.message
        if (isLikelySchemaError(error.message)) continue
        if (isPermissionError(error.message)) seenPermissionError = true
        continue
      }

      const rows = Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []
      const row = rows[0]
      if (!row) continue

      targetId = toText(row.id)
      targetResolvedUsername = toText(row.username) || targetResolvedUsername
      targetReferredBy = toText(row.referred_by)
      hasReferredByColumn = Object.prototype.hasOwnProperty.call(row, 'referred_by')
      break
    }
    if (targetId) break
  }

  if (!targetId) {
    for (const candidate of usernameCandidates) {
      const { data, error } = await params.supabase
        .from('profiles')
        .select('id, username, referred_by')
        .ilike('username', candidate)
        .limit(1)

      if (!error) {
        const rows = Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []
        const row = rows[0]
        if (row) {
          targetId = toText(row.id)
          targetResolvedUsername = toText(row.username) || targetResolvedUsername
          targetReferredBy = toText(row.referred_by)
          hasReferredByColumn = Object.prototype.hasOwnProperty.call(row, 'referred_by')
          break
        }
      } else {
        latestMessage = error.message
        if (isPermissionError(error.message)) seenPermissionError = true
      }
    }
  }

  if (!targetId) return { code: 'USER_NOT_FOUND', debugMessage: latestMessage || 'target_not_found' }
  if (targetId === params.referrerUserId) return { code: 'CANNOT_SELF_AFFILIATE' }
  if (targetReferredBy) return { code: 'ALREADY_AFFILIATED' }

  if (hasReferredByColumn) {
    const updatePayloads: Array<Record<string, unknown>> = [
      { referred_by: params.referrerUserId, is_approved: true },
      { referred_by: params.referrerUserId },
    ]

    for (const payload of updatePayloads) {
      const { data, error } = await params.supabase
        .from('profiles')
        .update(payload)
        .eq('id', targetId)
        .is('referred_by', null)
        .select('id')
        .limit(1)

      if (!error && Array.isArray(data) && data.length > 0) {
        return { code: 'OK' }
      }

      if (error) {
        latestMessage = error.message
        if (isDuplicateError(error.message)) return { code: 'ALREADY_AFFILIATED' }
        if (isPermissionError(error.message)) seenPermissionError = true
        if (isLikelySchemaError(error.message)) continue
      }
    }

    const check = await params.supabase.from('profiles').select('referred_by').eq('id', targetId).maybeSingle()
    if (!check.error && toText((check.data as Record<string, unknown> | null)?.referred_by)) {
      return { code: 'ALREADY_AFFILIATED' }
    }
  }

  const now = new Date().toISOString()
  const insertPlans: Array<{ table: string; payloads: Array<Record<string, unknown>> }> = [
    {
      table: 'user_affiliations',
      payloads: [
        {
          referrer_user_id: params.referrerUserId,
          referred_user_id: targetId,
          referrer_username: referrerUsername || null,
          referred_username: targetResolvedUsername || null,
          created_at: now,
        },
        {
          referrer_user_id: params.referrerUserId,
          referred_user_id: targetId,
          referred_username: targetResolvedUsername || null,
          created_at: now,
        },
        { referrer_user_id: params.referrerUserId, referred_user_id: targetId, created_at: now },
        { referrer_id: params.referrerUserId, referred_id: targetId, created_at: now },
      ],
    },
    {
      table: 'affiliations',
      payloads: [
        {
          referrer_user_id: params.referrerUserId,
          referred_user_id: targetId,
          referrer_username: referrerUsername || null,
          referred_username: targetResolvedUsername || null,
          created_at: now,
        },
        {
          referrer_user_id: params.referrerUserId,
          referred_user_id: targetId,
          referred_username: targetResolvedUsername || null,
          created_at: now,
        },
        { referrer_user_id: params.referrerUserId, referred_user_id: targetId, created_at: now },
        { referrer_id: params.referrerUserId, referred_id: targetId, created_at: now },
      ],
    },
    {
      table: 'referrals',
      payloads: [
        {
          referrer_user_id: params.referrerUserId,
          referred_user_id: targetId,
          referrer_username: referrerUsername || null,
          referred_username: targetResolvedUsername || null,
          created_at: now,
        },
        {
          referrer_user_id: params.referrerUserId,
          referred_user_id: targetId,
          referred_username: targetResolvedUsername || null,
          created_at: now,
        },
        { referrer_user_id: params.referrerUserId, referred_user_id: targetId, created_at: now },
        { referrer_id: params.referrerUserId, referred_id: targetId, created_at: now },
      ],
    },
  ]

  for (const plan of insertPlans) {
    for (const payload of plan.payloads) {
      const { error } = await params.supabase.from(plan.table).insert(payload)
      if (!error) {
        if (hasReferredByColumn) {
          await params.supabase
            .from('profiles')
            .update({ referred_by: params.referrerUserId })
            .eq('id', targetId)
            .is('referred_by', null)
        }
        return { code: 'OK' }
      }

      latestMessage = error.message
      if (isDuplicateError(error.message)) return { code: 'ALREADY_AFFILIATED' }
      if (isLikelySchemaError(error.message)) continue
      if (isPermissionError(error.message)) {
        seenPermissionError = true
        continue
      }
    }
  }

  if (seenPermissionError) return { code: 'PERMISSION_DENIED', debugMessage: latestMessage || 'permission_denied' }
  return { code: 'SYSTEM_ERROR', debugMessage: latestMessage || 'affiliate_unknown_error' }
}
