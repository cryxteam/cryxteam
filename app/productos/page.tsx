'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import styles from './productos.module.css'

type ProfileRow = {
  username: string
  is_approved: boolean
  role: string
  balance: number
}

type ViewerMode = 'guest' | 'affiliate'

type CategoryKey = 'all' | 'streaming' | 'music' | 'gaming' | 'software' | 'other'

type ExtraRequiredField = {
  key: string
  label: string
  placeholder: string
  required: boolean
}

type ProductNameFilter = {
  id: string
  name: string
  keyword: string
  imageUrl: string
  sortOrder: number
}

const IGNORED_EXTRA_FIELD_KEYS = new Set([
  'fields',
  'field',
  'extra_fields',
  'extra_required_fields',
  'profiles_per_account',
  'profile_per_account',
  'profilesperaccount',
  'profileperaccount',
  'perfiles_por_cuenta',
  'perfilesporcuenta',
  'profiles',
  'perfiles',
  'slot_capacity',
  'slots',
  'stock',
])

const IGNORED_EXTRA_FIELD_COMPACT_KEYS = new Set(
  Array.from(IGNORED_EXTRA_FIELD_KEYS).map(key => key.replace(/_/g, ''))
)

type Product = {
  id: number
  name: string
  logo: string
  stock: number
  summary: string
  durationDays: number | null
  priceGuest: number
  priceAffiliate: number
  renewalPrice: number | null
  providerId: string
  providerName: string
  providerAvatarUrl: string
  deliveryMode: string
  accountType: string
  renewable: boolean
  extraRequiredFields: ExtraRequiredField[]
  isActive: boolean
  isDemo: boolean
}

type OrderSignalRow = {
  product_id: number | string | null
  buyer_id: string | null
  status: string | null
}

type BrandLogo = {
  id: string
  src: string
  alt: string
  tone: 'white' | 'silver'
}

const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: '\u2728 Todo' },
  { key: 'streaming', label: '\u{1F4FA} Cuentas streaming' },
  { key: 'music', label: '\u{1F3B5} Musica y apps' },
  { key: 'gaming', label: '\u{1F3AE} Gaming' },
  { key: 'software', label: '\u{1F9E0} Software / IA' },
  { key: 'other', label: '\u{1F9E9} Otros' },
]

const BRAND_LOGOS: BrandLogo[] = [
  { id: 'prime', src: '/Logos/amazon-prime-video-1.svg', alt: 'Prime Video', tone: 'silver' },
  { id: 'spotify', src: '/Logos/spotify-logo.svg', alt: 'Spotify', tone: 'white' },
  { id: 'tidal', src: '/Logos/tidal-1.svg', alt: 'Tidal', tone: 'silver' },
  { id: 'apple', src: '/Logos/apple-music-3.svg', alt: 'Apple Music', tone: 'white' },
  { id: 'hbo', src: '/Logos/hbo-max-svgrepo-com.svg', alt: 'HBO Max', tone: 'white' },
  { id: 'hulu', src: '/Logos/hulu-2.svg', alt: 'Hulu', tone: 'silver' },
  { id: 'netflix', src: '/Logos/netflix-3.svg', alt: 'Netflix', tone: 'white' },
  { id: 'paramount', src: '/Logos/paramount-2.svg', alt: 'Paramount+', tone: 'white' },
  { id: 'rockstar', src: '/Logos/rockstar-games.svg', alt: 'Rockstar Games', tone: 'silver' },
]
const MARQUEE_LOGOS: BrandLogo[] = [...BRAND_LOGOS, ...BRAND_LOGOS, ...BRAND_LOGOS]

function formatPrice(value: number) {
  return `S/ ${value.toFixed(2)}`
}

function detectCategory(name: string): CategoryKey {
  const normalized = name.toLowerCase()

  if (
    normalized.includes('netflix') ||
    normalized.includes('disney') ||
    normalized.includes('hbo') ||
    normalized.includes('prime') ||
    normalized.includes('youtube') ||
    normalized.includes('iptv') ||
    normalized.includes('viki') ||
    normalized.includes('hulu')
  ) {
    return 'streaming'
  }

  if (
    normalized.includes('spotify') ||
    normalized.includes('apple') ||
    normalized.includes('music') ||
    normalized.includes('tidal')
  ) {
    return 'music'
  }

  if (
    normalized.includes('xbox') ||
    normalized.includes('playstation') ||
    normalized.includes('steam') ||
    normalized.includes('game')
  ) {
    return 'gaming'
  }

  if (
    normalized.includes('canva') ||
    normalized.includes('adobe') ||
    normalized.includes('chatgpt') ||
    normalized.includes('openai') ||
    normalized.includes('perplexity') ||
    normalized.includes('office') ||
    normalized.includes('software') ||
    normalized.includes('licencia')
  ) {
    return 'software'
  }

  return 'other'
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function guessLogoFromName(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes('netflix')) return '/particles/netflix.png'
  if (normalized.includes('spotify')) return '/particles/spotify.png'
  if (normalized.includes('youtube')) return '/particles/youtube.png'
  if (normalized.includes('xbox')) return '/particles/xbox.png'
  if (normalized.includes('playstation') || normalized.includes('ps')) {
    return '/particles/playstation.png'
  }
  if (normalized.includes('steam')) return '/particles/steam.png'
  if (normalized.includes('apple')) return '/particles/apple-music.png'
  return '/logo.png'
}

function resolveLogo(name: string, value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return guessLogoFromName(name)
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }

  if (value.startsWith('particles/')) {
    return `/${value}`
  }

  return `/${value}`
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const cleaned = value.trim()
    return cleaned.length > 0 ? cleaned : fallback
  }
  return fallback
}

function toIdText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const cleaned = value.trim()
    return cleaned.length > 0 ? cleaned : fallback
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.floor(value))
  }
  return fallback
}

function toFieldKey(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return cleaned || fallback
}

function shouldIgnoreExtraField(keyRaw: string, labelRaw = '') {
  const key = toFieldKey(keyRaw, '')
  const label = toFieldKey(labelRaw, '')
  if (!key && !label) return true

  const candidates = [key, label].filter(Boolean)
  return candidates.some(candidate => {
    if (IGNORED_EXTRA_FIELD_KEYS.has(candidate)) return true
    const compact = candidate.replace(/_/g, '')
    if (IGNORED_EXTRA_FIELD_COMPACT_KEYS.has(compact)) return true
    return (
      compact.includes('profilesperaccount') ||
      compact.includes('profileperaccount') ||
      compact.includes('perfilesporcuenta')
    )
  })
}

function toLabelFromKey(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
}

function parseExtraRequiredFields(value: unknown): ExtraRequiredField[] {
  if (value === null || value === undefined) return []

  let raw: unknown = value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.length === 0) return []
    try {
      raw = JSON.parse(trimmed) as unknown
    } catch {
      const asList = trimmed
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
      return asList
        .map((item, index) => {
          const key = toFieldKey(item, `extra_${index + 1}`)
          if (shouldIgnoreExtraField(key, item)) return null
          return {
            key,
            label: toLabelFromKey(key),
            placeholder: '',
            required: false,
          }
        })
        .filter((item): item is ExtraRequiredField => Boolean(item))
    }
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        if (typeof item === 'string') {
          const key = toFieldKey(item, `extra_${index + 1}`)
          if (shouldIgnoreExtraField(key, item)) return null
          return {
            key,
            label: toLabelFromKey(key),
            placeholder: '',
            required: false,
          }
        }

        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>
          const base = toText(
            record.key ?? record.name ?? record.id ?? record.field,
            `extra_${index + 1}`
          )
          const key = toFieldKey(base, `extra_${index + 1}`)
          const label = toText(record.label, toLabelFromKey(key))
          if (shouldIgnoreExtraField(key, label)) return null
          return {
            key,
            label,
            placeholder: toText(record.placeholder),
            required: Boolean(record.required),
          }
        }

        return null
      })
      .filter((item): item is ExtraRequiredField => Boolean(item))
  }

  if (typeof raw === 'object' && raw !== null) {
    const rawRecord = raw as Record<string, unknown>
    const nestedFieldsCandidate =
      rawRecord.fields ??
      rawRecord.extra_fields ??
      rawRecord.extra_required_fields ??
      rawRecord.campos ??
      rawRecord.campos_extra

    if (nestedFieldsCandidate !== undefined) {
      const nestedParsed = parseExtraRequiredFields(nestedFieldsCandidate)
      if (nestedParsed.length > 0) {
        return nestedParsed
      }
    }

    return Object.entries(raw as Record<string, unknown>)
      .map(([key, item]) => {
        const safeKey = toFieldKey(key, 'extra')
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>
          const label = toText(record.label, toLabelFromKey(safeKey))
          if (shouldIgnoreExtraField(safeKey, label)) return null
          return {
            key: safeKey,
            label,
            placeholder: toText(record.placeholder),
            required: Boolean(record.required),
          }
        }

        const label = toText(item, toLabelFromKey(safeKey))
        if (shouldIgnoreExtraField(safeKey, label)) return null
        return {
          key: safeKey,
          label,
          placeholder: '',
          required: false,
        }
      })
      .filter((item): item is ExtraRequiredField => Boolean(item))
  }

  return []
}

function formatDeliveryMode(modeRaw: string) {
  const mode = modeRaw.trim().toLowerCase()
  if (mode === 'instant' || mode === 'inmediata') return 'Inmediata'
  if (mode === 'on_demand' || mode === 'a_pedido' || mode === 'a pedido') return 'A pedido'
  return modeRaw || '-'
}

function isOnDemandDeliveryMode(modeRaw: string) {
  const mode = modeRaw.trim().toLowerCase()
  return mode === 'on_demand' || mode === 'a_pedido' || mode === 'a pedido'
}

function isProfileAccountType(typeRaw: string) {
  const type = typeRaw.trim().toLowerCase()
  return (
    type === 'profiles' ||
    type === 'perfiles' ||
    type === 'profile' ||
    type === 'perfil' ||
    type === 'profile_slots'
  )
}

function formatAccountType(typeRaw: string) {
  const type = typeRaw.trim().toLowerCase()
  if (type === 'full_account' || type === 'cuenta_completa') return 'Cuenta completa'
  if (isProfileAccountType(type)) return 'Perfil'
  return typeRaw || '-'
}

function getAccountTypeIcon(typeRaw: string) {
  const type = typeRaw.trim().toLowerCase()
  if (type === 'full_account' || type === 'cuenta_completa') return '\u{1F608}'
  if (isProfileAccountType(type)) return '\u{1FABB}'
  return '\u{1F6CD}\uFE0F'
}

function formatRenewable(value: boolean) {
  return value ? 'Renovable' : 'No renovable'
}

function formatDuration(days: number | null) {
  if (days === null) return 'Sin limite'
  if (days <= 1) return '1 dia'
  return `${days} dias`
}

function normalizeOrderStatus(statusRaw: string) {
  const value = statusRaw.trim().toLowerCase()
  if (!value) return 'pending'
  if (value === 'pendiente') return 'pending'
  if (value === 'en_proceso' || value === 'in process') return 'in_progress'
  if (value === 'pagado') return 'paid'
  if (value === 'entregado') return 'delivered'
  if (value === 'resuelto') return 'resolved'
  if (value === 'cancelado') return 'cancelled'
  return value
}

function isPaidLikeOrderStatus(statusRaw: string) {
  const status = normalizeOrderStatus(statusRaw)
  return status === 'paid' || status === 'delivered' || status === 'resolved' || status === 'closed'
}

function isTrendOrderStatus(statusRaw: string) {
  const status = normalizeOrderStatus(statusRaw)
  if (status === 'cancelled' || status === 'rejected' || status === 'failed') return false
  return (
    status === 'pending' ||
    status === 'in_progress' ||
    status === 'paid' ||
    status === 'delivered' ||
    status === 'resolved' ||
    status === 'closed'
  )
}

function mapPurchaseError(rawMessage: string) {
  const code = rawMessage.trim().toUpperCase()
  if (code === 'NO_AUTH') return 'Debes iniciar sesion para comprar.'
  if (code === 'NOT_APPROVED') return 'Tu cuenta aun no esta aprobada.'
  if (code === 'AFFILIATE_REQUIRED') return 'Tu cuenta no tiene afiliacion activa para comprar.'
  if (code === 'SELF_PURCHASE_NOT_ALLOWED') return 'No puedes comprar tu propio producto.'
  if (code === 'PRODUCT_NOT_FOUND') return 'El producto ya no existe o no esta disponible.'
  if (code === 'PRODUCT_INACTIVE') return 'El producto no esta activo.'
  if (code === 'OUT_OF_STOCK') return 'No hay stock disponible en este momento.'
  if (code === 'INSUFFICIENT_BALANCE') return 'Saldo insuficiente para completar la compra.'
  if (rawMessage.toLowerCase().includes('relation "public.wallets" does not exist')) {
    return 'Falta actualizar la funcion purchase_product en Supabase (wallets ya no existe).'
  }
  return `No se pudo completar la compra (${rawMessage}).`
}

function getDeterministicShuffleScore(id: number, seed: number) {
  const value = Math.sin(id * 12.9898 + seed * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function normalizeProducts(
  rows: Record<string, unknown>[],
  providerById: Map<string, { name: string; avatarUrl: string }>
): Product[] {
  return rows
    .filter(row => row.active !== false && row.is_active !== false)
    .map((row, index) => {
      const name =
        String(row.name ?? row.product_name ?? row.platform ?? row.title ?? '').trim() ||
        `Producto ${index + 1}`
      const stock = Math.max(
        0,
        Math.floor(toNumber(row.stock_available ?? row.stock ?? row.quantity ?? row.available_stock, 0))
      )

      const priceGuest = toNumber(
        row.price_guest ?? row.guest_price ?? row.public_price ?? row.price,
        0
      )
      const priceAffiliate = toNumber(
        row.price_affiliate ??
          row.price_logged ??
          row.price_login ??
          row.login_price ??
          row.affiliate_price ??
          row.price,
        priceGuest
      )
      const renewalPrice = toNullableNumber(
        row.renewal_price ??
          row.price_renewal ??
          row.renewal_price_affiliate ??
          row.price_renovation ??
          row.renewalPrice
      )

      const providerId = toText(row.provider_id, 'unknown-provider')
      const providerInfo = providerById.get(providerId)
      const providerName = providerInfo?.name ?? 'Proveedor'
      const providerAvatarUrl = providerInfo?.avatarUrl ?? ''
      const normalizedId = Math.max(1, Math.floor(toNumber(row.id ?? row.product_id, index + 1)))
      const durationDays = toNullableNumber(
        row.duration_days ?? row.subscription_days ?? row.durationDays ?? row.plan_days
      )

      return {
        id: normalizedId,
        name,
        logo: resolveLogo(
          name,
          row.logo_url ?? row.image_url ?? row.logo ?? row.image ?? row.icon
        ),
        stock,
        summary: toText(
          row.description ?? row.cycle ?? row.plan ?? row.duration,
          'Producto digital'
        ),
        durationDays: durationDays === null ? null : Math.max(1, Math.floor(durationDays)),
        priceGuest,
        priceAffiliate,
        renewalPrice,
        providerId,
        providerName,
        providerAvatarUrl,
        deliveryMode: toText(row.delivery_mode, 'instant'),
        accountType: toText(row.account_type, 'profiles'),
        renewable: Boolean(row.renewable),
        extraRequiredFields: parseExtraRequiredFields(row.extra_required_fields),
        isActive: row.is_active !== false && row.active !== false,
        isDemo: false,
      }
    })
}

export default function ProductsPage() {
  const pathname = usePathname()
  const [viewerMode, setViewerMode] = useState<ViewerMode>('guest')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAffiliateEnabled, setIsAffiliateEnabled] = useState(false)
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('q')?.trim() ?? ''
  })
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountLabel, setAccountLabel] = useState('Ingresa')
  const [accountHref, setAccountHref] = useState('/login')
  const [activePurchaseId, setActivePurchaseId] = useState<number | null>(null)
  const [purchaseCustomerName, setPurchaseCustomerName] = useState('')
  const [purchaseCustomerPhone, setPurchaseCustomerPhone] = useState('')
  const [purchaseExtraValues, setPurchaseExtraValues] = useState<Record<string, string>>({})
  const [purchaseMsg, setPurchaseMsg] = useState('')
  const [purchaseError, setPurchaseError] = useState('')
  const [buyingProductId, setBuyingProductId] = useState<number | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [nameFilters, setNameFilters] = useState<ProductNameFilter[]>([])
  const [activeNameFilterId, setActiveNameFilterId] = useState<string | null>(null)
  const [catalogReloadSeq, setCatalogReloadSeq] = useState(0)
  const [trendOrdersByProduct, setTrendOrdersByProduct] = useState<Record<number, number>>({})
  const [viewerPaidProductIds, setViewerPaidProductIds] = useState<number[]>([])
  const [allProductsShuffleSeed, setAllProductsShuffleSeed] = useState(1)
  const [catalogViewportWidth, setCatalogViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth
  )
  const [catalogPage, setCatalogPage] = useState(1)

  useEffect(() => {
    let mounted = true
    const appendMsg = (text: string) => {
      setMsg(previous => (previous ? `${previous} ${text}` : text))
    }

    const id = requestAnimationFrame(() => {
      void (async () => {
        const loadViewer = async () => {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser()

          if (!mounted) return
          if (error || !user) {
            setIsLoggedIn(false)
            setCurrentUserId(null)
            setIsAffiliateEnabled(false)
            setViewerMode('guest')
            setAccountLabel('Ingresa')
            setAccountHref('/login')
            return
          }

          setIsLoggedIn(true)
          setCurrentUserId(user.id)

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, is_approved, role, balance')
            .eq('id', user.id)
            .maybeSingle<ProfileRow>()

          if (!mounted) return
          if (profileError || !profile) {
            setViewerMode('guest')
            setIsAffiliateEnabled(false)
            setAccountLabel('Mi cuenta')
            setAccountHref('/dashboard')
            appendMsg('No se pudo cargar tu perfil. Mostrando precios de visitante.')
            return
          }

          if (!profile.is_approved) {
            await supabase.auth.signOut()
            if (!mounted) return
            setIsLoggedIn(false)
            setCurrentUserId(null)
            setIsAffiliateEnabled(false)
            setViewerMode('guest')
            setAccountLabel('Ingresa')
            setAccountHref('/login')
            appendMsg('Tu cuenta aun no esta aprobada. Mostrando precios de visitante.')
            return
          }

          const [{ data: affiliateEnabled }, { data: providerOrOwner }] = await Promise.all([
            supabase.rpc('is_affiliate_enabled'),
            supabase.rpc('is_provider_or_owner'),
          ])

          if (!mounted) return

          const canUseAffiliatePrices = Boolean(affiliateEnabled) || Boolean(providerOrOwner)
          setAccountLabel(profile.username)
          setAccountHref('/dashboard')
          setIsAffiliateEnabled(canUseAffiliatePrices)
          setViewerMode(canUseAffiliatePrices ? 'affiliate' : 'guest')

          if (!canUseAffiliatePrices) {
            appendMsg('Tu cuenta esta logueada, pero sin afiliacion activa. Se muestra precio publico.')
          }
        }

        const loadProducts = async () => {
          const { data: rowsRaw, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })

          if (!mounted) return

          if (error) {
            setProducts([])
            appendMsg('No se pudo cargar productos desde DB.')
            return
          }

          const rows = (rowsRaw ?? []) as Record<string, unknown>[]

          if (rows.length === 0) {
            setProducts([])
            appendMsg('No hay productos cargados en DB.')
            return
          }

          const providerIds = Array.from(
            new Set(
              rows
                .map(row => toText(row.provider_id))
                .filter(value => value.length > 0)
            )
          )

          const providerById = new Map<string, { name: string; avatarUrl: string }>()
          if (providerIds.length > 0) {
            const { data: providerRows, error: providerError } = await supabase.rpc(
              'get_public_profile_cards',
              { p_profile_ids: providerIds }
            )

            if (!providerError && Array.isArray(providerRows)) {
              for (const provider of providerRows as Array<Record<string, unknown>>) {
                const providerId = toText(provider.id)
                if (!providerId) continue
                providerById.set(providerId, {
                  name: toText(provider.username, 'Proveedor'),
                  avatarUrl: toText(provider.provider_avatar_url),
                })
              }
            } else {
              const { data: fallbackRows } = await supabase
                .from('profiles')
                .select('id, username, provider_avatar_url')
                .in('id', providerIds)

              for (const provider of (fallbackRows ?? []) as Array<Record<string, unknown>>) {
                const providerId = toText(provider.id)
                if (!providerId) continue
                providerById.set(providerId, {
                  name: toText(provider.username, 'Proveedor'),
                  avatarUrl: toText(provider.provider_avatar_url),
                })
              }
            }
          }

          setProducts(normalizeProducts(rows, providerById))
        }

        const loadNameFilters = async () => {
          const { data, error } = await supabase
            .from('product_name_filters')
            .select('id, name, keyword, image_url, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true })

          if (!mounted) return
          if (error || !Array.isArray(data)) {
            setNameFilters([])
            return
          }

          const mapped = (data as Record<string, unknown>[])
            .map((row, index) => {
              const id = toIdText(row.id, `logo-${index + 1}`)
              const name = toText(row.name, 'Plataforma')
              const keyword = toText(row.keyword, name).toLowerCase()
              const imageUrl = toText(row.image_url, '/logo.png')
              const sortOrder = toNumber(row.sort_order, index)
              if (!id || !keyword || !imageUrl) return null
              return {
                id,
                name,
                keyword,
                imageUrl,
                sortOrder,
              } satisfies ProductNameFilter
            })
            .filter((item): item is ProductNameFilter => Boolean(item))
            .sort((a, b) => a.sortOrder - b.sortOrder)

          setNameFilters(mapped)
        }

        await Promise.all([loadViewer(), loadProducts(), loadNameFilters()])
        if (mounted) setIsLoading(false)
      })()
    })

    return () => {
      mounted = false
      cancelAnimationFrame(id)
    }
  }, [catalogReloadSeq])

  useEffect(() => {
    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (reloadTimer) return
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        setCatalogReloadSeq(previous => previous + 1)
      }, 260)
    }

    const channel = supabase.channel('productos-live')
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_name_filters' }, scheduleReload)
      .subscribe()

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadOrderSignals = async () => {
      const nextTrendCounts: Record<number, number> = {}
      const trendSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: trendRowsRaw, error: trendError } = await supabase
        .from('orders')
        .select('product_id, status, created_at')
        .gte('created_at', trendSince)
        .order('created_at', { ascending: false })
        .limit(2600)

      if (!mounted) return

      if (!trendError && Array.isArray(trendRowsRaw)) {
        for (const row of trendRowsRaw as Array<Record<string, unknown>>) {
          const productId = Math.floor(toNumber(row.product_id, 0))
          const status = toText(row.status)
          if (productId <= 0 || !isTrendOrderStatus(status)) continue
          nextTrendCounts[productId] = (nextTrendCounts[productId] ?? 0) + 1
        }
      }

      setTrendOrdersByProduct(nextTrendCounts)

      if (!currentUserId) {
        setViewerPaidProductIds([])
        return
      }

      const { data: buyerRowsRaw, error: buyerError } = await supabase
        .from('orders')
        .select('product_id, buyer_id, status, created_at')
        .eq('buyer_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(900)

      if (!mounted) return

      if (buyerError || !Array.isArray(buyerRowsRaw)) {
        setViewerPaidProductIds([])
        return
      }

      const paidIds: number[] = []
      const seen = new Set<number>()
      for (const row of buyerRowsRaw as OrderSignalRow[]) {
        const productId = Math.floor(toNumber(row.product_id, 0))
        const status = toText(row.status)
        if (productId <= 0 || !isPaidLikeOrderStatus(status) || seen.has(productId)) continue
        seen.add(productId)
        paidIds.push(productId)
      }

      setViewerPaidProductIds(paidIds)
    }

    void loadOrderSignals()

    return () => {
      mounted = false
    }
  }, [catalogReloadSeq, currentUserId])

  function startPurchase(product: Product) {
    if (activePurchaseId === product.id) {
      setActivePurchaseId(null)
      setPurchaseCustomerName('')
      setPurchaseCustomerPhone('')
      setPurchaseExtraValues({})
      setPurchaseError('')
      setPurchaseMsg('')
      return
    }

    const defaults: Record<string, string> = {}
    for (const field of product.extraRequiredFields) {
      defaults[field.key] = ''
    }

    setActivePurchaseId(product.id)
    setPurchaseCustomerName('')
    setPurchaseCustomerPhone('')
    setPurchaseExtraValues(defaults)
    setPurchaseMsg('')
    setPurchaseError('')
  }

  async function handlePurchase(product: Product) {
    if (viewerMode !== 'affiliate') {
      setPurchaseError('Tu cuenta no puede comprar en este momento.')
      return
    }

    if (currentUserId && product.providerId === currentUserId) {
      setPurchaseError('No puedes comprar tu propio producto.')
      return
    }

    const isOnDemand = isOnDemandDeliveryMode(product.deliveryMode)
    if (!isOnDemand && product.stock <= 0) {
      setPurchaseError('Producto sin stock disponible.')
      return
    }

    const extraPayload: Record<string, string> = {}
    for (const field of product.extraRequiredFields) {
      const value = (purchaseExtraValues[field.key] ?? '').trim()
      if (field.required && value.length === 0) {
        setPurchaseError(`Completa el campo obligatorio: ${field.label}.`)
        return
      }
      if (value.length > 0) {
        extraPayload[field.key] = value
      }
    }

    setBuyingProductId(product.id)
    setPurchaseError('')
    setPurchaseMsg('')

    const payload: Record<string, unknown> = {
      p_product_id: product.id,
    }

    if (Object.keys(extraPayload).length > 0) {
      payload.p_customer_extra = extraPayload
    }

    const customerName = purchaseCustomerName.trim()
    const customerPhone = purchaseCustomerPhone.trim()
    if (customerName.length > 0) payload.p_customer_name = customerName
    if (customerPhone.length > 0) payload.p_customer_phone = customerPhone

    const { data, error } = await supabase.rpc('purchase_product', payload)

    if (error) {
      const rawCode = error.message.trim().toUpperCase()
      if (rawCode === 'OUT_OF_STOCK' && isOnDemand) {
        let { data: onDemandData, error: onDemandError } = await supabase.rpc(
          'purchase_on_demand_product',
          payload
        )

        const isCustomerExtraTypeError =
          onDemandError?.message
            ?.toLowerCase()
            .includes('customer_extra') &&
          onDemandError?.message
            ?.toLowerCase()
            .includes('is of type jsonb but expression is of type text')

        // Compat fix: some DBs still have purchase_on_demand_product with p_customer_extra as text.
        // Retry without the field so the purchase can proceed while DB function is corrected.
        if (onDemandError && isCustomerExtraTypeError) {
          const payloadWithoutExtra = { ...payload }
          delete payloadWithoutExtra.p_customer_extra
          ;({ data: onDemandData, error: onDemandError } = await supabase.rpc(
            'purchase_on_demand_product',
            payloadWithoutExtra
          ))
        }

        if (onDemandError) {
          setPurchaseError(
            `Producto A pedido, pero fallo el fallback en DB (purchase_on_demand_product). (${onDemandError.message})`
          )
          setBuyingProductId(null)
          return
        }

        const onDemandOrderId =
          typeof onDemandData === 'object' && onDemandData !== null
            ? toText((onDemandData as Record<string, unknown>).order_id)
            : ''

        setPurchaseMsg(
          onDemandOrderId
            ? `Solicitud A pedido creada. Pedido #${onDemandOrderId}.`
            : 'Solicitud A pedido creada correctamente.'
        )
        setBuyingProductId(null)
        setActivePurchaseId(null)
        return
      }
      setPurchaseError(mapPurchaseError(error.message))
      setBuyingProductId(null)
      return
    }

    const orderId =
      typeof data === 'object' && data !== null
        ? toText((data as Record<string, unknown>).order_id)
        : ''
    let successMessage = orderId
      ? `Compra creada correctamente. Pedido #${orderId}.`
      : 'Compra creada correctamente.'

    if (!isOnDemand && orderId) {
      const { error: settleError } = await supabase.rpc('settle_provider_commission', {
        p_order_id: orderId,
        p_credit_mode: 'adjust_only',
      })
      if (settleError) {
        successMessage += ` (Aviso: no se pudo liquidar saldo proveedor con comision: ${settleError.message})`
      }
    }

    setPurchaseMsg(successMessage)
    setProducts(previous =>
      previous.map(item =>
        item.id === product.id
          ? isOnDemandDeliveryMode(item.deliveryMode)
            ? item
            : { ...item, stock: Math.max(0, item.stock - 1) }
          : item
      )
    )
    setBuyingProductId(null)
    setActivePurchaseId(null)
  }

  function closePurchaseModal() {
    setActivePurchaseId(null)
    setPurchaseCustomerName('')
    setPurchaseCustomerPhone('')
    setPurchaseExtraValues({})
    setPurchaseError('')
    setPurchaseMsg('')
  }

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY || 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (activePurchaseId === null) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [activePurchaseId])

  useEffect(() => {
    const onResize = () => {
      setCatalogViewportWidth(window.innerWidth)
    }
    onResize()
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => b.stock - a.stock)
  }, [products])

  const productsById = useMemo(() => {
    return new Map<number, Product>(sortedProducts.map(item => [item.id, item]))
  }, [sortedProducts])

  const activeNameFilter = useMemo(
    () => nameFilters.find(item => item.id === activeNameFilterId) ?? null,
    [nameFilters, activeNameFilterId]
  )

  const trendingProducts = useMemo(() => {
    const hasRealTrendData = Object.values(trendOrdersByProduct).some(value => value > 0)
    const ranked = sortedProducts
      .map((item, index) => ({
        item,
        orders: trendOrdersByProduct[item.id] ?? 0,
        fallbackRank: index,
      }))
      .sort((a, b) => {
        if (hasRealTrendData) {
          return b.orders - a.orders || b.item.stock - a.item.stock || a.item.priceGuest - b.item.priceGuest
        }
        return b.item.stock - a.item.stock || a.item.priceGuest - b.item.priceGuest || a.fallbackRank - b.fallbackRank
      })

    return ranked.slice(0, 6)
  }, [sortedProducts, trendOrdersByProduct])

  const recommendationProducts = useMemo(() => {
    if (sortedProducts.length === 0) return []

    const purchasedSet = new Set(viewerPaidProductIds)
    const categoryAffinity = new Map<CategoryKey, number>()
    for (const productId of viewerPaidProductIds) {
      const product = productsById.get(productId)
      if (!product) continue
      const category = detectCategory(product.name)
      categoryAffinity.set(category, (categoryAffinity.get(category) ?? 0) + 1)
    }

    const orderedPreferredCategories = Array.from(categoryAffinity.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)
    const search = searchTerm.trim().toLowerCase()

    const ranked = sortedProducts
      .map((item, index) => {
        const category = detectCategory(item.name)
        const isOnDemand = isOnDemandDeliveryMode(item.deliveryMode)
        const inStockOrOnDemand = item.stock > 0 || isOnDemand
        const trendCount = trendOrdersByProduct[item.id] ?? 0
        const preferredIndex = orderedPreferredCategories.indexOf(category)

        let score = 0
        if (inStockOrOnDemand) score += 20
        if (item.renewable) score += 8
        if (trendCount > 0) score += Math.min(24, trendCount * 4)
        if (preferredIndex >= 0) score += Math.max(8, 26 - preferredIndex * 6)
        if (selectedCategory !== 'all' && category === selectedCategory) score += 14
        if (activeNameFilter && item.name.toLowerCase().includes(activeNameFilter.keyword.toLowerCase())) {
          score += 18
        }
        if (
          search.length > 0 &&
          (item.name.toLowerCase().includes(search) ||
            item.summary.toLowerCase().includes(search) ||
            item.providerName.toLowerCase().includes(search))
        ) {
          score += 12
        }
        if (purchasedSet.has(item.id)) score -= 22
        score += Math.max(0, 6 - index)

        return { item, score, trendCount, stock: item.stock }
      })
      .sort((a, b) => b.score - a.score || b.trendCount - a.trendCount || b.stock - a.stock)

    return ranked.slice(0, 5).map(entry => entry.item)
  }, [
    sortedProducts,
    viewerPaidProductIds,
    productsById,
    trendOrdersByProduct,
    selectedCategory,
    activeNameFilter,
    searchTerm,
  ])

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    const base = sortedProducts.filter(item => {
      const category = detectCategory(item.name)
      const categoryMatch = selectedCategory === 'all' || category === selectedCategory
      const nameFilterMatch =
        !activeNameFilter || item.name.toLowerCase().includes(activeNameFilter.keyword.toLowerCase())
      const searchMatch =
        search.length === 0 ||
        item.name.toLowerCase().includes(search) ||
        item.summary.toLowerCase().includes(search) ||
        item.providerName.toLowerCase().includes(search) ||
        formatDeliveryMode(item.deliveryMode).toLowerCase().includes(search) ||
        formatAccountType(item.accountType).toLowerCase().includes(search) ||
        formatDuration(item.durationDays).toLowerCase().includes(search)

      return categoryMatch && nameFilterMatch && searchMatch
    })

    if (selectedCategory !== 'all') return base
    return [...base].sort((left, right) => {
      const leftScore = getDeterministicShuffleScore(left.id, allProductsShuffleSeed)
      const rightScore = getDeterministicShuffleScore(right.id, allProductsShuffleSeed)
      return leftScore - rightScore
    })
  }, [sortedProducts, selectedCategory, searchTerm, activeNameFilter, allProductsShuffleSeed])

  const catalogColumns = useMemo(() => {
    if (catalogViewportWidth <= 860) return 2
    if (catalogViewportWidth <= 980) return 3
    return 4
  }, [catalogViewportWidth])

  const catalogPageSize = useMemo(() => Math.max(1, catalogColumns * 3), [catalogColumns])

  const catalogTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProducts.length / catalogPageSize)),
    [filteredProducts.length, catalogPageSize]
  )

  const paginatedProducts = useMemo(() => {
    const safePage = Math.max(1, Math.min(catalogPage, catalogTotalPages))
    const start = (safePage - 1) * catalogPageSize
    return filteredProducts.slice(start, start + catalogPageSize)
  }, [filteredProducts, catalogPage, catalogPageSize, catalogTotalPages])

  const activeCatalogPage = Math.max(1, Math.min(catalogPage, catalogTotalPages))

  const catalogPageNumbers = useMemo(() => {
    const visibleWindow = 5
    if (catalogTotalPages <= visibleWindow) {
      return Array.from({ length: catalogTotalPages }, (_, index) => index + 1)
    }

    const half = Math.floor(visibleWindow / 2)
    let start = Math.max(1, activeCatalogPage - half)
    let end = start + visibleWindow - 1
    if (end > catalogTotalPages) {
      end = catalogTotalPages
      start = end - visibleWindow + 1
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [activeCatalogPage, catalogTotalPages])

  const activePurchaseProduct = useMemo(() => {
    if (activePurchaseId === null) return null
    return products.find(item => item.id === activePurchaseId) ?? null
  }, [products, activePurchaseId])

  const canPurchase = viewerMode === 'affiliate'
  const priceLabel = canPurchase ? 'Precio distribuidor' : 'Precio publico'
  const sideOffset = Math.sin(scrollY / 170) * 104
  const navClass = (isActive: boolean, isAccount = false) =>
    `${styles.navLink} ${isActive ? styles.navActive : ''} ${isAccount ? styles.accountLink : ''}`.trim()
  const logoClass = (logo: BrandLogo) => {
    const toneClass = logo.tone === 'silver' ? styles.brandLogoSilver : styles.brandLogoWhite
    const customClass =
      logo.id === 'disney'
        ? styles.brandLogoDisney
        : logo.id === 'paramount'
          ? styles.brandLogoParamount
          : logo.id === 'rockstar'
            ? styles.brandLogoRockstar
            : logo.id === 'hbo'
              ? styles.brandLogoHbo
              : ''

    return `${styles.brandLogoImage} ${toneClass} ${customClass}`.trim()
  }

  const applyNameFilter = (filter: ProductNameFilter | null) => {
    if (filter === null) {
      setActiveNameFilterId(null)
      setSelectedCategory('all')
      setSearchTerm('')
      setCatalogPage(1)
      return
    }
    setSelectedCategory('all')
    setSearchTerm('')
    setCatalogPage(1)
    setActiveNameFilterId(previous => (previous === filter.id ? null : filter.id))
  }

  const applyCategoryFilter = (category: CategoryKey) => {
    if (category === 'all') {
      setAllProductsShuffleSeed(previous => ((previous + 7919) % 1000000) + 1)
    }
    setSelectedCategory(category)
    setActiveNameFilterId(null)
    setSearchTerm('')
    setCatalogPage(1)
  }

  const totalTrendOrders = useMemo(
    () => Object.values(trendOrdersByProduct).reduce((sum, value) => sum + Math.max(0, toNumber(value)), 0),
    [trendOrdersByProduct]
  )

  const focusProduct = (product: Product) => {
    setSelectedCategory('all')
    setActiveNameFilterId(null)
    setSearchTerm(product.name)
    setCatalogPage(1)
    window.setTimeout(() => {
      const target = document.getElementById(`catalog-product-${product.id}`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)
  }

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/inicio" className={styles.brand}>
          <Image src='/logo-mark.png' alt='CRYXTEAM' width={265} height={320} className={styles.brandLogo} />
          <span className={styles.brandText}>CRYXTEAM</span>
        </Link>

        <nav className={styles.quickNav}>
          <Link href='/inicio' className={navClass(pathname === '/inicio')}>
            Inicio
          </Link>
          <Link href='/productos' className={navClass(pathname === '/productos')}>
            Productos
          </Link>
          <Link href={accountHref} className={navClass(pathname === '/dashboard', true)}>
            {accountLabel}
          </Link>
        </nav>

        <button
          type='button'
          className={styles.menuToggle}
          onClick={() => setMenuOpen(v => !v)}
          aria-label='Menu'
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div className={styles.sideWords} aria-hidden='true'>
        <span
          className={styles.sideWordLeft}
          style={{ transform: `translateY(calc(-50% + ${sideOffset}px))` }}
        >
          OFERTAS
        </span>
        <span
          className={styles.sideWordRight}
          style={{ transform: `translateY(calc(-50% - ${sideOffset * 0.75}px))` }}
        >
          CRYXTEAM
        </span>
      </div>

      {menuOpen && (
        <div className={styles.menuPanel}>
          <Link href='/inicio' className={pathname === '/inicio' ? styles.navActive : ''} onClick={() => setMenuOpen(false)}>
            Inicio
          </Link>
          <Link href='/productos' className={pathname === '/productos' ? styles.navActive : ''} onClick={() => setMenuOpen(false)}>
            Productos
          </Link>
          <Link
            href={accountHref}
            className={`${styles.accountLinkMobile} ${pathname === '/dashboard' ? styles.navActive : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {accountLabel}
          </Link>
        </div>
      )}

      <section className={styles.contentShell}>
        {msg && <p className={styles.infoMessage}>{msg}</p>}
        {isLoading && <p className={styles.loading}>Cargando productos...</p>}

        <section className={styles.brandStrip} aria-label='Plataformas destacadas'>
          <div className={styles.brandMarquee}>
            <div className={styles.brandTrack}>
              {MARQUEE_LOGOS.map((logo, index) => (
                <span key={`${logo.src}-${index}`} className={styles.brandLogoChip}>
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={170}
                    height={50}
                    className={logoClass(logo)}
                  />
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.discoverLayout}>
          <article className={styles.trendingPanel}>
            <header className={styles.discoverHead}>
              <div>
                <h2>{'\u{1F525}'} Tendencias 24h</h2>
                <p>Lo mas pedido durante las ultimas 24 horas.</p>
              </div>
              <span className={styles.discoverCounter}>{totalTrendOrders} compras</span>
            </header>
            <div className={styles.trendingGrid}>
              {trendingProducts.map(({ item, orders }) => {
                const displayPrice = canPurchase ? item.priceAffiliate : item.priceGuest
                const trendLabel = orders > 0 ? `${orders} compras` : 'Sin compras'

                return (
                  <button
                    key={`trend-${item.id}`}
                    type='button'
                    className={styles.trendingCard}
                    onClick={() => focusProduct(item)}
                  >
                    <span className={styles.trendingImageWrap}>
                      <Image
                        src={item.logo}
                        alt={item.name}
                        width={320}
                        height={180}
                        sizes='(max-width: 980px) 100vw, 28vw'
                        quality={100}
                        className={styles.trendingImage}
                        draggable={false}
                        onContextMenu={event => event.preventDefault()}
                        onDragStart={event => event.preventDefault()}
                      />
                    </span>
                    <span className={styles.trendingBody}>
                      <strong>{item.name}</strong>
                      <small>
                        {formatAccountType(item.accountType)} | {formatDeliveryMode(item.deliveryMode)}
                      </small>
                      <span className={styles.trendingMeta}>
                        <em>{trendLabel}</em>
                        <b>{formatPrice(displayPrice)}</b>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </article>

          <aside className={styles.recommendPanel}>
            <header className={styles.discoverHead}>
              <div>
                <h2>{'\u{1F3AF}'} Te podria interesar</h2>
                <p>Recomendado segun tu actividad y lo que mas rota.</p>
              </div>
            </header>
            <ul className={styles.recommendList}>
              {recommendationProducts.map(item => {
                const displayPrice = canPurchase ? item.priceAffiliate : item.priceGuest
                const trendCount = trendOrdersByProduct[item.id] ?? 0
                const hint = trendCount > 0 ? `${trendCount} compras recientes` : 'Recomendado para ti'

                return (
                  <li key={`suggest-${item.id}`}>
                    <button
                      type='button'
                      className={styles.recommendButton}
                      onClick={() => focusProduct(item)}
                    >
                      <span className={styles.recommendThumb}>
                        <Image
                          src={item.logo}
                          alt={item.name}
                          width={52}
                          height={52}
                          sizes='52px'
                          quality={100}
                          draggable={false}
                          onContextMenu={event => event.preventDefault()}
                          onDragStart={event => event.preventDefault()}
                        />
                      </span>
                      <span className={styles.recommendBody}>
                        <strong>{item.name}</strong>
                        <small>{hint}</small>
                      </span>
                      <span className={styles.recommendPrice}>{formatPrice(displayPrice)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>
        </section>

        <section className={styles.searchSection}>
          <h2>{'\u{1F50E}'} Busca tu producto</h2>
          <p>
            {'\u{1F4B8}'} {priceLabel} visible para esta sesion.
            {isLoggedIn && !isAffiliateEnabled ? ' \u26A1 Activa afiliacion para poder comprar.' : ''}
          </p>
          <div className={styles.searchBox}>
            <input
              type='search'
              value={searchTerm}
              onChange={event => {
                setSearchTerm(event.target.value)
                setCatalogPage(1)
              }}
              placeholder='Busca un producto...'
              aria-label='Buscar productos'
            />
            <span>
              Buscar {'\u{1F50D}'}
            </span>
          </div>
        </section>

        <section className={styles.categoryRow}>
          {CATEGORY_OPTIONS.map(option => (
            <button
              key={option.key}
              type='button'
              className={selectedCategory === option.key ? styles.categoryActive : ''}
              onClick={() => applyCategoryFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </section>

        {nameFilters.length > 0 && (
          <section className={styles.platformFilterRow} aria-label='Filtrar por plataforma'>
            {nameFilters.map(filter => (
              <button
                key={filter.id}
                type='button'
                title={`Filtrar por ${filter.name}`}
                className={`${styles.platformFilterButton} ${
                  activeNameFilterId === filter.id ? styles.platformFilterActive : ''
                }`}
                onClick={() => applyNameFilter(filter)}
              >
                <span className={styles.platformFilterImageWrap}>
                  <Image
                    src={filter.imageUrl}
                    alt={filter.name}
                    width={78}
                    height={78}
                    quality={100}
                    unoptimized
                    sizes='78px'
                    className={styles.platformFilterImage}
                    draggable={false}
                    onContextMenu={event => event.preventDefault()}
                    onDragStart={event => event.preventDefault()}
                  />
                </span>
              </button>
            ))}
          </section>
        )}

        <section className={styles.grid}>
          {paginatedProducts.map(item => {
            const displayPrice = canPurchase ? item.priceAffiliate : item.priceGuest
            const isOpen = activePurchaseId === item.id
            const isBuying = buyingProductId === item.id
            const isOwnProduct = Boolean(currentUserId) && item.providerId === currentUserId
            const isOnDemand = isOnDemandDeliveryMode(item.deliveryMode)
            const isBlockedByStock = !isOnDemand && item.stock === 0
            const hasRenewalOverride =
              item.renewable &&
              item.renewalPrice !== null &&
              Math.abs(item.renewalPrice - displayPrice) > 0.009
            const providerInitial = item.providerName.trim().charAt(0).toUpperCase() || 'P'

            return (
              <article
                key={item.id}
                id={`catalog-product-${item.id}`}
                className={`${styles.card} ${item.stock === 0 ? styles.cardOut : ''}`}
              >
                <div
                  className={styles.cardMedia}
                  onContextMenu={event => event.preventDefault()}
                  onDragStart={event => event.preventDefault()}
                >
                  <Image
                    src={item.logo}
                    alt={item.name}
                    width={560}
                    height={360}
                    quality={100}
                    sizes='(max-width: 900px) 96vw, (max-width: 1400px) 48vw, 560px'
                    className={styles.cardMediaImage}
                    draggable={false}
                    onContextMenu={event => event.preventDefault()}
                    onDragStart={event => event.preventDefault()}
                  />
                  <span
                    className={`${styles.cardRenewBadge} ${
                      item.renewable ? styles.cardRenewBadgeOn : styles.cardRenewBadgeOff
                    }`}
                  >
                    {item.renewable ? 'Renovable' : 'No renovable'}
                  </span>
                  <span
                    className={`${styles.cardStockPill} ${
                      isBlockedByStock ? styles.cardStockPillEmpty : ''
                    }`}
                  >
                    {isOnDemand ? 'A pedido' : item.stock === 0 ? 'Sin stock' : `${item.stock} con stock`}
                  </span>
                </div>

                <div className={styles.cardProviderRow}>
                  <span className={styles.cardProviderAvatar}>
                    {item.providerAvatarUrl ? (
                      <Image
                        src={item.providerAvatarUrl}
                        alt={item.providerName}
                        width={34}
                        height={34}
                        className={styles.cardProviderAvatarImage}
                        draggable={false}
                        onContextMenu={event => event.preventDefault()}
                        onDragStart={event => event.preventDefault()}
                      />
                    ) : (
                      providerInitial
                    )}
                  </span>
                  <span className={styles.cardProviderName}>{item.providerName}</span>
                  <span className={styles.cardProviderCheck}>{'\u2714'}</span>
                </div>

                <h2 className={styles.cardTitle}>
                  <span className={styles.cardTitleIcon}>{getAccountTypeIcon(item.accountType)}</span>
                  <span className={styles.cardTitleTickerMask} title={item.name}>
                    <span className={styles.cardTitleTickerTrack}>
                      <span className={styles.cardTitleTickerItem}>{item.name}</span>
                    </span>
                  </span>
                </h2>
                <p className={styles.cardMeta}>
                  <span className={styles.profileInfoIcon} title='Info del producto'>
                    i
                  </span>
                  <span className={styles.cardMetaText}>
                    {formatAccountType(item.accountType)} | {formatDeliveryMode(item.deliveryMode)} |{' '}
                    {formatRenewable(item.renewable)} | {formatDuration(item.durationDays)}
                  </span>
                </p>

                <div className={styles.cardPriceRow}>
                  <span className={styles.priceChip}>{formatPrice(displayPrice)}</span>
                  {!canPurchase && (
                    <span className={styles.priceHint}>Dist: {formatPrice(item.priceAffiliate)}</span>
                  )}
                </div>
                {hasRenewalOverride && (
                  <p className={styles.renewalTag}>
                    Renovacion: {formatPrice(item.renewalPrice as number)}
                  </p>
                )}

                <div className={styles.buyArea}>
                  {!canPurchase || isOwnProduct ? (
                    <>
                      <button className={`${styles.buyButton} ${styles.buyButtonBlocked}`} disabled>
                        {isOwnProduct
                          ? 'No puedes comprar tu producto'
                          : isLoggedIn
                            ? '\u{1F512} Afiliacion requerida'
                            : '\u{1F510} Inicia sesion para comprar'}
                      </button>
                      {!isLoggedIn && !isOwnProduct && (
                        <Link href='/login' className={styles.buyLink}>
                          {'\u{1F449}'} Ir a login
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type='button'
                        className={`${styles.buyButton} ${
                          item.isDemo ? styles.buyButtonDemo : styles.buyButtonPrimary
                        }`}
                        disabled={isBlockedByStock || !item.isActive || item.isDemo || isBuying}
                        onClick={() => startPurchase(item)}
                      >
                        {isBlockedByStock
                          ? '\u{1F6AB} Sin stock'
                          : item.isDemo
                            ? '\u{1F6AB} No disponible'
                          : isBuying
                            ? '\u23F3 Procesando...'
                            : isOpen
                              ? '\u2716 Cerrar compra'
                              : isOnDemand
                                ? '\u{1F4E9} Solicitar a pedido'
                                : '\u{1F6D2} Comprar ahora'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}

          {filteredProducts.length === 0 && (
            <article className={styles.emptyState}>
              <h3>Sin resultados</h3>
              <p>Prueba con otro nombre o cambia de categoria.</p>
            </article>
          )}
        </section>

        {filteredProducts.length > 0 && catalogTotalPages > 1 && (
          <nav className={styles.catalogPagination} aria-label='Paginacion de productos'>
            <button
              type='button'
              className={styles.catalogPageButton}
              disabled={activeCatalogPage <= 1}
              onClick={() => setCatalogPage(previous => Math.max(1, previous - 1))}
            >
              Anterior
            </button>
            <div className={styles.catalogPageNumbers}>
              {catalogPageNumbers.map(pageNumber => (
                <button
                  key={`catalog-page-${pageNumber}`}
                  type='button'
                  className={`${styles.catalogPageButton} ${
                    pageNumber === activeCatalogPage ? styles.catalogPageButtonActive : ''
                  }`}
                  onClick={() => setCatalogPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              type='button'
              className={styles.catalogPageButton}
              disabled={activeCatalogPage >= catalogTotalPages}
              onClick={() => setCatalogPage(previous => Math.min(catalogTotalPages, previous + 1))}
            >
              Siguiente
            </button>
          </nav>
        )}

        {activePurchaseProduct && canPurchase && !activePurchaseProduct.isDemo && (
          <div className={styles.purchaseModalBackdrop} role='presentation'>
            <section
              className={styles.purchaseModal}
              role='dialog'
              aria-modal='true'
              aria-labelledby='purchase-modal-title'
            >
              <header className={styles.purchaseModalHead}>
                <div>
                  <p className={styles.purchaseModalKicker}>Compra</p>
                  <h3 id='purchase-modal-title'>{activePurchaseProduct.name}</h3>
                  <p className={styles.purchaseModalMeta}>
                    {formatAccountType(activePurchaseProduct.accountType)} |{' '}
                    {formatDeliveryMode(activePurchaseProduct.deliveryMode)} |{' '}
                    {formatPrice(activePurchaseProduct.priceAffiliate)}
                  </p>
                </div>
                <button type='button' className={styles.purchaseModalClose} onClick={closePurchaseModal}>
                  ✕
                </button>
              </header>

              <div className={styles.purchasePanel}>
                <article className={styles.purchaseProductInfo}>
                  <p>
                    <strong>Descripcion:</strong> {activePurchaseProduct.summary}
                  </p>
                  <p>
                    <strong>Duracion:</strong> {formatDuration(activePurchaseProduct.durationDays)}
                  </p>
                </article>

                <label className={styles.purchaseField}>
                  <span>Nombre del cliente</span>
                  <input
                    type='text'
                    value={purchaseCustomerName}
                    onChange={event => setPurchaseCustomerName(event.target.value)}
                    placeholder='Nombre completo'
                  />
                </label>

                <label className={styles.purchaseField}>
                  <span>Telefono del cliente</span>
                  <input
                    type='text'
                    value={purchaseCustomerPhone}
                    onChange={event => setPurchaseCustomerPhone(event.target.value)}
                    placeholder='+51 999 999 999'
                  />
                </label>

                {activePurchaseProduct.extraRequiredFields.map(field => (
                  <label key={`modal-${activePurchaseProduct.id}-${field.key}`} className={styles.purchaseField}>
                    <span>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>
                    <input
                      type='text'
                      value={purchaseExtraValues[field.key] ?? ''}
                      onChange={event =>
                        setPurchaseExtraValues(previous => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                      placeholder={field.placeholder || field.label}
                    />
                  </label>
                ))}

                <button
                  type='button'
                  className={styles.buyConfirmButton}
                  disabled={buyingProductId === activePurchaseProduct.id}
                  onClick={() => void handlePurchase(activePurchaseProduct)}
                >
                  {buyingProductId === activePurchaseProduct.id ? 'Confirmando...' : 'Confirmar compra'}
                </button>

                {purchaseError && <p className={styles.purchaseError}>{purchaseError}</p>}
                {purchaseMsg && <p className={styles.purchaseSuccess}>{purchaseMsg}</p>}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

