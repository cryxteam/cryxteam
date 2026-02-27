'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { isValidPin } from '@/lib/pin'
import { affiliateUserByUsernameAction } from '@/lib/affiliate'
import styles from './dashboard.module.css'

type ProfileRow = {
  username: string
  role: string
  is_approved: boolean
  balance: number
  purchase_pin: string | null
  provider_avatar_url?: string | null
  created_at: string | null
}

type ProductRow = {
  id: number
  provider_id: string | null
  name: string | null
  description: string | null
  delivery_mode: string | null
  account_type: string | null
  renewable: boolean | null
  duration_days: number | null
}

type OrderRow = {
  id: string | number
  buyer_id: string
  provider_id: string | null
  product_id: number | null
  inventory_slot_id: string | null
  status: string | null
  delivery_mode: string | null
  account_type: string | null
  price_paid: number | null
  customer_name: string | null
  customer_phone: string | null
  customer_extra: unknown
  credentials: unknown
  created_at: string | null
  updated_at: string | null
  paid_at: string | null
  delivered_at: string | null
  duration_days: number | null
  starts_at: string | null
  expires_at: string | null
}

type TicketRow = {
  id: string | number
  type: string | null
  status: string | null
  buyer_id: string
  provider_id: string | null
  product_id: number | null
  order_id: string | number | null
  subject: string | null
  description: string | null
  resolution_summary: string | null
  resolution_detail: string | null
  resolved_by: string | null
  created_at: string | null
  updated_at: string | null
  resolved_at: string | null
}

type DashboardSectionId =
  | 'mis-productos'
  | 'recargar'
  | 'afiliacion'
  | 'proveedor'
  | 'administrador-cuentas'
  | 'administrador'
  | 'codigo-soporte'
  | 'comunidad'

type DashboardMenuItem = {
  id: DashboardSectionId
  label: string
}

type DashboardSectionMeta = {
  title: string
  description: string
  emptyState: string
  ctaLabel: string
  ctaHref: string
  external?: boolean
}

type OwnedProduct = {
  id: string
  productId: number | null
  productName: string
  productDescription: string
  providerId: string
  providerName: string
  providerPhone: string
  status: string
  deliveryMode: string
  accountType: string
  durationDays: number | null
  startsAt: string | null
  expiresAt: string | null
  daysLeft: number | null
  renewableLabel: string
  pricePaid: number
  customerName: string
  customerPhone: string
  customerExtra: string
  credentialsText: string
  createdAt: string | null
  updatedAt: string | null
  paidAt: string | null
  deliveredAt: string | null
  inventorySlotLabel: string
  inventorySlotPin: string
}

type ResolvedTicket = {
  id: string
  productName: string
  orderId: string
  subject: string
  description: string
  resolutionSummary: string
  resolutionDetail: string
  status: string
  buyerConfirmed: boolean
  updatedAt: string | null
  resolvedAt: string | null
}

type AffiliateMember = {
  id: string
  username: string
  approved: boolean
  linkedAt: string | null
  salesCount: number
  salesAmount: number
}

type InlineMessageType = 'idle' | 'ok' | 'error'
type UserOrderContactFeedback = {
  type: 'ok' | 'error'
  text: string
}
type UserOrderEditModalState = {
  orderId: string
  field: 'customerName' | 'customerPhone'
  value: string
}
type UserSupportModalState = {
  orderId: string
  subject: string
  description: string
}
type UserSupportModalFeedback = {
  type: 'ok' | 'error'
  text: string
}
type AffiliateRewardLevel = {
  id: string
  title: string
  referralsRequired: number
  reward: string
  note: string
}

type ProviderProduct = {
  id: number
  providerId: string
  providerName: string
  name: string
  summary: string
  durationDays: number | null
  logo: string
  stock: number
  priceGuest: number
  priceAffiliate: number
  renewalPrice: number | null
  profilesPerAccount: number | null
  renewable: boolean
  deliveryMode: string
  accountType: string
  extraRequiredFieldsRaw: string
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

type ProviderTicket = {
  id: string
  type: string
  status: string
  deliveryMode: string
  isOnDemandRequest: boolean
  orderId: string | null
  orderAccountType: string
  orderInventorySlotId: string | null
  orderCredentialsRaw: unknown
  credentialLoginUser: string
  credentialLoginPassword: string
  credentialProfileLabel: string
  credentialProfilePin: string
  buyerId: string
  buyerName: string
  buyerPhone: string
  customerName: string
  customerPhone: string
  customerExtra: string
  productId: number | null
  productName: string
  productLogo: string
  subject: string
  description: string
  resolutionSummary: string
  resolutionDetail: string
  createdAt: string | null
  updatedAt: string | null
}

type ProviderOrder = {
  id: string
  status: string
  buyerId: string
  buyerName: string
  buyerPhone: string
  productId: number | null
  productName: string
  productLogo: string
  deliveryMode: string
  accountType: string
  durationDays: number | null
  amount: number
  customerName: string
  customerPhone: string
  customerExtra: string
  createdAt: string | null
}

type ProviderOrderDraft = {
  resolutionSummary: string
  loginUser: string
  loginPassword: string
  profilePin: string
}

type ProviderTicketDraft = {
  status: string
  resolutionSummary: string
  resolutionDetail: string
  loginUser: string
  loginPassword: string
  profileLabel: string
  profilePin: string
}

type ProviderFormState = {
  name: string
  summary: string
  logo: string
  durationDays: string
  profilesPerAccount: string
  priceGuest: string
  priceAffiliate: string
  renewable: boolean
  renewalPrice: string
  deliveryMode: string
  accountType: string
  extraRequiredFields: string
  isActive: boolean
}

type ProviderInventorySlot = {
  id: string
  slotIndex: number
  slotLabel: string
  profilePin: string
  status: string
  buyerId: string
  buyerName: string
  createdAt: string | null
}

type ProviderInventoryAccount = {
  id: string
  productId: number
  loginUser: string
  loginPassword: string
  slotCapacity: number
  isActive: boolean
  createdAt: string | null
  buyerId: string
  buyerName: string
  buyerPhone: string
  orderId: string | null
  assignedAt: string | null
  expiresAt: string | null
  assignmentStatus: string
  slots: ProviderInventorySlot[]
}

type ProviderBuyerModalState = {
  name: string
  phone: string
}

type ProviderInventoryFormState = {
  quantity: string
  loginUser: string
  loginPassword: string
  slotCapacity: string
  profilePin: string
  slotLabelPrefix: string
}

type ProviderInventoryEditFormState = {
  loginUser: string
  loginPassword: string
  slotLabel: string
  profilePin: string
}

type ProviderInventoryProfileInput = {
  slotLabel: string
  profilePin: string
}

type OwnerUser = {
  id: string
  username: string
  role: string
  approved: boolean
  balance: number
  providerBalance: number | null
  createdAt: string | null
}

type OwnerOverview = {
  salesTotal: number
  rechargedTotal: number
  usersPendingApproval: number
  onDemandPending: number
  ticketsOpen: number
  users: number
  providers: number
  products: number
  orders: number
}

type OwnerApprovalFilter = 'all' | 'approved' | 'pending'
type OwnerTabId =
  | 'resumen'
  | 'usuarios'
  | 'proveedores'
  | 'productos'
  | 'recargas'
  | 'pedidos'
  | 'tickets'
  | 'afiliacion'

type OwnerProviderItem = {
  id: string
  username: string
  role: string
  approved: boolean
  productLimit: number | null
  productsCreated: number
  providerBalance: number
  openTickets: number
  salesAmount: number
}

type OwnerProductItem = {
  id: number
  name: string
  description: string
  providerId: string
  providerName: string
  accountType: string
  deliveryMode: string
  durationDays: number | null
  stock: number
  priceGuest: number
  priceAffiliate: number
  renewable: boolean
  active: boolean
  createdAt: string | null
}

type OwnerOrderItem = {
  id: string
  buyerId: string
  buyerName: string
  providerId: string
  providerName: string
  productId: number | null
  productName: string
  accountType: string
  deliveryMode: string
  durationDays: number | null
  startsAt: string | null
  expiresAt: string | null
  daysLeft: number | null
  status: string
  amount: number
  createdAt: string | null
}

type OwnerTicketItem = {
  id: string
  type: string
  status: string
  buyerId: string
  buyerName: string
  providerId: string
  providerName: string
  productId: number | null
  productName: string
  subject: string
  createdAt: string | null
  updatedAt: string | null
}

type OwnerRechargeRequest = {
  id: string
  sourceTable: string
  userId: string
  username: string
  amount: number
  method: string
  status: string
  note: string
  proofUrl: string
  createdAt: string | null
}

type OwnerActivityItem = {
  id: string
  type: 'recarga' | 'compra' | 'ticket' | 'producto'
  title: string
  detail: string
  createdAt: string | null
}

type OwnerReferralItem = {
  referrerId: string
  referrerUsername: string
  referredId: string
  referredUsername: string
  linkedAt: string | null
  referredSales: number
}

type OwnerProductNameFilter = {
  id: string
  name: string
  keyword: string
  imageUrl: string
  sortOrder: number
  active: boolean
  createdAt: string | null
  updatedAt: string | null
}

type OwnerProductNameFilterDraft = {
  name: string
  keyword: string
  imageUrl: string
  sortOrder: string
}

type OwnerDialogType = 'ok' | 'error' | 'confirm'

const SUPPORT_NUMBER = '51929436705'
const SUPPORT_URL = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(
  'Hola quiero soporte en CRYXTEAM.'
)}`
const COMMUNITY_URL = 'https://chat.whatsapp.com/DAq3BQwm4YgA2Ao1loPxFO'
const PRODUCT_IMAGE_BUCKET = 'product-images'
const PROVIDER_AVATAR_BUCKET = 'provider-avatars'
const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024
const PRODUCT_FILTER_LOGO_MIN_SIZE = 420
const PRODUCT_IMAGE_ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
])

const DASHBOARD_MENU_ITEMS: DashboardMenuItem[] = [
  { id: 'mis-productos', label: 'Mis productos' },
  { id: 'recargar', label: 'Recargar' },
  { id: 'afiliacion', label: 'Afiliacion' },
  { id: 'proveedor', label: 'Proveedor' },
  { id: 'administrador-cuentas', label: 'Owner' },
  { id: 'administrador', label: 'Administrador' },
  { id: 'codigo-soporte', label: 'Códigos auto' },
  { id: 'comunidad', label: 'Comunidad' },
]

const RECHARGE_METHODS = [
  {
    id: 'billeteras-pe',
    label: 'Billeteras Peru',
    chips: ['Yape', 'Plin', 'PE'],
    detail: 'Valido para Yape, Plin y billeteras peruanas compatibles.',
    fields: [
      { label: 'Titular', value: 'Asunta Anampa' },
      { label: 'Numero', value: '+51 929 436 705' },
    ],
    imageSrc: '/yape.png',
    imageAlt: 'QR Yape y Plin',
  },
  {
    id: 'binance',
    label: 'Binance Pay',
    chips: ['USDT', 'Global'],
    detail: 'Recarga internacional para usuarios fuera de Peru.',
    fields: [{ label: 'ID Binance', value: '481656447' }],
    imageSrc: '/binance.png',
    imageAlt: 'QR Binance',
  },
] as const

const AFFILIATE_LINK_QUERIES = [
  {
    table: 'user_affiliations',
    filterColumn: 'referrer_user_id',
    referredColumns: ['referred_user_id', 'affiliate_user_id', 'referred_id'],
  },
  {
    table: 'user_affiliations',
    filterColumn: 'referrer_id',
    referredColumns: ['referred_user_id', 'affiliate_user_id', 'referred_id'],
  },
  {
    table: 'affiliations',
    filterColumn: 'referrer_user_id',
    referredColumns: ['referred_user_id', 'referred_id', 'affiliate_user_id', 'user_id'],
  },
  {
    table: 'affiliations',
    filterColumn: 'referrer_id',
    referredColumns: ['referred_user_id', 'referred_id', 'affiliate_user_id', 'user_id'],
  },
  {
    table: 'referrals',
    filterColumn: 'referrer_user_id',
    referredColumns: ['referred_user_id', 'referred_id', 'user_id'],
  },
  {
    table: 'referrals',
    filterColumn: 'referrer_id',
    referredColumns: ['referred_user_id', 'referred_id', 'user_id'],
  },
] as const

const AFFILIATE_REWARD_LEVELS: AffiliateRewardLevel[] = [
  {
    id: 'starter',
    title: 'Starter',
    referralsRequired: 10,
    reward: 'Bono S/ 15',
    note: 'Activa tu primera recompensa al llegar a 10 afiliados aprobados.',
  },
  {
    id: 'pro',
    title: 'Pro',
    referralsRequired: 20,
    reward: 'Bono S/ 40',
    note: 'Escala tu red y sube al segundo nivel de bono.',
  },
  {
    id: 'elite',
    title: 'Elite',
    referralsRequired: 35,
    reward: 'Bono S/ 90',
    note: 'Nivel alto para distribuidores con red activa.',
  },
  {
    id: 'legend',
    title: 'Legend',
    referralsRequired: 55,
    reward: 'Bono S/ 160',
    note: 'Meta premium del programa de afiliados.',
  },
  {
    id: 'mythic',
    title: 'Mythic',
    referralsRequired: 80,
    reward: 'Bono S/ 300',
    note: 'Nivel maximo con premio especial de temporada.',
  },
]

const PROVIDER_FORM_DEFAULT: ProviderFormState = {
  name: '',
  summary: '',
  logo: '',
  durationDays: '30',
  profilesPerAccount: '5',
  priceGuest: '',
  priceAffiliate: '',
  renewable: true,
  renewalPrice: '',
  deliveryMode: 'instant',
  accountType: 'profiles',
  extraRequiredFields: '',
  isActive: true,
}

const PROVIDER_INVENTORY_FORM_DEFAULT: ProviderInventoryFormState = {
  quantity: '1',
  loginUser: '',
  loginPassword: '',
  slotCapacity: '5',
  profilePin: '',
  slotLabelPrefix: 'Perfil',
}

const PROVIDER_INVENTORY_EDIT_FORM_DEFAULT: ProviderInventoryEditFormState = {
  loginUser: '',
  loginPassword: '',
  slotLabel: '',
  profilePin: '',
}

const OWNER_OVERVIEW_DEFAULT: OwnerOverview = {
  salesTotal: 0,
  rechargedTotal: 0,
  usersPendingApproval: 0,
  onDemandPending: 0,
  ticketsOpen: 0,
  users: 0,
  providers: 0,
  products: 0,
  orders: 0,
}

const OWNER_BASE_ROLES = ['owner', 'provider', 'distributor', 'guest'] as const
const PROVIDER_BALANCE_KEYS = [
  'provider_balance',
  'providerBalance',
  'provider_wallet_balance',
  'provider_wallet',
  'provider_saldo',
  'saldo_provider',
  'saldo_proveedor',
  'proveedor_balance',
  'balance_proveedor',
  'supplier_balance',
  'balance_provider',
] as const
const OWNER_ORDER_STATUS_OPTIONS = ['pending', 'in_progress', 'paid', 'delivered', 'cancelled'] as const
const OWNER_TICKET_STATUS_OPTIONS = ['open', 'in_progress', 'resolved'] as const
const PROVIDER_PRODUCTS_PAGE_SIZE = 4
const PROVIDER_INVENTORY_PAGE_SIZE = 8
const USER_TICKET_CONFIRM_MARKER = '__BUYER_CONFIRMED__'

function DashboardMenuIcon({ id }: { id: DashboardSectionId }) {
  switch (id) {
    case 'mis-productos':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M6 8h12l-1 12H7L6 8z' />
          <path d='M9 8V6a3 3 0 0 1 6 0v2' />
        </svg>
      )
    case 'recargar':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <rect x='3' y='6' width='18' height='12' rx='2' />
          <path d='M3 10h18M7 14h4M16 14h1' />
        </svg>
      )
    case 'afiliacion':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' />
          <path d='M16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' />
          <path d='M3 19a5 5 0 0 1 10 0M14 19a4 4 0 0 1 7 0' />
        </svg>
      )
    case 'proveedor':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M3 8.5 12 4l9 4.5-9 4.5-9-4.5z' />
          <path d='M3 8.5V16l9 4 9-4V8.5' />
          <path d='M12 13v7' />
        </svg>
      )
    case 'administrador-cuentas':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M12 3l7 3v6c0 5-3.4 8.2-7 9-3.6-.8-7-4-7-9V6l7-3z' />
          <path d='m9.5 12 1.8 1.8L14.8 10' />
        </svg>
      )
    case 'administrador':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <rect x='3' y='5' width='18' height='14' rx='3' />
          <path d='M8 10h8M8 14h5' />
          <circle cx='17.2' cy='14.2' r='1.2' />
        </svg>
      )
    case 'codigo-soporte':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M7 14a4 4 0 1 1 3.8-5.2L21 9v3h-2v2h-2v2h-3l-2.2-2.2A4 4 0 0 1 7 14z' />
        </svg>
      )
    case 'comunidad':
      return (
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M20 14a4 4 0 0 1-4 4H9l-5 3V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z' />
          <path d='M9 10h6M9 13h4' />
        </svg>
      )
    default:
      return null
  }
}

function sectionMeta(id: DashboardSectionId): DashboardSectionMeta {
  switch (id) {
    case 'mis-productos':
      return {
        title: 'Mis productos',
        description: '',
        emptyState: 'Todavia no tienes productos asignados.',
        ctaLabel: 'Ver catalogo',
        ctaHref: '/productos',
      }
    case 'recargar':
      return {
        title: 'Recargar',
        description: 'Elige un metodo y envia tu comprobante para recargar saldo.',
        emptyState: 'No hay solicitudes de recarga en este momento.',
        ctaLabel: 'Solicitar recarga',
        ctaHref: SUPPORT_URL,
        external: true,
      }
    case 'afiliacion':
      return {
        title: 'Afiliacion',
        description: 'Administra afiliados y vinculaciones de tu red.',
        emptyState: 'Sin movimientos de afiliacion por ahora.',
        ctaLabel: 'Ir a afiliacion',
        ctaHref: '/dashboard/afiliacion',
      }
    case 'proveedor':
      return {
        title: 'Proveedor',
        description: 'Panel operativo para stock, productos y entregas.',
        emptyState: 'No hay tareas de proveedor pendientes.',
        ctaLabel: 'Ver panel proveedor',
        ctaHref: '/dashboard',
      }
    case 'administrador-cuentas':
      return {
        title: 'Owner',
        description: 'Control global de usuarios, aprobaciones y balance.',
        emptyState: 'Sin acciones de administracion pendientes.',
        ctaLabel: 'Actualizar dashboard',
        ctaHref: '/dashboard',
      }
    case 'administrador':
      return {
        title: 'Administrador',
        description: 'Controla cuentas externas que administras fuera de tus compras del kiosko.',
        emptyState: 'Aun no tienes cuentas externas registradas.',
        ctaLabel: 'Ir a mis productos',
        ctaHref: '/dashboard',
      }
    case 'codigo-soporte':
      return {
        title: 'Códigos auto',
        description: 'Tu area para codigos auto y soporte.',
        emptyState: 'Aun no tienes codigos de soporte activos.',
        ctaLabel: 'Contactar soporte',
        ctaHref: SUPPORT_URL,
        external: true,
      }
    case 'comunidad':
      return {
        title: 'Comunidad',
        description: 'Entra al grupo para avisos, soporte y novedades.',
        emptyState: 'Tu comunidad esta lista para recibirte.',
        ctaLabel: 'Ir a la comunidad',
        ctaHref: COMMUNITY_URL,
        external: true,
      }
    default:
      return {
        title: 'Dashboard',
        description: 'Panel general.',
        emptyState: 'Sin datos por mostrar.',
        ctaLabel: 'Volver',
        ctaHref: '/dashboard',
      }
  }
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
  const parsed = toNumber(value, NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function toText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toScalarText(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return ''
}

function toIdText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.floor(value))
  }
  return fallback
}

function toNullableIdText(value: unknown) {
  const normalized = toIdText(value)
  return normalized || null
}

const DISPLAY_NAME_KEYS = ['username', 'user_name', 'display_name', 'full_name', 'name', 'nombre'] as const

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeDisplayName(value: unknown) {
  const cleaned = toText(value).replace(/^@+/, '')
  if (!cleaned) return ''
  if (isUuidLike(cleaned)) return ''
  return cleaned
}

function pickDisplayName(row: Record<string, unknown>, keys: readonly string[] = DISPLAY_NAME_KEYS) {
  for (const key of keys) {
    const name = normalizeDisplayName(row[key])
    if (name) return name
  }
  return ''
}

function formatMoney(value: number) {
  return `S/ ${value.toFixed(2)}`
}

function formatDate(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function formatDateOnly(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function formatDurationDays(value: number | null) {
  if (value === null || value < 1) return 'Sin limite'
  if (value === 1) return '1 dia'
  return `${value} dias`
}

function calculateDaysLeft(expiresAt: string | null) {
  if (!expiresAt) return null
  const expiresDate = new Date(expiresAt)
  if (Number.isNaN(expiresDate.getTime())) return null
  const diffMs = expiresDate.getTime() - Date.now()
  const days = Math.ceil(diffMs / 86400000)
  return Math.max(0, days)
}

function formatDaysLeft(value: number | null) {
  if (value === null) return '-'
  if (value <= 0) return 'Vencido'
  if (value === 1) return '1 dia'
  return `${value} dias`
}

function sanitizeFilePart(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'producto'
}

function resolveFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/avif') return 'avif'
  return 'jpg'
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const probe = new window.Image()
    probe.onload = () => {
      const width = probe.naturalWidth || probe.width
      const height = probe.naturalHeight || probe.height
      URL.revokeObjectURL(objectUrl)
      resolve({ width, height })
    }
    probe.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('IMAGE_DIMENSIONS_READ_FAILED'))
    }
    probe.src = objectUrl
  })
}

function formatCompactId(value: string) {
  const raw = toText(value)
  if (raw.length <= 16) return raw
  return `${raw.slice(0, 8)}...${raw.slice(-4)}`
}

function formatOrderStatus(statusRaw: string) {
  const status = statusRaw.trim().toLowerCase()
  if (status === 'paid' || status === 'pagado') return 'Pagado'
  if (status === 'delivered' || status === 'entregado') return 'Entregado'
  if (status === 'pending' || status === 'pendiente') return 'Pendiente'
  if (status === 'resolved' || status === 'resuelto' || status === 'closed') return 'Resuelto'
  if (status === 'cancelled' || status === 'cancelado') return 'Cancelado'
  if (status === 'refunded' || status === 'reembolsado') return 'Reembolsado'
  if (status === 'open' || status === 'abierto') return 'Abierto'
  return statusRaw || '-'
}

function formatDeliveryMode(modeRaw: string) {
  const mode = modeRaw.trim().toLowerCase()
  if (mode === 'instant' || mode === 'inmediata') return 'Inmediata'
  if (mode === 'on_demand' || mode === 'a_pedido' || mode === 'a pedido') return 'A pedido'
  return modeRaw || '-'
}

function isOnDemandMode(modeRaw: string) {
  const mode = modeRaw.trim().toLowerCase()
  return mode === 'on_demand' || mode === 'a_pedido' || mode === 'a pedido'
}

function isOnDemandTicketType(typeRaw: string) {
  const type = typeRaw.trim().toLowerCase()
  return (
    type === 'on_demand' ||
    type === 'a_pedido' ||
    type === 'a pedido' ||
    type === 'pedido' ||
    type === 'pedido_on_demand'
  )
}

function shouldCountProviderSale(statusRaw: string, deliveryModeRaw: string) {
  const status = normalizeOrderStatusInput(statusRaw)
  const onDemand = isOnDemandMode(deliveryModeRaw)
  if (onDemand) {
    return status === 'delivered' || status === 'resolved'
  }
  return status === 'paid' || status === 'delivered' || status === 'resolved'
}

function formatAccountType(typeRaw: string) {
  const type = typeRaw.trim().toLowerCase()
  if (type === 'full_account' || type === 'cuenta_completa') return 'Cuenta completa'
  if (
    type === 'profiles' ||
    type === 'perfiles' ||
    type === 'profile_slots' ||
    type === 'profile' ||
    type === 'perfil'
  ) {
    return 'Perfil'
  }
  return typeRaw || '-'
}

function isProfilesAccountType(typeRaw: string) {
  const type = typeRaw.trim().toLowerCase()
  return (
    type === 'profiles' ||
    type === 'perfiles' ||
    type === 'profile' ||
    type === 'perfil' ||
    type === 'profile_slots'
  )
}

function toProviderFormAccountType(typeRaw: string) {
  return isProfilesAccountType(typeRaw) ? 'profiles' : 'full_account'
}

function toProductAccountTypeForDb(typeRaw: string) {
  return isProfilesAccountType(typeRaw) ? 'profile_slots' : 'full_account'
}

function getProductAccountTypeDbCandidates(typeRaw: string) {
  if (isProfilesAccountType(typeRaw)) {
    return ['profile_slots', 'profiles', 'perfiles', 'profile', 'perfil'] as const
  }
  return ['full_account', 'cuenta_completa', 'full'] as const
}

function getProviderCommissionAmount(accountTypeRaw: string) {
  return isProfilesAccountType(accountTypeRaw) ? 0.5 : 1
}

function resolveRenewalAmountFromProductRow(row: Record<string, unknown>, fallbackAmount: number) {
  const candidates = [
    row.renewal_price,
    row.price_renewal,
    row.renewal_price_affiliate,
    row.price_renovation,
    row.renewalPrice,
    row.price_affiliate,
    row.price_logged,
    row.price_guest,
    fallbackAmount,
  ]

  for (const candidate of candidates) {
    const parsed = toNullableNumber(candidate)
    if (parsed !== null && parsed > 0) return parsed
  }
  return 0
}

function formatCredentials(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) return ''

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        return formatCredentials(parsed)
      } catch {
        return trimmed
      }
    }

    return trimmed
  }

  if (typeof value === 'object') {
    const pairs = Object.entries(value as Record<string, unknown>).map(([key, rawValue]) => {
      const normalizedValue =
        typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue, null, 2)
      return `${key}: ${normalizedValue}`
    })
    return pairs.join('\n').trim()
  }

  return String(value)
}

function normalizeWhatsappPhone(value: string) {
  const digits = value.replace(/\D+/g, '')
  if (digits.length < 8) return ''
  if (digits.startsWith('00')) return digits.slice(2)
  return digits
}

function buildWhatsappUrl(phone: string, lines: string[]) {
  const text = lines
    .join('\n')
    .normalize('NFC')
    .replace(/\uFFFD/g, '')
  const encodedText = encodeURIComponent(text)
  return `https://wa.me/${phone}?text=${encodedText}`
}

const WA_EMOJI = {
  check: String.fromCodePoint(0x2705),
  handshake: String.fromCodePoint(0x1f91d),
  sparkles: String.fromCodePoint(0x2728),
  movie: String.fromCodePoint(0x1f3ac),
  mail: String.fromCodePoint(0x1f4e9),
  lock: String.fromCodePoint(0x1f510),
  profile: String.fromCodePoint(0x1f464),
  pin: String.fromCodePoint(0x1f522),
  hands: String.fromCodePoint(0x1f64c),
  hourglass: String.fromCodePoint(0x23f3),
}

function normalizeCredentialKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function parseCredentialMap(credentialsText: string) {
  const map = new Map<string, string>()
  if (!credentialsText.trim()) return map

  const lines = credentialsText.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line === '{' || line === '}') continue

    const separatorIndex = line.indexOf(':')
    if (separatorIndex > 0) {
      const rawKey = line.slice(0, separatorIndex).trim()
      const rawValue = line.slice(separatorIndex + 1).trim()
      if (!rawKey || !rawValue) continue

      const normalizedKey = normalizeCredentialKey(rawKey)
      const normalizedValue = rawValue.replace(/^"+|"+$/g, '').trim()
      if (normalizedKey && normalizedValue && !map.has(normalizedKey)) {
        map.set(normalizedKey, normalizedValue)
      }
      continue
    }

    if (/^https?:\/\//i.test(line) && !map.has('url')) {
      map.set('url', line)
    }
  }

  return map
}

function pickCredentialValue(map: Map<string, string>, keys: readonly string[]) {
  for (const key of keys) {
    const normalizedAlias = normalizeCredentialKey(key)
    const exact = map.get(normalizedAlias)
    if (exact) return exact
  }

  for (const [entryKey, entryValue] of map.entries()) {
    for (const key of keys) {
      const normalizedAlias = normalizeCredentialKey(key)
      if (entryKey.includes(normalizedAlias) || normalizedAlias.includes(entryKey)) {
        return entryValue
      }
    }
  }

  return '-'
}

function extractCredentialSnapshot(credentialsText: string) {
  const map = parseCredentialMap(credentialsText)
  return {
    username: pickCredentialValue(map, ['username', 'user', 'login_user', 'correo', 'email', 'mail', 'cuenta', 'account']),
    password: pickCredentialValue(map, ['password', 'pass', 'login_password', 'clave', 'contrasena', 'contrasenia']),
    url: pickCredentialValue(map, ['url', 'link', 'enlace', 'website', 'web', 'sitio']),
    profileNumber: pickCredentialValue(map, ['perfil', 'n_perfil', 'numero_perfil', 'profile', 'profile_number', 'slot', 'slot_label']),
    pin: pickCredentialValue(map, ['pin', 'profile_pin', 'codigo', 'code']),
  }
}

function isResolvedStatus(statusRaw: string) {
  const normalized = statusRaw.trim().toLowerCase()
  return normalized === 'resuelto' || normalized === 'resolved' || normalized === 'closed'
}

function isLikelySchemaError(message: string) {
  const text = message.toLowerCase()
  return (
    text.includes('does not exist') ||
    text.includes('does not have') ||
    text.includes('could not find') ||
    text.includes('schema cache')
  )
}

function isMissingTableError(message: string) {
  const text = message.toLowerCase()
  return (
    (text.includes('relation') && text.includes('does not exist')) ||
    (text.includes('could not find the table') && text.includes('schema cache'))
  )
}

function pickRowText(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const raw = row[key]
    if (typeof raw === 'string') {
      const trimmed = raw.trim()
      if (trimmed.length > 0) return trimmed
    }
  }
  return ''
}

function isPaidLikeOrderStatus(statusRaw: string | null | undefined) {
  const status = toText(statusRaw).toLowerCase()
  return (
    status === 'paid' ||
    status === 'pagado' ||
    status === 'delivered' ||
    status === 'entregado' ||
    status === 'resolved' ||
    status === 'resuelto'
  )
}

function isTrueLike(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === '1' || normalized === 'si' || normalized === 'yes'
  }
  return false
}

function isOpenTicketStatus(statusRaw: string) {
  const status = statusRaw.trim().toLowerCase()
  return (
    status === 'open' ||
    status === 'abierto' ||
    status === 'in_progress' ||
    status === 'en_proceso' ||
    status === 'pending' ||
    status === 'pendiente'
  )
}

function parseExtraFieldKeys(value: unknown) {
  if (value === null || value === undefined) return [] as string[]

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return [] as string[]

    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed) as unknown
        return parseExtraFieldKeys(parsed)
      } catch {
        return trimmed
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      }
    }

    return trimmed
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') return item.trim()
        if (typeof item === 'object' && item !== null) {
          const record = item as Record<string, unknown>
          return toText(record.key ?? record.name ?? record.label)
        }
        return ''
      })
      .filter(Boolean)
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (record.fields !== undefined) return parseExtraFieldKeys(record.fields)
    if (record.required !== undefined) return parseExtraFieldKeys(record.required)
    if (record.extra_fields !== undefined) return parseExtraFieldKeys(record.extra_fields)

    return Object.keys(record)
      .filter(Boolean)
      .filter(
        key =>
          key !== 'profiles_per_account' &&
          key !== 'slot_capacity' &&
          key !== 'profile_slots' &&
          key !== 'perfiles'
      )
  }

  return [] as string[]
}

function parseDecimalInput(value: string) {
  if (!value.trim()) return NaN
  const normalized = value.replace(',', '.')
  return Number(normalized)
}

function normalizeProductNameFilterKeyword(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseCommaSeparatedValues(value: string) {
  return value
    .split(/[,;\n]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function buildInventoryProfileInputs(totalRaw: number | null | undefined) {
  const total = Math.max(1, Math.floor(toNumber(totalRaw, 5)))
  return Array.from({ length: total }, () => ({
    slotLabel: '',
    profilePin: '',
  })) as ProviderInventoryProfileInput[]
}

function formatProfileSlotLabel(slotLabelRaw: string, slotIndex: number) {
  const raw = slotLabelRaw.trim()
  if (!raw) return String(slotIndex)
  return raw
}

function isGenericProfileSlotLabel(slotLabelRaw: string, slotIndex: number) {
  const raw = slotLabelRaw.trim().toLowerCase()
  if (!raw) return true
  if (raw === String(slotIndex)) return true
  if (/^\d+$/.test(raw)) return true
  if (/^perfil\s*#?\s*\d+$/i.test(raw)) return true
  if (/^profile\s*#?\s*\d+$/i.test(raw)) return true
  return false
}

function encodeProfileLabelForInventoryLogin(labelRaw: string) {
  return encodeURIComponent(labelRaw.trim())
}

function decodeProfileLabelFromInventoryLogin(loginRaw: string) {
  const match = loginRaw.match(/::slot_([^:]+)::/i)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

function stripInventoryProfileSuffix(loginRaw: string) {
  return loginRaw.replace(/::slot_[^:]+::[^:]+$/i, '').replace(/::perfil_.+$/i, '')
}

function extractInventoryProfileSuffix(loginRaw: string) {
  const match = loginRaw.match(/::slot_[^:]+::([^:]+)$/i)
  return match ? match[1] : ''
}

function composeInventoryProfileLogin(loginUserRaw: string, profileLabelRaw: string, currentLoginRaw: string) {
  const loginBase = stripInventoryProfileSuffix(loginUserRaw).trim()
  const profileLabel = profileLabelRaw.trim() || '1'
  if (!loginBase) return ''
  const currentSuffix = extractInventoryProfileSuffix(currentLoginRaw)
  const suffix = currentSuffix || `manual_${Date.now()}`
  return `${loginBase}::slot_${encodeProfileLabelForInventoryLogin(profileLabel)}::${suffix}`
}

function buildOrderCredentialPayload(
  currentRaw: unknown,
  next: {
    loginUser: string
    loginPassword: string
    profileLabel: string
    profilePin: string
    isProfiles: boolean
  }
) {
  const payload: Record<string, unknown> =
    currentRaw && typeof currentRaw === 'object' && !Array.isArray(currentRaw)
      ? { ...(currentRaw as Record<string, unknown>) }
      : {}

  const loginUser = next.loginUser.trim()
  const loginPassword = next.loginPassword.trim()
  const profileLabel = next.profileLabel.trim()
  const profilePin = next.profilePin.trim()

  payload.login_user = loginUser || null
  payload.username = loginUser || null
  payload.correo = loginUser || null

  payload.login_password = loginPassword || null
  payload.password = loginPassword || null
  payload.clave = loginPassword || null

  if (next.isProfiles) {
    payload.profile = profileLabel || null
    payload.perfil = profileLabel || null
    payload.slot_label = profileLabel || null
    payload.profile_pin = profilePin || null
    payload.pin = profilePin || null
  }

  return payload
}

function readProfilesPerAccount(value: unknown) {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return readProfilesPerAccount(JSON.parse(trimmed))
      } catch {
        return null
      }
    }
    return null
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const candidate = toNullableNumber(
      record.profiles_per_account ?? record.slot_capacity ?? record.profile_slots ?? record.perfiles
    )
    if (candidate !== null) return Math.max(1, Math.floor(candidate))
  }
  return null
}

function normalizeAppRole(roleRaw: string) {
  const normalized = roleRaw.trim().toLowerCase()
  if (!normalized) return 'guest'
  if (normalized === 'owner') return 'owner'
  if (normalized === 'admin' || normalized === 'administrator') return 'admin'
  if (normalized === 'provider' || normalized === 'proveedor') return 'provider'
  if (
    normalized === 'affiliate' ||
    normalized === 'afiliado' ||
    normalized === 'distributor' ||
    normalized === 'distribuidor'
  ) {
    return 'distributor'
  }
  if (normalized === 'guest' || normalized === 'invitado') return 'guest'
  return normalized
}

function formatOwnerRole(role: string) {
  const normalized = normalizeAppRole(role)
  if (normalized === 'owner') return 'Owner'
  if (normalized === 'admin') return 'Admin'
  if (normalized === 'provider') return 'Proveedor'
  if (normalized === 'distributor') return 'Distribuidor'
  if (normalized === 'guest') return 'Guest'
  return role || '-'
}

function guessProductLogo(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes('netflix')) return '/particles/netflix.png'
  if (normalized.includes('spotify')) return '/particles/spotify.png'
  if (normalized.includes('youtube')) return '/particles/youtube.png'
  if (normalized.includes('xbox')) return '/particles/xbox.png'
  if (normalized.includes('playstation') || normalized.includes('ps')) return '/particles/playstation.png'
  if (normalized.includes('steam')) return '/particles/steam.png'
  if (normalized.includes('apple')) return '/particles/apple-music.png'
  return '/logo.png'
}

function resolveProductLogo(name: string, value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    return guessProductLogo(name)
  }

  const cleaned = value.trim()
  if (cleaned.startsWith('data:image/') || cleaned.startsWith('blob:')) {
    return cleaned
  }
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.startsWith('/')) {
    return cleaned
  }
  if (cleaned.startsWith('particles/')) return `/${cleaned}`
  return `/${cleaned}`
}

function normalizeOrderStatusInput(statusRaw: string) {
  const value = statusRaw.trim().toLowerCase()
  if (!value) return 'pending'
  if (value === 'abierto') return 'open'
  if (value === 'pendiente') return 'pending'
  if (value === 'en_proceso') return 'in_progress'
  if (value === 'entregado') return 'delivered'
  if (value === 'cancelado') return 'cancelled'
  if (value === 'resuelto') return 'resolved'
  if (value === 'pagado') return 'paid'
  if (value === 'aprobado') return 'approved'
  if (value === 'rechazado') return 'rejected'
  return value
}

function isPendingLikeOrderStatus(statusRaw: string) {
  const status = normalizeOrderStatusInput(statusRaw)
  return status === 'pending' || status === 'in_progress' || status === 'open'
}

export default function UserDashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeSection, setActiveSection] = useState<DashboardSectionId>('mis-productos')
  const [menuSearch, setMenuSearch] = useState('')
  const [ownedProducts, setOwnedProducts] = useState<OwnedProduct[]>([])
  const [userPurchasesCount, setUserPurchasesCount] = useState(0)
  const [resolvedTickets, setResolvedTickets] = useState<ResolvedTicket[]>([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(true)
  const [ordersMsg, setOrdersMsg] = useState('')
  const [ordersReloadSeq, setOrdersReloadSeq] = useState(0)
  const [userTicketConfirming, setUserTicketConfirming] = useState<Record<string, boolean>>({})
  const [userTicketFeedback, setUserTicketFeedback] = useState<Record<string, UserOrderContactFeedback>>({})
  const [visibleCredentials, setVisibleCredentials] = useState<Record<string, boolean>>({})
  const [userOrderContactSaving, setUserOrderContactSaving] = useState<Record<string, boolean>>({})
  const [userOrderContactFeedback, setUserOrderContactFeedback] = useState<
    Record<string, UserOrderContactFeedback>
  >({})
  const [userOrderRenewing, setUserOrderRenewing] = useState<Record<string, boolean>>({})
  const [userOrderRenewFeedback, setUserOrderRenewFeedback] = useState<
    Record<string, UserOrderContactFeedback>
  >({})
  const [userOrderEditModal, setUserOrderEditModal] = useState<UserOrderEditModalState | null>(null)
  const [userSupportModal, setUserSupportModal] = useState<UserSupportModalState | null>(null)
  const [userSupportModalSaving, setUserSupportModalSaving] = useState(false)
  const [userSupportModalFeedback, setUserSupportModalFeedback] = useState<UserSupportModalFeedback | null>(null)
  const [showSupportCode, setShowSupportCode] = useState(false)
  const [showSupportMaintenanceModal, setShowSupportMaintenanceModal] = useState(false)
  const [affiliateUsername, setAffiliateUsername] = useState('')
  const [affiliateMsg, setAffiliateMsg] = useState('')
  const [affiliateMsgType, setAffiliateMsgType] = useState<InlineMessageType>('idle')
  const [isAffiliateSubmitting, setIsAffiliateSubmitting] = useState(false)
  const [showAffiliateNotFoundModal, setShowAffiliateNotFoundModal] = useState(false)
  const [showAffiliateRulesModal, setShowAffiliateRulesModal] = useState(false)
  const [showAffiliateMembersList, setShowAffiliateMembersList] = useState(true)
  const [affiliateMembers, setAffiliateMembers] = useState<AffiliateMember[]>([])
  const [isAffiliateMembersLoading, setIsAffiliateMembersLoading] = useState(false)
  const [affiliateMembersMsg, setAffiliateMembersMsg] = useState('')
  const [providerPinInput, setProviderPinInput] = useState('')
  const [providerPinError, setProviderPinError] = useState('')
  const [providerAccessGranted, setProviderAccessGranted] = useState(false)
  const [providerProducts, setProviderProducts] = useState<ProviderProduct[]>([])
  const [providerOrders, setProviderOrders] = useState<ProviderOrder[]>([])
  const [providerTickets, setProviderTickets] = useState<ProviderTicket[]>([])
  const [providerBalanceMetric, setProviderBalanceMetric] = useState(0)
  const [providerSideTab, setProviderSideTab] = useState<'orders' | 'tickets'>('orders')
  const [providerSelectedOrderId, setProviderSelectedOrderId] = useState<string | null>(null)
  const [providerSelectedTicketId, setProviderSelectedTicketId] = useState<string | null>(null)
  const [providerProductLimit, setProviderProductLimit] = useState<number | null>(null)
  const [providerMsg, setProviderMsg] = useState('')
  const [providerMsgType, setProviderMsgType] = useState<InlineMessageType>('idle')
  const [isProviderLoading, setIsProviderLoading] = useState(false)
  const [isProviderSaving, setIsProviderSaving] = useState(false)
  const [isProviderImageUploading, setIsProviderImageUploading] = useState(false)
  const [editingProviderProductId, setEditingProviderProductId] = useState<number | null>(null)
  const [showProviderProductForm, setShowProviderProductForm] = useState(false)
  const [showProviderProfilesModal, setShowProviderProfilesModal] = useState(false)
  const [providerProductSearch, setProviderProductSearch] = useState('')
  const [providerProductsPage, setProviderProductsPage] = useState(1)
  const [selectedProviderProductId, setSelectedProviderProductId] = useState<number | null>(null)
  const [providerInventoryAccounts, setProviderInventoryAccounts] = useState<ProviderInventoryAccount[]>([])
  const [isProviderInventoryLoading, setIsProviderInventoryLoading] = useState(false)
  const [providerInventorySearch, setProviderInventorySearch] = useState('')
  const [providerInventoryActiveOnly, setProviderInventoryActiveOnly] = useState(false)
  const [providerInventoryPage, setProviderInventoryPage] = useState(1)
  const [providerInventoryMsg, setProviderInventoryMsg] = useState('')
  const [providerInventoryMsgType, setProviderInventoryMsgType] = useState<InlineMessageType>('idle')
  const [showProviderInventoryModal, setShowProviderInventoryModal] = useState(false)
  const [showProviderInventoryProfilesModal, setShowProviderInventoryProfilesModal] = useState(false)
  const [isProviderInventorySaving, setIsProviderInventorySaving] = useState(false)
  const [providerInventoryForm, setProviderInventoryForm] = useState<ProviderInventoryFormState>(
    PROVIDER_INVENTORY_FORM_DEFAULT
  )
  const [providerInventoryProfileInputs, setProviderInventoryProfileInputs] = useState<ProviderInventoryProfileInput[]>(
    buildInventoryProfileInputs(5)
  )
  const [providerInventoryVisiblePasswords, setProviderInventoryVisiblePasswords] = useState<Record<string, boolean>>({})
  const [providerInventoryDaysDraft, setProviderInventoryDaysDraft] = useState<Record<string, string>>({})
  const [providerInventoryDaysEditingId, setProviderInventoryDaysEditingId] = useState<string | null>(null)
  const [providerInventoryEditingAccountId, setProviderInventoryEditingAccountId] = useState<string | null>(null)
  const [providerInventoryEditForm, setProviderInventoryEditForm] = useState<ProviderInventoryEditFormState>(
    PROVIDER_INVENTORY_EDIT_FORM_DEFAULT
  )
  const [isProviderInventoryEditingSaving, setIsProviderInventoryEditingSaving] = useState(false)
  const [isProviderInventoryDeleting, setIsProviderInventoryDeleting] = useState<Record<string, boolean>>({})
  const [providerBuyerModal, setProviderBuyerModal] = useState<ProviderBuyerModalState | null>(null)
  const [providerProductForm, setProviderProductForm] = useState<ProviderFormState>(PROVIDER_FORM_DEFAULT)
  const [providerOrderDrafts, setProviderOrderDrafts] = useState<Record<string, ProviderOrderDraft>>({})
  const [providerOrderSaving, setProviderOrderSaving] = useState<Record<string, boolean>>({})
  const [providerTicketDrafts, setProviderTicketDrafts] = useState<Record<string, ProviderTicketDraft>>({})
  const [providerTicketSaving, setProviderTicketSaving] = useState<Record<string, boolean>>({})
  const providerImageInputRef = useRef<HTMLInputElement | null>(null)
  const providerAvatarInputRef = useRef<HTMLInputElement | null>(null)
  const [isProviderAvatarUploading, setIsProviderAvatarUploading] = useState(false)
  const ownerNewFilterImageInputRef = useRef<HTMLInputElement | null>(null)
  const ownerEditFilterImageInputRef = useRef<HTMLInputElement | null>(null)
  const [ownerEditingFilterImageId, setOwnerEditingFilterImageId] = useState<string | null>(null)
  const [ownerUsers, setOwnerUsers] = useState<OwnerUser[]>([])
  const [ownerOverview, setOwnerOverview] = useState<OwnerOverview>(OWNER_OVERVIEW_DEFAULT)
  const [ownerRoleOptions, setOwnerRoleOptions] = useState<string[]>([...OWNER_BASE_ROLES])
  const [ownerProviderBalanceColumn, setOwnerProviderBalanceColumn] = useState<string | null>(null)
  const [ownerRoleDraft, setOwnerRoleDraft] = useState<Record<string, string>>({})
  const [ownerBalanceDraft, setOwnerBalanceDraft] = useState<Record<string, string>>({})
  const [ownerProviderBalanceDraft, setOwnerProviderBalanceDraft] = useState<Record<string, string>>({})
  const [ownerProviderLimitDraft, setOwnerProviderLimitDraft] = useState<Record<string, string>>({})
  const [ownerOrderStatusDraft, setOwnerOrderStatusDraft] = useState<Record<string, string>>({})
  const [ownerTicketStatusDraft, setOwnerTicketStatusDraft] = useState<Record<string, string>>({})
  const [ownerActiveTab, setOwnerActiveTab] = useState<OwnerTabId>('resumen')
  const [ownerProducts, setOwnerProducts] = useState<OwnerProductItem[]>([])
  const [ownerOrders, setOwnerOrders] = useState<OwnerOrderItem[]>([])
  const [ownerTicketsGlobal, setOwnerTicketsGlobal] = useState<OwnerTicketItem[]>([])
  const [ownerProviders, setOwnerProviders] = useState<OwnerProviderItem[]>([])
  const [ownerProductNameFilters, setOwnerProductNameFilters] = useState<OwnerProductNameFilter[]>([])
  const [ownerProductNameFilterDrafts, setOwnerProductNameFilterDrafts] = useState<
    Record<string, OwnerProductNameFilterDraft>
  >({})
  const [ownerNewFilterName, setOwnerNewFilterName] = useState('')
  const [ownerNewFilterKeyword, setOwnerNewFilterKeyword] = useState('')
  const [ownerNewFilterImageUrl, setOwnerNewFilterImageUrl] = useState('')
  const [ownerNewFilterSortOrder, setOwnerNewFilterSortOrder] = useState('')
  const [isOwnerProductNameFiltersLoading, setIsOwnerProductNameFiltersLoading] = useState(false)
  const [ownerRechargeRequests, setOwnerRechargeRequests] = useState<OwnerRechargeRequest[]>([])
  const [ownerReferralLinks, setOwnerReferralLinks] = useState<OwnerReferralItem[]>([])
  const [ownerRecentActivity, setOwnerRecentActivity] = useState<OwnerActivityItem[]>([])
  const [ownerSearch, setOwnerSearch] = useState('')
  const [ownerRoleFilter, setOwnerRoleFilter] = useState('all')
  const [ownerApprovalFilter, setOwnerApprovalFilter] = useState<OwnerApprovalFilter>('all')
  const [ownerProductProviderFilter, setOwnerProductProviderFilter] = useState('all')
  const [ownerProductTypeFilter, setOwnerProductTypeFilter] = useState('all')
  const [ownerProductDeliveryFilter, setOwnerProductDeliveryFilter] = useState('all')
  const [ownerProductStateFilter, setOwnerProductStateFilter] = useState('all')
  const [ownerOrderStatusFilter, setOwnerOrderStatusFilter] = useState('all')
  const [ownerTicketStatusFilter, setOwnerTicketStatusFilter] = useState('all')
  const [ownerReferralSearch, setOwnerReferralSearch] = useState('')
  const [ownerTopupUsername, setOwnerTopupUsername] = useState('')
  const [ownerTopupAmount, setOwnerTopupAmount] = useState('')
  const [ownerMsg, setOwnerMsg] = useState('')
  const [ownerMsgType, setOwnerMsgType] = useState<InlineMessageType>('idle')
  const [isOwnerLoading, setIsOwnerLoading] = useState(false)
  const [ownerSaving, setOwnerSaving] = useState<Record<string, boolean>>({})
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false)
  const [ownerDialogType, setOwnerDialogType] = useState<OwnerDialogType>('ok')
  const [ownerDialogTitle, setOwnerDialogTitle] = useState('')
  const [ownerDialogMessage, setOwnerDialogMessage] = useState('')
  const [ownerDialogConfirmLabel, setOwnerDialogConfirmLabel] = useState('Aceptar')
  const [ownerDialogCancelLabel, setOwnerDialogCancelLabel] = useState('Cancelar')
  const [ownerDialogAction, setOwnerDialogAction] = useState<(() => void) | null>(null)

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

        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle<ProfileRow>()

        if (!mounted) return
        if (profileError || !userProfile) {
          setMsg('No se pudo cargar tu perfil.')
          setIsLoading(false)
          return
        }

        if (!userProfile.is_approved) {
          await supabase.auth.signOut()
          if (!mounted) return
          router.replace('/login')
          return
        }

        setUserId(user.id)
        setProfile(userProfile)
        setIsLoading(false)
      })()
    })

    return () => {
      mounted = false
      cancelAnimationFrame(id)
    }
  }, [router])

  useEffect(() => {
    let mounted = true

    if (!userId || !profile?.is_approved) {
      setOwnedProducts([])
      setUserPurchasesCount(0)
      setResolvedTickets([])
      setVisibleCredentials({})
      setUserTicketConfirming({})
      setUserTicketFeedback({})
      setUserOrderContactSaving({})
      setUserOrderContactFeedback({})
      setUserOrderRenewing({})
      setUserOrderRenewFeedback({})
      setUserOrderEditModal(null)
      setUserSupportModal(null)
      setUserSupportModalSaving(false)
      setUserSupportModalFeedback(null)
      setOrdersMsg('')
      setIsOrdersLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsOrdersLoading(true)
    setOrdersMsg('')

    const id = requestAnimationFrame(() => {
      void (async () => {
        const errors: string[] = []

        try {
          const [ordersResult, ticketsResult] = await Promise.all([
            supabase
              .from('orders')
              .select(
                'id, buyer_id, provider_id, product_id, inventory_slot_id, status, delivery_mode, account_type, price_paid, customer_name, customer_phone, customer_extra, credentials, created_at, updated_at, paid_at, delivered_at, duration_days, starts_at, expires_at'
              )
              .eq('buyer_id', userId)
              .order('created_at', { ascending: false }),
            supabase
              .from('tickets')
              .select(
                'id, type, status, buyer_id, provider_id, product_id, order_id, subject, description, resolution_summary, resolution_detail, resolved_by, created_at, updated_at, resolved_at'
              )
              .eq('buyer_id', userId)
              .order('created_at', { ascending: false }),
          ])

          if (!mounted) return

          if (ordersResult.error) {
            errors.push('No se pudieron cargar tus compras.')
          }
          if (ticketsResult.error) {
            errors.push('No se pudieron cargar tus tickets.')
          }

          const orderRows = (ordersResult.data ?? []) as OrderRow[]
          const ticketRows = (ticketsResult.data ?? []) as TicketRow[]
          const paidPurchasesCount = orderRows.filter(order => isPaidLikeOrderStatus(order.status)).length
          const ticketIds = Array.from(
            new Set(ticketRows.map(ticket => toText(ticket.id)).filter((value): value is string => value.length > 0))
          )
          const buyerConfirmedTicketIds = new Set<string>()
          if (ticketIds.length > 0) {
            const { data: ticketMessagesRows, error: ticketMessagesError } = await supabase
              .from('ticket_messages')
              .select('ticket_id, sender_id, body')
              .in('ticket_id', ticketIds)
              .eq('sender_id', userId)

            if (!mounted) return

            if (ticketMessagesError && !isLikelySchemaError(ticketMessagesError.message)) {
              errors.push('No se pudieron cargar confirmaciones de tickets.')
            } else {
              for (const row of (ticketMessagesRows ?? []) as Array<Record<string, unknown>>) {
                const ticketId = toText(row.ticket_id)
                if (!ticketId) continue
                const body = toText(row.body)
                if (body.includes(USER_TICKET_CONFIRM_MARKER)) {
                  buyerConfirmedTicketIds.add(ticketId)
                }
              }
            }
          }

          const orderProductIds = Array.from(
            new Set(
              orderRows
                .map(order => toNullableNumber(order.product_id))
                .filter((value): value is number => value !== null)
                .map(value => Math.floor(value))
            )
          )

          const slotIds = Array.from(
            new Set(
              orderRows
                .map(order => toText(order.inventory_slot_id))
                .filter((value): value is string => value.length > 0)
            )
          )
          const slotInfoById = new Map<string, { slotLabel: string; profilePin: string }>()
          if (slotIds.length > 0) {
            const { data: slotRows, error: slotError } = await supabase
              .from('inventory_slots')
              .select('id, slot_label, profile_pin')
              .in('id', slotIds)

            if (!mounted) return
            if (slotError && !isLikelySchemaError(slotError.message)) {
              errors.push('No se pudo cargar informacion de perfil/PIN de algunos slots.')
            } else {
              for (const row of (slotRows ?? []) as Array<Record<string, unknown>>) {
                const slotId = toText(row.id)
                if (!slotId) continue
                slotInfoById.set(slotId, {
                  slotLabel: toScalarText(row.slot_label),
                  profilePin: toScalarText(row.profile_pin),
                })
              }
            }
          }

          const buyerSlotsByProductId = new Map<
            string,
            Array<{
              slotId: string
              slotLabel: string
              profilePin: string
              slotIndex: number
              loginUser: string
              loginPassword: string
              createdAt: string | null
            }>
          >()
          if (orderProductIds.length > 0 && userId) {
            const { data: buyerSlotRows, error: buyerSlotError } = await supabase
              .from('inventory_slots')
              .select('id, inventory_account_id, product_id, slot_label, profile_pin, slot_index, buyer_id, created_at')
              .in('product_id', orderProductIds)
              .eq('buyer_id', userId)

            if (!mounted) return
            if (buyerSlotError && !isLikelySchemaError(buyerSlotError.message)) {
              errors.push('No se pudieron cargar tus slots asignados para resolver PIN.')
            } else {
              const buyerSlots = (buyerSlotRows ?? []) as Array<Record<string, unknown>>
              const buyerAccountIds = Array.from(
                new Set(
                  buyerSlots
                    .map(row => toText(row.inventory_account_id))
                    .filter((value): value is string => value.length > 0)
                )
              )
              const buyerAccountById = new Map<string, { loginUser: string; loginPassword: string }>()
              if (buyerAccountIds.length > 0) {
                const { data: buyerAccountsRows, error: buyerAccountsError } = await supabase
                  .from('inventory_accounts')
                  .select('id, login_user, login_password')
                  .in('id', buyerAccountIds)
                if (!mounted) return
                if (buyerAccountsError && !isLikelySchemaError(buyerAccountsError.message)) {
                  errors.push('No se pudieron cargar cuentas ligadas a tus slots.')
                } else {
                  for (const row of (buyerAccountsRows ?? []) as Array<Record<string, unknown>>) {
                    const accountId = toText(row.id)
                    if (!accountId) continue
                    buyerAccountById.set(accountId, {
                      loginUser: stripInventoryProfileSuffix(toScalarText(row.login_user)),
                      loginPassword: toScalarText(row.login_password),
                    })
                  }
                }
              }

              for (const row of buyerSlots) {
                const productId = toIdText(row.product_id)
                if (!productId) continue
                const accountId = toText(row.inventory_account_id)
                const accountInfo = buyerAccountById.get(accountId) ?? { loginUser: '', loginPassword: '' }
                const slotLabel = toScalarText(row.slot_label)
                const profilePin = toScalarText(row.profile_pin)
                const slotList = buyerSlotsByProductId.get(productId) ?? []
                slotList.push({
                  slotId: toText(row.id),
                  slotLabel,
                  profilePin,
                  slotIndex: Math.max(1, Math.floor(toNumber(row.slot_index, 1))),
                  loginUser: accountInfo.loginUser,
                  loginPassword: accountInfo.loginPassword,
                  createdAt: toText(row.created_at) || null,
                })
                buyerSlotsByProductId.set(productId, slotList)
              }
            }
          }

          const accountIdsByCredentialKey = new Map<string, string[]>()
          const accountIdsByLoginKey = new Map<string, string[]>()
          const accountProfileLabelById = new Map<string, string>()
          const slotsByAccountId = new Map<string, Array<{ slotLabel: string; profilePin: string; slotIndex: number }>>()
          const slotPinByProductAndLabel = new Map<string, string>()
          if (orderProductIds.length > 0) {
            const [accountsLookupResult, slotsLookupResult] = await Promise.all([
              supabase
                .from('inventory_accounts')
                .select('id, product_id, provider_id, login_user, login_password')
                .in('product_id', orderProductIds),
              supabase
                .from('inventory_slots')
                .select('inventory_account_id, slot_label, profile_pin, slot_index, product_id')
                .in('product_id', orderProductIds),
            ])

            if (!mounted) return

            if (accountsLookupResult.error && !isLikelySchemaError(accountsLookupResult.error.message)) {
              errors.push('No se pudo cargar cuentas de inventario para completar PIN.')
            } else {
              for (const row of (accountsLookupResult.data ?? []) as Array<Record<string, unknown>>) {
                const accountId = toText(row.id)
                if (!accountId) continue
                const providerId = toText(row.provider_id)
                const productId = toIdText(row.product_id)
                const rawLoginUser = toScalarText(row.login_user)
                const profileLabelFromLogin = decodeProfileLabelFromInventoryLogin(rawLoginUser)
                if (profileLabelFromLogin) {
                  accountProfileLabelById.set(accountId, profileLabelFromLogin)
                }
                const loginUser = stripInventoryProfileSuffix(rawLoginUser).toLowerCase()
                const loginPassword = toScalarText(row.login_password)
                if (!productId || !loginUser) continue

                const loginKeys = [
                  `${providerId}::${productId}::${loginUser}`,
                  `${productId}::${loginUser}`,
                ]
                for (const loginKey of loginKeys) {
                  const current = accountIdsByLoginKey.get(loginKey) ?? []
                  current.push(accountId)
                  accountIdsByLoginKey.set(loginKey, current)
                }

                if (loginPassword) {
                  const credentialKeys = [
                    `${providerId}::${productId}::${loginUser}::${loginPassword}`,
                    `${productId}::${loginUser}::${loginPassword}`,
                  ]
                  for (const credentialKey of credentialKeys) {
                    const current = accountIdsByCredentialKey.get(credentialKey) ?? []
                    current.push(accountId)
                    accountIdsByCredentialKey.set(credentialKey, current)
                  }
                }
              }
            }

            if (slotsLookupResult.error && !isLikelySchemaError(slotsLookupResult.error.message)) {
              errors.push('No se pudo cargar slots de inventario para completar PIN.')
            } else {
              for (const row of (slotsLookupResult.data ?? []) as Array<Record<string, unknown>>) {
                const accountId = toText(row.inventory_account_id)
                if (!accountId) continue
                const slotList = slotsByAccountId.get(accountId) ?? []
                const slotLabelRaw = toScalarText(row.slot_label)
                const fallbackSlotLabel = accountProfileLabelById.get(accountId) || ''
                const slotLabelValue = slotLabelRaw || fallbackSlotLabel
                const profilePinValue = toScalarText(row.profile_pin)
                slotList.push({
                  slotLabel: slotLabelValue,
                  profilePin: profilePinValue,
                  slotIndex: Math.max(1, Math.floor(toNumber(row.slot_index, 1))),
                })
                slotsByAccountId.set(accountId, slotList)

                const productId = toIdText(row.product_id)
                if (productId && slotLabelValue && profilePinValue) {
                  const normalizedLabel = slotLabelValue.trim().toLowerCase()
                  if (normalizedLabel) {
                    slotPinByProductAndLabel.set(`${productId}::${normalizedLabel}`, profilePinValue)
                    if (normalizedLabel.startsWith('perfil ')) {
                      slotPinByProductAndLabel.set(
                        `${productId}::${normalizedLabel.replace(/^perfil\s+/i, '').trim()}`,
                        profilePinValue
                      )
                    }
                    if (normalizedLabel.startsWith('profile ')) {
                      slotPinByProductAndLabel.set(
                        `${productId}::${normalizedLabel.replace(/^profile\s+/i, '').trim()}`,
                        profilePinValue
                      )
                    }
                  }
                }
              }
            }
          }

          const productIdSet = new Set<string>()
          for (const order of orderRows) {
            if (order.product_id !== null) productIdSet.add(String(order.product_id))
          }
          for (const ticket of ticketRows) {
            if (ticket.product_id !== null) productIdSet.add(String(ticket.product_id))
          }

          let productRows: ProductRow[] = []
          const productIds = Array.from(productIdSet)
          if (productIds.length > 0) {
            const { data, error } = await supabase
              .from('products')
              .select('id, provider_id, name, description, delivery_mode, account_type, renewable, duration_days')
              .in('id', productIds)

            if (!mounted) return
            if (error) {
              errors.push('No se pudo cargar la data de productos.')
            } else {
              productRows = (data ?? []) as ProductRow[]
            }
          }

          const productById = new Map<string, ProductRow>()
          for (const product of productRows) {
            productById.set(String(product.id), product)
          }

          const providerIdSet = new Set<string>()
          for (const order of orderRows) {
            if (order.provider_id) providerIdSet.add(order.provider_id)
          }
          for (const ticket of ticketRows) {
            if (ticket.provider_id) providerIdSet.add(ticket.provider_id)
          }
          for (const product of productRows) {
            if (product.provider_id) providerIdSet.add(product.provider_id)
          }

          const providerIds = Array.from(providerIdSet)
          const providerById = new Map<string, { username: string; phone: string }>()

          if (providerIds.length > 0) {
            const { data, error } = await supabase.from('profiles').select('*').in('id', providerIds)

            if (!mounted) return

            if (error) {
              errors.push('No se pudo cargar el nombre de algunos proveedores.')
            } else {
              for (const provider of (data ?? []) as Array<Record<string, unknown>>) {
                const providerId = toText(provider.id)
                if (!providerId) continue

                const providerPhone =
                  toText(provider.phone_e164) ||
                  toText(provider.phone) ||
                  toText(provider.celular) ||
                  toText(provider.whatsapp)

                providerById.set(providerId, {
                  username: toText(provider.username) || 'Proveedor',
                  phone: providerPhone,
                })
              }
            }
          }

          const normalizedOrders = orderRows.map<OwnedProduct>(order => {
            const product = order.product_id !== null ? productById.get(String(order.product_id)) : undefined
            const providerId = order.provider_id ?? product?.provider_id ?? ''
            const providerInfo = providerById.get(providerId)
            const providerName = providerInfo?.username ?? 'Proveedor'
            const providerPhone = providerInfo?.phone ?? ''
            const productName = toText(product?.name) || 'Producto sin nombre'
            const slotInfo = toText(order.inventory_slot_id)
              ? slotInfoById.get(toText(order.inventory_slot_id))
              : undefined
            const credentialsText = formatCredentials(order.credentials)
            const credentialSnapshot = extractCredentialSnapshot(credentialsText)
            const credentialLogin =
              credentialSnapshot.username !== '-'
                ? stripInventoryProfileSuffix(credentialSnapshot.username).toLowerCase()
                : ''
            const credentialPassword = credentialSnapshot.password !== '-' ? credentialSnapshot.password : ''
            const credentialProfileLabel = credentialSnapshot.profileNumber !== '-' ? credentialSnapshot.profileNumber : ''

            let resolvedSlotLabel = slotInfo?.slotLabel ?? ''
            let resolvedSlotPin = slotInfo?.profilePin ?? ''

            if ((!resolvedSlotLabel || !resolvedSlotPin) && order.product_id !== null && credentialLogin) {
              const productId = String(order.product_id)
              const candidateAccountIds = Array.from(
                new Set(
                  [
                    ...(credentialPassword
                      ? accountIdsByCredentialKey.get(
                          `${providerId}::${productId}::${credentialLogin}::${credentialPassword}`
                        ) ?? []
                      : []),
                    ...(credentialPassword
                      ? accountIdsByCredentialKey.get(`${productId}::${credentialLogin}::${credentialPassword}`) ?? []
                      : []),
                    ...(accountIdsByLoginKey.get(`${providerId}::${productId}::${credentialLogin}`) ?? []),
                    ...(accountIdsByLoginKey.get(`${productId}::${credentialLogin}`) ?? []),
                  ].filter(Boolean)
                )
              )
              const candidateSlots = candidateAccountIds
                .flatMap(accountId => slotsByAccountId.get(accountId) ?? [])
                .filter(slot => slot.slotLabel || slot.profilePin)

              if (candidateSlots.length > 0) {
                const normalizedWanted = credentialProfileLabel.trim().toLowerCase()
                const pickedSlot =
                  candidateSlots.find(slot => {
                    const slotLabelNormalized = slot.slotLabel.trim().toLowerCase()
                    if (!normalizedWanted) return false
                    return (
                      slotLabelNormalized === normalizedWanted ||
                      String(slot.slotIndex) === normalizedWanted ||
                      `perfil ${slot.slotIndex}` === normalizedWanted ||
                      `profile ${slot.slotIndex}` === normalizedWanted
                    )
                  }) ??
                  candidateSlots.find(slot => Boolean(slot.profilePin)) ??
                  (candidateSlots.length === 1 ? candidateSlots[0] : null)

                if (pickedSlot) {
                  if (!resolvedSlotLabel) resolvedSlotLabel = pickedSlot.slotLabel
                  if (!resolvedSlotPin) resolvedSlotPin = pickedSlot.profilePin
                }
              }
            }

            if (!resolvedSlotPin && order.product_id !== null) {
              const productId = String(order.product_id)
              const labelsToTry = [credentialProfileLabel, resolvedSlotLabel]
              for (const labelRaw of labelsToTry) {
                const normalizedLabel = labelRaw.trim().toLowerCase()
                if (!normalizedLabel) continue
                const lookupKeys = [
                  `${productId}::${normalizedLabel}`,
                  `${productId}::${normalizedLabel.replace(/^perfil\s+/i, '').trim()}`,
                  `${productId}::${normalizedLabel.replace(/^profile\s+/i, '').trim()}`,
                ]
                let foundPin = ''
                for (const lookupKey of lookupKeys) {
                  foundPin = slotPinByProductAndLabel.get(lookupKey) ?? ''
                  if (foundPin) break
                }
                if (foundPin) {
                  resolvedSlotPin = foundPin
                  break
                }
              }
            }

            if (!resolvedSlotPin && order.product_id !== null) {
              const productId = String(order.product_id)
              const buyerSlots = buyerSlotsByProductId.get(productId) ?? []
              if (buyerSlots.length > 0) {
                const normalizedWanted = credentialProfileLabel.trim().toLowerCase()
                const normalizedLogin = credentialLogin.trim().toLowerCase()
                const normalizedPassword = credentialPassword.trim()
                const normalizeSlotLabel = (label: string, index: number) => {
                  const raw = label.trim().toLowerCase()
                  if (!raw) return String(index)
                  if (raw.startsWith('perfil ')) return raw.replace(/^perfil\s+/i, '').trim()
                  if (raw.startsWith('profile ')) return raw.replace(/^profile\s+/i, '').trim()
                  return raw
                }

                const selectedBuyerSlot =
                  buyerSlots.find(slot => {
                    if (!slot.profilePin) return false
                    const slotLogin = stripInventoryProfileSuffix(slot.loginUser).trim().toLowerCase()
                    const slotPassword = slot.loginPassword.trim()
                    const loginMatch = normalizedLogin ? slotLogin === normalizedLogin : true
                    const passwordMatch = normalizedPassword ? slotPassword === normalizedPassword : true
                    if (!loginMatch || !passwordMatch) return false
                    if (!normalizedWanted) return true
                    const slotLabelNormalized = normalizeSlotLabel(slot.slotLabel, slot.slotIndex)
                    return (
                      slotLabelNormalized === normalizedWanted ||
                      String(slot.slotIndex) === normalizedWanted
                    )
                  }) ??
                  buyerSlots.find(slot => {
                    if (!slot.profilePin || !normalizedWanted) return false
                    const slotLabelNormalized = normalizeSlotLabel(slot.slotLabel, slot.slotIndex)
                    return (
                      slotLabelNormalized === normalizedWanted ||
                      String(slot.slotIndex) === normalizedWanted
                    )
                  }) ??
                  buyerSlots.find(slot => Boolean(slot.profilePin)) ??
                  null

                if (selectedBuyerSlot) {
                  if (!resolvedSlotLabel) {
                    resolvedSlotLabel = selectedBuyerSlot.slotLabel || String(selectedBuyerSlot.slotIndex)
                  }
                  resolvedSlotPin = selectedBuyerSlot.profilePin || resolvedSlotPin
                }
              }
            }

            const deliveryMode = toText(order.delivery_mode) || toText(product?.delivery_mode)
            const accountType = toText(order.account_type) || toText(product?.account_type)
            const renewableLabel =
              typeof product?.renewable === 'boolean'
                ? product.renewable
                  ? 'Renovable'
                  : 'No renovable'
                : '-'
            const durationRaw = toNullableNumber(order.duration_days ?? product?.duration_days)
            const durationDays = durationRaw === null ? null : Math.max(1, Math.floor(durationRaw))
            const startsAt = toText(order.starts_at) || null
            const expiresAt = toText(order.expires_at) || null
            const daysLeft = calculateDaysLeft(expiresAt)

            return {
              id: String(order.id),
              productId: order.product_id === null ? null : Math.floor(order.product_id),
              productName,
              productDescription: toText(product?.description) || '-',
              providerId,
              providerName,
              providerPhone,
              status: toText(order.status),
              deliveryMode,
              accountType,
              durationDays,
              startsAt,
              expiresAt,
              daysLeft,
              renewableLabel,
              pricePaid: toNumber(order.price_paid),
              customerName: toText(order.customer_name),
              customerPhone: toText(order.customer_phone),
              customerExtra: formatCredentials(order.customer_extra),
              credentialsText,
              createdAt: order.created_at,
              updatedAt: order.updated_at,
              paidAt: order.paid_at,
              deliveredAt: order.delivered_at,
              inventorySlotLabel: resolvedSlotLabel,
              inventorySlotPin: resolvedSlotPin,
            }
          })

          const normalizedTickets = ticketRows.map<ResolvedTicket>(ticket => {
              const product = ticket.product_id !== null ? productById.get(String(ticket.product_id)) : undefined
              return {
                id: String(ticket.id),
                productName: toText(product?.name) || 'Producto no disponible',
                orderId: ticket.order_id !== null ? String(ticket.order_id) : '-',
                subject: toText(ticket.subject) || 'Ticket sin asunto',
                description: toText(ticket.description) || '-',
                resolutionSummary: toText(ticket.resolution_summary) || '-',
                resolutionDetail: toText(ticket.resolution_detail) || '-',
                status: toText(ticket.status) || '-',
                buyerConfirmed: buyerConfirmedTicketIds.has(String(ticket.id)),
                updatedAt: ticket.updated_at,
                resolvedAt: ticket.resolved_at,
              }
            })

          const visibleTickets = normalizedTickets.filter(ticket => {
            if (!isResolvedStatus(ticket.status)) return true
            return !ticket.buyerConfirmed
          })

          const blockedOrderIds = new Set(
            visibleTickets
              .map(ticket => ticket.orderId)
              .filter(orderId => orderId !== '-' && orderId.trim().length > 0)
          )

          const visibleOrders = normalizedOrders.filter(order => {
            const delivery = order.deliveryMode.trim().toLowerCase()
            const isOnDemand = delivery === 'on_demand' || delivery === 'a_pedido' || delivery === 'a pedido'
            if (blockedOrderIds.has(order.id)) return false
            if (!isOnDemand) return true
            return isPaidLikeOrderStatus(order.status)
          })

          setOwnedProducts(visibleOrders)
          setUserPurchasesCount(paidPurchasesCount)
          setResolvedTickets(visibleTickets)
          setOrdersMsg(errors.join(' '))
        } catch {
          if (!mounted) return
          setOwnedProducts([])
          setUserPurchasesCount(0)
          setResolvedTickets([])
          setOrdersMsg('Error inesperado cargando tus productos y tickets.')
        } finally {
          if (!mounted) return
          setIsOrdersLoading(false)
        }
      })()
    })

    return () => {
      mounted = false
      cancelAnimationFrame(id)
    }
  }, [ordersReloadSeq, profile?.is_approved, userId])

  useEffect(() => {
    setUserOrderContactSaving(previous => {
      const nextSaving: Record<string, boolean> = {}
      for (const order of ownedProducts) {
        if (previous[order.id]) nextSaving[order.id] = true
      }
      return nextSaving
    })

    setUserOrderContactFeedback(previous => {
      const nextFeedback: Record<string, UserOrderContactFeedback> = {}
      for (const order of ownedProducts) {
        const rowFeedback = previous[order.id]
        if (rowFeedback) nextFeedback[order.id] = rowFeedback
      }
      return nextFeedback
    })

    setUserOrderRenewing(previous => {
      const nextSaving: Record<string, boolean> = {}
      for (const order of ownedProducts) {
        if (previous[order.id]) nextSaving[order.id] = true
      }
      return nextSaving
    })

    setUserOrderRenewFeedback(previous => {
      const nextFeedback: Record<string, UserOrderContactFeedback> = {}
      for (const order of ownedProducts) {
        const rowFeedback = previous[order.id]
        if (rowFeedback) nextFeedback[order.id] = rowFeedback
      }
      return nextFeedback
    })

    setUserOrderEditModal(previous => {
      if (!previous) return previous
      const exists = ownedProducts.some(order => order.id === previous.orderId)
      return exists ? previous : null
    })
    setUserSupportModal(previous => {
      if (!previous) return previous
      const exists = ownedProducts.some(order => order.id === previous.orderId)
      return exists ? previous : null
    })
  }, [ownedProducts])

  useEffect(() => {
    setUserTicketConfirming(previous => {
      const next: Record<string, boolean> = {}
      for (const ticket of resolvedTickets) {
        if (previous[ticket.id]) next[ticket.id] = true
      }
      return next
    })

    setUserTicketFeedback(previous => {
      const next: Record<string, UserOrderContactFeedback> = {}
      for (const ticket of resolvedTickets) {
        const rowFeedback = previous[ticket.id]
        if (rowFeedback) next[ticket.id] = rowFeedback
      }
      return next
    })
  }, [resolvedTickets])

  const loadAffiliateMembers = useCallback(async (currentUserId: string) => {
    setIsAffiliateMembersLoading(true)
    setAffiliateMembersMsg('')

    try {
      const linkedMap = new Map<string, string | null>()
      const linkedUsernameMap = new Map<string, string>()
      const profileSeed = new Map<
        string,
        {
          id: string
          username: string | null
          is_approved: boolean
          created_at: string | null
        }
      >()

      let hasReadableSource = false
      let hasRuntimeError = false

      for (const source of AFFILIATE_LINK_QUERIES) {
        const { data, error } = await supabase
          .from(source.table)
          .select('*')
          .eq(source.filterColumn, currentUserId)
          .order('created_at', { ascending: false })
          .limit(250)

        if (error) {
          if (isLikelySchemaError(error.message)) continue
          hasRuntimeError = true
          continue
        }

        hasReadableSource = true

        for (const row of (data ?? []) as Array<Record<string, unknown>>) {
          const linkedUserId = pickRowText(row, source.referredColumns)
          if (!linkedUserId || linkedUserId === currentUserId) continue

          const linkedAt = pickRowText(row, ['created_at', 'linked_at', 'inserted_at']) || null
          if (!linkedMap.has(linkedUserId)) linkedMap.set(linkedUserId, linkedAt)

          const linkedUsername = pickRowText(row, [
            'referred_username',
            'referred_user_username',
            'target_username',
            'username',
          ])
          if (linkedUsername && !linkedUsernameMap.has(linkedUserId)) {
            linkedUsernameMap.set(linkedUserId, linkedUsername)
          }
        }
      }

      const { data: profileLinkedRows, error: profileLinkedError } = await supabase
        .from('profiles')
        .select('id, username, is_approved, created_at')
        .eq('referred_by', currentUserId)
        .order('created_at', { ascending: false })
        .limit(250)

      if (!profileLinkedError) {
        hasReadableSource = true

        for (const row of (profileLinkedRows ?? []) as Array<{
          id: string
          username: string | null
          is_approved: boolean
          created_at: string | null
        }>) {
          if (!row.id || row.id === currentUserId) continue
          profileSeed.set(row.id, row)
          if (!linkedMap.has(row.id)) linkedMap.set(row.id, row.created_at ?? null)
          if (row.username && !linkedUsernameMap.has(row.id)) {
            linkedUsernameMap.set(row.id, row.username)
          }
        }
      }

      const referredIds = Array.from(linkedMap.keys())
      if (referredIds.length === 0) {
        setAffiliateMembers([])
        if (!hasReadableSource && hasRuntimeError) {
          setAffiliateMembersMsg('No se pudo cargar tu red de afiliados por ahora.')
        }
        return
      }

      const profileById = new Map(profileSeed)

      const { data: referredProfiles, error: referredProfilesError } = await supabase
        .from('profiles')
        .select('id, username, is_approved, created_at')
        .in('id', referredIds)

      if (!referredProfilesError) {
        for (const row of (referredProfiles ?? []) as Array<{
          id: string
          username: string | null
          is_approved: boolean
          created_at: string | null
        }>) {
          profileById.set(row.id, row)
          if (row.username && !linkedUsernameMap.has(row.id)) {
            linkedUsernameMap.set(row.id, row.username)
          }
        }
      }

      const salesByBuyer = new Map<string, { count: number; amount: number }>()
      const { data: orderRows, error: orderError } = await supabase
        .from('orders')
        .select('buyer_id, status, price_paid')
        .in('buyer_id', referredIds)

      if (!orderError) {
        for (const order of (orderRows ?? []) as Array<{
          buyer_id: string
          status: string | null
          price_paid: number | null
        }>) {
          if (!isPaidLikeOrderStatus(order.status)) continue

          const current = salesByBuyer.get(order.buyer_id) ?? { count: 0, amount: 0 }
          current.count += 1
          current.amount += toNumber(order.price_paid)
          salesByBuyer.set(order.buyer_id, current)
        }
      }

      const members = referredIds
        .map<AffiliateMember>(id => {
          const profileRow = profileById.get(id)
          const sales = salesByBuyer.get(id) ?? { count: 0, amount: 0 }
          return {
            id,
            // Si RLS no deja leer profiles del referido, usamos username de affiliations.
            username: normalizeDisplayName(profileRow?.username) || normalizeDisplayName(linkedUsernameMap.get(id)) || 'Sin nombre',
            // Regla de negocio actual: al afiliar se aprueba al instante.
            approved: profileRow ? Boolean(profileRow.is_approved) : true,
            linkedAt: linkedMap.get(id) ?? profileRow?.created_at ?? null,
            salesCount: sales.count,
            salesAmount: sales.amount,
          }
        })
        .sort((a, b) => {
          const left = a.linkedAt ? new Date(a.linkedAt).getTime() : 0
          const right = b.linkedAt ? new Date(b.linkedAt).getTime() : 0
          return right - left
        })

      setAffiliateMembers(members)

      if (members.length === 0 && !hasReadableSource && hasRuntimeError) {
        setAffiliateMembersMsg('No se pudo leer la data de afiliados con el esquema actual.')
      }
    } catch {
      setAffiliateMembers([])
      setAffiliateMembersMsg('No se pudo cargar tu red de afiliados por ahora.')
    } finally {
      setIsAffiliateMembersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!userId || !profile?.is_approved) {
      setAffiliateMembers([])
      setAffiliateMembersMsg('')
      setIsAffiliateMembersLoading(false)
      return
    }

    const id = requestAnimationFrame(() => {
      void loadAffiliateMembers(userId)
    })

    return () => cancelAnimationFrame(id)
  }, [loadAffiliateMembers, profile?.is_approved, userId])

  useEffect(() => {
    if (!userId || !profile?.is_approved) return

    let ordersReloadTimer: ReturnType<typeof setTimeout> | null = null
    let profileReloadTimer: ReturnType<typeof setTimeout> | null = null
    let affiliateReloadTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleOrdersReload = () => {
      if (ordersReloadTimer) return
      ordersReloadTimer = setTimeout(() => {
        ordersReloadTimer = null
        setOrdersReloadSeq(previous => previous + 1)
      }, 240)
    }

    const scheduleProfileReload = () => {
      if (profileReloadTimer) return
      profileReloadTimer = setTimeout(() => {
        profileReloadTimer = null
        void (async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle<ProfileRow>()
          if (error || !data) return
          setProfile(data)
        })()
      }, 260)
    }

    const scheduleAffiliateReload = () => {
      if (affiliateReloadTimer) return
      affiliateReloadTimer = setTimeout(() => {
        affiliateReloadTimer = null
        void loadAffiliateMembers(userId)
      }, 260)
    }

    const channel = supabase.channel(`user-live-${userId}`)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${userId}` }, scheduleOrdersReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `buyer_id=eq.${userId}` }, scheduleOrdersReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleOrdersReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, scheduleProfileReload)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'affiliations', filter: `referrer_user_id=eq.${userId}` },
        scheduleAffiliateReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_affiliations', filter: `referrer_user_id=eq.${userId}` },
        scheduleAffiliateReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals', filter: `referrer_user_id=eq.${userId}` },
        scheduleAffiliateReload
      )
      .subscribe()

    return () => {
      if (ordersReloadTimer) clearTimeout(ordersReloadTimer)
      if (profileReloadTimer) clearTimeout(profileReloadTimer)
      if (affiliateReloadTimer) clearTimeout(affiliateReloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [loadAffiliateMembers, profile?.is_approved, userId])

  async function handleSignOut() {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMsg('No se pudo cerrar sesion. Intenta otra vez.')
      setIsSigningOut(false)
      return
    }

    router.push('/login')
  }

  function toggleCredentials(orderId: string) {
    setVisibleCredentials(previous => ({ ...previous, [orderId]: !previous[orderId] }))
  }

  function openUserOrderEditModal(order: OwnedProduct, field: 'customerName' | 'customerPhone') {
    setUserOrderEditModal({
      orderId: order.id,
      field,
      value: field === 'customerName' ? order.customerName || '' : order.customerPhone || '',
    })
    setUserOrderContactFeedback(previous => {
      if (!previous[order.id]) return previous
      const next = { ...previous }
      delete next[order.id]
      return next
    })
  }

  function closeUserOrderEditModal() {
    setUserOrderEditModal(null)
  }

  function handleUserOrderEditModalChange(value: string) {
    setUserOrderEditModal(previous => {
      if (!previous) return previous
      return {
        ...previous,
        value,
      }
    })
  }

  async function handleUserOrderContactSave(
    order: OwnedProduct,
    customerNameRaw: string,
    customerPhoneRaw: string
  ) {
    if (!userId) {
      setUserOrderContactFeedback(previous => ({
        ...previous,
        [order.id]: { type: 'error', text: 'Sesion no valida para guardar.' },
      }))
      return
    }

    const nextCustomerName = customerNameRaw.trim()
    const nextCustomerPhone = customerPhoneRaw.trim()
    const currentCustomerName = order.customerName.trim()
    const currentCustomerPhone = order.customerPhone.trim()

    if (nextCustomerName === currentCustomerName && nextCustomerPhone === currentCustomerPhone) return

    setUserOrderContactSaving(previous => ({ ...previous, [order.id]: true }))

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          customer_name: nextCustomerName || null,
          customer_phone: nextCustomerPhone || null,
        })
        .eq('id', order.id)
        .eq('buyer_id', userId)
        .select('id')
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data?.id) throw new Error('No se encontro la compra para actualizar.')

      setOwnedProducts(previous =>
        previous.map(item =>
          item.id === order.id
            ? {
                ...item,
                customerName: nextCustomerName,
                customerPhone: nextCustomerPhone,
              }
            : item
        )
      )

      setUserOrderContactFeedback(previous => ({
        ...previous,
        [order.id]: { type: 'ok', text: 'Guardado.' },
      }))
      setUserOrderEditModal(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido.'
      setUserOrderContactFeedback(previous => ({
        ...previous,
        [order.id]: { type: 'error', text: `No se pudo guardar. ${message}` },
      }))
    } finally {
      setUserOrderContactSaving(previous => ({ ...previous, [order.id]: false }))
    }
  }

  async function handleUserRenewOrder(order: OwnedProduct) {
    const orderId = order.id.trim()
    if (!userId || !orderId) {
      setUserOrderRenewFeedback(previous => ({
        ...previous,
        [order.id]: { type: 'error', text: 'Sesion invalida para renovar.' },
      }))
      return
    }

    const wantsRenew =
      typeof window === 'undefined' ||
      window.confirm(`Confirmar renovacion de ${order.productName}? Se descontara saldo de tu cuenta.`)
    if (!wantsRenew) return

    setUserOrderRenewing(previous => ({ ...previous, [orderId]: true }))
    setUserOrderRenewFeedback(previous => {
      const next = { ...previous }
      delete next[orderId]
      return next
    })

    let buyerBalanceCurrent = 0
    let buyerDebited = false
    let providerCredited = false
    let providerCreditedId = ''
    let providerBalanceColumn = ''
    let providerBalanceCurrent = 0

    try {
      const [orderResult, buyerProfileResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, buyer_id, provider_id, product_id, account_type, duration_days, expires_at, starts_at, status, price_paid')
          .eq('id', orderId)
          .eq('buyer_id', userId)
          .maybeSingle(),
        supabase.from('profiles').select('balance').eq('id', userId).maybeSingle(),
      ])

      if (orderResult.error) throw new Error(orderResult.error.message)
      const orderRow = (orderResult.data ?? null) as Record<string, unknown> | null
      if (!orderRow?.id) throw new Error('No se encontro la compra para renovar.')

      if (buyerProfileResult.error) throw new Error(buyerProfileResult.error.message)
      buyerBalanceCurrent = Math.max(
        0,
        toNumber((buyerProfileResult.data as Record<string, unknown> | null)?.balance, 0)
      )

      const productId = Math.floor(toNumber(orderRow.product_id ?? order.productId, 0))
      if (productId <= 0) throw new Error('La compra no tiene producto valido.')

      const providerId = toText(orderRow.provider_id) || order.providerId
      if (!providerId) throw new Error('La compra no tiene proveedor asignado.')

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle()
      if (productError) throw new Error(productError.message)
      const productRow = (productData ?? null) as Record<string, unknown> | null
      if (!productRow) throw new Error('No se encontro el producto de la compra.')
      if (!isTrueLike(productRow.renewable)) throw new Error('Este producto no es renovable.')

      const accountType =
        toText(orderRow.account_type) || toText(productRow.account_type) || order.accountType
      const renewalAmount = resolveRenewalAmountFromProductRow(
        productRow,
        Math.max(0, toNumber(orderRow.price_paid, order.pricePaid))
      )
      if (!Number.isFinite(renewalAmount) || renewalAmount <= 0) {
        throw new Error('No se pudo calcular monto de renovacion.')
      }
      if (buyerBalanceCurrent + 1e-9 < renewalAmount) {
        throw new Error(`Saldo insuficiente. Necesitas ${formatMoney(renewalAmount)}.`)
      }

      const commissionAmount = getProviderCommissionAmount(accountType)
      const providerCredit = Math.max(0, renewalAmount - commissionAmount)
      const nextBuyerBalance = Number((buyerBalanceCurrent - renewalAmount).toFixed(2))

      const { error: buyerUpdateError } = await supabase
        .from('profiles')
        .update({ balance: nextBuyerBalance })
        .eq('id', userId)
      if (buyerUpdateError) throw new Error(`No se pudo descontar saldo. ${buyerUpdateError.message}`)
      buyerDebited = true

      if (providerCredit > 0) {
        const { data: providerProfileData, error: providerReadError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', providerId)
          .maybeSingle()
        if (providerReadError) throw new Error(providerReadError.message)

        const providerRow = (providerProfileData ?? null) as Record<string, unknown> | null
        if (!providerRow) throw new Error('No se encontro perfil del proveedor para acreditar saldo.')

        providerBalanceColumn =
          PROVIDER_BALANCE_KEYS.find(key => Object.prototype.hasOwnProperty.call(providerRow, key)) ??
          'provider_balance'
        providerBalanceCurrent = Math.max(0, toNumber(providerRow[providerBalanceColumn], 0))
        const nextProviderBalance = Number((providerBalanceCurrent + providerCredit).toFixed(2))

        const { error: providerUpdateError } = await supabase
          .from('profiles')
          .update({ [providerBalanceColumn]: nextProviderBalance })
          .eq('id', providerId)
        if (providerUpdateError) {
          throw new Error(`No se pudo acreditar saldo al proveedor. ${providerUpdateError.message}`)
        }
        providerCredited = true
        providerCreditedId = providerId
      }

      const durationRaw = toNullableNumber(
        productRow.duration_days ?? orderRow.duration_days ?? order.durationDays
      )
      const durationDays = durationRaw === null ? null : Math.max(1, Math.floor(durationRaw))
      if (durationDays === null) throw new Error('Este producto no tiene duracion valida para renovar.')

      const now = new Date()
      const currentExpiresRaw = toText(orderRow.expires_at) || order.expiresAt || ''
      const currentExpiresDate = currentExpiresRaw ? new Date(currentExpiresRaw) : null
      const hasActiveExpiry =
        currentExpiresDate !== null &&
        !Number.isNaN(currentExpiresDate.getTime()) &&
        currentExpiresDate.getTime() > now.getTime()
      const baseDate = hasActiveExpiry && currentExpiresDate ? currentExpiresDate : now
      const nextExpiresAt = new Date(baseDate.getTime() + durationDays * 86400000).toISOString()
      const startsAt = toText(orderRow.starts_at) || order.startsAt || now.toISOString()
      const currentStatus = toText(orderRow.status)
      const nextStatus = isPaidLikeOrderStatus(currentStatus) ? currentStatus : 'paid'

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          starts_at: startsAt,
          expires_at: nextExpiresAt,
          duration_days: durationDays,
          status: nextStatus,
        })
        .eq('id', orderId)
        .eq('buyer_id', userId)
      if (orderUpdateError) {
        throw new Error(`No se pudo actualizar vencimiento. ${orderUpdateError.message}`)
      }

      setOwnedProducts(previous =>
        previous.map(item =>
          item.id === orderId
            ? {
                ...item,
                startsAt,
                expiresAt: nextExpiresAt,
                durationDays,
                daysLeft: calculateDaysLeft(nextExpiresAt),
                status: nextStatus,
              }
            : item
        )
      )
      setUserOrderRenewFeedback(previous => ({
        ...previous,
        [orderId]: {
          type: 'ok',
          text: `Renovado: ${formatMoney(renewalAmount)}. Proveedor recibe ${formatMoney(
            Math.max(0, renewalAmount - commissionAmount)
          )}.`,
        },
      }))
      setOrdersReloadSeq(previous => previous + 1)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido.'

      if (providerCredited && providerBalanceColumn && providerCreditedId) {
        await supabase
          .from('profiles')
          .update({ [providerBalanceColumn]: providerBalanceCurrent })
          .eq('id', providerCreditedId)
      }
      if (buyerDebited) {
        await supabase.from('profiles').update({ balance: buyerBalanceCurrent }).eq('id', userId)
      }

      setUserOrderRenewFeedback(previous => ({
        ...previous,
        [orderId]: { type: 'error', text: `No se pudo renovar. ${message}` },
      }))
    } finally {
      setUserOrderRenewing(previous => ({ ...previous, [orderId]: false }))
    }
  }

  function openUserSupportModal(order: OwnedProduct) {
    setUserSupportModal({
      orderId: order.id,
      subject: `Soporte ${order.productName}`,
      description: '',
    })
    setUserSupportModalFeedback(null)
  }

  function closeUserSupportModal() {
    setUserSupportModal(null)
    setUserSupportModalSaving(false)
    setUserSupportModalFeedback(null)
  }

  function handleUserSupportModalChange(field: 'subject' | 'description', value: string) {
    setUserSupportModal(previous => {
      if (!previous) return previous
      return {
        ...previous,
        [field]: value,
      }
    })
    setUserSupportModalFeedback(null)
  }

  async function handleUserSupportModalSubmit() {
    if (!userId || !userSupportModal) {
      setUserSupportModalFeedback({ type: 'error', text: 'Sesion invalida para enviar soporte.' })
      return
    }

    const order = ownedProducts.find(item => item.id === userSupportModal.orderId)
    if (!order) {
      setUserSupportModalFeedback({ type: 'error', text: 'No se encontro la compra para soporte.' })
      return
    }
    if (!order.providerId) {
      setUserSupportModalFeedback({ type: 'error', text: 'Esta compra no tiene proveedor asignado.' })
      return
    }

    const subject = userSupportModal.subject.trim() || `Soporte ${order.productName}`
    const description = userSupportModal.description.trim()
    if (description.length < 4) {
      setUserSupportModalFeedback({ type: 'error', text: 'Escribe el detalle del problema.' })
      return
    }

    setUserSupportModalSaving(true)

    try {
      const payloadBase: Record<string, unknown> = {
        buyer_id: userId,
        provider_id: order.providerId,
        subject,
        description,
      }

      const existingSupportTypes = providerTickets
        .map(ticket => toText(ticket.type).trim().toLowerCase())
        .filter(type => type.length > 0 && !isOnDemandTicketType(type))
      const typeCandidates = Array.from(
        new Set([...existingSupportTypes, 'support', 'soporte', 'ticket', 'general', 'normal'])
      )
      const statusCandidates = Array.from(new Set(['open', 'abierto']))
      const relationVariants: Array<{ order_id: string | null; product_id: number | null }> = [
        { order_id: order.id, product_id: order.productId },
        { order_id: null, product_id: order.productId },
        { order_id: null, product_id: null },
      ]

      let sent = false
      let finalError = ''
      const retryableInsertError = (message: string) => {
        const lower = message.toLowerCase()
        return (
          lower.includes('violates check constraint') ||
          lower.includes('tickets_type_check') ||
          lower.includes('tickets_status_check') ||
          lower.includes('invalid input syntax') ||
          lower.includes('null value in column')
        )
      }

      attemptLoop: for (const relation of relationVariants) {
        for (const statusValue of statusCandidates) {
          for (const typeValue of [...typeCandidates, '']) {
            const payload: Record<string, unknown> = {
              ...payloadBase,
              ...relation,
              status: statusValue,
            }
            if (typeValue) payload.type = typeValue

            const { error } = await supabase.from('tickets').insert(payload)
            if (!error) {
              sent = true
              break attemptLoop
            }

            finalError = error.message
            if (!retryableInsertError(error.message)) {
              break attemptLoop
            }
          }
        }
      }

      if (!sent) {
        throw new Error(finalError || 'No se pudo crear ticket de soporte.')
      }

      setUserSupportModalFeedback({ type: 'ok', text: 'Soporte enviado al proveedor.' })
      setOrdersReloadSeq(previous => previous + 1)
      setTimeout(() => {
        setUserSupportModal(null)
        setUserSupportModalSaving(false)
        setUserSupportModalFeedback(null)
      }, 450)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setUserSupportModalFeedback({ type: 'error', text: `No se pudo enviar soporte. ${message}` })
    } finally {
      setUserSupportModalSaving(false)
    }
  }

  async function handleUserConfirmTicket(ticket: ResolvedTicket) {
    if (!userId) {
      setUserTicketFeedback(previous => ({
        ...previous,
        [ticket.id]: { type: 'error', text: 'Sesion invalida para confirmar ticket.' },
      }))
      return
    }

    if (!isResolvedStatus(ticket.status)) {
      setUserTicketFeedback(previous => ({
        ...previous,
        [ticket.id]: { type: 'error', text: 'Ese ticket aun no esta resuelto.' },
      }))
      return
    }

    setUserTicketConfirming(previous => ({ ...previous, [ticket.id]: true }))
    setUserTicketFeedback(previous => {
      const next = { ...previous }
      delete next[ticket.id]
      return next
    })

    try {
      const { error: messageError } = await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: userId,
        body: `${USER_TICKET_CONFIRM_MARKER} ${new Date().toISOString()}`,
        is_internal: false,
      })

      if (messageError) {
        throw new Error(messageError.message)
      }

      const closeStatusCandidates = ['closed', 'resolved', 'resuelto']
      for (const nextStatus of closeStatusCandidates) {
        const { error: closeError } = await supabase
          .from('tickets')
          .update({ status: nextStatus })
          .eq('id', ticket.id)
          .eq('buyer_id', userId)
        if (!closeError) break
      }

      setUserTicketFeedback(previous => ({
        ...previous,
        [ticket.id]: { type: 'ok', text: 'Ticket confirmado. La cuenta vuelve a Mis productos.' },
      }))
      setOrdersReloadSeq(previous => previous + 1)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setUserTicketFeedback(previous => ({
        ...previous,
        [ticket.id]: { type: 'error', text: `No se pudo confirmar ticket. ${message}` },
      }))
    } finally {
      setUserTicketConfirming(previous => ({ ...previous, [ticket.id]: false }))
    }
  }

  function resolveOrderCredentialForMessage(order: OwnedProduct) {
    const credential = extractCredentialSnapshot(order.credentialsText)
    const usernameRaw = credential.username
    const emailValue = usernameRaw === '-' ? '-' : stripInventoryProfileSuffix(usernameRaw)
    const profileFromLogin = usernameRaw === '-' ? '' : decodeProfileLabelFromInventoryLogin(usernameRaw)
    const slotProfileLabel = order.inventorySlotLabel.trim()
    const profileValue = (() => {
      const fromCredential = credential.profileNumber.trim()
      if (
        slotProfileLabel &&
        (fromCredential === '-' || isGenericProfileSlotLabel(fromCredential, 1))
      ) {
        return slotProfileLabel
      }
      if (fromCredential !== '-') return fromCredential
      if (profileFromLogin) return profileFromLogin
      return '-'
    })()
    const pinValue = credential.pin !== '-' ? credential.pin : order.inventorySlotPin.trim() || '-'
    return {
      emailValue,
      passwordValue: credential.password !== '-' ? credential.password : '-',
      profileValue,
      pinValue,
      isProfileProduct: isProfilesAccountType(order.accountType),
    }
  }

  function buildSendToCustomerLink(order: OwnedProduct) {
    const customerPhone = normalizeWhatsappPhone(order.customerPhone)
    if (!customerPhone || !order.credentialsText) return ''
    const credentialInfo = resolveOrderCredentialForMessage(order)
    const lines = [
      `${WA_EMOJI.check} Gracias por tu compra ${WA_EMOJI.handshake}${WA_EMOJI.sparkles}`,
      `${WA_EMOJI.movie} *Producto:* *${order.productName}*`,
      '',
      `${WA_EMOJI.mail} *Correo:* ${credentialInfo.emailValue}`,
      `${WA_EMOJI.lock} *Contrasena:* ${credentialInfo.passwordValue}`,
    ]

    if (credentialInfo.isProfileProduct) {
      lines.push(
        `${WA_EMOJI.profile} *Perfil:* ${credentialInfo.profileValue}`,
        `${WA_EMOJI.pin} *PIN:* ${credentialInfo.pinValue}`
      )
    }
    lines.push('', `Cualquier duda con el acceso me escribes ${WA_EMOJI.hands}`)
    return buildWhatsappUrl(customerPhone, lines)
  }

  function buildExpiryReminderLink(order: OwnedProduct) {
    const customerPhone = normalizeWhatsappPhone(order.customerPhone)
    if (!customerPhone || !order.credentialsText) return ''
    const credentialInfo = resolveOrderCredentialForMessage(order)
    const lines = [
      `${WA_EMOJI.hourglass} *Aviso de vencimiento*`,
      `Tu *${order.productName}* esta por vencer.`,
      '',
      `${WA_EMOJI.mail} *Correo:* ${credentialInfo.emailValue}`,
      `${WA_EMOJI.lock} *Contrasena:* ${credentialInfo.passwordValue}`,
    ]

    if (credentialInfo.isProfileProduct) {
      lines.push(
        `${WA_EMOJI.profile} *Perfil:* ${credentialInfo.profileValue}`,
        `${WA_EMOJI.pin} *PIN:* ${credentialInfo.pinValue}`
      )
    }

    lines.push('', `Si deseas *renovar* para seguir sin cortes, escribeme y lo coordinamos ${WA_EMOJI.check}`)
    return buildWhatsappUrl(customerPhone, lines)
  }

  function buildProviderHelpLink(order: OwnedProduct) {
    const providerPhone = normalizeWhatsappPhone(order.providerPhone)
    if (!providerPhone) return ''
    const text = [
      `Hola ${order.providerName}, tengo un problema con esta cuenta.`,
      `Producto: ${order.productName}.`,
      `Pedido: #${order.id}.`,
    ]
    return buildWhatsappUrl(providerPhone, text)
  }

  async function handleAffiliateSubmit() {
    const target = affiliateUsername.trim()
    if (!target) {
      setAffiliateMsgType('error')
      setAffiliateMsg('Escribe un username para afiliar.')
      setShowAffiliateNotFoundModal(false)
      return
    }
    if (!userId) {
      setAffiliateMsgType('error')
      setAffiliateMsg('No se pudo validar tu sesion para afiliar.')
      setShowAffiliateNotFoundModal(false)
      return
    }

    setIsAffiliateSubmitting(true)
    setAffiliateMsg('')
    setShowAffiliateNotFoundModal(false)

    const result = await affiliateUserByUsernameAction({
      supabase,
      referrerUserId: userId,
      referrerUsername: profile?.username ?? '',
      targetUsername: target,
    })

    if (result.code === 'OK') {
      setAffiliateMsgType('ok')
      setAffiliateMsg('Usuario afiliado y aprobado correctamente.')
      setAffiliateUsername('')
      if (userId) void loadAffiliateMembers(userId)
      setIsAffiliateSubmitting(false)
      return
    }

    setAffiliateMsgType('error')
    switch (result.code) {
      case 'USER_NOT_FOUND':
        setAffiliateMsg('')
        setShowAffiliateNotFoundModal(true)
        break
      case 'CANNOT_SELF_AFFILIATE':
        setAffiliateMsg('No puedes afiliarte a ti mismo.')
        break
      case 'ALREADY_AFFILIATED':
        setAffiliateMsg('Ese usuario ya fue afiliado antes.')
        break
      case 'NOT_AUTHENTICATED':
        setAffiliateMsg('Tu sesion expiro. Cierra sesion y vuelve a entrar.')
        break
      case 'PERMISSION_DENIED':
        setAffiliateMsg('No tienes permisos para afiliar en este momento. Avisa al owner.')
        break
      case 'INVALID_INPUT':
        setAffiliateMsg('Ingresa un username valido.')
        break
      default:
        setAffiliateMsg('Error del sistema. Intenta otra vez.')
    }

    setIsAffiliateSubmitting(false)
  }

  const normalizedRole = normalizeAppRole(profile?.role ?? '')
  const isOwner = normalizedRole === 'owner'
  const isAdmin = normalizedRole === 'admin'
  const isOwnerOrAdmin = isOwner || isAdmin
  const isProvider = normalizedRole === 'provider'
  const canSeeProvider = isProvider || isOwner
  const canSeeAdminAccounts = isOwnerOrAdmin
  const providerDisplayName = normalizeDisplayName(profile?.username) || 'Proveedor'
  const menuItems = useMemo(
    () =>
      DASHBOARD_MENU_ITEMS.filter(item => {
        if (item.id === 'proveedor') return canSeeProvider
        if (item.id === 'administrador-cuentas') return canSeeAdminAccounts
        return true
      }),
    [canSeeProvider, canSeeAdminAccounts]
  )

  const filteredMenuItems = useMemo(() => {
    const term = menuSearch.trim().toLowerCase()
    if (term.length === 0) return menuItems
    return menuItems.filter(item => item.label.toLowerCase().includes(term))
  }, [menuItems, menuSearch])

  const currentSectionId =
    menuItems.some(item => item.id === activeSection) && menuItems.length > 0
      ? activeSection
      : menuItems[0]?.id ?? 'mis-productos'
  const isBlockingOverlayOpen =
    menuOpen ||
    showAffiliateNotFoundModal ||
    showAffiliateRulesModal ||
    showSupportMaintenanceModal ||
    showProviderProductForm ||
    showProviderProfilesModal ||
    showProviderInventoryModal ||
    showProviderInventoryProfilesModal ||
    providerInventoryEditingAccountId !== null ||
    providerSelectedOrderId !== null ||
    providerSelectedTicketId !== null ||
    providerBuyerModal !== null ||
    ownerDialogOpen ||
    userSupportModal !== null ||
    userOrderEditModal !== null

  const handleMenuSectionClick = useCallback((sectionId: DashboardSectionId) => {
    if (sectionId === 'codigo-soporte') {
      setShowSupportMaintenanceModal(true)
      setMenuOpen(false)
      return
    }

    setActiveSection(sectionId)
    setMenuOpen(false)
  }, [])

  useEffect(() => {
    if (!isBlockingOverlayOpen) return

    const body = document.body
    const html = document.documentElement
    const scrollY = window.scrollY
    const previousBodyOverflow = body.style.overflow
    const previousBodyPosition = body.style.position
    const previousBodyTop = body.style.top
    const previousBodyWidth = body.style.width
    const previousHtmlOverflow = html.style.overflow

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    html.style.overflow = 'hidden'

    return () => {
      body.style.overflow = previousBodyOverflow
      body.style.position = previousBodyPosition
      body.style.top = previousBodyTop
      body.style.width = previousBodyWidth
      html.style.overflow = previousHtmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [isBlockingOverlayOpen])

  const providerPinExpected = toText(profile?.purchase_pin)
  const providerAvatarUrl = toText(profile?.provider_avatar_url)
  const providerDisplayInitial = providerDisplayName.trim().charAt(0).toUpperCase() || 'P'

  function resetProviderProductForm() {
    setEditingProviderProductId(null)
    setProviderProductForm(PROVIDER_FORM_DEFAULT)
    setShowProviderProfilesModal(false)
  }

  function startProviderProductEdit(product: ProviderProduct) {
    setShowProviderProductForm(true)
    setEditingProviderProductId(product.id)
    setProviderProductForm({
      name: product.name,
      summary: product.summary,
      logo: product.logo,
      durationDays: product.durationDays === null ? '' : String(product.durationDays),
      profilesPerAccount: product.profilesPerAccount !== null ? String(product.profilesPerAccount) : '5',
      priceGuest: String(product.priceGuest),
      priceAffiliate: String(product.priceAffiliate),
      renewable: product.renewable,
      renewalPrice: product.renewalPrice === null ? '' : String(product.renewalPrice),
      deliveryMode: product.deliveryMode || 'instant',
      accountType: toProviderFormAccountType(product.accountType || 'profiles'),
      extraRequiredFields: product.extraRequiredFieldsRaw,
      isActive: product.isActive,
    })
  }

  async function handleProviderLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!userId) {
      setProviderMsgType('error')
      setProviderMsg('No se pudo validar tu sesion para subir imagen.')
      event.target.value = ''
      return
    }

    if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setProviderMsgType('error')
      setProviderMsg('Selecciona un archivo de imagen valido (PNG/JPG/WEBP).')
      event.target.value = ''
      return
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setProviderMsgType('error')
      setProviderMsg('La imagen pesa demasiado. Usa una de maximo 2MB.')
      event.target.value = ''
      return
    }

    setIsProviderImageUploading(true)
    setProviderMsgType('idle')
    setProviderMsg('Subiendo imagen...')

    const safeName = sanitizeFilePart(providerProductForm.name || 'producto')
    const ext = resolveFileExtension(file)
    const objectPath = `${userId}/${Date.now()}-${safeName}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      setIsProviderImageUploading(false)
      setProviderMsgType('error')
      setProviderMsg(
        `No se pudo subir imagen. Verifica bucket '${PRODUCT_IMAGE_BUCKET}' y policy INSERT/SELECT. ${uploadError.message}`
      )
      event.target.value = ''
      return
    }

    const { data: publicData } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath)
    const publicUrl = toText(publicData.publicUrl)
    if (!publicUrl) {
      setIsProviderImageUploading(false)
      setProviderMsgType('error')
      setProviderMsg('La imagen se subio, pero no se pudo generar URL publica.')
      event.target.value = ''
      return
    }

    setProviderProductForm(previous => ({ ...previous, logo: publicUrl }))
    setIsProviderImageUploading(false)
    setProviderMsgType('ok')
    setProviderMsg('Imagen subida correctamente a Supabase.')
    event.target.value = ''
  }

  async function handleProviderAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!userId) {
      setProviderMsgType('error')
      setProviderMsg('No se pudo validar tu sesion para subir foto de perfil.')
      event.target.value = ''
      return
    }

    if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setProviderMsgType('error')
      setProviderMsg('Selecciona una imagen valida (PNG/JPG/WEBP/AVIF).')
      event.target.value = ''
      return
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setProviderMsgType('error')
      setProviderMsg('La foto pesa demasiado. Usa una de maximo 2MB.')
      event.target.value = ''
      return
    }

    setIsProviderAvatarUploading(true)
    setProviderMsgType('idle')
    setProviderMsg('Subiendo foto de perfil...')

    const safeName = sanitizeFilePart(profile?.username || 'proveedor')
    const ext = resolveFileExtension(file)
    const objectPath = `${userId}/avatar-${Date.now()}-${safeName}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(PROVIDER_AVATAR_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      setIsProviderAvatarUploading(false)
      setProviderMsgType('error')
      setProviderMsg(
        `No se pudo subir foto de perfil. Revisa bucket '${PROVIDER_AVATAR_BUCKET}' y policies. ${uploadError.message}`
      )
      event.target.value = ''
      return
    }

    const { data: publicData } = supabase.storage.from(PROVIDER_AVATAR_BUCKET).getPublicUrl(objectPath)
    const publicUrl = toText(publicData.publicUrl)
    if (!publicUrl) {
      setIsProviderAvatarUploading(false)
      setProviderMsgType('error')
      setProviderMsg('La foto se subio, pero no se pudo generar URL publica.')
      event.target.value = ''
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ provider_avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) {
      setIsProviderAvatarUploading(false)
      setProviderMsgType('error')
      setProviderMsg(`No se pudo guardar la foto en tu perfil. ${updateError.message}`)
      event.target.value = ''
      return
    }

    setProfile(previous =>
      previous
        ? {
            ...previous,
            provider_avatar_url: publicUrl,
          }
        : previous
    )
    setIsProviderAvatarUploading(false)
    setProviderMsgType('ok')
    setProviderMsg('Foto de perfil actualizada.')
    event.target.value = ''
  }

  async function handleProviderAvatarClear() {
    if (!userId) {
      setProviderMsgType('error')
      setProviderMsg('No se pudo validar tu sesion para quitar foto.')
      return
    }

    setIsProviderAvatarUploading(true)
    const { error } = await supabase.from('profiles').update({ provider_avatar_url: null }).eq('id', userId)
    setIsProviderAvatarUploading(false)

    if (error) {
      setProviderMsgType('error')
      setProviderMsg(`No se pudo quitar foto de perfil. ${error.message}`)
      return
    }

    setProfile(previous =>
      previous
        ? {
            ...previous,
            provider_avatar_url: null,
          }
        : previous
    )
    setProviderMsgType('ok')
    setProviderMsg('Foto de perfil eliminada.')
  }

  function unlockProviderPanel() {
    const pinValue = providerPinInput.trim()
    if (!providerPinExpected) {
      setProviderPinError('No tienes PIN configurado en tu perfil.')
      return
    }
    if (!isValidPin(pinValue)) {
      setProviderPinError('Ingresa un PIN valido de 4 digitos.')
      return
    }
    if (pinValue !== providerPinExpected) {
      setProviderPinError('PIN incorrecto.')
      return
    }
    setProviderAccessGranted(true)
    setProviderPinError('')
    setProviderPinInput('')
  }

  const loadProviderDashboardData = useCallback(async () => {
    if (!userId || !canSeeProvider) return

    setIsProviderLoading(true)
    setProviderMsg('')
    setProviderMsgType('idle')

    try {
      let productsQuery = supabase.from('products').select('*').order('created_at', { ascending: false }).limit(350)
      let ticketsQuery = supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(350)
      let ordersQuery = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1200)
      let accountsQuery = supabase.from('inventory_accounts').select('*').limit(4000)
      let slotsQuery = supabase.from('inventory_slots').select('*').limit(8000)
      const profileBalanceQuery = supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      const providerLimitQuery = supabase
        .from('provider_limits')
        .select('*')
        .eq('provider_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)

      if (!isOwner) {
        productsQuery = productsQuery.eq('provider_id', userId)
        ticketsQuery = ticketsQuery.eq('provider_id', userId)
        ordersQuery = ordersQuery.eq('provider_id', userId)
        accountsQuery = accountsQuery.eq('provider_id', userId)
        slotsQuery = slotsQuery.eq('provider_id', userId)
      }

      const [productsResult, ticketsResult, ordersResult, accountsResult, slotsResult, profileBalanceResult, providerLimitResult] = await Promise.all([
        productsQuery,
        ticketsQuery,
        ordersQuery,
        accountsQuery,
        slotsQuery,
        profileBalanceQuery,
        providerLimitQuery,
      ])

      const errors: string[] = []

      if (productsResult.error) {
        errors.push('No se pudieron cargar productos del proveedor.')
      }
      if (ticketsResult.error) {
        errors.push('No se pudieron cargar tickets del proveedor.')
      }
      if (ordersResult.error) {
        errors.push('No se pudieron cargar pedidos del proveedor.')
      }
      if (accountsResult.error && !isLikelySchemaError(accountsResult.error.message)) {
        errors.push('No se pudo cargar inventario de cuentas.')
      }
      if (slotsResult.error && !isLikelySchemaError(slotsResult.error.message)) {
        errors.push('No se pudo cargar inventario de perfiles.')
      }
      if (profileBalanceResult.error && !isLikelySchemaError(profileBalanceResult.error.message)) {
        errors.push('No se pudo leer saldo del proveedor.')
      }
      if (providerLimitResult.error && !isLikelySchemaError(providerLimitResult.error.message)) {
        errors.push('No se pudo leer limite de productos del proveedor.')
      }

      const productRows = (productsResult.data ?? []) as Array<Record<string, unknown>>
      const ticketRows = (ticketsResult.data ?? []) as Array<Record<string, unknown>>
      const orderRows = (ordersResult.data ?? []) as Array<Record<string, unknown>>
      const providerBalanceRow =
        profileBalanceResult.data && typeof profileBalanceResult.data === 'object'
          ? (profileBalanceResult.data as Record<string, unknown>)
          : null
      let providerLimitRow: Record<string, unknown> | null = null
      if (Array.isArray(providerLimitResult.data) && providerLimitResult.data.length > 0) {
        providerLimitRow = providerLimitResult.data[0] as Record<string, unknown>
      } else if (!providerLimitResult.error) {
        const providerLimitByUser = await supabase
          .from('provider_limits')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)

        if (
          !providerLimitByUser.error &&
          Array.isArray(providerLimitByUser.data) &&
          providerLimitByUser.data.length > 0
        ) {
          providerLimitRow = providerLimitByUser.data[0] as Record<string, unknown>
        }
      }

      const providerIds = Array.from(
        new Set(
          productRows
            .map(row => toText(row.provider_id))
            .concat(ticketRows.map(row => toText(row.provider_id)))
            .filter(Boolean)
        )
      )

      const providerNameById = new Map<string, string>()
      if (providerIds.length > 0) {
        const { data: providerRows } = await supabase.from('profiles').select('id, username').in('id', providerIds)
        for (const row of (providerRows ?? []) as Array<{ id: string; username: string | null }>) {
          providerNameById.set(row.id, normalizeDisplayName(row.username) || 'Proveedor')
        }
      }

      const activeAccountsByProductId = new Map<number, number>()
      const freeSlotsByProductId = new Map<number, number>()
      const providerSlotInfoById = new Map<
        string,
        { slotLabel: string; profilePin: string; inventoryAccountId: string }
      >()

      if (!accountsResult.error) {
        const accountRows = (accountsResult.data ?? []) as Array<Record<string, unknown>>
        for (const account of accountRows) {
          if (account.is_active === false) continue
          const productIdRaw = toNullableNumber(account.product_id ?? account.productId)
          if (productIdRaw === null) continue
          const productId = Math.floor(productIdRaw)
          activeAccountsByProductId.set(productId, (activeAccountsByProductId.get(productId) ?? 0) + 1)
        }
      }

      if (!slotsResult.error) {
        const slotRows = (slotsResult.data ?? []) as Array<Record<string, unknown>>

        for (const slot of slotRows) {
          const slotId = toText(slot.id)
          if (slotId) {
            providerSlotInfoById.set(slotId, {
              slotLabel: toText(slot.slot_label ?? slot.profile_name ?? slot.slot_name),
              profilePin: toText(slot.profile_pin ?? slot.pin ?? slot.slot_pin),
              inventoryAccountId: toText(slot.inventory_account_id),
            })
          }

          const occupiedByStatus = ['occupied', 'ocupado', 'used', 'taken', 'asignado'].includes(
            toText(slot.status).toLowerCase()
          )
          const occupied = isTrueLike(slot.is_occupied) || occupiedByStatus
          if (occupied) continue

          const productIdRaw = toNullableNumber(slot.product_id ?? slot.productId)
          if (productIdRaw === null) continue
          const productId = Math.floor(productIdRaw)
          freeSlotsByProductId.set(productId, (freeSlotsByProductId.get(productId) ?? 0) + 1)
        }
      }

      const normalizedProducts = productRows.map<ProviderProduct>((row, index) => {
        const id = Math.max(1, Math.floor(toNumber(row.id ?? row.product_id, index + 1)))
        const providerId = toText(row.provider_id)
        const name = toText(row.name ?? row.product_name ?? row.platform ?? row.title) || `Producto ${index + 1}`
        const accountType = toText(row.account_type ?? row.type) || 'profiles'
        const stockManual = Math.max(
          0,
          Math.floor(toNumber(row.stock_available ?? row.stock ?? row.quantity ?? row.available_stock, 0))
        )
        const stock = isProfilesAccountType(accountType)
          ? freeSlotsByProductId.get(id) ?? 0
          : activeAccountsByProductId.get(id) ?? stockManual
        const priceGuest = Math.max(0, toNumber(row.price_guest ?? row.guest_price ?? row.public_price))
        const priceAffiliate = Math.max(
          0,
          toNumber(
            row.price_affiliate ??
              row.price_logged ??
              row.price_login ??
              row.login_price ??
              row.affiliate_price,
            priceGuest
          )
        )
        const renewalPrice = toNullableNumber(
          row.renewal_price ??
            row.price_renewal ??
            row.renewal_price_affiliate ??
            row.price_renovation ??
            row.renewalPrice
        )
        const durationDays = toNullableNumber(
          row.duration_days ?? row.subscription_days ?? row.durationDays ?? row.plan_days
        )

        return {
          id,
          providerId,
          providerName: providerNameById.get(providerId) ?? 'Proveedor',
          name,
          summary: toText(row.description ?? row.summary ?? row.plan ?? row.duration) || 'Producto digital',
          durationDays: durationDays === null ? null : Math.max(1, Math.floor(durationDays)),
          logo: resolveProductLogo(name, row.logo_url ?? row.image_url ?? row.logo ?? row.image ?? row.icon),
          stock,
          priceGuest,
          priceAffiliate,
          renewalPrice,
          profilesPerAccount: readProfilesPerAccount(row.extra_required_fields),
          renewable: isTrueLike(row.renewable),
          deliveryMode: toText(row.delivery_mode ?? row.delivery) || 'instant',
          accountType,
          extraRequiredFieldsRaw: parseExtraFieldKeys(row.extra_required_fields).join(', '),
          isActive: row.is_active !== false && row.active !== false,
          createdAt: toText(row.created_at) || null,
          updatedAt: toText(row.updated_at) || null,
        }
      })

      const productById = new Map<number, ProviderProduct>()
      const productNameById = new Map<string, string>()
      const productDeliveryById = new Map<number, string>()
      for (const item of normalizedProducts) {
        productById.set(item.id, item)
        productNameById.set(String(item.id), item.name)
        productDeliveryById.set(item.id, item.deliveryMode)
      }

      const buyerIds = Array.from(
        new Set(
          ticketRows
            .map(row => toText(row.buyer_id ?? row.user_id))
            .concat(orderRows.map(row => toText(row.buyer_id ?? row.user_id)))
            .filter(Boolean)
        )
      )

      const buyerNameById = new Map<string, string>()
      const buyerPhoneById = new Map<string, string>()
      if (buyerIds.length > 0) {
        const { data: buyerRows } = await supabase.from('profiles').select('*').in('id', buyerIds)
        for (const row of (buyerRows ?? []) as Array<Record<string, unknown>>) {
          const buyerId = toText(row.id)
          if (!buyerId) continue
          buyerNameById.set(
            buyerId,
            normalizeDisplayName(row.username) || pickDisplayName(row) || 'Cliente'
          )

          const rawPhone = pickRowText(row, [
            'phone_e164',
            'phone',
            'phone_number',
            'whatsapp',
            'whatsapp_phone',
            'whatsapp_number',
            'mobile',
            'celular',
            'telefono',
            'telefono_whatsapp',
            'numero',
            'numero_whatsapp',
            'contact_phone',
          ])
          const phoneCode = pickRowText(row, [
            'country_dial',
            'phone_code',
            'dial_code',
            'country_dial_code',
            'country_prefix',
          ])
          let fullPhone = rawPhone
          if (
            fullPhone &&
            phoneCode &&
            !fullPhone.startsWith('+') &&
            !fullPhone.startsWith('00')
          ) {
            const digits = fullPhone.replace(/\D+/g, '')
            if (digits.length > 0 && digits.length <= 10) {
              fullPhone = `${phoneCode}${fullPhone}`
            }
          }
          buyerPhoneById.set(buyerId, fullPhone)
        }
      }

      const orderById = new Map<string, Record<string, unknown>>()
      for (const row of orderRows) {
        const orderId = toIdText(row.id ?? row.order_id)
        if (!orderId) continue
        orderById.set(orderId, row)
      }

      const normalizedTickets = ticketRows.map<ProviderTicket>((row, index) => {
        const id = toIdText(row.id ?? row.ticket_id, `ticket-${index + 1}`)
        const productIdRaw = toNullableNumber(row.product_id ?? row.productId)
        const productId = productIdRaw === null ? null : Math.floor(productIdRaw)
        const orderId = toNullableIdText(row.order_id ?? row.orderId)
        const buyerId = toText(row.buyer_id ?? row.user_id)
        const linkedOrder = orderId ? orderById.get(orderId) : null
        const orderCredentialsRaw = linkedOrder?.['credentials'] ?? null
        const orderCredentialsSnapshot = extractCredentialSnapshot(formatCredentials(orderCredentialsRaw))
        const orderInventorySlotId = toText(linkedOrder?.['inventory_slot_id']) || null
        const linkedSlotInfo = orderInventorySlotId ? providerSlotInfoById.get(orderInventorySlotId) : null
        const orderAccountType =
          toText(linkedOrder?.['account_type']) ||
          (productId !== null ? productById.get(productId)?.accountType ?? '' : '')
        const customerExtraRaw = linkedOrder ? formatCredentials(linkedOrder['customer_extra']) : ''
        const status = toText(row.status) || 'open'
        const type = toText(row.type ?? row.ticket_type) || 'soporte'
        const linkedDeliveryMode =
          toText(linkedOrder?.['delivery_mode'] ?? linkedOrder?.['delivery']) ||
          (productId !== null ? productDeliveryById.get(productId) ?? '' : '')
        const isOnDemandRequest = isOnDemandMode(linkedDeliveryMode) || isOnDemandTicketType(type)

        return {
          id,
          type,
          status,
          deliveryMode: linkedDeliveryMode || 'instant',
          isOnDemandRequest,
          orderId,
          orderAccountType,
          orderInventorySlotId,
          orderCredentialsRaw,
          credentialLoginUser:
            orderCredentialsSnapshot.username !== '-' ? stripInventoryProfileSuffix(orderCredentialsSnapshot.username) : '',
          credentialLoginPassword: orderCredentialsSnapshot.password !== '-' ? orderCredentialsSnapshot.password : '',
          credentialProfileLabel:
            linkedSlotInfo?.slotLabel ||
            (orderCredentialsSnapshot.profileNumber !== '-' ? orderCredentialsSnapshot.profileNumber : ''),
          credentialProfilePin:
            linkedSlotInfo?.profilePin || (orderCredentialsSnapshot.pin !== '-' ? orderCredentialsSnapshot.pin : ''),
          buyerId,
          buyerName: buyerNameById.get(buyerId) ?? 'Cliente',
          buyerPhone: buyerPhoneById.get(buyerId) ?? '',
          customerName: toText(linkedOrder?.['customer_name']),
          customerPhone: toText(linkedOrder?.['customer_phone']),
          customerExtra: customerExtraRaw.replace(/\s*\n+\s*/g, ' | '),
          productId,
          productName: productId !== null ? productNameById.get(String(productId)) ?? 'Producto' : 'Producto',
          productLogo:
            productId !== null
              ? productById.get(productId)?.logo || resolveProductLogo(productNameById.get(String(productId)) ?? 'Producto', null)
              : resolveProductLogo('Producto', null),
          subject: toText(row.subject ?? row.asunto) || `Ticket #${id}`,
          description: toText(row.description ?? row.detalle) || '-',
          resolutionSummary: toText(row.resolution_summary ?? row.solution_summary),
          resolutionDetail: toText(row.resolution_detail ?? row.solution_detail),
          createdAt: toText(row.created_at) || null,
          updatedAt: toText(row.updated_at) || null,
        }
      })

      const normalizedOrders = orderRows.map<ProviderOrder>((row, index) => {
        const id = toIdText(row.id ?? row.order_id, `order-${index + 1}`)
        const productIdRaw = toNullableNumber(row.product_id ?? row.productId)
        const productId = productIdRaw === null ? null : Math.floor(productIdRaw)
        const linkedProduct = productId !== null ? productById.get(productId) : undefined
        const buyerId = toText(row.buyer_id ?? row.user_id)
        const customerExtra = formatCredentials(row.customer_extra).replace(/\s*\n+\s*/g, ' | ')
        const productDurationDays = linkedProduct?.durationDays ?? null
        const rowDurationDays = toNullableNumber(row.duration_days ?? row.subscription_days)
        const durationDaysRaw = rowDurationDays ?? productDurationDays
        const productName = productId !== null ? productNameById.get(String(productId)) ?? 'Producto' : 'Producto'
        return {
          id,
          status: normalizeOrderStatusInput(toText(row.status) || 'pending'),
          buyerId,
          buyerName: buyerNameById.get(buyerId) ?? 'Cliente',
          buyerPhone: buyerPhoneById.get(buyerId) ?? '',
          productId,
          productName,
          productLogo: linkedProduct?.logo || resolveProductLogo(productName, null),
          deliveryMode: toText(row.delivery_mode ?? row.delivery) || 'instant',
          accountType: toText(row.account_type ?? row.type) || 'profiles',
          durationDays:
            durationDaysRaw === null ? null : Math.max(1, Math.floor(toNumber(durationDaysRaw, durationDaysRaw))),
          amount: Math.max(0, toNumber(row.price_paid ?? row.amount ?? row.total)),
          customerName: toText(row.customer_name),
          customerPhone: toText(row.customer_phone),
          customerExtra,
          createdAt: toText(row.created_at) || null,
        }
      })

      const ticketDraftById: Record<string, ProviderTicketDraft> = {}
      for (const ticket of normalizedTickets) {
        ticketDraftById[String(ticket.id)] = {
          status: ticket.status,
          resolutionSummary: ticket.resolutionSummary,
          resolutionDetail: ticket.resolutionDetail,
          loginUser: ticket.credentialLoginUser,
          loginPassword: ticket.credentialLoginPassword,
          profileLabel: ticket.credentialProfileLabel,
          profilePin: ticket.credentialProfilePin,
        }
      }
      const orderDraftById: Record<string, ProviderOrderDraft> = {}
      for (const order of normalizedOrders) {
        if (!isOnDemandMode(order.deliveryMode)) continue
        if (!isPendingLikeOrderStatus(order.status)) continue
        orderDraftById[String(order.id)] = {
          resolutionSummary: '',
          loginUser: '',
          loginPassword: '',
          profilePin: '',
        }
      }

      const rawProductLimit = toNullableNumber(
        providerLimitRow?.max_products ?? providerLimitRow?.product_limit ?? providerLimitRow?.limit
      )
      const normalizedProductLimit =
        rawProductLimit === null ? null : Math.max(0, Math.floor(rawProductLimit))
      const providerBalanceColumn =
        PROVIDER_BALANCE_KEYS.find(
          key => providerBalanceRow !== null && Object.prototype.hasOwnProperty.call(providerBalanceRow, key)
        ) ?? null
      const providerBalanceValue =
        providerBalanceColumn !== null && providerBalanceRow !== null
          ? Math.max(0, toNumber(providerBalanceRow[providerBalanceColumn], 0))
          : 0
      const creditedSalesTotal = normalizedOrders.reduce((sum, order) => {
        return shouldCountProviderSale(order.status, order.deliveryMode) ? sum + Math.max(0, order.amount) : sum
      }, 0)
      const effectiveProviderBalance =
        providerBalanceValue > 0 || creditedSalesTotal <= 0
          ? providerBalanceValue
          : creditedSalesTotal

      setProviderProducts(normalizedProducts)
      setProviderOrders(normalizedOrders)
      setProviderTickets(normalizedTickets)
      setProviderBalanceMetric(effectiveProviderBalance)
      setProviderOrderDrafts(previous => {
        const next: Record<string, ProviderOrderDraft> = {}
        for (const [orderId, draft] of Object.entries(orderDraftById)) {
          next[orderId] = previous[orderId] ?? draft
        }
        return next
      })
      setProviderTicketDrafts(ticketDraftById)
      setProviderProductLimit(isOwner ? null : normalizedProductLimit)

      if (errors.length > 0) {
        setProviderMsg(errors.join(' '))
        setProviderMsgType('error')
      }
    } catch {
      setProviderProducts([])
      setProviderOrders([])
      setProviderTickets([])
      setProviderBalanceMetric(0)
      setProviderOrderDrafts({})
      setProviderProductLimit(null)
      setProviderMsg('Error inesperado cargando modulo proveedor.')
      setProviderMsgType('error')
    } finally {
      setIsProviderLoading(false)
    }
  }, [canSeeProvider, isOwner, userId])

  const filteredProviderProducts = useMemo(() => {
    const term = providerProductSearch.trim().toLowerCase()
    if (!term) return providerProducts

    return providerProducts.filter(product => {
      return (
        product.name.toLowerCase().includes(term) ||
        product.summary.toLowerCase().includes(term) ||
        product.providerName.toLowerCase().includes(term) ||
        String(product.id).includes(term)
      )
    })
  }, [providerProductSearch, providerProducts])

  const providerProductsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProviderProducts.length / PROVIDER_PRODUCTS_PAGE_SIZE))
  }, [filteredProviderProducts.length])

  const providerProductsCurrentPage = Math.min(providerProductsPage, providerProductsTotalPages)

  const paginatedProviderProducts = useMemo(() => {
    const start = (providerProductsCurrentPage - 1) * PROVIDER_PRODUCTS_PAGE_SIZE
    return filteredProviderProducts.slice(start, start + PROVIDER_PRODUCTS_PAGE_SIZE)
  }, [filteredProviderProducts, providerProductsCurrentPage])

  const providerCreationBlocked = useMemo(() => {
    if (isOwner) return false
    if (providerProductLimit === null) return false
    return providerProducts.length >= providerProductLimit
  }, [isOwner, providerProductLimit, providerProducts.length])
  const providerLimitUnknown = !isOwner && providerProductLimit === null

  function handleProviderCreateProductClick() {
    if (showProviderProductForm && editingProviderProductId === null) {
      setShowProviderProductForm(false)
      return
    }
    if (providerLimitUnknown && editingProviderProductId === null) {
      setProviderMsgType('error')
      setProviderMsg(
        'No se pudo validar tu limite de productos. Verifica provider_limits + policy SELECT para provider.'
      )
      return
    }
    if (providerCreationBlocked && editingProviderProductId === null) {
      setProviderMsgType('error')
      setProviderMsg(
        providerProductLimit !== null
          ? `Ya llegaste al limite de ${providerProductLimit} productos.`
          : 'No puedes crear mas productos en este momento.'
      )
      return
    }
    resetProviderProductForm()
    setShowProviderProductForm(true)
  }

  const selectedProviderProduct = useMemo(() => {
    if (selectedProviderProductId === null) return null
    return providerProducts.find(product => product.id === selectedProviderProductId) ?? null
  }, [providerProducts, selectedProviderProductId])

  const providerOrdersSorted = useMemo(() => {
    return [...providerOrders].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [providerOrders])

  const providerOrdersLive = useMemo(() => {
    return providerOrdersSorted.filter(order => {
      return isOnDemandMode(order.deliveryMode) && isPendingLikeOrderStatus(order.status)
    })
  }, [providerOrdersSorted])

  const providerSelectedOrder = useMemo(() => {
    if (!providerSelectedOrderId) return null
    return providerOrdersLive.find(order => String(order.id) === providerSelectedOrderId) ?? null
  }, [providerOrdersLive, providerSelectedOrderId])

  const providerTicketsSorted = useMemo(() => {
    return [...providerTickets].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })
  }, [providerTickets])

  const providerTicketsLive = useMemo(() => {
    return providerTicketsSorted.filter(ticket => {
      return isOpenTicketStatus(ticket.status) && !ticket.isOnDemandRequest
    })
  }, [providerTicketsSorted])

  const providerSelectedTicket = useMemo(() => {
    if (!providerSelectedTicketId) return null
    return providerTicketsLive.find(ticket => String(ticket.id) === providerSelectedTicketId) ?? null
  }, [providerTicketsLive, providerSelectedTicketId])

  const providerSalesTotalMetric = useMemo(() => {
    return providerOrders.reduce((sum, order) => {
      if (shouldCountProviderSale(order.status, order.deliveryMode)) {
        return sum + 1
      }
      return sum
    }, 0)
  }, [providerOrders])

  const providerRefundsCountMetric = useMemo(() => {
    return providerOrders.reduce((sum, order) => {
      const status = normalizeOrderStatusInput(order.status)
      if (status === 'refunded' || status === 'rejected' || status === 'cancelled') {
        return sum + 1
      }
      return sum
    }, 0)
  }, [providerOrders])

  const filteredProviderInventoryAccounts = useMemo(() => {
    let rows = providerInventoryAccounts
    if (providerInventoryActiveOnly) {
      rows = rows.filter(item => item.isActive)
    }

    const term = providerInventorySearch.trim().toLowerCase()
    if (!term) return rows

    return rows.filter(item => {
      if (item.loginUser.toLowerCase().includes(term)) return true
      if (item.id.toLowerCase().includes(term)) return true
      if (item.slots.some(slot => slot.slotLabel.toLowerCase().includes(term))) return true
      return false
    })
  }, [providerInventoryAccounts, providerInventoryActiveOnly, providerInventorySearch])

  const providerInventoryTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProviderInventoryAccounts.length / PROVIDER_INVENTORY_PAGE_SIZE))
  }, [filteredProviderInventoryAccounts.length])

  const providerInventoryCurrentPage = Math.min(providerInventoryPage, providerInventoryTotalPages)

  const paginatedProviderInventoryAccounts = useMemo(() => {
    const start = (providerInventoryCurrentPage - 1) * PROVIDER_INVENTORY_PAGE_SIZE
    return filteredProviderInventoryAccounts.slice(start, start + PROVIDER_INVENTORY_PAGE_SIZE)
  }, [filteredProviderInventoryAccounts, providerInventoryCurrentPage])

  const providerInventoryEditingAccount = useMemo(() => {
    if (!providerInventoryEditingAccountId) return null
    return providerInventoryAccounts.find(account => account.id === providerInventoryEditingAccountId) ?? null
  }, [providerInventoryAccounts, providerInventoryEditingAccountId])

  function resetProviderInventoryForm(product: ProviderProduct | null = selectedProviderProduct) {
    setProviderInventoryForm({
      ...PROVIDER_INVENTORY_FORM_DEFAULT,
      slotCapacity: String(product?.profilesPerAccount ?? 5),
    })
    setProviderInventoryProfileInputs(buildInventoryProfileInputs(product?.profilesPerAccount ?? 5))
    setShowProviderInventoryProfilesModal(false)
  }

  function closeProviderInventoryEditModal() {
    setProviderInventoryEditingAccountId(null)
    setProviderInventoryEditForm(PROVIDER_INVENTORY_EDIT_FORM_DEFAULT)
    setIsProviderInventoryEditingSaving(false)
  }

  function openProviderInventoryEditModal(account: ProviderInventoryAccount) {
    const sortedSlots = [...account.slots].sort((a, b) => a.slotIndex - b.slotIndex)
    const firstSlot = sortedSlots[0]
    const isProfilesInventoryProduct = Boolean(
      selectedProviderProduct && isProfilesAccountType(selectedProviderProduct.accountType)
    )

    setProviderInventoryEditForm({
      loginUser: isProfilesInventoryProduct ? stripInventoryProfileSuffix(account.loginUser) : account.loginUser,
      loginPassword: account.loginPassword || '',
      slotLabel: firstSlot?.slotLabel || '',
      profilePin: firstSlot?.profilePin || '',
    })
    setProviderInventoryEditingAccountId(account.id)
  }

  const loadProviderProductInventory = useCallback(
    async (product: ProviderProduct) => {
      if (!userId || !canSeeProvider) return

      setIsProviderInventoryLoading(true)
      setProviderInventoryMsg('')
      setProviderInventoryMsgType('idle')

      let accountsQuery = supabase
        .from('inventory_accounts')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
      let slotsQuery = supabase
        .from('inventory_slots')
        .select('*')
        .eq('product_id', product.id)
        .order('slot_index', { ascending: true })

      if (isOwner) {
        if (product.providerId) {
          accountsQuery = accountsQuery.eq('provider_id', product.providerId)
          slotsQuery = slotsQuery.eq('provider_id', product.providerId)
        }
      } else {
        accountsQuery = accountsQuery.eq('provider_id', userId)
        slotsQuery = slotsQuery.eq('provider_id', userId)
      }

      const [accountsResult, slotsResult] = await Promise.all([accountsQuery, slotsQuery])

      if (accountsResult.error) {
        setProviderInventoryAccounts([])
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(`No se pudo cargar inventario. ${accountsResult.error.message}`)
        setIsProviderInventoryLoading(false)
        return
      }

      if (slotsResult.error && !isLikelySchemaError(slotsResult.error.message)) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(`No se pudieron cargar perfiles. ${slotsResult.error.message}`)
      }

      const slotRows = (slotsResult.data ?? []) as Array<Record<string, unknown>>
      const accountRows = (accountsResult.data ?? []) as Array<Record<string, unknown>>
      const accountProfileLabelById = new Map<string, string>()
      for (const row of accountRows) {
        const accountId = toText(row.id)
        if (!accountId) continue
        const decodedLabel = decodeProfileLabelFromInventoryLogin(toText(row.login_user))
        if (decodedLabel) {
          accountProfileLabelById.set(accountId, decodedLabel)
        }
      }

      let ordersByProductQuery = supabase
        .from('orders')
        .select('id, buyer_id, provider_id, inventory_slot_id, status, credentials, created_at, starts_at, expires_at')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(2000)
      if (isOwner) {
        if (product.providerId) {
          ordersByProductQuery = ordersByProductQuery.eq('provider_id', product.providerId)
        }
      } else {
        ordersByProductQuery = ordersByProductQuery.eq('provider_id', userId)
      }
      const { data: orderRowsRaw, error: orderRowsError } = await ordersByProductQuery
      if (orderRowsError && !isLikelySchemaError(orderRowsError.message)) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(`No se pudieron cruzar compradores del inventario. ${orderRowsError.message}`)
      }
      const orderRows = (orderRowsRaw ?? []) as Array<Record<string, unknown>>

      const buyerIds = Array.from(
        new Set(slotRows.map(row => toText(row.buyer_id)).concat(orderRows.map(row => toText(row.buyer_id))).filter(Boolean))
      )
      const buyerNameById = new Map<string, string>()
      const buyerPhoneById = new Map<string, string>()
      if (buyerIds.length > 0) {
        const { data: buyerRows } = await supabase.from('profiles').select('*').in('id', buyerIds)
        for (const row of (buyerRows ?? []) as Array<Record<string, unknown>>) {
          const buyerId = toText(row.id)
          if (!buyerId) continue
          buyerNameById.set(
            buyerId,
            normalizeDisplayName(row.username) || pickDisplayName(row) || `usuario-${formatCompactId(buyerId)}`
          )

          const rawPhone = pickRowText(row, [
            'phone_e164',
            'phone',
            'phone_number',
            'whatsapp',
            'whatsapp_phone',
            'whatsapp_number',
            'mobile',
            'celular',
            'telefono',
            'numero',
            'numero_whatsapp',
            'contact_phone',
          ])
          const phoneCode = pickRowText(row, [
            'country_dial',
            'phone_code',
            'dial_code',
            'country_dial_code',
            'country_prefix',
          ])
          let fullPhone = rawPhone
          if (
            fullPhone &&
            phoneCode &&
            !fullPhone.startsWith('+') &&
            !fullPhone.startsWith('00')
          ) {
            const digits = fullPhone.replace(/\D+/g, '')
            if (digits.length > 0 && digits.length <= 10) {
              fullPhone = `${phoneCode}${fullPhone}`
            }
          }
          buyerPhoneById.set(buyerId, fullPhone)
        }
      }

      type InventoryOrderHint = {
        orderId: string
        buyerId: string
        buyerName: string
        buyerPhone: string
        profilePin: string
        status: string
        createdAt: string | null
        startsAt: string | null
        expiresAt: string | null
      }

      const busyStatuses = ['occupied', 'ocupado', 'delivered', 'entregado', 'reserved', 'reservado', 'used', 'taken', 'asignado']
      const makeCredentialKey = (login: string, password: string) => `${login.trim().toLowerCase()}::${password.trim()}`

      const orderHintBySlotId = new Map<string, InventoryOrderHint>()
      const orderHintByCredentialKey = new Map<string, InventoryOrderHint>()
      const orderHintByLogin = new Map<string, InventoryOrderHint>()

      for (const row of orderRows) {
        const status = normalizeOrderStatusInput(toText(row.status) || 'pending')
        if (status === 'cancelled' || status === 'rejected' || status === 'refunded') {
          continue
        }
        const expiresAt = toText(row.expires_at) || null
        const buyerId = toText(row.buyer_id)
        if (!buyerId) continue
        const orderId = toText(row.id)
        if (!orderId) continue
        const buyerName = buyerNameById.get(buyerId) || `usuario-${formatCompactId(buyerId)}`
        const hint: InventoryOrderHint = {
          orderId,
          buyerId,
          buyerName,
          buyerPhone: buyerPhoneById.get(buyerId) || '',
          profilePin: '',
          status: toText(row.status) || 'occupied',
          createdAt: toText(row.created_at) || null,
          startsAt: toText(row.starts_at) || null,
          expiresAt,
        }

        const slotId = toText(row.inventory_slot_id)
        if (slotId && !orderHintBySlotId.has(slotId)) {
          orderHintBySlotId.set(slotId, hint)
        }

        const credentialsSnapshot = extractCredentialSnapshot(formatCredentials(row.credentials))
        const loginFromOrder = credentialsSnapshot.username !== '-' ? credentialsSnapshot.username : ''
        const passwordFromOrder = credentialsSnapshot.password !== '-' ? credentialsSnapshot.password : ''
        const profilePinFromOrder = credentialsSnapshot.pin !== '-' ? credentialsSnapshot.pin : ''
        if (loginFromOrder && passwordFromOrder) {
          const credentialsKey = makeCredentialKey(loginFromOrder, passwordFromOrder)
          if (!orderHintByCredentialKey.has(credentialsKey)) {
            orderHintByCredentialKey.set(credentialsKey, {
              ...hint,
              profilePin: profilePinFromOrder,
            })
          }
        }
        if (slotId && profilePinFromOrder) {
          const current = orderHintBySlotId.get(slotId)
          if (current && !current.profilePin) {
            orderHintBySlotId.set(slotId, {
              ...current,
              profilePin: profilePinFromOrder,
            })
          }
        }
        if (loginFromOrder) {
          const loginKey = loginFromOrder.trim().toLowerCase()
          if (!orderHintByLogin.has(loginKey)) {
            orderHintByLogin.set(loginKey, {
              ...hint,
              profilePin: profilePinFromOrder,
            })
          }
        }
      }

      const slotsByAccountId = new Map<string, ProviderInventorySlot[]>()
      for (const row of slotRows) {
        const accountId = toText(row.inventory_account_id)
        if (!accountId) continue
        const slotIndex = Math.max(1, Math.floor(toNumber(row.slot_index, 1)))
        const slotId = toText(row.id) || `${accountId}-${slotIndex}`
        const slotHint = orderHintBySlotId.get(slotId)
        const buyerId = toText(row.buyer_id)
        const resolvedBuyerId = buyerId || slotHint?.buyerId || ''
        const rawSlotLabel = toScalarText(
          row.slot_label ?? row.profile_name ?? row.slot_name ?? row.name ?? row.slot ?? row.perfil
        )
        const fallbackLabel = accountProfileLabelById.get(accountId) || ''
        const slotLabel = isGenericProfileSlotLabel(rawSlotLabel, slotIndex)
          ? fallbackLabel || rawSlotLabel
          : rawSlotLabel
        const rawProfilePin = toScalarText(
          row.profile_pin ?? row.pin ?? row.slot_pin ?? row.profile_code ?? row.codigo ?? row.code
        )
        const slot: ProviderInventorySlot = {
          id: slotId,
          slotIndex,
          slotLabel,
          profilePin: rawProfilePin || slotHint?.profilePin || '',
          status: toText(row.status) || slotHint?.status || 'free',
          buyerId: resolvedBuyerId,
          buyerName: buyerNameById.get(resolvedBuyerId) || slotHint?.buyerName || '',
          createdAt: toText(row.created_at) || slotHint?.startsAt || slotHint?.createdAt || null,
        }
        const current = slotsByAccountId.get(accountId) ?? []
        current.push(slot)
        slotsByAccountId.set(accountId, current)
      }

      const normalized = accountRows.map<ProviderInventoryAccount>(row => {
        const id = toText(row.id)
        const loginUser = toText(row.login_user)
        const loginPassword = toText(row.login_password)
        const slotCapacity = Math.max(1, Math.floor(toNumber(row.slot_capacity, 1)))
        const slots = slotsByAccountId.get(id) ?? []
        const occupiedSlot =
          slots.find(slot => busyStatuses.includes(slot.status.trim().toLowerCase()) || slot.buyerId.length > 0) ?? null

        const slotOrderHint = occupiedSlot ? orderHintBySlotId.get(occupiedSlot.id) : null
        const credentialOrderHint =
          orderHintByCredentialKey.get(makeCredentialKey(loginUser, loginPassword)) ??
          orderHintByLogin.get(loginUser.trim().toLowerCase()) ??
          null

        const buyerId =
          occupiedSlot?.buyerId ||
          slotOrderHint?.buyerId ||
          credentialOrderHint?.buyerId ||
          ''
        const buyerName =
          occupiedSlot?.buyerName ||
          slotOrderHint?.buyerName ||
          credentialOrderHint?.buyerName ||
          (buyerId ? buyerNameById.get(buyerId) || '' : '')
        const buyerPhone =
          (buyerId ? buyerPhoneById.get(buyerId) || '' : '') ||
          slotOrderHint?.buyerPhone ||
          credentialOrderHint?.buyerPhone ||
          ''
        const orderId = slotOrderHint?.orderId || credentialOrderHint?.orderId || null
        const assignedAt =
          slotOrderHint?.startsAt ||
          credentialOrderHint?.startsAt ||
          slotOrderHint?.createdAt ||
          credentialOrderHint?.createdAt ||
          occupiedSlot?.createdAt ||
          null
        const expiresAt = slotOrderHint?.expiresAt || credentialOrderHint?.expiresAt || null
        const assignmentStatus =
          slotOrderHint?.status ||
          occupiedSlot?.status ||
          credentialOrderHint?.status ||
          (row.is_active !== false ? 'free' : 'inactive')

        return {
          id,
          productId: Math.max(1, Math.floor(toNumber(row.product_id, product.id))),
          loginUser,
          loginPassword,
          slotCapacity,
          isActive: row.is_active !== false,
          createdAt: toText(row.created_at) || null,
          buyerId,
          buyerName,
          buyerPhone,
          orderId,
          assignedAt,
          expiresAt,
          assignmentStatus,
          slots,
        }
      })

      setProviderInventoryAccounts(normalized)
      setIsProviderInventoryLoading(false)
    },
    [canSeeProvider, isOwner, userId]
  )

  const syncProviderProductStock = useCallback(
    async (product: ProviderProduct) => {
      if (!userId || !canSeeProvider) return

      let accountCountQuery = supabase
        .from('inventory_accounts')
        .select('id, is_active')
        .eq('product_id', product.id)
      let slotCountQuery = supabase
        .from('inventory_slots')
        .select('id, status, buyer_id')
        .eq('product_id', product.id)

      if (isOwner) {
        if (product.providerId) {
          accountCountQuery = accountCountQuery.eq('provider_id', product.providerId)
          slotCountQuery = slotCountQuery.eq('provider_id', product.providerId)
        }
      } else {
        accountCountQuery = accountCountQuery.eq('provider_id', userId)
        slotCountQuery = slotCountQuery.eq('provider_id', userId)
      }

      const [accountsResult, slotsResult] = await Promise.all([accountCountQuery, slotCountQuery])

      const accountRows = (accountsResult.data ?? []) as Array<Record<string, unknown>>
      const activeAccounts = accountRows.filter(row => row.is_active !== false).length

      const slotRows = (slotsResult.data ?? []) as Array<Record<string, unknown>>
      const freeSlots = slotRows.reduce((sum, row) => {
        const status = toText(row.status).toLowerCase()
        const isOccupiedStatus = ['occupied', 'ocupado', 'used', 'taken', 'asignado', 'delivered', 'entregado'].includes(
          status
        )
        const buyerAssigned = toText(row.buyer_id).length > 0
        return sum + (isOccupiedStatus || buyerAssigned ? 0 : 1)
      }, 0)

      const stockAvailable = isProfilesAccountType(product.accountType) ? freeSlots : activeAccounts

      let stockUpdateQuery = supabase.from('products').update({ stock_available: stockAvailable }).eq('id', product.id)
      if (!isOwner) {
        stockUpdateQuery = stockUpdateQuery.eq('provider_id', userId)
      } else if (product.providerId) {
        stockUpdateQuery = stockUpdateQuery.eq('provider_id', product.providerId)
      }
      await stockUpdateQuery
    },
    [canSeeProvider, isOwner, userId]
  )

  async function openProviderInventoryManager(product: ProviderProduct) {
    setSelectedProviderProductId(product.id)
    setProviderInventorySearch('')
    setProviderInventoryActiveOnly(false)
    setProviderInventoryPage(1)
    setProviderInventoryVisiblePasswords({})
    setProviderInventoryDaysDraft({})
    setProviderInventoryDaysEditingId(null)
    resetProviderInventoryForm(product)
    await loadProviderProductInventory(product)
  }

  function closeProviderInventoryManager() {
    setSelectedProviderProductId(null)
    setProviderInventoryAccounts([])
    setProviderInventorySearch('')
    setProviderInventoryActiveOnly(false)
    setProviderInventoryPage(1)
    setProviderInventoryVisiblePasswords({})
    setProviderInventoryDaysDraft({})
    setProviderInventoryDaysEditingId(null)
    setProviderBuyerModal(null)
    setShowProviderInventoryModal(false)
    setShowProviderInventoryProfilesModal(false)
    setProviderInventoryMsg('')
    setProviderInventoryMsgType('idle')
  }

  function toggleProviderInventoryPassword(accountId: string) {
    setProviderInventoryVisiblePasswords(previous => ({
      ...previous,
      [accountId]: !previous[accountId],
    }))
  }

  async function copyProviderInventoryField(label: string, value: string) {
    const text = value.trim()
    if (!text) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(`No hay ${label} para copiar.`)
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setProviderInventoryMsgType('ok')
      setProviderInventoryMsg(`${label} copiado al portapapeles.`)
    } catch {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('No se pudo copiar. Verifica permisos del navegador.')
    }
  }

  async function copyProviderInventoryCredentials(account: ProviderInventoryAccount) {
    const loginUserVisible = stripInventoryProfileSuffix(account.loginUser)
    const text = `Usuario: ${loginUserVisible}\nPassword: ${account.loginPassword}`
    try {
      await navigator.clipboard.writeText(text)
      setProviderInventoryMsgType('ok')
      setProviderInventoryMsg('Credenciales copiadas al portapapeles.')
    } catch {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('No se pudo copiar. Verifica permisos del navegador.')
    }
  }

  async function handleProviderInventorySubmit() {
    if (!userId || !selectedProviderProduct) return

    const isProfilesProduct = isProfilesAccountType(selectedProviderProduct.accountType)
    const loginBase = providerInventoryForm.loginUser.trim()
    const passwordBase = providerInventoryForm.loginPassword.trim()
    const providerId = selectedProviderProduct.providerId || userId

    if (!isOwner && providerId !== userId) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('No puedes editar inventario de otro proveedor.')
      return
    }

    const accountRows: Array<Record<string, unknown>> = []
    const profileSlotsToAttachPerAccount: Array<{
      slotIndex: number
      slotLabel: string
      profilePin: string
    }> = []
    const configuredProfileSlots = providerInventoryProfileInputs
      .map((item, index) => {
        const slotLabel = item.slotLabel.trim()
        const profilePin = item.profilePin.trim()
        if (!slotLabel) return null
        return {
          slotIndex: index + 1,
          slotLabel,
          profilePin,
        }
      })
      .filter((item): item is { slotIndex: number; slotLabel: string; profilePin: string } => item !== null)

    if (isProfilesProduct) {
      const parsedUsers = parseCommaSeparatedValues(loginBase)
      if (parsedUsers.length !== 1) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg('Para perfiles debes ingresar un solo usuario/login por cuenta.')
        return
      }
      if (!passwordBase) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg('La contraseña es obligatoria para cuentas de perfiles.')
        return
      }
      if (configuredProfileSlots.length === 0) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg('Configura al menos un perfil con nombre/numero desde ⚙️ antes de guardar stock.')
        return
      }

      const loginUser = parsedUsers[0]
      const profileSuffixSeed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
      for (let slotPos = 0; slotPos < configuredProfileSlots.length; slotPos += 1) {
        const configuredSlot = configuredProfileSlots[slotPos]
        const encodedProfileLabel = encodeProfileLabelForInventoryLogin(
          configuredSlot.slotLabel || String(configuredSlot.slotIndex)
        )
        accountRows.push({
          product_id: selectedProviderProduct.id,
          provider_id: providerId,
          login_user: `${loginUser}::slot_${encodedProfileLabel}::${profileSuffixSeed}_${slotPos + 1}`,
          login_password: passwordBase,
          slot_capacity: 1,
          is_active: true,
        })
        profileSlotsToAttachPerAccount.push(configuredSlot)
      }
    } else {
      const loginUsers = parseCommaSeparatedValues(loginBase)
      if (loginUsers.length === 0) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg('Ingresa al menos un usuario/login separado por comas.')
        return
      }

      if (!passwordBase) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg('La contraseña es obligatoria para cuentas completas.')
        return
      }

      const passwordValues = parseCommaSeparatedValues(passwordBase)
      if (passwordValues.length === 0) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg('La contraseña es obligatoria para cuentas completas.')
        return
      }

      const onePasswordForAll = passwordValues.length === 1
      if (!onePasswordForAll && passwordValues.length !== loginUsers.length) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(
          'Si usas contraseñas separadas por comas, deben tener la misma cantidad que los usuarios/login.'
        )
        return
      }

      for (let index = 0; index < loginUsers.length; index += 1) {
        accountRows.push({
          product_id: selectedProviderProduct.id,
          provider_id: providerId,
          login_user: loginUsers[index],
          login_password: onePasswordForAll ? passwordValues[0] : passwordValues[index],
          slot_capacity: 1,
          is_active: true,
        })
      }
    }

    if (accountRows.length === 0) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('No se pudieron preparar cuentas para guardar stock.')
      return
    }

    setIsProviderInventorySaving(true)
    setProviderInventoryMsg('')
    setProviderInventoryMsgType('idle')

    let insertedAccounts: Array<Record<string, unknown>> = []
    if (accountRows.length > 0) {
      const { data, error: insertAccountsError } = await supabase
        .from('inventory_accounts')
        .insert(accountRows)
        .select('id, slot_capacity')

      if (insertAccountsError) {
        setIsProviderInventorySaving(false)
        const duplicateByProfile = insertAccountsError.message.toLowerCase().includes(
          'inventory_accounts_unique_login_per_product_idx'
        )
        if (isProfilesProduct && duplicateByProfile) {
          setProviderInventoryMsgType('error')
          setProviderInventoryMsg(
            'Tu DB aún bloquea perfiles separados por login único. Ejecuta SQL para quitar ese índice único y vuelve a intentar.'
          )
          return
        }
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(`No se pudo agregar stock. ${insertAccountsError.message}`)
        return
      }

      insertedAccounts = (data ?? []) as Array<Record<string, unknown>>
    }

    if (isProfilesProduct) {
      const slotMutationErrors: string[] = []
      for (let index = 0; index < insertedAccounts.length; index += 1) {
        const accountId = toText((insertedAccounts[index] as Record<string, unknown>).id)
        const configuredSlot = profileSlotsToAttachPerAccount[index]
        if (!accountId || !configuredSlot) continue
        const slotPayload = {
          slot_label: configuredSlot.slotLabel || String(configuredSlot.slotIndex),
          profile_pin: configuredSlot.profilePin || null,
        }

        const { data: existingSlots, error: existingSlotsError } = await supabase
          .from('inventory_slots')
          .select('id')
          .eq('inventory_account_id', accountId)
          .eq('product_id', selectedProviderProduct.id)
          .order('slot_index', { ascending: true })
          .limit(1)

        if (existingSlotsError && !isLikelySchemaError(existingSlotsError.message)) {
          slotMutationErrors.push(existingSlotsError.message)
          continue
        }

        const existingSlotId = toText((existingSlots ?? [])[0]?.id)
        if (existingSlotId) {
          const { error: updateExistingSlotError } = await supabase
            .from('inventory_slots')
            .update({
              ...slotPayload,
              provider_id: providerId,
            })
            .eq('id', existingSlotId)

          if (updateExistingSlotError && !isLikelySchemaError(updateExistingSlotError.message)) {
            slotMutationErrors.push(updateExistingSlotError.message)
          }
          continue
        }

        const newSlotPayload = {
          inventory_account_id: accountId,
          product_id: selectedProviderProduct.id,
          provider_id: providerId,
          slot_index: configuredSlot.slotIndex,
          slot_label: slotPayload.slot_label,
          profile_pin: slotPayload.profile_pin,
          status: 'free',
        }
        const { error: insertSlotError } = await supabase.from('inventory_slots').insert(newSlotPayload)
        if (insertSlotError) {
          slotMutationErrors.push(insertSlotError.message)
        }
      }

      if (slotMutationErrors.length > 0) {
        setIsProviderInventorySaving(false)
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(
          `Se agregaron cuentas, pero no se pudieron guardar algunos perfiles/PIN. ${slotMutationErrors[0]}`
        )
        await loadProviderProductInventory(selectedProviderProduct)
        await syncProviderProductStock(selectedProviderProduct)
        await loadProviderDashboardData()
        return
      }
    }

    await syncProviderProductStock(selectedProviderProduct)
    await loadProviderProductInventory(selectedProviderProduct)
    await loadProviderDashboardData()
    resetProviderInventoryForm(selectedProviderProduct)
    setShowProviderInventoryModal(false)
    setIsProviderInventorySaving(false)
    setProviderInventoryMsgType('ok')
    if (isProfilesProduct) {
      setProviderInventoryMsg(
        `Perfiles cargados por separado: ${configuredProfileSlots.length}.`
      )
    } else {
      setProviderInventoryMsg('Stock y credenciales cargados correctamente.')
    }
  }

  async function handleProviderInventoryAccountToggle(account: ProviderInventoryAccount) {
    if (!selectedProviderProduct) return

    const productDurationDays = selectedProviderProduct.durationDays
    const startedAtIso = account.assignedAt ?? account.createdAt
    const hasValidStartDate = startedAtIso !== null && !Number.isNaN(new Date(startedAtIso).getTime())
    const expectedEndDateIso =
      account.expiresAt ||
      (hasValidStartDate && productDurationDays !== null && productDurationDays > 0
        ? new Date(new Date(startedAtIso as string).getTime() + productDurationDays * 86400000).toISOString()
        : null)
    const daysLeft = calculateDaysLeft(expectedEndDateIso)
    const hasBuyer = account.buyerId.trim().length > 0 || account.buyerName.trim().length > 0
    const hasSlotAssignment = account.slots.some(slot => {
      const status = slot.status.trim().toLowerCase()
      return (
        slot.buyerId.trim().length > 0 ||
        ['occupied', 'ocupado', 'delivered', 'entregado', 'reserved', 'reservado', 'used', 'taken', 'asignado'].includes(
          status
        )
      )
    })
    const mustReleaseAssignment = hasBuyer || hasSlotAssignment || Boolean(account.orderId)

    if (mustReleaseAssignment && (daysLeft === null || daysLeft > 0)) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(
        `No puedes cambiar estado de esta cuenta mientras siga vigente (${daysLeft === null ? 'sin limite' : `${daysLeft} dias`}).`
      )
      return
    }

    const nextValue = !account.isActive

    if (mustReleaseAssignment) {
      const releaseAt = new Date(Date.now() - 60000).toISOString()
      if (account.orderId) {
        const { error: releaseOrderError } = await supabase
          .from('orders')
          .update({
            inventory_slot_id: null,
            credentials: null,
            expires_at: releaseAt,
          })
          .eq('id', account.orderId)

        if (releaseOrderError) {
          setProviderInventoryMsgType('error')
          setProviderInventoryMsg(`No se pudo liberar la cuenta del usuario. ${releaseOrderError.message}`)
          return
        }
      }

      let slotReleaseQuery = supabase
        .from('inventory_slots')
        .update({
          status: 'free',
          buyer_id: null,
        })
        .eq('inventory_account_id', account.id)
        .eq('product_id', selectedProviderProduct.id)

      if (!isOwner) {
        slotReleaseQuery = slotReleaseQuery.eq('provider_id', userId)
      } else if (selectedProviderProduct.providerId) {
        slotReleaseQuery = slotReleaseQuery.eq('provider_id', selectedProviderProduct.providerId)
      }

      const { error: releaseSlotsError } = await slotReleaseQuery
      if (releaseSlotsError && !isLikelySchemaError(releaseSlotsError.message)) {
        setProviderInventoryMsgType('error')
        setProviderInventoryMsg(`No se pudo liberar slots de la cuenta. ${releaseSlotsError.message}`)
        return
      }
    }

    const { error } = await supabase
      .from('inventory_accounts')
      .update({ is_active: nextValue })
      .eq('id', account.id)
      .eq('product_id', selectedProviderProduct.id)

    if (error) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(`No se pudo actualizar cuenta. ${error.message}`)
      return
    }

    await syncProviderProductStock(selectedProviderProduct)
    await loadProviderProductInventory(selectedProviderProduct)
    await loadProviderDashboardData()
    setProviderInventoryMsgType('ok')
    setProviderInventoryMsg(
      nextValue
        ? 'Cuenta activada y libre para reasignar.'
        : 'Cuenta desactivada y liberada del usuario anterior.'
    )
  }

  async function handleProviderInventoryExpiryDaysSave(account: ProviderInventoryAccount) {
    if (!selectedProviderProduct) return
    if (!account.orderId) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Esta cuenta no tiene una compra vinculada para editar vencimiento.')
      return
    }

    const rawValue = (providerInventoryDaysDraft[account.id] ?? '').trim()
    const parsedValue = Math.floor(toNumber(parseDecimalInput(rawValue), NaN))
    if (!Number.isFinite(parsedValue)) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Ingresa un numero valido de dias para ajustar vencimiento.')
      return
    }

    const nowMs = Date.now()
    const nextExpiresIso =
      parsedValue <= 0
        ? new Date(nowMs - 60000).toISOString()
        : new Date(nowMs + parsedValue * 86400000).toISOString()

    const { error } = await supabase
      .from('orders')
      .update({
        expires_at: nextExpiresIso,
      })
      .eq('id', account.orderId)

    if (error) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(`No se pudo actualizar los dias restantes. ${error.message}`)
      return
    }

    await loadProviderProductInventory(selectedProviderProduct)
    await loadProviderDashboardData()
    setProviderInventoryDaysDraft(previous => {
      const next = { ...previous }
      delete next[account.id]
      return next
    })
    setProviderInventoryDaysEditingId(null)
    setProviderInventoryMsgType('ok')
    setProviderInventoryMsg(
      parsedValue <= 0
        ? 'Cuenta marcada como vencida. Ya puedes liberarla.'
        : `Vencimiento actualizado. Ahora quedan ${parsedValue} dias.`
    )
  }

  async function handleProviderInventoryEditSave() {
    if (!selectedProviderProduct || !providerInventoryEditingAccount) return
    if (!isOwner && !userId) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Sesion invalida para editar inventario.')
      return
    }

    const isProfilesInventoryProduct = isProfilesAccountType(selectedProviderProduct.accountType)
    const nextLoginUserRaw = providerInventoryEditForm.loginUser.trim()
    const nextLoginPassword = providerInventoryEditForm.loginPassword.trim()
    const nextSlotLabel = providerInventoryEditForm.slotLabel.trim()
    const nextProfilePin = providerInventoryEditForm.profilePin.trim()

    if (!nextLoginUserRaw) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Ingresa el usuario/login para guardar cambios.')
      return
    }
    if (!nextLoginPassword) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Ingresa la contraseña para guardar cambios.')
      return
    }
    if (isProfilesInventoryProduct && !nextSlotLabel) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Para perfiles debes indicar nombre/numero de perfil.')
      return
    }

    const accountId = providerInventoryEditingAccount.id
    const accountUpdatePayload: Record<string, unknown> = {
      login_user: isProfilesInventoryProduct
        ? composeInventoryProfileLogin(nextLoginUserRaw, nextSlotLabel || '1', providerInventoryEditingAccount.loginUser)
        : nextLoginUserRaw,
      login_password: nextLoginPassword,
    }

    setIsProviderInventoryEditingSaving(true)
    setProviderInventoryMsg('')
    setProviderInventoryMsgType('idle')

    let accountUpdateQuery = supabase
      .from('inventory_accounts')
      .update(accountUpdatePayload)
      .eq('id', accountId)
      .eq('product_id', selectedProviderProduct.id)

    if (!isOwner) {
      accountUpdateQuery = accountUpdateQuery.eq('provider_id', userId as string)
    } else if (selectedProviderProduct.providerId) {
      accountUpdateQuery = accountUpdateQuery.eq('provider_id', selectedProviderProduct.providerId)
    }

    const { error: accountUpdateError } = await accountUpdateQuery
    if (accountUpdateError) {
      setIsProviderInventoryEditingSaving(false)
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(`No se pudo editar la cuenta. ${accountUpdateError.message}`)
      return
    }

    if (isProfilesInventoryProduct) {
      const sortedSlots = [...providerInventoryEditingAccount.slots].sort((a, b) => a.slotIndex - b.slotIndex)
      const firstSlot = sortedSlots[0]
      const slotPayload: Record<string, unknown> = {
        slot_label: nextSlotLabel || null,
        profile_pin: nextProfilePin || null,
      }

      if (firstSlot?.id) {
        let slotUpdateQuery = supabase
          .from('inventory_slots')
          .update(slotPayload)
          .eq('id', firstSlot.id)
          .eq('product_id', selectedProviderProduct.id)

        if (!isOwner) {
          slotUpdateQuery = slotUpdateQuery.eq('provider_id', userId as string)
        } else if (selectedProviderProduct.providerId) {
          slotUpdateQuery = slotUpdateQuery.eq('provider_id', selectedProviderProduct.providerId)
        }

        const { error: slotUpdateError } = await slotUpdateQuery
        if (slotUpdateError) {
          setIsProviderInventoryEditingSaving(false)
          setProviderInventoryMsgType('error')
          setProviderInventoryMsg(`No se pudo editar perfil/PIN. ${slotUpdateError.message}`)
          return
        }
      } else {
        const insertPayload = {
          inventory_account_id: accountId,
          product_id: selectedProviderProduct.id,
          provider_id: selectedProviderProduct.providerId || (userId as string),
          slot_index: 1,
          slot_label: nextSlotLabel || '1',
          profile_pin: nextProfilePin || null,
          status: 'free',
        }
        const { error: insertSlotError } = await supabase.from('inventory_slots').insert(insertPayload)
        if (insertSlotError) {
          setIsProviderInventoryEditingSaving(false)
          setProviderInventoryMsgType('error')
          setProviderInventoryMsg(`No se pudo crear perfil/PIN. ${insertSlotError.message}`)
          return
        }
      }
    }

    await loadProviderProductInventory(selectedProviderProduct)
    await loadProviderDashboardData()
    closeProviderInventoryEditModal()
    setProviderInventoryMsgType('ok')
    setProviderInventoryMsg('Cuenta/perfil actualizado correctamente.')
  }

  async function handleProviderInventoryDeleteAccount(account: ProviderInventoryAccount) {
    if (!selectedProviderProduct) return
    if (!isOwner && !userId) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('Sesion invalida para borrar inventario.')
      return
    }

    const hasBuyer = account.buyerId.trim().length > 0 || account.buyerName.trim().length > 0
    const hasSlotAssignment = account.slots.some(slot => {
      const status = slot.status.trim().toLowerCase()
      return (
        slot.buyerId.trim().length > 0 ||
        ['occupied', 'ocupado', 'delivered', 'entregado', 'reserved', 'reservado', 'used', 'taken', 'asignado'].includes(
          status
        )
      )
    })

    if (hasBuyer || hasSlotAssignment || Boolean(account.orderId)) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg('No puedes borrar una cuenta vinculada a compra activa. Primero liberala/vencela.')
      return
    }

    const deletingKey = account.id
    setIsProviderInventoryDeleting(previous => ({ ...previous, [deletingKey]: true }))
    setProviderInventoryMsg('')
    setProviderInventoryMsgType('idle')

    let slotsDeleteQuery = supabase
      .from('inventory_slots')
      .delete()
      .eq('inventory_account_id', account.id)
      .eq('product_id', selectedProviderProduct.id)

    if (!isOwner) {
      slotsDeleteQuery = slotsDeleteQuery.eq('provider_id', userId as string)
    } else if (selectedProviderProduct.providerId) {
      slotsDeleteQuery = slotsDeleteQuery.eq('provider_id', selectedProviderProduct.providerId)
    }

    const { error: deleteSlotsError } = await slotsDeleteQuery
    if (deleteSlotsError && !isLikelySchemaError(deleteSlotsError.message)) {
      setIsProviderInventoryDeleting(previous => ({ ...previous, [deletingKey]: false }))
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(`No se pudo borrar perfiles vinculados. ${deleteSlotsError.message}`)
      return
    }

    let accountDeleteQuery = supabase
      .from('inventory_accounts')
      .delete()
      .eq('id', account.id)
      .eq('product_id', selectedProviderProduct.id)

    if (!isOwner) {
      accountDeleteQuery = accountDeleteQuery.eq('provider_id', userId as string)
    } else if (selectedProviderProduct.providerId) {
      accountDeleteQuery = accountDeleteQuery.eq('provider_id', selectedProviderProduct.providerId)
    }

    const { error: deleteAccountError } = await accountDeleteQuery
    setIsProviderInventoryDeleting(previous => ({ ...previous, [deletingKey]: false }))

    if (deleteAccountError) {
      setProviderInventoryMsgType('error')
      setProviderInventoryMsg(`No se pudo borrar la cuenta. ${deleteAccountError.message}`)
      return
    }

    await syncProviderProductStock(selectedProviderProduct)
    await loadProviderProductInventory(selectedProviderProduct)
    await loadProviderDashboardData()
    if (providerInventoryEditingAccountId === account.id) {
      closeProviderInventoryEditModal()
    }
    setProviderInventoryMsgType('ok')
    setProviderInventoryMsg('Cuenta/perfil eliminado correctamente.')
  }

  async function handleProviderProductSubmit() {
    if (!userId || !canSeeProvider) return

    const name = providerProductForm.name.trim()
    const accountType = providerProductForm.accountType.trim().toLowerCase() || 'profiles'
    const isProfilesProduct = isProfilesAccountType(accountType)
    const priceGuest = Math.max(0, toNumber(parseDecimalInput(providerProductForm.priceGuest), NaN))
    const priceAffiliate = Math.max(0, toNumber(parseDecimalInput(providerProductForm.priceAffiliate), NaN))
    const profilesPerAccount = Math.floor(toNumber(parseDecimalInput(providerProductForm.profilesPerAccount), NaN))
    const durationRaw = providerProductForm.durationDays.trim()
    let durationDays: number | null = null
    if (durationRaw.length > 0) {
      const parsedDuration = Math.floor(toNumber(parseDecimalInput(durationRaw), NaN))
      if (!Number.isFinite(parsedDuration) || parsedDuration < 1) {
        setProviderMsgType('error')
        setProviderMsg('Duracion invalida. Ingresa dias validos (minimo 1).')
        return
      }
      durationDays = parsedDuration
    }

    if (!name) {
      setProviderMsgType('error')
      setProviderMsg('Ingresa nombre del producto.')
      return
    }
    if (!providerProductForm.logo.trim()) {
      setProviderMsgType('error')
      setProviderMsg('Sube una imagen del producto antes de guardar.')
      return
    }
    if (isProviderImageUploading) {
      setProviderMsgType('error')
      setProviderMsg('Espera a que termine la subida de imagen.')
      return
    }
    if (!Number.isFinite(priceGuest) || !Number.isFinite(priceAffiliate)) {
      setProviderMsgType('error')
      setProviderMsg('Precios invalidos.')
      return
    }
    if (isProfilesProduct && (!Number.isFinite(profilesPerAccount) || profilesPerAccount < 1)) {
      setShowProviderProfilesModal(true)
      setProviderMsgType('error')
      setProviderMsg('Define cuantos perfiles va a tener cada cuenta.')
      return
    }

    if (editingProviderProductId === null && !isOwner) {
      let liveLimit = providerProductLimit
      let productsCount = providerProducts.length

      const countResult = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', userId)

      if (!countResult.error && typeof countResult.count === 'number') {
        productsCount = countResult.count
      }

      const limitByProvider = await supabase
        .from('provider_limits')
        .select('*')
        .eq('provider_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
      let limitRow: Record<string, unknown> | null =
        !limitByProvider.error &&
        Array.isArray(limitByProvider.data) &&
        limitByProvider.data.length > 0
          ? (limitByProvider.data[0] as Record<string, unknown>)
          : null

      if (limitRow) {
        const row = limitRow
        const raw = toNullableNumber(row.max_products ?? row.product_limit ?? row.limit)
        liveLimit = raw === null ? null : Math.max(0, Math.floor(raw))
      } else if (!limitByProvider.error || isLikelySchemaError(limitByProvider.error?.message ?? '')) {
        const limitByUser = await supabase
          .from('provider_limits')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
        limitRow =
          !limitByUser.error && Array.isArray(limitByUser.data) && limitByUser.data.length > 0
            ? (limitByUser.data[0] as Record<string, unknown>)
            : null

        if (limitRow) {
          const row = limitRow
          const raw = toNullableNumber(row.max_products ?? row.product_limit ?? row.limit)
          liveLimit = raw === null ? null : Math.max(0, Math.floor(raw))
        }
      }

      if (liveLimit === null) {
        setProviderMsgType('error')
        setProviderMsg(
          'No se pudo validar tu limite de productos. Verifica provider_limits + policy SELECT para provider.'
        )
        return
      }

      if (liveLimit !== null && productsCount >= liveLimit) {
        setProviderProductLimit(liveLimit)
        setProviderMsgType('error')
        setProviderMsg(
          `Llegaste a tu limite (${productsCount}/${liveLimit}). Pide al owner que aumente tu limite para crear otro producto.`
        )
        return
      }
    }

    const extraFields = parseExtraFieldKeys(providerProductForm.extraRequiredFields)
    const extraRequiredFieldsPayload = isProfilesProduct
      ? {
          fields: extraFields,
          profiles_per_account: profilesPerAccount,
        }
      : extraFields

    const basePayload: Record<string, unknown> = {
      provider_id: userId,
      name,
      description: providerProductForm.summary.trim() || null,
      image_url: providerProductForm.logo.trim() || null,
      stock_available: 0,
      price_guest: priceGuest,
      price_affiliate: priceAffiliate,
      price_logged: priceAffiliate,
      duration_days: durationDays,
      renewable: providerProductForm.renewable,
      delivery_mode: providerProductForm.deliveryMode,
      extra_required_fields: extraRequiredFieldsPayload,
      active: providerProductForm.isActive,
      is_active: providerProductForm.isActive,
    }
    const accountTypeCandidates = [
      toProductAccountTypeForDb(accountType),
      ...getProductAccountTypeDbCandidates(accountType),
    ].filter((value, index, array) => array.indexOf(value) === index)

    setIsProviderSaving(true)
    setProviderMsg('')
    setProviderMsgType('idle')
    let errorMessage = ''
    let saved = false

    for (const accountTypeCandidate of accountTypeCandidates) {
      const payload = {
        ...basePayload,
        account_type: accountTypeCandidate,
      }
      if (editingProviderProductId !== null) {
        let query = supabase.from('products').update(payload).eq('id', editingProviderProductId)
        if (!isOwner) {
          query = query.eq('provider_id', userId)
        }
        const { error } = await query
        if (!error) {
          saved = true
          break
        }
        errorMessage = error.message
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (!error) {
          saved = true
          break
        }
        errorMessage = error.message
      }
    }

    if (!saved) {
      const normalizedError = errorMessage.trim().toUpperCase()
      if (normalizedError.includes('PRODUCT_LIMIT_REACHED')) {
        setProviderMsgType('error')
        setProviderMsg(
          providerProductLimit !== null
            ? `Limite alcanzado (${providerProducts.length}/${providerProductLimit}).`
            : 'Llegaste al limite de productos asignado por owner.'
        )
        setIsProviderSaving(false)
        return
      }
      setProviderMsgType('error')
      setProviderMsg(
        `No se pudo guardar producto. ${errorMessage || 'Revisa constraint products_account_type_chk en DB.'}`.trim()
      )
      setIsProviderSaving(false)
      return
    }

    setProviderMsgType('ok')
    setProviderMsg(editingProviderProductId ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.')
    resetProviderProductForm()
    setShowProviderProductForm(false)
    setShowProviderProfilesModal(false)
    await loadProviderDashboardData()
    setIsProviderSaving(false)
  }

  async function handleProviderToggleActive(product: ProviderProduct) {
    const nextValue = !product.isActive
    setProviderMsg('')
    setProviderMsgType('idle')

    const variants: Array<Record<string, unknown>> = [{ is_active: nextValue }, { active: nextValue }]
    let updated = false
    let finalError = ''

    for (const payload of variants) {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id)
      if (!error) {
        updated = true
        break
      }
      finalError = error.message
      if (!isLikelySchemaError(error.message)) break
    }

    if (!updated) {
      setProviderMsgType('error')
      setProviderMsg(`No se pudo actualizar estado del producto. ${finalError || ''}`.trim())
      return
    }

    setProviderMsgType('ok')
    setProviderMsg(nextValue ? 'Producto activado.' : 'Producto desactivado.')
    await loadProviderDashboardData()
  }

  async function settleProviderCommissionForOrder(orderId: string, creditMode: 'adjust_only' | 'net_credit' | 'auto' = 'auto') {
    const normalizedOrderId = orderId.trim()
    if (!normalizedOrderId) {
      return { ok: false, reason: 'Pedido invalido para liquidacion.' }
    }

    const { error } = await supabase.rpc('settle_provider_commission', {
      p_order_id: normalizedOrderId,
      p_credit_mode: creditMode,
    })
    if (error) {
      return { ok: false, reason: error.message }
    }

    return { ok: true, reason: '' }
  }

  function handleProviderOrderDraftChange(orderId: string, patch: Partial<ProviderOrderDraft>) {
    setProviderOrderDrafts(previous => {
      const key = String(orderId)
      const current = previous[key] ?? { resolutionSummary: '', loginUser: '', loginPassword: '', profilePin: '' }
      return {
        ...previous,
        [key]: {
          ...current,
          ...patch,
        },
      }
    })
  }

  async function refundBuyerBalance(buyerId: string, amount: number) {
    if (!buyerId || !Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: 'Datos invalidos para reembolso.' }
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', buyerId)
      .maybeSingle()

    if (profileError) {
      return { ok: false, reason: profileError.message }
    }

    const currentBalance = Math.max(0, toNumber((profileRow as Record<string, unknown> | null)?.balance, 0))
    const nextBalance = currentBalance + Math.max(0, amount)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: nextBalance })
      .eq('id', buyerId)

    if (updateError) {
      return { ok: false, reason: updateError.message }
    }
    return { ok: true, reason: '' }
  }

  async function handleProviderOnDemandOrderSave(order: ProviderOrder) {
    if (!userId) return

    const key = String(order.id)
    const draft = providerOrderDrafts[key] ?? {
      resolutionSummary: '',
      loginUser: '',
      loginPassword: '',
      profilePin: '',
    }

    const resolutionSummary = draft.resolutionSummary.trim()
    const loginUser = draft.loginUser.trim()
    const loginPassword = draft.loginPassword.trim()
    const profilePin = draft.profilePin.trim()

    if (!resolutionSummary) {
      setProviderMsgType('error')
      setProviderMsg(`Ingresa un resumen de resolucion para el pedido #${order.id}.`)
      return
    }
    if (!loginUser || !loginPassword) {
      setProviderMsgType('error')
      setProviderMsg(`Completa login y password para el pedido #${order.id}.`)
      return
    }
    if (order.productId === null) {
      setProviderMsgType('error')
      setProviderMsg(`El pedido #${order.id} no tiene producto vinculado.`)
      return
    }

    const product = providerProducts.find(item => item.id === order.productId)
    if (!product) {
      setProviderMsgType('error')
      setProviderMsg(`No se encontro el producto del pedido #${order.id}.`)
      return
    }

    const providerId = product.providerId || userId
    const isProfilesProduct = isProfilesAccountType(product.accountType)
    const durationDays = order.durationDays ?? product.durationDays
    const now = new Date()
    const nowIso = now.toISOString()
    const expiresAt =
      durationDays !== null && durationDays > 0
        ? new Date(now.getTime() + durationDays * 86400000).toISOString()
        : null

    setProviderOrderSaving(previous => ({ ...previous, [key]: true }))
    setProviderMsg('')
    setProviderMsgType('idle')

    const credentialsPayload = {
      login_user: loginUser,
      login_password: loginPassword,
      ...(isProfilesProduct && profilePin ? { profile_pin: profilePin } : {}),
    }

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: nowIso,
        starts_at: nowIso,
        expires_at: expiresAt,
        duration_days: durationDays,
        credentials: credentialsPayload,
      })
      .eq('id', order.id)

    if (orderUpdateError) {
      setProviderOrderSaving(previous => ({ ...previous, [key]: false }))
      setProviderMsgType('error')
      setProviderMsg(`No se pudo cerrar el pedido #${order.id}. ${orderUpdateError.message}`)
      return
    }

    const { data: insertedAccounts, error: accountInsertError } = await supabase
      .from('inventory_accounts')
      .insert({
        product_id: product.id,
        provider_id: providerId,
        login_user: loginUser,
        login_password: loginPassword,
        slot_capacity: 1,
        is_active: isProfilesProduct,
      })
      .select('id')
      .limit(1)

    if (accountInsertError) {
      setProviderOrderSaving(previous => ({ ...previous, [key]: false }))
      setProviderMsgType('error')
      setProviderMsg(
        `Pedido #${order.id} entregado, pero no se pudo guardar credenciales en inventario. ${accountInsertError.message}`
      )
      await loadProviderDashboardData()
      return
    }

    const insertedAccountId = toText((insertedAccounts ?? [])[0]?.id)
    let slotId = ''
    if (isProfilesProduct && insertedAccountId) {
      const { data: insertedSlots, error: slotInsertError } = await supabase
        .from('inventory_slots')
        .insert({
          inventory_account_id: insertedAccountId,
          product_id: product.id,
          provider_id: providerId,
          slot_index: 1,
          slot_label: 'Perfil 1',
          profile_pin: profilePin || null,
          status: 'occupied',
          buyer_id: order.buyerId || null,
        })
        .select('id')
        .limit(1)

      if (slotInsertError) {
        setProviderOrderSaving(previous => ({ ...previous, [key]: false }))
        setProviderMsgType('error')
        setProviderMsg(
          `Pedido #${order.id} entregado, pero no se pudo crear slot del inventario. ${slotInsertError.message}`
        )
        await syncProviderProductStock(product)
        await loadProviderDashboardData()
        return
      }
      slotId = toText((insertedSlots ?? [])[0]?.id)
    }

    if (slotId) {
      await supabase.from('orders').update({ inventory_slot_id: slotId }).eq('id', order.id)
    }

    const linkedOnDemandTicket = providerTickets.find(
      ticket => ticket.orderId === String(order.id) && ticket.isOnDemandRequest
    )
    if (linkedOnDemandTicket) {
      await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          resolution_summary: resolutionSummary,
          resolved_at: nowIso,
        })
        .eq('id', linkedOnDemandTicket.id)
    }

    const balanceCreditResult = await settleProviderCommissionForOrder(String(order.id), 'net_credit')

    await syncProviderProductStock(product)
    if (selectedProviderProductId === product.id) {
      await loadProviderProductInventory(product)
    }
    await loadProviderDashboardData()
    setProviderOrderSaving(previous => ({ ...previous, [key]: false }))
    if (!balanceCreditResult.ok) {
      setProviderMsgType('error')
      setProviderMsg(
        `Pedido #${order.id} entregado, pero no se pudo acreditar saldo proveedor. ${balanceCreditResult.reason}`
      )
      return
    }
    setProviderMsgType('ok')
    setProviderMsg(`Pedido #${order.id} entregado, guardado en inventario y saldo acreditado.`)
  }

  async function handleProviderOnDemandOrderReject(order: ProviderOrder) {
    if (!userId) return

    const key = String(order.id)
    const draft = providerOrderDrafts[key] ?? {
      resolutionSummary: '',
      loginUser: '',
      loginPassword: '',
      profilePin: '',
    }
    const rejectionSummary = draft.resolutionSummary.trim() || 'Pedido rechazado por proveedor.'

    setProviderOrderSaving(previous => ({ ...previous, [key]: true }))
    setProviderMsg('')
    setProviderMsgType('idle')

    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'rejected',
      })
      .eq('id', order.id)

    if (orderUpdateError) {
      setProviderOrderSaving(previous => ({ ...previous, [key]: false }))
      setProviderMsgType('error')
      setProviderMsg(`No se pudo rechazar el pedido #${order.id}. ${orderUpdateError.message}`)
      return
    }

    const linkedOnDemandTicket = providerTickets.find(
      ticket => ticket.orderId === String(order.id) && ticket.isOnDemandRequest
    )
    if (linkedOnDemandTicket) {
      await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          resolution_summary: rejectionSummary,
          resolution_detail: 'Pedido rechazado por proveedor.',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', linkedOnDemandTicket.id)
    }

    let refundResult = { ok: true, reason: '' }
    if (order.buyerId && order.amount > 0) {
      refundResult = await refundBuyerBalance(order.buyerId, order.amount)
    }

    await loadProviderDashboardData()
    setProviderOrderSaving(previous => ({ ...previous, [key]: false }))
    if (!refundResult.ok) {
      setProviderMsgType('error')
      setProviderMsg(
        `Pedido #${order.id} rechazado, pero fallo el reembolso al comprador. ${refundResult.reason}`
      )
      return
    }
    setProviderMsgType('ok')
    setProviderMsg(`Pedido #${order.id} rechazado y saldo devuelto al comprador.`)
  }

  function handleProviderTicketDraftChange(ticketId: string, patch: Partial<ProviderTicketDraft>) {
    setProviderTicketDrafts(previous => {
      const key = String(ticketId)
      const current = previous[key] ?? {
        status: 'open',
        resolutionSummary: '',
        resolutionDetail: '',
        loginUser: '',
        loginPassword: '',
        profileLabel: '',
        profilePin: '',
      }
      return {
        ...previous,
        [key]: {
          ...current,
          ...patch,
        },
      }
    })
  }

  async function handleProviderTicketSave(ticket: ProviderTicket) {
    const key = String(ticket.id)
    const draft = providerTicketDrafts[key] ?? {
      status: ticket.status,
      resolutionSummary: ticket.resolutionSummary,
      resolutionDetail: ticket.resolutionDetail,
      loginUser: ticket.credentialLoginUser,
      loginPassword: ticket.credentialLoginPassword,
      profileLabel: ticket.credentialProfileLabel,
      profilePin: ticket.credentialProfilePin,
    }

    const normalizedStatus = draft.status.trim().toLowerCase() || 'open'
    const isProfilesTicket = isProfilesAccountType(ticket.orderAccountType)
    const currentLoginUser = ticket.credentialLoginUser.trim()
    const currentLoginPassword = ticket.credentialLoginPassword.trim()
    const currentProfileLabel = ticket.credentialProfileLabel.trim()
    const currentProfilePin = ticket.credentialProfilePin.trim()
    const nextLoginUser = draft.loginUser.trim() || currentLoginUser
    const nextLoginPassword = draft.loginPassword.trim() || currentLoginPassword
    const nextProfileLabel = draft.profileLabel.trim() || currentProfileLabel
    const nextProfilePin = draft.profilePin.trim() || currentProfilePin

    const changedCredentialFields: string[] = []
    if (ticket.orderId !== null) {
      if (nextLoginUser !== currentLoginUser) changedCredentialFields.push('correo/login')
      if (nextLoginPassword !== currentLoginPassword) changedCredentialFields.push('contrasena')
      if (isProfilesTicket && nextProfileLabel !== currentProfileLabel) changedCredentialFields.push('perfil')
      if (isProfilesTicket && nextProfilePin !== currentProfilePin) changedCredentialFields.push('PIN')
    }

    const autoResolutionDetail =
      changedCredentialFields.length > 0
        ? `Credenciales actualizadas por proveedor: ${changedCredentialFields.join(', ')}.`
        : ''
    const mergedResolutionDetail = [draft.resolutionDetail.trim(), autoResolutionDetail]
      .filter(Boolean)
      .join(' | ')

    const resolvedAt =
      normalizedStatus === 'resolved' || normalizedStatus === 'resuelto' || normalizedStatus === 'closed'
        ? new Date().toISOString()
        : null

    const payloadVariants: Array<Record<string, unknown>> = [
      {
        status: normalizedStatus,
        resolution_summary: draft.resolutionSummary.trim() || null,
        resolution_detail: mergedResolutionDetail || null,
        resolved_at: resolvedAt,
      },
      {
        status: normalizedStatus,
        resolved_at: resolvedAt,
      },
    ]

    setProviderTicketSaving(previous => ({ ...previous, [key]: true }))
    setProviderMsg('')
    setProviderMsgType('idle')

    let saved = false
    let finalError = ''

    for (const payload of payloadVariants) {
      const { error } = await supabase.from('tickets').update(payload).eq('id', ticket.id)
      if (!error) {
        saved = true
        break
      }
      finalError = error.message
      if (!isLikelySchemaError(error.message)) break
    }

    setProviderTicketSaving(previous => ({ ...previous, [key]: false }))

    if (!saved) {
      setProviderMsgType('error')
      setProviderMsg(`No se pudo actualizar ticket #${ticket.id}. ${finalError || ''}`.trim())
      return
    }

    let orderSyncError = ''
    if (ticket.orderId !== null) {
      const orderPatch: Record<string, unknown> = {}
      if (ticket.isOnDemandRequest) {
        if (
          normalizedStatus === 'resolved' ||
          normalizedStatus === 'resuelto' ||
          normalizedStatus === 'delivered' ||
          normalizedStatus === 'entregado'
        ) {
          orderPatch.status = 'delivered'
          orderPatch.delivered_at = new Date().toISOString()
        } else if (normalizedStatus === 'in_progress' || normalizedStatus === 'en_proceso') {
          orderPatch.status = 'in_progress'
        } else if (normalizedStatus === 'open' || normalizedStatus === 'abierto') {
          orderPatch.status = 'pending'
        }
      }

      if (changedCredentialFields.length > 0) {
        orderPatch.credentials = buildOrderCredentialPayload(ticket.orderCredentialsRaw, {
          loginUser: nextLoginUser,
          loginPassword: nextLoginPassword,
          profileLabel: nextProfileLabel,
          profilePin: nextProfilePin,
          isProfiles: isProfilesTicket,
        })
      }

      if (Object.keys(orderPatch).length > 0) {
        const { error: orderError } = await supabase.from('orders').update(orderPatch).eq('id', ticket.orderId)
        if (orderError) {
          orderSyncError = orderError.message
        }
      }

      if (!orderSyncError && changedCredentialFields.length > 0 && ticket.orderInventorySlotId) {
        let linkedAccountId = ''
        const { data: slotRow, error: slotReadError } = await supabase
          .from('inventory_slots')
          .select('inventory_account_id')
          .eq('id', ticket.orderInventorySlotId)
          .maybeSingle()

        if (slotReadError && !isLikelySchemaError(slotReadError.message)) {
          orderSyncError = `No se pudo leer slot vinculado. ${slotReadError.message}`
        } else {
          linkedAccountId = toText((slotRow as Record<string, unknown> | null)?.inventory_account_id)
        }

        if (!orderSyncError && isProfilesTicket) {
          const slotPatch: Record<string, unknown> = {}
          if (nextProfileLabel) slotPatch.slot_label = nextProfileLabel
          if (nextProfilePin) slotPatch.profile_pin = nextProfilePin
          if (Object.keys(slotPatch).length > 0) {
            const { error: slotUpdateError } = await supabase
              .from('inventory_slots')
              .update(slotPatch)
              .eq('id', ticket.orderInventorySlotId)
            if (slotUpdateError) {
              orderSyncError = `No se pudo actualizar perfil/PIN del slot. ${slotUpdateError.message}`
            }
          }
        }

        if (!orderSyncError && linkedAccountId) {
          const { data: accountRow, error: accountReadError } = await supabase
            .from('inventory_accounts')
            .select('login_user')
            .eq('id', linkedAccountId)
            .maybeSingle()
          if (accountReadError && !isLikelySchemaError(accountReadError.message)) {
            orderSyncError = `No se pudo leer cuenta de inventario. ${accountReadError.message}`
          } else {
            const currentInventoryLogin = toText((accountRow as Record<string, unknown> | null)?.login_user)
            const nextInventoryLogin = isProfilesTicket
              ? composeInventoryProfileLogin(
                  nextLoginUser || currentInventoryLogin,
                  nextProfileLabel || currentProfileLabel || '1',
                  currentInventoryLogin
                )
              : nextLoginUser

            const accountPatch: Record<string, unknown> = {}
            if (nextInventoryLogin) accountPatch.login_user = nextInventoryLogin
            if (nextLoginPassword) accountPatch.login_password = nextLoginPassword

            if (Object.keys(accountPatch).length > 0) {
              const { error: accountUpdateError } = await supabase
                .from('inventory_accounts')
                .update(accountPatch)
                .eq('id', linkedAccountId)
              if (accountUpdateError) {
                orderSyncError = `No se pudo actualizar cuenta de inventario. ${accountUpdateError.message}`
              }
            }
          }
        }
      }
    }

    if (orderSyncError) {
      setProviderMsgType('error')
      setProviderMsg(
        `Ticket #${ticket.id} actualizado, pero no se pudo actualizar pedido #${ticket.orderId}. ${orderSyncError}`
      )
      await loadProviderDashboardData()
      return
    }

    setProviderMsgType('ok')
    setProviderMsg(
      ticket.orderId !== null
        ? `Ticket #${ticket.id} y pedido #${ticket.orderId} actualizados.`
        : `Ticket #${ticket.id} actualizado.`
    )
    await loadProviderDashboardData()
  }

  const loadOwnerDashboardData = useCallback(async () => {
    if (!isOwnerOrAdmin) return

    setIsOwnerLoading(true)
    setOwnerMsg('')
    setOwnerMsgType('idle')

    try {
      const [profilesResult, productsResult, ordersResult, ticketsResult, providerLimitsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(2000),
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(2000),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(3500),
        supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(3500),
        supabase.from('provider_limits').select('*').limit(3000),
      ])

      if (profilesResult.error) {
        setOwnerUsers([])
        setOwnerOverview(OWNER_OVERVIEW_DEFAULT)
        setOwnerMsg('No se pudo cargar la lista de usuarios.')
        setOwnerMsgType('error')
        return
      }

      const errors: string[] = []
      if (productsResult.error) errors.push('Error cargando productos globales.')
      if (ordersResult.error) errors.push('Error cargando compras/pedidos globales.')
      if (ticketsResult.error) errors.push('Error contando tickets.')
      if (providerLimitsResult.error) errors.push('Error cargando limites de proveedor.')

      const profileRows = (profilesResult.data ?? []) as Array<Record<string, unknown>>
      const providerBalanceColumn =
        PROVIDER_BALANCE_KEYS.find(key => profileRows.some(row => Object.prototype.hasOwnProperty.call(row, key))) ??
        null

      const normalizedUsers = profileRows.map<OwnerUser>(row => {
        const id = toText(row.id)
        const username = pickDisplayName(row) || 'Sin nombre'
        const role = normalizeAppRole(toText(row.role) || 'guest')
        const providerBalance =
          providerBalanceColumn !== null ? toNullableNumber(row[providerBalanceColumn]) : null

        return {
          id,
          username,
          role,
          approved: isTrueLike(row.is_approved),
          balance: toNumber(row.balance),
          providerBalance,
          createdAt: toText(row.created_at) || null,
        }
      })

      const rolePool = new Set<string>(OWNER_BASE_ROLES)
      for (const user of normalizedUsers) {
        if (user.role) rolePool.add(user.role)
      }

      // Solo guardamos usernames reales, no fallback con id.
      const usernameById = new Map<string, string>()
      const roleDraftSeed: Record<string, string> = {}
      const balanceDraftSeed: Record<string, string> = {}
      const providerBalanceDraftSeed: Record<string, string> = {}
      const providerLimitDraftSeed: Record<string, string> = {}

      for (let i = 0; i < normalizedUsers.length; i += 1) {
        const user = normalizedUsers[i]
        const raw = profileRows[i] ?? {}
        const rawUsername = pickDisplayName(raw as Record<string, unknown>)
        if (rawUsername) {
          usernameById.set(user.id, rawUsername)
        }
        roleDraftSeed[user.id] = normalizeAppRole(user.role)
        balanceDraftSeed[user.id] = ''
        providerBalanceDraftSeed[user.id] = ''
        providerLimitDraftSeed[user.id] = ''
      }

      const productRows = (productsResult.data ?? []) as Array<Record<string, unknown>>
      const ownerProductsMapped = productRows.map<OwnerProductItem>((row, index) => {
        const id = Math.max(1, Math.floor(toNumber(row.id ?? row.product_id, index + 1)))
        const providerId = toText(row.provider_id)
        const providerName = usernameById.get(providerId) ?? 'Proveedor'
        const name = toText(row.name ?? row.product_name ?? row.platform ?? row.title) || `Producto ${id}`
        const description = toText(row.description ?? row.summary ?? row.plan ?? row.duration)
        const stock = Math.max(
          0,
          Math.floor(toNumber(row.stock_available ?? row.stock ?? row.quantity ?? row.available_stock, 0))
        )
        const durationRaw = toNullableNumber(
          row.duration_days ?? row.subscription_days ?? row.durationDays ?? row.plan_days
        )
        const durationDays = durationRaw === null ? null : Math.max(1, Math.floor(durationRaw))
        const priceGuest = Math.max(0, toNumber(row.price_guest ?? row.guest_price ?? row.public_price))
        const priceAffiliate = Math.max(
          0,
          toNumber(
            row.price_affiliate ??
              row.price_logged ??
              row.price_login ??
              row.login_price ??
              row.affiliate_price,
            priceGuest
          )
        )
        const renewable = isTrueLike(row.renewable)
        const active = row.is_active !== false && row.active !== false
        return {
          id,
          name,
          description,
          providerId,
          providerName,
          accountType: toText(row.account_type ?? row.type) || 'profiles',
          deliveryMode: toText(row.delivery_mode ?? row.delivery) || 'instant',
          durationDays,
          stock,
          priceGuest,
          priceAffiliate,
          renewable,
          active,
          createdAt: toText(row.created_at) || null,
        }
      })

      const productById = new Map<number, OwnerProductItem>()
      for (const product of ownerProductsMapped) {
        productById.set(product.id, product)
      }

      const orderRows = (ordersResult.data ?? []) as Array<Record<string, unknown>>
      const ownerOrdersMapped = orderRows.map<OwnerOrderItem>((row, index) => {
        const id = toIdText(row.id ?? row.order_id, `order-${index + 1}`)
        const buyerId = toText(row.buyer_id ?? row.user_id)
        const providerId = toText(row.provider_id)
        const productIdRaw = toNullableNumber(row.product_id ?? row.productId)
        const productId = productIdRaw === null ? null : Math.floor(productIdRaw)
        const product = productId !== null ? productById.get(productId) : undefined
        const status = normalizeOrderStatusInput(toText(row.status) || 'pending')
        const durationRaw = toNullableNumber(
          row.duration_days ?? row.subscription_days ?? product?.durationDays
        )
        const durationDays = durationRaw === null ? null : Math.max(1, Math.floor(durationRaw))
        const startsAt = toText(row.starts_at) || null
        const expiresAt = toText(row.expires_at) || null
        const daysLeft = calculateDaysLeft(expiresAt)
        return {
          id,
          buyerId,
          buyerName: usernameById.get(buyerId) ?? 'Comprador',
          providerId,
          providerName: usernameById.get(providerId) ?? 'Proveedor',
          productId,
          productName: product?.name ?? (toText(row.product_name) || 'Producto'),
          accountType: toText(row.account_type) || product?.accountType || 'profiles',
          deliveryMode: toText(row.delivery_mode) || product?.deliveryMode || 'instant',
          durationDays,
          startsAt,
          expiresAt,
          daysLeft,
          status,
          amount: Math.max(0, toNumber(row.price_paid ?? row.amount ?? row.total)),
          createdAt: toText(row.created_at) || null,
        }
      })

      const orderStatusDraftSeed: Record<string, string> = {}
      for (const order of ownerOrdersMapped) {
        orderStatusDraftSeed[String(order.id)] = order.status
      }

      const ticketRows = (ticketsResult.data ?? []) as Array<Record<string, unknown>>
      const ownerTicketsMapped = ticketRows.map<OwnerTicketItem>((row, index) => {
        const id = toIdText(row.id ?? row.ticket_id, `ticket-${index + 1}`)
        const buyerId = toText(row.buyer_id ?? row.user_id)
        const providerId = toText(row.provider_id)
        const productIdRaw = toNullableNumber(row.product_id ?? row.productId)
        const productId = productIdRaw === null ? null : Math.floor(productIdRaw)
        const product = productId !== null ? productById.get(productId) : undefined
        const status = normalizeOrderStatusInput(toText(row.status) || 'open')
        return {
          id,
          type: toText(row.type ?? row.ticket_type) || 'soporte',
          status,
          buyerId,
          buyerName: usernameById.get(buyerId) ?? 'Comprador',
          providerId,
          providerName: usernameById.get(providerId) ?? 'Proveedor',
          productId,
          productName: product?.name ?? (toText(row.product_name) || 'Producto'),
          subject: toText(row.subject ?? row.asunto) || `Ticket #${id}`,
          createdAt: toText(row.created_at) || null,
          updatedAt: toText(row.updated_at) || null,
        }
      })

      const ticketStatusDraftSeed: Record<string, string> = {}
      for (const ticket of ownerTicketsMapped) {
        ticketStatusDraftSeed[String(ticket.id)] = ticket.status
      }

      const providerIdSet = new Set<string>()
      for (const user of normalizedUsers) {
        const role = normalizeAppRole(user.role)
        if (role === 'provider') providerIdSet.add(user.id)
      }
      for (const product of ownerProductsMapped) {
        if (product.providerId) providerIdSet.add(product.providerId)
      }
      for (const ticket of ownerTicketsMapped) {
        if (ticket.providerId) providerIdSet.add(ticket.providerId)
      }
      for (const order of ownerOrdersMapped) {
        if (order.providerId) providerIdSet.add(order.providerId)
      }

      const providerLimitByProviderId = new Map<string, number | null>()
      const providerLimitRows = (providerLimitsResult.data ?? []) as Array<Record<string, unknown>>
      for (const row of providerLimitRows) {
        const providerId = toText(row.provider_id ?? row.user_id)
        if (!providerId) continue
        const rawLimit = toNullableNumber(row.max_products ?? row.product_limit ?? row.limit)
        const normalizedLimit = rawLimit === null ? null : Math.max(0, Math.floor(rawLimit))
        providerLimitByProviderId.set(providerId, normalizedLimit)
      }

      const providerItems: OwnerProviderItem[] = Array.from(providerIdSet).map(providerId => {
        const profileUser = normalizedUsers.find(user => user.id === providerId)
        const role = profileUser?.role ?? 'provider'
        const productLimit = providerLimitByProviderId.get(providerId) ?? null
        const productsCreated = ownerProductsMapped.reduce(
          (sum, product) => sum + (product.providerId === providerId ? 1 : 0),
          0
        )
        const openTickets = ownerTicketsMapped.reduce(
          (sum, ticket) => sum + (ticket.providerId === providerId && isOpenTicketStatus(ticket.status) ? 1 : 0),
          0
        )
        const salesAmount = ownerOrdersMapped.reduce(
          (sum, order) =>
            sum +
            (order.providerId === providerId && isPaidLikeOrderStatus(order.status) ? order.amount : 0),
          0
        )

        return {
          id: providerId,
          username: profileUser?.username ?? usernameById.get(providerId) ?? 'Sin nombre',
          role,
          approved: profileUser?.approved ?? false,
          productLimit,
          productsCreated,
          providerBalance: profileUser?.providerBalance ?? 0,
          openTickets,
          salesAmount,
        }
      })

      providerItems.sort((a, b) => b.salesAmount - a.salesAmount)
      for (const provider of providerItems) {
        providerLimitDraftSeed[provider.id] = provider.productLimit !== null ? String(provider.productLimit) : ''
      }

      const rechargeTables = ['wallet_movements']
      const ownerRechargeRows: OwnerRechargeRequest[] = []

      for (const table of rechargeTables) {
        const { data, error } = await supabase
          .from(table)
          .select('id, user_id, amount, created_at')
          .order('created_at', { ascending: false })
          .limit(450)

        if (error) {
          if (isLikelySchemaError(error.message)) continue
          errors.push(`Error cargando ${table}.`)
          continue
        }

        for (const [index, row] of ((data ?? []) as Array<Record<string, unknown>>).entries()) {
          const amount = Math.max(0, toNumber(row.amount))
          if (amount <= 0) continue

          const userId = toText(row.user_id)
          ownerRechargeRows.push({
            id: toText(row.id ?? row.movement_id ?? row.request_id ?? row.uuid) || `${table}-${index}`,
            sourceTable: table,
            userId,
            username: (usernameById.get(userId) ?? pickDisplayName(row)) || 'Sin nombre',
            amount,
            method: 'Manual owner',
            status: 'approved',
            note: '',
            proofUrl: '',
            createdAt: toText(row.created_at ?? row.inserted_at) || null,
          })
        }
      }

      ownerRechargeRows.sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return right - left
      })

      const paidSalesByBuyer = new Map<string, number>()
      for (const order of ownerOrdersMapped) {
        if (!isPaidLikeOrderStatus(order.status)) continue
        const current = paidSalesByBuyer.get(order.buyerId) ?? 0
        paidSalesByBuyer.set(order.buyerId, current + order.amount)
      }

      const referralUsernameById = new Map<string, string>()

      const referralMap = new Map<
        string,
        {
          referrerId: string
          referredId: string
          linkedAt: string | null
          referrerUsernameHint: string | null
          referredUsernameHint: string | null
        }
      >()
      for (const row of profileRows) {
        const referrerId = toText(row.referred_by)
        const referredId = toText(row.id)
        const referredUsername = normalizeDisplayName(row.username)
        if (referredId && referredUsername) {
          referralUsernameById.set(referredId, referredUsername)
        }
        if (!referrerId || !referredId || referrerId === referredId) continue
        const key = `${referrerId}:${referredId}`
        if (!referralMap.has(key)) {
          referralMap.set(key, {
            referrerId,
            referredId,
            linkedAt: toText(row.created_at) || null,
            referrerUsernameHint: null,
            referredUsernameHint: referredUsername || null,
          })
        }
      }

      for (const source of AFFILIATE_LINK_QUERIES) {
        const { data, error } = await supabase
          .from(source.table)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1600)

        if (error) {
          if (isLikelySchemaError(error.message)) continue
          errors.push(`Error leyendo ${source.table}.`)
          continue
        }

        for (const row of (data ?? []) as Array<Record<string, unknown>>) {
          const referrerId = pickRowText(row, [
            source.filterColumn,
            'referrer_user_id',
            'referrer_id',
            'owner_id',
          ])
          const referredId = pickRowText(row, source.referredColumns)
          if (!referrerId || !referredId || referrerId === referredId) continue
          const key = `${referrerId}:${referredId}`
          const referrerUsernameHint = normalizeDisplayName(
            pickRowText(row, [
              'referrer_username',
              'referrer_name',
              'affiliate_username',
              'owner_username',
              'username_referrer',
            ])
          )
          const referredUsernameHint = normalizeDisplayName(
            pickRowText(row, ['referred_username', 'referred_name', 'target_username', 'username_referred', 'username'])
          )
          if (referrerId && referrerUsernameHint) {
            referralUsernameById.set(referrerId, referrerUsernameHint)
          }
          if (referredId && referredUsernameHint) {
            referralUsernameById.set(referredId, referredUsernameHint)
          }
          if (!referralMap.has(key)) {
            referralMap.set(key, {
              referrerId,
              referredId,
              linkedAt: pickRowText(row, ['created_at', 'linked_at', 'inserted_at']) || null,
              referrerUsernameHint: referrerUsernameHint || null,
              referredUsernameHint: referredUsernameHint || null,
            })
          } else {
            const existing = referralMap.get(key)
            if (existing) {
              if (!existing.referrerUsernameHint && referrerUsernameHint) {
                existing.referrerUsernameHint = referrerUsernameHint
              }
              if (!existing.referredUsernameHint && referredUsernameHint) {
                existing.referredUsernameHint = referredUsernameHint
              }
            }
          }
        }
      }

      const ownerReferralRows = Array.from(referralMap.values())
        .map<OwnerReferralItem>(item => ({
          referrerId: item.referrerId,
          referrerUsername:
            normalizeDisplayName(usernameById.get(item.referrerId)) ||
            normalizeDisplayName(item.referrerUsernameHint) ||
            normalizeDisplayName(referralUsernameById.get(item.referrerId)) ||
            'Sin nombre',
          referredId: item.referredId,
          referredUsername:
            normalizeDisplayName(usernameById.get(item.referredId)) ||
            normalizeDisplayName(item.referredUsernameHint) ||
            normalizeDisplayName(referralUsernameById.get(item.referredId)) ||
            'Sin nombre',
          linkedAt: item.linkedAt,
          referredSales: paidSalesByBuyer.get(item.referredId) ?? 0,
        }))
        .sort((a, b) => {
          const left = a.linkedAt ? new Date(a.linkedAt).getTime() : 0
          const right = b.linkedAt ? new Date(b.linkedAt).getTime() : 0
          return right - left
        })

      const activityUserIds = new Set<string>()
      for (const order of ownerOrdersMapped) {
        if (order.buyerId) activityUserIds.add(order.buyerId)
        if (order.providerId) activityUserIds.add(order.providerId)
      }
      for (const ticket of ownerTicketsMapped) {
        if (ticket.buyerId) activityUserIds.add(ticket.buyerId)
        if (ticket.providerId) activityUserIds.add(ticket.providerId)
      }
      for (const item of ownerReferralRows) {
        if (item.referrerId) activityUserIds.add(item.referrerId)
        if (item.referredId) activityUserIds.add(item.referredId)
      }

      if (normalizedUsers.length <= 1 && activityUserIds.size > 1) {
        errors.push(
          'RLS en profiles esta limitando el listado de usuarios. Ajusta policy SELECT para que owner pueda leer todos los perfiles.'
        )
      }

      const recentActivity: OwnerActivityItem[] = []
      for (const order of ownerOrdersMapped.slice(0, 12)) {
        recentActivity.push({
          id: `order-${order.id}`,
          type: 'compra',
          title: `Compra #${order.id}`,
          detail: `${order.buyerName} compro ${order.productName} (${formatMoney(order.amount)}).`,
          createdAt: order.createdAt,
        })
      }
      for (const ticket of ownerTicketsMapped.slice(0, 12)) {
        recentActivity.push({
          id: `ticket-${ticket.id}`,
          type: 'ticket',
          title: `Ticket #${ticket.id}`,
          detail: `${ticket.subject} | ${formatOrderStatus(ticket.status)}`,
          createdAt: ticket.updatedAt || ticket.createdAt,
        })
      }
      for (const product of ownerProductsMapped.slice(0, 10)) {
        recentActivity.push({
          id: `product-${product.id}`,
          type: 'producto',
          title: product.active ? `Producto activo #${product.id}` : `Producto pausado #${product.id}`,
          detail: `${product.name} (${product.providerName}).`,
          createdAt: product.createdAt,
        })
      }
      for (const request of ownerRechargeRows.slice(0, 10)) {
        recentActivity.push({
          id: `recharge-${request.id}`,
          type: 'recarga',
          title: `Recarga ${formatOrderStatus(request.status)}`,
          detail: `${request.username} | ${formatMoney(request.amount)} | ${request.method}`,
          createdAt: request.createdAt,
        })
      }
      recentActivity.sort((a, b) => {
        const left = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const right = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return right - left
      })

      const approvedUsers = normalizedUsers.filter(user => user.approved).length
      const usersPendingApproval = normalizedUsers.length - approvedUsers
      const providers = normalizedUsers.filter(user => {
        const role = normalizeAppRole(user.role)
        return role === 'provider'
      }).length

      const salesTotal = ownerOrdersMapped.reduce(
        (sum, order) => sum + (isPaidLikeOrderStatus(order.status) ? order.amount : 0),
        0
      )
      const rechargedTotal = ownerRechargeRows.reduce((sum, request) => {
        const status = normalizeOrderStatusInput(request.status)
        const approved = status === 'approved' || status === 'aprobado' || status === 'completed' || status === 'paid'
        return sum + (approved ? request.amount : 0)
      }, 0)
      const onDemandPending = ownerOrdersMapped.reduce((sum, order) => {
        const onDemand = ['on_demand', 'a_pedido', 'a pedido'].includes(order.deliveryMode.trim().toLowerCase())
        return sum + (onDemand && isPendingLikeOrderStatus(order.status) ? 1 : 0)
      }, 0)
      const ticketsOpen = ownerTicketsMapped.reduce(
        (sum, ticket) => sum + (isOpenTicketStatus(ticket.status) ? 1 : 0),
        0
      )

      setOwnerUsers(normalizedUsers)
      setOwnerRoleOptions(
        Array.from(new Set(Array.from(rolePool).map(roleValue => normalizeAppRole(roleValue)))).sort((a, b) =>
          a.localeCompare(b)
        )
      )
      setOwnerRoleDraft(roleDraftSeed)
      setOwnerBalanceDraft(balanceDraftSeed)
      setOwnerProviderBalanceDraft(providerBalanceDraftSeed)
      setOwnerProviderLimitDraft(providerLimitDraftSeed)
      setOwnerOrderStatusDraft(orderStatusDraftSeed)
      setOwnerTicketStatusDraft(ticketStatusDraftSeed)
      setOwnerProviderBalanceColumn(providerBalanceColumn)
      setOwnerProducts(ownerProductsMapped)
      setOwnerOrders(ownerOrdersMapped)
      setOwnerTicketsGlobal(ownerTicketsMapped)
      setOwnerProviders(providerItems)
      setOwnerRechargeRequests(ownerRechargeRows)
      setOwnerReferralLinks(ownerReferralRows)
      setOwnerRecentActivity(recentActivity.slice(0, 28))
      setOwnerOverview({
        salesTotal,
        rechargedTotal,
        usersPendingApproval,
        onDemandPending,
        ticketsOpen,
        users: normalizedUsers.length,
        providers,
        products: ownerProductsMapped.length,
        orders: ownerOrdersMapped.length,
      })

      if (errors.length > 0) {
        setOwnerMsg(errors.join(' '))
        setOwnerMsgType('error')
      }
    } catch {
      setOwnerUsers([])
      setOwnerOverview(OWNER_OVERVIEW_DEFAULT)
      setOwnerProducts([])
      setOwnerOrders([])
      setOwnerTicketsGlobal([])
      setOwnerProviders([])
      setOwnerRechargeRequests([])
      setOwnerReferralLinks([])
      setOwnerRecentActivity([])
      setOwnerMsg('Error inesperado cargando panel owner.')
      setOwnerMsgType('error')
    } finally {
      setIsOwnerLoading(false)
    }
  }, [isOwnerOrAdmin])

  const filteredOwnerUsers = useMemo(() => {
    const term = ownerSearch.trim().toLowerCase()

    return ownerUsers.filter(user => {
      const role = normalizeAppRole(user.role)
      const matchesSearch =
        term.length === 0 || user.username.toLowerCase().includes(term) || role.includes(term) || user.id.includes(term)
      const matchesRole =
        ownerRoleFilter === 'all' || role === normalizeAppRole(ownerRoleFilter)
      const matchesApproval =
        ownerApprovalFilter === 'all' ||
        (ownerApprovalFilter === 'approved' && user.approved) ||
        (ownerApprovalFilter === 'pending' && !user.approved)

      return matchesSearch && matchesRole && matchesApproval
    })
  }, [ownerApprovalFilter, ownerRoleFilter, ownerSearch, ownerUsers])

  const assignableOwnerRoles = useMemo(
    () => ownerRoleOptions.filter(roleValue => normalizeAppRole(roleValue) !== 'owner'),
    [ownerRoleOptions]
  )

  const closeOwnerDialog = useCallback(() => {
    setOwnerDialogOpen(false)
    setOwnerDialogAction(null)
  }, [])

  const showOwnerNotice = useCallback(
    (message: string, type: OwnerDialogType = 'ok') => {
      const normalizedType: OwnerDialogType = type === 'confirm' ? 'ok' : type
      setOwnerDialogType(normalizedType)
      setOwnerDialogTitle(
        normalizedType === 'error' ? '⚠️ Atención owner' : '✅ Operación completada'
      )
      setOwnerDialogMessage(message)
      setOwnerDialogConfirmLabel('Aceptar')
      setOwnerDialogCancelLabel('Cancelar')
      setOwnerDialogAction(null)
      setOwnerDialogOpen(true)
    },
    []
  )

  const showOwnerConfirm = useCallback(
    (message: string, onConfirm: () => void, confirmLabel = 'Confirmar') => {
      setOwnerDialogType('confirm')
      setOwnerDialogTitle('🛡️ Confirmar acción')
      setOwnerDialogMessage(message)
      setOwnerDialogConfirmLabel(confirmLabel)
      setOwnerDialogCancelLabel('Cancelar')
      setOwnerDialogAction(() => onConfirm)
      setOwnerDialogOpen(true)
    },
    []
  )

  const handleOwnerDialogPrimary = useCallback(() => {
    const action = ownerDialogAction
    setOwnerDialogOpen(false)
    setOwnerDialogAction(null)
    if (action) action()
  }, [ownerDialogAction])

  const loadOwnerProductNameFilters = useCallback(async () => {
    if (!isOwnerOrAdmin) return
    setIsOwnerProductNameFiltersLoading(true)
    try {
      const { data, error } = await supabase
        .from('product_name_filters')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        setOwnerProductNameFilters([])
        setOwnerProductNameFilterDrafts({})
        setOwnerMsg(`No se pudo cargar filtros de plataformas. ${error.message}`)
        setOwnerMsgType('error')
        return
      }

      const rows = (data ?? []) as Record<string, unknown>[]
      const mapped = rows.map<OwnerProductNameFilter>((row, index) => {
        const id = toIdText(row.id, `logo-${index + 1}`)
        const name = toText(row.name) || `Plataforma ${index + 1}`
        const keyword = normalizeProductNameFilterKeyword(toText(row.keyword) || name)
        const imageUrl = toText(row.image_url) || '/logo.png'
        const sortOrder = Math.max(0, Math.floor(toNumber(row.sort_order, index)))
        const active = row.is_active !== false
        return {
          id,
          name,
          keyword,
          imageUrl,
          sortOrder,
          active,
          createdAt: toText(row.created_at) || null,
          updatedAt: toText(row.updated_at) || null,
        }
      })

      const draftSeed: Record<string, OwnerProductNameFilterDraft> = {}
      for (const item of mapped) {
        draftSeed[item.id] = {
          name: item.name,
          keyword: item.keyword,
          imageUrl: item.imageUrl,
          sortOrder: String(item.sortOrder),
        }
      }
      setOwnerProductNameFilters(mapped)
      setOwnerProductNameFilterDrafts(draftSeed)
    } catch {
      setOwnerProductNameFilters([])
      setOwnerProductNameFilterDrafts({})
      setOwnerMsg('Error cargando filtros de plataformas.')
      setOwnerMsgType('error')
    } finally {
      setIsOwnerProductNameFiltersLoading(false)
    }
  }, [isOwnerOrAdmin])

  const ownerProviderOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const product of ownerProducts) {
      if (product.providerId) map.set(product.providerId, product.providerName)
    }
    for (const provider of ownerProviders) {
      map.set(provider.id, provider.username)
    }
    return Array.from(map.entries())
      .map(([id, username]) => ({ id, username }))
      .sort((a, b) => a.username.localeCompare(b.username))
  }, [ownerProducts, ownerProviders])

  const filteredOwnerProviders = useMemo(() => {
    const term = ownerSearch.trim().toLowerCase()
    if (!term) return ownerProviders
    return ownerProviders.filter(provider => {
      const role = normalizeAppRole(provider.role)
      return (
        provider.username.toLowerCase().includes(term) ||
        role.includes(term) ||
        provider.id.includes(term)
      )
    })
  }, [ownerProviders, ownerSearch])

  const filteredOwnerProducts = useMemo(() => {
    return ownerProducts.filter(product => {
      const matchesProvider =
        ownerProductProviderFilter === 'all' || product.providerId === ownerProductProviderFilter
      const matchesType =
        ownerProductTypeFilter === 'all' || product.accountType.trim().toLowerCase() === ownerProductTypeFilter
      const matchesDelivery =
        ownerProductDeliveryFilter === 'all' ||
        product.deliveryMode.trim().toLowerCase() === ownerProductDeliveryFilter
      const state = product.active ? (product.stock > 0 ? 'active' : 'agotado') : 'paused'
      const matchesState = ownerProductStateFilter === 'all' || state === ownerProductStateFilter
      return matchesProvider && matchesType && matchesDelivery && matchesState
    })
  }, [
    ownerProductDeliveryFilter,
    ownerProductProviderFilter,
    ownerProductStateFilter,
    ownerProductTypeFilter,
    ownerProducts,
  ])

  const filteredOwnerOrders = useMemo(() => {
    return ownerOrders.filter(order => {
      const status = normalizeOrderStatusInput(order.status)
      const matchesStatus = ownerOrderStatusFilter === 'all' || status === ownerOrderStatusFilter
      const term = ownerSearch.trim().toLowerCase()
      const matchesSearch =
        term.length === 0 ||
        order.buyerName.toLowerCase().includes(term) ||
        order.providerName.toLowerCase().includes(term) ||
        order.productName.toLowerCase().includes(term) ||
        String(order.id).includes(term)
      return matchesStatus && matchesSearch
    })
  }, [ownerOrderStatusFilter, ownerOrders, ownerSearch])

  const filteredOwnerTickets = useMemo(() => {
    return ownerTicketsGlobal.filter(ticket => {
      const status = normalizeOrderStatusInput(ticket.status)
      const matchesStatus = ownerTicketStatusFilter === 'all' || status === ownerTicketStatusFilter
      const term = ownerSearch.trim().toLowerCase()
      const matchesSearch =
        term.length === 0 ||
        ticket.buyerName.toLowerCase().includes(term) ||
        ticket.providerName.toLowerCase().includes(term) ||
        ticket.productName.toLowerCase().includes(term) ||
        ticket.subject.toLowerCase().includes(term) ||
        String(ticket.id).includes(term)
      return matchesStatus && matchesSearch
    })
  }, [ownerSearch, ownerTicketStatusFilter, ownerTicketsGlobal])

  const filteredOwnerRecharges = useMemo(() => {
    const term = ownerSearch.trim().toLowerCase()
    if (!term) return ownerRechargeRequests
    return ownerRechargeRequests.filter(request => {
      const status = normalizeOrderStatusInput(request.status)
      return (
        request.username.toLowerCase().includes(term) ||
        request.method.toLowerCase().includes(term) ||
        status.includes(term) ||
        request.id.toLowerCase().includes(term)
      )
    })
  }, [ownerRechargeRequests, ownerSearch])

  const filteredOwnerReferrals = useMemo(() => {
    const term = ownerReferralSearch.trim().toLowerCase()
    if (!term) return ownerReferralLinks
    return ownerReferralLinks.filter(item => {
      return (
        item.referrerUsername.toLowerCase().includes(term) ||
        item.referredUsername.toLowerCase().includes(term) ||
        item.referrerId.includes(term) ||
        item.referredId.includes(term)
      )
    })
  }, [ownerReferralLinks, ownerReferralSearch])

  const ownerOrderCountByBuyer = useMemo(() => {
    const map = new Map<string, number>()
    for (const order of ownerOrders) {
      map.set(order.buyerId, (map.get(order.buyerId) ?? 0) + 1)
    }
    return map
  }, [ownerOrders])

  const ownerTicketCountByBuyer = useMemo(() => {
    const map = new Map<string, number>()
    for (const ticket of ownerTicketsGlobal) {
      map.set(ticket.buyerId, (map.get(ticket.buyerId) ?? 0) + 1)
    }
    return map
  }, [ownerTicketsGlobal])

  const ownerReferrerByUser = useMemo(() => {
    const map = new Map<string, string>()
    for (const link of ownerReferralLinks) {
      if (!map.has(link.referredId)) {
        map.set(link.referredId, link.referrerUsername)
      }
    }
    return map
  }, [ownerReferralLinks])

  const ownerReferralSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        referrerId: string
        referrerUsername: string
        total: number
        sales: number
        lastLinkedAt: string | null
      }
    >()
    for (const link of ownerReferralLinks) {
      const current = map.get(link.referrerId)
      if (!current) {
        map.set(link.referrerId, {
          referrerId: link.referrerId,
          referrerUsername: link.referrerUsername,
          total: 1,
          sales: link.referredSales,
          lastLinkedAt: link.linkedAt,
        })
        continue
      }
      current.total += 1
      current.sales += link.referredSales
      const currentDate = current.lastLinkedAt ? new Date(current.lastLinkedAt).getTime() : 0
      const nextDate = link.linkedAt ? new Date(link.linkedAt).getTime() : 0
      if (nextDate > currentDate) current.lastLinkedAt = link.linkedAt
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [ownerReferralLinks])

  const isOwnerTopupSaving = useMemo(() => {
    return Object.entries(ownerSaving).some(([key, value]) => key.startsWith('topup-') && value)
  }, [ownerSaving])

  async function handleOwnerToggleApprove(user: OwnerUser) {
    const key = user.id
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !user.approved })
      .eq('id', user.id)

    if (error) {
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      setOwnerMsg(`No se pudo actualizar aprobacion para ${user.username}. ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`Usuario ${user.username} actualizado.`)
    await loadOwnerDashboardData()
    setOwnerSaving(previous => ({ ...previous, [key]: false }))
  }

  async function handleOwnerSaveRole(user: OwnerUser) {
    const key = user.id
    const targetRole = normalizeAppRole(ownerRoleDraft[user.id] ?? user.role)
    if (normalizeAppRole(user.role) === 'owner') {
      setOwnerMsg('La cuenta Owner no se puede cambiar de rol desde este panel.')
      setOwnerMsgType('error')
      return
    }
    if (targetRole === 'owner') {
      setOwnerMsg('El rol Owner esta bloqueado por seguridad.')
      setOwnerMsgType('error')
      return
    }
    if (!targetRole) {
      setOwnerMsg('Selecciona un rol valido.')
      setOwnerMsgType('error')
      return
    }

    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const { error } = await supabase.from('profiles').update({ role: targetRole }).eq('id', user.id)

    if (error) {
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      setOwnerMsg(`No se pudo actualizar rol para ${user.username}. ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`Rol actualizado para ${user.username}.`)
    await loadOwnerDashboardData()
    setOwnerSaving(previous => ({ ...previous, [key]: false }))
  }

  async function handleOwnerApplyBalance(user: OwnerUser) {
    const key = user.id
    const delta = parseDecimalInput(ownerBalanceDraft[user.id] ?? '')
    if (!Number.isFinite(delta) || delta === 0) {
      setOwnerMsg('Ingresa un ajuste de saldo valido (positivo o negativo).')
      setOwnerMsgType('error')
      return
    }

    const nextBalance = Math.max(0, user.balance + delta)
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const { error } = await supabase.from('profiles').update({ balance: nextBalance }).eq('id', user.id)

    if (error) {
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      setOwnerMsg(`No se pudo actualizar saldo para ${user.username}. ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    let movementSaved = true
    let movementReason = ''
    if (delta > 0) {
      const movementResult = await writeOwnerBalanceMovement({
        targetUserId: user.id,
        amount: delta,
      })
      movementSaved = movementResult.ok
      movementReason = movementResult.reason
    }

    await loadOwnerDashboardData()
    setOwnerMsgType(movementSaved ? 'ok' : 'error')
    setOwnerMsg(
      movementSaved
        ? `Saldo actualizado para ${user.username}.`
        : `Saldo actualizado para ${user.username}, pero no se pudo guardar en historial de recargas. (${movementReason})`
    )
    setOwnerSaving(previous => ({ ...previous, [key]: false }))
  }

  async function handleOwnerApplyProviderBalance(user: OwnerUser) {
    if (!ownerProviderBalanceColumn) return

    const key = user.id
    const delta = parseDecimalInput(ownerProviderBalanceDraft[user.id] ?? '')
    if (!Number.isFinite(delta) || delta === 0) {
      setOwnerMsg('Ingresa un ajuste valido para saldo proveedor.')
      setOwnerMsgType('error')
      return
    }

    const currentProviderBalance = user.providerBalance ?? 0
    const nextProviderBalance = Math.max(0, currentProviderBalance + delta)
    const payload: Record<string, unknown> = {
      [ownerProviderBalanceColumn]: nextProviderBalance,
    }

    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)

    if (error) {
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      setOwnerMsg(`No se pudo actualizar saldo proveedor para ${user.username}. ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`Saldo proveedor actualizado para ${user.username}.`)
    await loadOwnerDashboardData()
    setOwnerSaving(previous => ({ ...previous, [key]: false }))
  }

  async function handleOwnerSaveProviderLimit(provider: OwnerProviderItem) {
    const key = provider.id
    const rawValue = ownerProviderLimitDraft[provider.id] ?? ''
    const nextLimit = Math.max(0, Math.floor(toNumber(parseDecimalInput(rawValue), NaN)))
    if (!Number.isFinite(nextLimit)) {
      setOwnerMsg('Ingresa un limite valido para el proveedor.')
      setOwnerMsgType('error')
      return
    }

    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const upsertPayload: Record<string, unknown> = {
      provider_id: provider.id,
      max_products: nextLimit,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('provider_limits')
      .upsert(upsertPayload, { onConflict: 'provider_id' })

    if (!upsertError) {
      setOwnerMsgType('ok')
      setOwnerMsg(`Limite actualizado para ${provider.username}.`)
      await loadOwnerDashboardData()
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      return
    }

    const fallbackPayload: Record<string, unknown> = {
      max_products: nextLimit,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }
    const { error: updateError } = await supabase
      .from('provider_limits')
      .update(fallbackPayload)
      .eq('provider_id', provider.id)
    if (!updateError) {
      setOwnerMsgType('ok')
      setOwnerMsg(`Limite actualizado para ${provider.username}.`)
      await loadOwnerDashboardData()
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      return
    }

    const minimalInsertPayload: Record<string, unknown> = {
      provider_id: provider.id,
      max_products: nextLimit,
    }
    const { error: insertError } = await supabase.from('provider_limits').insert(minimalInsertPayload)
    if (insertError) {
      setOwnerSaving(previous => ({ ...previous, [key]: false }))
      setOwnerMsg(
        `No se pudo actualizar limite de ${provider.username}. ${
          insertError.message || updateError?.message || upsertError.message
        }`
      )
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`Limite actualizado para ${provider.username}.`)
    await loadOwnerDashboardData()
    setOwnerSaving(previous => ({ ...previous, [key]: false }))
  }

  async function handleOwnerToggleProductActive(product: OwnerProductItem) {
    const key = `product-${product.id}`
    const nextValue = !product.active
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const payloadVariants: Array<Record<string, unknown>> = [{ is_active: nextValue }, { active: nextValue }]
    let updated = false
    let finalError = ''

    for (const payload of payloadVariants) {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id)
      if (!error) {
        updated = true
        break
      }
      finalError = error.message
      if (!isLikelySchemaError(error.message)) break
    }

    setOwnerSaving(previous => ({ ...previous, [key]: false }))

    if (!updated) {
      setOwnerMsg(`No se pudo cambiar estado de ${product.name}. ${finalError || ''}`.trim())
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`${product.name} ${nextValue ? 'activado' : 'pausado'} correctamente.`)
    await loadOwnerDashboardData()
  }

  async function uploadOwnerProductNameFilterImage(file: File, baseName: string) {
    if (!userId) {
      setOwnerMsg('No se pudo validar sesion para subir imagen.')
      setOwnerMsgType('error')
      return null
    }

    if (!PRODUCT_IMAGE_ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setOwnerMsg('Imagen invalida. Usa PNG/JPG/WEBP/AVIF.')
      setOwnerMsgType('error')
      return null
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setOwnerMsg('Imagen demasiado pesada. Maximo 2MB.')
      setOwnerMsgType('error')
      return null
    }

    try {
      const { width, height } = await getImageDimensions(file)
      if (width < PRODUCT_FILTER_LOGO_MIN_SIZE || height < PRODUCT_FILTER_LOGO_MIN_SIZE) {
        setOwnerMsg(
          `Logo con baja resolucion (${width}x${height}). Sube minimo ${PRODUCT_FILTER_LOGO_MIN_SIZE}x${PRODUCT_FILTER_LOGO_MIN_SIZE}.`
        )
        setOwnerMsgType('error')
        return null
      }
    } catch {
      setOwnerMsg('No se pudo leer la resolucion del logo.')
      setOwnerMsgType('error')
      return null
    }

    const safeName = sanitizeFilePart(baseName || 'plataforma')
    const ext = resolveFileExtension(file)
    const objectPath = `owner-name-filters/${userId}/${Date.now()}-${safeName}.${ext}`

    const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(objectPath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) {
      setOwnerMsg(
        `No se pudo subir logo. Verifica bucket '${PRODUCT_IMAGE_BUCKET}' y policies. ${uploadError.message}`
      )
      setOwnerMsgType('error')
      return null
    }

    const { data: publicData } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(objectPath)
    const publicUrl = toText(publicData.publicUrl)
    if (!publicUrl) {
      setOwnerMsg('Logo subido, pero no se pudo obtener URL publica.')
      setOwnerMsgType('error')
      return null
    }

    return publicUrl
  }

  async function handleOwnerNewFilterImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const key = 'owner-name-filter-upload-create'
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('Subiendo logo...')
    setOwnerMsgType('idle')

    const url = await uploadOwnerProductNameFilterImage(
      file,
      ownerNewFilterName || ownerNewFilterKeyword || 'plataforma'
    )

    setOwnerSaving(previous => ({ ...previous, [key]: false }))
    event.target.value = ''

    if (!url) return
    setOwnerNewFilterImageUrl(url)
    setOwnerMsg('Logo subido correctamente.')
    setOwnerMsgType('ok')
  }

  async function handleOwnerEditFilterImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const filterId = ownerEditingFilterImageId
    if (!filterId) {
      event.target.value = ''
      return
    }

    const draft = ownerProductNameFilterDrafts[filterId]
    const key = `owner-name-filter-upload-${filterId}`
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('Subiendo logo...')
    setOwnerMsgType('idle')

    const url = await uploadOwnerProductNameFilterImage(file, draft?.name || 'plataforma')

    setOwnerSaving(previous => ({ ...previous, [key]: false }))
    event.target.value = ''

    if (!url) return
    setOwnerProductNameFilterDrafts(previous => ({
      ...previous,
      [filterId]: {
        ...(previous[filterId] ?? { name: '', keyword: '', imageUrl: '', sortOrder: '0' }),
        imageUrl: url,
      },
    }))
    setOwnerMsg('Logo subido correctamente.')
    setOwnerMsgType('ok')
  }

  async function handleOwnerCreateProductNameFilter() {
    if (!isOwnerOrAdmin || !userId) return

    const name = toText(ownerNewFilterName)
    const keyword = normalizeProductNameFilterKeyword(ownerNewFilterKeyword || ownerNewFilterName)
    const imageUrl = toText(ownerNewFilterImageUrl)
    const parsedSort = parseDecimalInput(ownerNewFilterSortOrder)
    const sortOrder = Number.isFinite(parsedSort)
      ? Math.max(0, Math.floor(parsedSort))
      : ownerProductNameFilters.length

    if (!name) {
      setOwnerMsg('Ingresa un nombre para el logo.')
      setOwnerMsgType('error')
      return
    }
    if (!keyword) {
      setOwnerMsg('Ingresa una palabra de coincidencia (ej: netflix).')
      setOwnerMsgType('error')
      return
    }
    if (!imageUrl) {
      setOwnerMsg('Primero sube logo desde archivos.')
      setOwnerMsgType('error')
      return
    }

    const key = 'owner-name-filter-create'
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const payload: Record<string, unknown> = {
      name,
      keyword,
      image_url: imageUrl,
      sort_order: sortOrder,
      is_active: true,
      created_by: userId,
      updated_by: userId,
    }

    const { error } = await supabase.from('product_name_filters').insert(payload)

    setOwnerSaving(previous => ({ ...previous, [key]: false }))
    if (error) {
      setOwnerMsg(`No se pudo crear el logo filtro. ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsg('Logo filtro creado correctamente.')
    setOwnerMsgType('ok')
    setOwnerNewFilterName('')
    setOwnerNewFilterKeyword('')
    setOwnerNewFilterImageUrl('')
    setOwnerNewFilterSortOrder('')
    await loadOwnerProductNameFilters()
  }

  async function handleOwnerSaveProductNameFilter(item: OwnerProductNameFilter) {
    if (!isOwnerOrAdmin || !userId) return
    const draft = ownerProductNameFilterDrafts[item.id]
    if (!draft) return

    const name = toText(draft.name)
    const keyword = normalizeProductNameFilterKeyword(draft.keyword || draft.name)
    const imageUrl = toText(draft.imageUrl)
    const parsedSort = parseDecimalInput(draft.sortOrder)
    const sortOrder = Number.isFinite(parsedSort) ? Math.max(0, Math.floor(parsedSort)) : item.sortOrder

    if (!name || !keyword || !imageUrl) {
      setOwnerMsg('Nombre, keyword e imagen son obligatorios para guardar.')
      setOwnerMsgType('error')
      return
    }

    const key = `owner-name-filter-save-${item.id}`
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const payload: Record<string, unknown> = {
      name,
      keyword,
      image_url: imageUrl,
      sort_order: sortOrder,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('product_name_filters').update(payload).eq('id', item.id)

    setOwnerSaving(previous => ({ ...previous, [key]: false }))
    if (error) {
      setOwnerMsg(`No se pudo guardar logo filtro "${item.name}". ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsg(`Logo filtro "${name}" actualizado.`)
    setOwnerMsgType('ok')
    await loadOwnerProductNameFilters()
  }

  async function handleOwnerToggleProductNameFilterActive(item: OwnerProductNameFilter) {
    if (!isOwnerOrAdmin || !userId) return
    const key = `owner-name-filter-toggle-${item.id}`
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const payload: Record<string, unknown> = {
      is_active: !item.active,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('product_name_filters').update(payload).eq('id', item.id)

    setOwnerSaving(previous => ({ ...previous, [key]: false }))
    if (error) {
      setOwnerMsg(`No se pudo cambiar estado de "${item.name}". ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsg(`"${item.name}" ${item.active ? 'oculto' : 'publicado'} correctamente.`)
    setOwnerMsgType('ok')
    await loadOwnerProductNameFilters()
  }

  async function handleOwnerDeleteProductNameFilter(item: OwnerProductNameFilter) {
    if (!isOwnerOrAdmin) return
    const key = `owner-name-filter-delete-${item.id}`
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const { error } = await supabase.from('product_name_filters').delete().eq('id', item.id)

    setOwnerSaving(previous => ({ ...previous, [key]: false }))
    if (error) {
      setOwnerMsg(`No se pudo eliminar "${item.name}". ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsg(`"${item.name}" eliminado.`)
    setOwnerMsgType('ok')
    await loadOwnerProductNameFilters()
  }

  async function handleOwnerSaveOrderStatus(order: OwnerOrderItem) {
    const key = `order-${order.id}`
    const nextStatus = normalizeOrderStatusInput(ownerOrderStatusDraft[String(order.id)] ?? order.status)
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id)

    setOwnerSaving(previous => ({ ...previous, [key]: false }))

    if (error) {
      setOwnerMsg(`No se pudo actualizar pedido #${order.id}.`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`Pedido #${order.id} actualizado.`)
    await loadOwnerDashboardData()
  }

  async function handleOwnerSaveTicketStatus(ticket: OwnerTicketItem) {
    const key = `ticket-${ticket.id}`
    const nextStatus = normalizeOrderStatusInput(ownerTicketStatusDraft[String(ticket.id)] ?? ticket.status)
    const resolvedAt =
      nextStatus === 'resolved' || nextStatus === 'resuelto' || nextStatus === 'closed'
        ? new Date().toISOString()
        : null

    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const payloadVariants: Array<Record<string, unknown>> = [
      { status: nextStatus, resolved_at: resolvedAt },
      { status: nextStatus },
    ]
    let saved = false
    for (const payload of payloadVariants) {
      const { error } = await supabase.from('tickets').update(payload).eq('id', ticket.id)
      if (!error) {
        saved = true
        break
      }
      if (!isLikelySchemaError(error.message)) break
    }

    setOwnerSaving(previous => ({ ...previous, [key]: false }))

    if (!saved) {
      setOwnerMsg(`No se pudo actualizar ticket #${ticket.id}.`)
      setOwnerMsgType('error')
      return
    }

    setOwnerMsgType('ok')
    setOwnerMsg(`Ticket #${ticket.id} actualizado.`)
    await loadOwnerDashboardData()
  }

  async function writeOwnerBalanceMovement(params: {
    targetUserId: string
    amount: number
  }) {
    if (!userId || !params.targetUserId || !Number.isFinite(params.amount) || params.amount <= 0) {
      return { ok: false, reason: 'invalid_params' }
    }
    const normalizedAmount = Math.abs(params.amount)
    const payload: Record<string, unknown> = {
      user_id: params.targetUserId,
      amount: normalizedAmount,
    }
    const { error } = await supabase.from('wallet_movements').insert(payload)
    if (!error) return { ok: true, reason: 'wallet_movements' }
    if (isMissingTableError(error.message)) {
      return { ok: false, reason: `wallet_movements: ${error.message}` }
    }
    return { ok: false, reason: `wallet_movements: ${error.message}` }
  }

  async function handleOwnerManualTopup() {
    const usernameTarget = ownerTopupUsername.trim()
    const amount = parseDecimalInput(ownerTopupAmount)
    if (!usernameTarget) {
      setOwnerMsg('Ingresa username exacto para recargar.')
      setOwnerMsgType('error')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setOwnerMsg('Ingresa un monto valido mayor a 0.')
      setOwnerMsgType('error')
      return
    }

    const target = ownerUsers.find(user => user.username === usernameTarget)
    if (!target) {
      setOwnerMsg(`No existe usuario ${usernameTarget} en la lista actual.`)
      setOwnerMsgType('error')
      return
    }

    const key = `topup-${target.id}`
    setOwnerSaving(previous => ({ ...previous, [key]: true }))
    setOwnerMsg('')
    setOwnerMsgType('idle')

    const nextBalance = Math.max(0, target.balance + amount)
    const { error } = await supabase.from('profiles').update({ balance: nextBalance }).eq('id', target.id)

    setOwnerSaving(previous => ({ ...previous, [key]: false }))

    if (error) {
      setOwnerMsg(`No se pudo recargar saldo para ${target.username}. ${error.message}`)
      setOwnerMsgType('error')
      return
    }

    const movementResult = await writeOwnerBalanceMovement({
      targetUserId: target.id,
      amount,
    })

    setOwnerTopupAmount('')
    await loadOwnerDashboardData()
    setOwnerMsgType(movementResult.ok ? 'ok' : 'error')
    setOwnerMsg(
      movementResult.ok
        ? `Saldo agregado a ${target.username}: ${formatMoney(amount)}.`
        : `Saldo agregado a ${target.username}, pero no se pudo guardar en historial de recargas. (${movementResult.reason})`
    )
  }

  useEffect(() => {
    if (currentSectionId !== 'proveedor' || !canSeeProvider || !providerAccessGranted || !userId) return
    const id = requestAnimationFrame(() => {
      void loadProviderDashboardData()
    })
    return () => cancelAnimationFrame(id)
  }, [canSeeProvider, currentSectionId, loadProviderDashboardData, providerAccessGranted, userId])

  useEffect(() => {
    if (currentSectionId !== 'proveedor' || !canSeeProvider || !providerAccessGranted || !userId) return

    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (reloadTimer) return
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        void loadProviderDashboardData()
      }, 260)
    }

    const channelName = `provider-live-${userId}-${isOwner ? 'owner' : 'provider'}`
    const channel = supabase.channel(channelName)

    if (isOwner) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_accounts' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_slots' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_limits' }, scheduleReload)
        .subscribe()
    } else {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `provider_id=eq.${userId}` },
          scheduleReload
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets', filter: `provider_id=eq.${userId}` },
          scheduleReload
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products', filter: `provider_id=eq.${userId}` },
          scheduleReload
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_accounts', filter: `provider_id=eq.${userId}` },
          scheduleReload
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_slots', filter: `provider_id=eq.${userId}` },
          scheduleReload
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'provider_limits', filter: `provider_id=eq.${userId}` },
          scheduleReload
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          scheduleReload
        )
        .subscribe()
    }

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [
    canSeeProvider,
    currentSectionId,
    isOwner,
    loadProviderDashboardData,
    providerAccessGranted,
    userId,
  ])

  useEffect(() => {
    if (providerSideTab === 'orders') return
    setProviderSelectedOrderId(null)
  }, [providerSideTab])

  useEffect(() => {
    if (providerSideTab === 'tickets') return
    setProviderSelectedTicketId(null)
  }, [providerSideTab])

  useEffect(() => {
    if (!providerSelectedOrderId) return
    const exists = providerOrdersLive.some(order => String(order.id) === providerSelectedOrderId)
    if (!exists) {
      setProviderSelectedOrderId(null)
    }
  }, [providerOrdersLive, providerSelectedOrderId])

  useEffect(() => {
    if (!providerSelectedTicketId) return
    const exists = providerTicketsLive.some(ticket => String(ticket.id) === providerSelectedTicketId)
    if (!exists) {
      setProviderSelectedTicketId(null)
    }
  }, [providerSelectedTicketId, providerTicketsLive])

  useEffect(() => {
    if (!providerInventoryEditingAccountId) return
    const exists = providerInventoryAccounts.some(account => account.id === providerInventoryEditingAccountId)
    if (!exists) {
      closeProviderInventoryEditModal()
    }
  }, [providerInventoryAccounts, providerInventoryEditingAccountId])

  useEffect(() => {
    setProviderProductsPage(1)
  }, [providerProductSearch])

  useEffect(() => {
    if (providerProductsPage > providerProductsTotalPages) {
      setProviderProductsPage(providerProductsTotalPages)
    }
  }, [providerProductsPage, providerProductsTotalPages])

  useEffect(() => {
    setProviderInventoryPage(1)
  }, [providerInventorySearch, providerInventoryActiveOnly, selectedProviderProductId])

  useEffect(() => {
    if (providerInventoryPage > providerInventoryTotalPages) {
      setProviderInventoryPage(providerInventoryTotalPages)
    }
  }, [providerInventoryPage, providerInventoryTotalPages])

  useEffect(() => {
    if (currentSectionId !== 'proveedor' || !providerAccessGranted || !selectedProviderProduct) return
    const id = requestAnimationFrame(() => {
      void loadProviderProductInventory(selectedProviderProduct)
    })
    return () => cancelAnimationFrame(id)
  }, [
    currentSectionId,
    loadProviderProductInventory,
    providerAccessGranted,
    selectedProviderProduct,
  ])

  useEffect(() => {
    if (currentSectionId === 'proveedor') return
    setSelectedProviderProductId(null)
    setProviderSelectedOrderId(null)
    setProviderSelectedTicketId(null)
    setProviderBuyerModal(null)
    setProviderInventoryAccounts([])
    setProviderInventorySearch('')
    setProviderInventoryActiveOnly(false)
    setProviderInventoryVisiblePasswords({})
    setProviderInventoryDaysDraft({})
    setProviderInventoryDaysEditingId(null)
    setProviderInventoryEditingAccountId(null)
    setProviderInventoryEditForm(PROVIDER_INVENTORY_EDIT_FORM_DEFAULT)
    setIsProviderInventoryEditingSaving(false)
    setIsProviderInventoryDeleting({})
    setShowProviderInventoryModal(false)
    setShowProviderInventoryProfilesModal(false)
    setProviderInventoryPage(1)
  }, [currentSectionId])

  useEffect(() => {
    if (selectedProviderProductId === null) return
    const exists = providerProducts.some(product => product.id === selectedProviderProductId)
    if (exists) return
    setSelectedProviderProductId(null)
    setProviderBuyerModal(null)
    setProviderInventoryAccounts([])
    setProviderInventoryDaysDraft({})
    setProviderInventoryDaysEditingId(null)
    setProviderInventoryEditingAccountId(null)
    setProviderInventoryEditForm(PROVIDER_INVENTORY_EDIT_FORM_DEFAULT)
    setIsProviderInventoryEditingSaving(false)
    setIsProviderInventoryDeleting({})
    setShowProviderInventoryModal(false)
  }, [providerProducts, selectedProviderProductId])

  useEffect(() => {
    if (currentSectionId !== 'administrador-cuentas' || !isOwnerOrAdmin) return
    const id = requestAnimationFrame(() => {
      void loadOwnerDashboardData()
    })
    return () => cancelAnimationFrame(id)
  }, [currentSectionId, isOwnerOrAdmin, loadOwnerDashboardData])

  useEffect(() => {
    if (currentSectionId !== 'administrador-cuentas' || !isOwnerOrAdmin) return
    if (ownerActiveTab !== 'productos') return
    const id = requestAnimationFrame(() => {
      void loadOwnerProductNameFilters()
    })
    return () => cancelAnimationFrame(id)
  }, [currentSectionId, isOwnerOrAdmin, ownerActiveTab, loadOwnerProductNameFilters])

  useEffect(() => {
    if (currentSectionId !== 'administrador-cuentas' || !isOwnerOrAdmin || !userId) return

    let reloadTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (reloadTimer) return
      reloadTimer = setTimeout(() => {
        reloadTimer = null
        void loadOwnerDashboardData()
      }, 420)
    }

    const channel = supabase.channel(`owner-live-${userId}`)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_accounts' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_slots' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_movements' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliations' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_limits' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_name_filters' }, scheduleReload)
      .subscribe()

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [currentSectionId, isOwnerOrAdmin, loadOwnerDashboardData, userId])

  useEffect(() => {
    if (currentSectionId !== 'administrador-cuentas' || !isOwnerOrAdmin || ownerActiveTab !== 'productos' || !userId) {
      return
    }
    const channel = supabase.channel(`owner-product-name-filters-${userId}`)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_name_filters' }, () => {
        void loadOwnerProductNameFilters()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentSectionId, isOwnerOrAdmin, ownerActiveTab, userId, loadOwnerProductNameFilters])

  useEffect(() => {
    if (currentSectionId !== 'administrador-cuentas') return
    if (!ownerMsg) return
    showOwnerNotice(ownerMsg, ownerMsgType === 'error' ? 'error' : 'ok')
    setOwnerMsg('')
    setOwnerMsgType('idle')
  }, [currentSectionId, ownerMsg, ownerMsgType, showOwnerNotice])

  const section = sectionMeta(currentSectionId)
  const accountLabel = profile ? profile.username : 'Ingresa'
  const isMyProductsSection = currentSectionId === 'mis-productos'
  const supportCodeRaw = toText(profile?.purchase_pin)
  const supportCodeMasked = supportCodeRaw
    ? '\u2022'.repeat(Math.max(4, supportCodeRaw.length))
    : '----'
  const affiliateSummary = useMemo(() => {
    const total = affiliateMembers.length
    const approved = affiliateMembers.filter(member => member.approved).length
    const pending = Math.max(0, total - approved)
    const salesCount = affiliateMembers.reduce((sum, member) => sum + member.salesCount, 0)
    const salesAmount = affiliateMembers.reduce((sum, member) => sum + member.salesAmount, 0)
    const topSeller =
      affiliateMembers.length > 0
        ? affiliateMembers.reduce((best, current) =>
            current.salesAmount > best.salesAmount ? current : best
          )
        : null
    const goalSteps = [3, 5, 10, 15, 25, 40]
    const nextGoal = goalSteps.find(step => step > total) ?? total + 10
    const progress = nextGoal > 0 ? Math.min(100, Math.round((total / nextGoal) * 100)) : 0
    const missing = Math.max(0, nextGoal - total)

    return {
      total,
      approved,
      pending,
      salesCount,
      salesAmount,
      topSeller,
      nextGoal,
      progress,
      missing,
    }
  }, [affiliateMembers])
  const affiliateRewards = useMemo(
    () =>
      AFFILIATE_REWARD_LEVELS.map(level => {
        const unlocked = affiliateSummary.approved >= level.referralsRequired
        const missing = Math.max(0, level.referralsRequired - affiliateSummary.approved)
        const progress = Math.min(100, Math.round((affiliateSummary.approved / level.referralsRequired) * 100))
        return {
          ...level,
          unlocked,
          missing,
          progress,
        }
      }),
    [affiliateSummary.approved]
  )
  const nextReward = affiliateRewards.find(level => !level.unlocked) ?? null
  const unlockedRewards = affiliateRewards.filter(level => level.unlocked)
  const rewardsSupportUrl = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(
    unlockedRewards.length > 0
      ? `Hola, quiero reclamar mis recompensas de afiliacion. Afiliados aprobados: ${affiliateSummary.approved}. Niveles desbloqueados: ${unlockedRewards
          .map(level => level.title)
          .join(', ')}.`
      : `Hola, quiero informacion sobre el programa de recompensas de afiliacion.`
  )}`
  const topLinkClass = (isActive: boolean, isAccount = false) =>
    `${styles.topLink} ${isActive ? styles.topLinkActive : ''} ${isAccount ? styles.userChip : ''}`.trim()
  const ownerQuickCards: Array<{ label: string; value: string; tab: OwnerTabId }> = [
    { label: '💰 Ventas totales', value: formatMoney(ownerOverview.salesTotal), tab: 'resumen' },
    { label: '💳 Total recargado', value: formatMoney(ownerOverview.rechargedTotal), tab: 'recargas' },
    { label: '🎫 Tickets abiertos', value: String(ownerOverview.ticketsOpen), tab: 'tickets' },
    { label: '👥 Usuarios', value: String(ownerOverview.users), tab: 'usuarios' },
    { label: '🧩 Proveedores', value: String(ownerOverview.providers), tab: 'proveedores' },
    { label: '📦 Productos', value: String(ownerOverview.products), tab: 'productos' },
    { label: '🛒 Pedidos', value: String(ownerOverview.orders), tab: 'pedidos' },
  ]

  const renderSectionContent = () => {
    if (currentSectionId === 'recargar') {
      return (
        <section className={styles.rechargeStage}>
          <section className={styles.rechargeHero}>
            <div className={styles.rechargeHeroIcon}>
              <Image
                src='/logo-mark.png'
                alt='CRYXTEAM'
                width={84}
                height={84}
                className={styles.rechargeHeroLogo}
              />
            </div>
            <h3 className={styles.rechargeHeroTitle}>💸 Recarga de saldo 💳</h3>
            <p className={styles.rechargeHeroBrands}>Yape | Plin | Binance 🚀</p>
            <p className={styles.rechargeHeroHint}>⚡ Validacion rapida y segura</p>
            <p className={styles.rechargeHeroMin}>
              Puedes recargar desde <strong>S/ 5.00</strong> 🔥
            </p>
          </section>

          <div className={styles.rechargeActionStrip}>
            <a
              href={SUPPORT_URL}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.rechargeWhatsappButton}
            >
              <span className={styles.rechargeWhatsappRow}>
                <Image
                  src='/whatsapp.png'
                  alt='WhatsApp'
                  width={32}
                  height={32}
                  className={styles.rechargeWhatsappIcon}
                />
                <span className={styles.rechargeWhatsappCopy}>
                  <span className={styles.rechargeWhatsappTitle}>Enviar comprobante por WhatsApp</span>
                  <span className={styles.rechargeWhatsappText}>Tu recarga se procesa al confirmar el pago.</span>
                </span>
              </span>
            </a>
          </div>

          <p className={styles.rechargeDisclaimer}>
            Aviso: pronto las recargas seran 100% automaticas e instantaneas.
          </p>

          <h3 className={styles.rechargeSectionTitle}>Escoge tu metodo de pago ✌️</h3>

          <div className={styles.rechargeMethods}>
            {RECHARGE_METHODS.map(method => (
              <article key={method.id} className={styles.rechargeCard} data-method={method.id}>
                <div className={styles.rechargeMethodHead}>
                  <span className={styles.rechargeBadge}>{method.label}</span>
                  <span className={styles.rechargeMethodState}>Disponible</span>
                </div>

                <div className={styles.rechargeChipRow}>
                  {method.chips.map(chip => (
                    <span key={`${method.id}-${chip}`} className={styles.rechargeChip}>
                      {chip}
                    </span>
                  ))}
                </div>

                <div className={styles.rechargeQrWrap}>
                  <Image
                    src={method.imageSrc}
                    alt={method.imageAlt}
                    width={420}
                    height={420}
                    className={styles.rechargeQr}
                  />
                </div>

                <div className={styles.rechargeMeta}>
                  {method.fields.map(field => (
                    <p key={`${method.id}-${field.label}`} className={styles.rechargeDataRow}>
                      <span>{field.label}</span>
                      <strong>{field.value}</strong>
                    </p>
                  ))}
                </div>

                <p className={styles.rechargeDetail}>{method.detail}</p>
              </article>
            ))}
          </div>

          <p className={styles.rechargeFooterNote}>
            No olvides enviar tu comprobante usando el boton de WhatsApp 👇
          </p>
        </section>
      )
    }

    if (currentSectionId === 'afiliacion') {
      return (
        <section className={styles.affiliationStage}>
          <div className={styles.affiliationLayout}>
            <div className={styles.affiliationMain}>
              <header className={styles.affiliationHero}>
                <p className={styles.affiliationKicker}>Zona de referidos CRYX</p>

                <div className={styles.affiliationHeroTop}>
                  <div className={styles.affiliationLeftStack}>
                    <div className={styles.affiliationHeroCopy}>
                      <h3>
                        <span className={styles.affiliationHeroEmoji} aria-hidden='true'>
                          💸
                        </span>
                        <span>Gana dinero afiliando</span>
                      </h3>
                      <p>Trae clientes nuevos, crea red y aumenta tus ganancias.</p>
                      <div className={styles.affiliationRules}>
                        <span>🎯 Username exacto</span>
                        <span>⚡ Una sola afiliacion</span>
                        <span>🛡 Sin auto-afiliacion</span>
                      </div>
                    </div>

                    <div className={styles.affiliationLeftColumn}>
                      <aside className={styles.affiliationPosterFree}>
                        <Image
                          src='/distribuidores.png'
                          alt='Programa de distribuidores'
                          width={1024}
                          height={1536}
                          className={styles.affiliationPosterImage}
                        />
                      </aside>

                      <section className={styles.affiliatesBoard}>
                        <div className={styles.affiliatesBoardHead}>
                          <h4>
                            ⚡ Distribuidores afiliados
                            <span className={styles.affiliatesInlineCount}>{affiliateMembers.length}</span>
                          </h4>
                          {!isAffiliateMembersLoading && affiliateMembers.length > 0 && (
                            <button
                              type='button'
                              className={styles.affiliatesToggleButton}
                              onClick={() => setShowAffiliateMembersList(prev => !prev)}
                            >
                              {showAffiliateMembersList ? 'Ocultar' : 'Mostrar'}
                            </button>
                          )}
                        </div>

                        {isAffiliateMembersLoading && <p className={styles.panelEmpty}>Cargando afiliados...</p>}
                        {!isAffiliateMembersLoading && affiliateMembers.length === 0 && (
                          <p className={styles.panelEmpty}>Todavia no tienes afiliados registrados.</p>
                        )}
                        {affiliateMembersMsg && <p className={styles.inlineError}>{affiliateMembersMsg}</p>}

                        {!isAffiliateMembersLoading && affiliateMembers.length > 0 && showAffiliateMembersList && (
                          <div className={styles.affiliatesScroll}>
                            <div className={styles.affiliatesGrid}>
                              {affiliateMembers.map(member => (
                                <article key={member.id} className={styles.affiliateMemberCard}>
                                  <div className={styles.affiliateMemberTop}>
                                    <strong>{member.username}</strong>
                                    <span
                                      className={member.approved ? styles.affiliateStateOk : styles.affiliateStatePending}
                                    >
                                      {member.approved ? 'Aprobado' : 'Pendiente'}
                                    </span>
                                  </div>

                                  <div className={styles.affiliateStatsGrid}>
                                    <p>
                                      <span>Ventas</span>
                                      <strong>{member.salesCount}</strong>
                                    </p>
                                    <p>
                                      <span>Monto</span>
                                      <strong>{formatMoney(member.salesAmount)}</strong>
                                    </p>
                                    <p>
                                      <span>Alta</span>
                                      <strong>{formatDate(member.linkedAt)}</strong>
                                    </p>
                                  </div>
                                </article>
                              ))}
                            </div>
                          </div>
                        )}

                        {!isAffiliateMembersLoading && affiliateMembers.length > 0 && !showAffiliateMembersList && (
                          <p className={styles.panelEmpty}>Lista oculta. Pulsa "Mostrar" para verla.</p>
                        )}
                      </section>
                    </div>
                  </div>

                  <article className={`${styles.affiliatePanel} ${styles.affiliatePanelPro} ${styles.affiliatePanelTop}`}>
                    <label htmlFor='affiliate-username' className={styles.affiliateLabel}>
                      🔎 Ingresa el nombre del usuario al que quieras afiliar
                    </label>
                    <div className={styles.affiliateInputRow}>
                      <input
                        id='affiliate-username'
                        type='text'
                        value={affiliateUsername}
                        onChange={event => {
                          setAffiliateUsername(event.target.value)
                          if (showAffiliateNotFoundModal) setShowAffiliateNotFoundModal(false)
                        }}
                        placeholder='Ingresa el usuario'
                        className={styles.affiliateInput}
                        autoComplete='off'
                      />
                      <button
                        type='button'
                        className={styles.affiliateAction}
                        onClick={handleAffiliateSubmit}
                        disabled={isAffiliateSubmitting}
                      >
                        {isAffiliateSubmitting ? 'Procesando...' : 'Afiliar'}
                      </button>
                    </div>

                    {affiliateMsg && (
                      <p className={affiliateMsgType === 'ok' ? styles.affiliateOk : styles.affiliateError}>
                        {affiliateMsg}
                      </p>
                    )}

                    <section className={styles.affiliateRewardsPanel} aria-label='Recompensas de afiliacion'>
                      <div className={styles.affiliateRewardsHead}>
                        <h5>🎁 Recompensas por afiliacion</h5>
                        <div className={styles.affiliateRewardsHeadRight}>
                          <span>{affiliateSummary.approved} aprobados</span>
                          <button
                            type='button'
                            className={styles.affiliateRulesButton}
                            onClick={() => setShowAffiliateRulesModal(true)}
                          >
                            📜 Reglas
                          </button>
                        </div>
                      </div>

                      <p className={styles.affiliateRewardsLead}>
                        Desbloquea bonos al sumar afiliados aprobados. Entre mas crece tu red, mas ganas.
                      </p>

                      <div className={styles.affiliateRewardCards}>
                        {affiliateRewards.map(level => (
                          <article
                            key={level.id}
                            className={`${styles.affiliateRewardCard} ${
                              level.unlocked
                                ? styles.affiliateRewardCardUnlocked
                                : nextReward?.id === level.id
                                  ? styles.affiliateRewardCardCurrent
                                  : styles.affiliateRewardCardLocked
                            }`}
                          >
                            <div className={styles.affiliateRewardTop}>
                              <strong>{level.title}</strong>
                              <span>{level.reward}</span>
                            </div>
                            <p>{level.note}</p>
                            {level.unlocked ? (
                              <em>Desbloqueado</em>
                            ) : (
                              <em>Faltan {level.missing} afiliados</em>
                            )}
                            <div className={styles.affiliateRewardBar}>
                              <span style={{ width: `${level.progress}%` }} />
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className={styles.affiliateRewardsFoot}>
                        <p>
                          {nextReward
                            ? `Siguiente nivel: ${nextReward.title} (${nextReward.referralsRequired} afiliados).`
                            : 'Completaste todos los niveles actuales.'}
                          {' '}
                          Ventas de red: <strong>{affiliateSummary.salesCount}</strong>.
                        </p>
                        <a href={rewardsSupportUrl} target='_blank' rel='noopener noreferrer'>
                          Solicitar premio
                        </a>
                      </div>
                    </section>
                  </article>
                </div>
              </header>
            </div>
          </div>

          {showAffiliateNotFoundModal && (
            <div className={styles.affiliationModalBackdrop}>
              <article className={styles.affiliationModalCard}>
                <h4>Usuario no encontrado 😵‍💫</h4>
                <p>Ingresa el nombre del usuario tal cual aparece en su cuenta.</p>
                <button type='button' onClick={() => setShowAffiliateNotFoundModal(false)}>
                  Aceptar
                </button>
              </article>
            </div>
          )}

          {showAffiliateRulesModal && (
            <div className={styles.affiliationModalBackdrop}>
              <article className={styles.affiliateRulesModalCard}>
                <button
                  type='button'
                  className={styles.affiliateRulesModalClose}
                  aria-label='Cerrar reglas'
                  onClick={() => setShowAffiliateRulesModal(false)}
                >
                  ✕
                </button>
                <h4>📜 Reglas de validacion</h4>
                <p>Antes de aprobar un premio revisamos calidad real de referidos y actividad en la red.</p>
                <ul>
                  <li>Solo cuentan afiliados reales y aprobados por el sistema.</li>
                  <li>No se consideran auto-registros, duplicados o cuentas clonadas.</li>
                  <li>Se auditan patrones sospechosos antes de liberar cada bono.</li>
                  <li>El owner valida manualmente solicitudes de premio.</li>
                  <li>Los niveles y montos pueden ajustarse por campaña activa.</li>
                </ul>
                <button type='button' onClick={() => setShowAffiliateRulesModal(false)}>
                  Entendido
                </button>
              </article>
            </div>
          )}
        </section>
      )
    }

    if (currentSectionId === 'proveedor') {
      return (
        <section className={`${styles.providerStage} ${styles.providerStageLux}`}>
          {!canSeeProvider && (
            <p className={styles.panelEmpty}>Este modulo solo esta disponible para perfiles proveedor u owner.</p>
          )}

          {canSeeProvider && !providerAccessGranted && (
            <article className={styles.providerPinGate}>
              <h3>Acceso proveedor</h3>
              <p>Ingresa tu PIN para abrir el modulo de productos, stock y tickets.</p>
              <label className={styles.providerPinLabel} htmlFor='provider-pin-input'>
                PIN de 4 digitos
              </label>
              <div className={styles.providerPinRow}>
                <input
                  id='provider-pin-input'
                  type='password'
                  inputMode='numeric'
                  maxLength={4}
                  value={providerPinInput}
                  onChange={event => {
                    setProviderPinInput(event.target.value.replace(/\D+/g, '').slice(0, 4))
                    if (providerPinError) setProviderPinError('')
                  }}
                  placeholder='0000'
                  autoComplete='one-time-code'
                />
                <button type='button' onClick={unlockProviderPanel}>
                  Validar PIN
                </button>
              </div>
              {providerPinError && <p className={`${styles.inlineError} ${styles.providerInlineErrorCard}`}>{providerPinError}</p>}
            </article>
          )}

          {canSeeProvider && providerAccessGranted && (
            <>
              {providerMsg && (
                <article
                  className={`${styles.providerNoticeCard} ${
                    providerMsgType === 'error' ? styles.providerNoticeCardError : styles.providerNoticeCardOk
                  }`}
                >
                  <div className={styles.providerNoticeGlow} />
                  <p className={styles.providerNoticeBadge}>
                    {providerMsgType === 'error' ? '🚨 Aviso proveedor' : '✨ Actualizacion proveedor'}
                  </p>
                  <p className={styles.providerNoticeText}>{providerMsg}</p>
                </article>
              )}

              <header className={styles.providerHero}>
                <div className={styles.providerHeroTop}>
                  <div className={styles.providerHeroCopy}>
                    <p className={styles.providerHeroPath}>Dashboard / Proveedor</p>
                    <h3>Bienvenido {providerDisplayName}</h3>
                    <p>Administra tu catalogo, controla stock y responde tickets en un solo lugar.</p>
                  </div>
                  <div className={styles.providerAvatarPanel}>
                    <div className={styles.providerAvatarPreview} aria-label='Foto de perfil proveedor'>
                      {providerAvatarUrl ? (
                        <Image
                          src={providerAvatarUrl}
                          alt={`Foto de ${providerDisplayName}`}
                          width={96}
                          height={96}
                          className={styles.providerAvatarPreviewImage}
                        />
                      ) : (
                        <span>{providerDisplayInitial}</span>
                      )}
                    </div>
                    <div className={styles.providerAvatarActions}>
                      <button
                        type='button'
                        className={styles.providerGhostButton}
                        onClick={() => providerAvatarInputRef.current?.click()}
                        disabled={isProviderAvatarUploading}
                      >
                        {isProviderAvatarUploading ? 'Subiendo...' : 'Subir foto'}
                      </button>
                      {providerAvatarUrl && (
                        <button
                          type='button'
                          className={styles.providerGhostButton}
                          onClick={() => void handleProviderAvatarClear()}
                          disabled={isProviderAvatarUploading}
                        >
                          Quitar
                        </button>
                      )}
                      <input
                        ref={providerAvatarInputRef}
                        type='file'
                        accept='image/png,image/jpeg,image/webp,image/avif'
                        className={styles.providerHiddenInput}
                        onChange={handleProviderAvatarFileChange}
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.providerHeroMetricsRow}>
                  <article className={styles.providerHeroMetricCard}>
                    <span className={styles.providerHeroMetricLabel}>💸 Saldo proveedor</span>
                    <strong>{formatMoney(providerBalanceMetric)}</strong>
                  </article>
                  <article className={styles.providerHeroMetricCard}>
                    <span className={styles.providerHeroMetricLabel}>🔁 Reembolsos</span>
                    <strong>{providerRefundsCountMetric}</strong>
                  </article>
                  <article className={styles.providerHeroMetricCard}>
                    <span className={styles.providerHeroMetricLabel}>📈 Ventas totales</span>
                    <strong>{providerSalesTotalMetric}</strong>
                  </article>
                </div>
              </header>

              {!isOwner && providerProductLimit !== null && (
                <p className={styles.providerLimitInfo}>
                  Limite de productos: <strong>{providerProducts.length}</strong> /{' '}
                  <strong>{providerProductLimit}</strong>
                </p>
              )}
              {!isOwner && providerLimitUnknown && (
                <p className={styles.providerLimitInfo}>
                  No se pudo validar tu limite. El owner debe revisar `provider_limits` y la policy `SELECT`.
                </p>
              )}

              <div className={styles.providerWorkspace}>
                <div className={styles.providerMainGrid}>
                {(showProviderProductForm || editingProviderProductId !== null) && (
                  <div className={styles.providerCreateModalBackdrop} role='presentation'>
                    <section
                      className={`${styles.providerBlock} ${styles.providerCreateBlock} ${styles.providerCreateModalCard}`}
                      role='dialog'
                      aria-modal='true'
                      aria-labelledby='provider-product-modal-title'
                    >
                  <div className={styles.providerBlockHead}>
                    <h3 id='provider-product-modal-title'>{editingProviderProductId ? '✍️ Editar producto' : '✨ Agregar producto'}</h3>
                    <div className={styles.providerHeadActions}>
                      <button type='button' onClick={resetProviderProductForm}>
                        Limpiar
                      </button>
                      <button
                        type='button'
                        onClick={() => {
                          resetProviderProductForm()
                          setShowProviderProductForm(false)
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>

                  <div className={styles.providerFormGrid}>
                    <label className={styles.providerField}>
                      <span>Nombre</span>
                      <input
                        type='text'
                        value={providerProductForm.name}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, name: event.target.value }))
                        }
                        placeholder='Netflix Premium'
                      />
                    </label>

                    <label className={styles.providerField}>
                      <span>Descripcion del producto</span>
                      <textarea
                        rows={3}
                        value={providerProductForm.summary}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, summary: event.target.value }))
                        }
                        placeholder='Describe tu producto y lo que incluye'
                      />
                    </label>

                    <label className={styles.providerField}>
                      <span>Imagen del producto</span>
                      <div className={styles.providerImageActions}>
                        <button
                          type='button'
                          className={styles.providerGhostButton}
                          disabled={isProviderImageUploading}
                          onClick={() => providerImageInputRef.current?.click()}
                        >
                          {isProviderImageUploading ? 'Subiendo...' : 'Subir desde archivos'}
                        </button>
                        {providerProductForm.logo.trim() && (
                          <button
                            type='button'
                            className={styles.providerGhostButton}
                            disabled={isProviderImageUploading}
                            onClick={() => setProviderProductForm(previous => ({ ...previous, logo: '' }))}
                          >
                            Quitar imagen
                          </button>
                        )}
                      </div>
                      <input
                        ref={providerImageInputRef}
                        className={styles.providerHiddenInput}
                        type='file'
                        accept='image/png,image/jpeg,image/webp,image/avif'
                        onChange={handleProviderLogoFileChange}
                      />
                      {providerProductForm.logo.trim() && (
                        <div className={styles.providerImagePreviewWrap}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveProductLogo(providerProductForm.name || 'producto', providerProductForm.logo)}
                            alt='Preview del producto'
                            className={styles.providerImagePreview}
                          />
                        </div>
                      )}
                    </label>

                    <label className={styles.providerField}>
                      <span>Duracion (dias)</span>
                      <input
                        type='number'
                        min={1}
                        step={1}
                        value={providerProductForm.durationDays}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, durationDays: event.target.value }))
                        }
                        placeholder='Ej: 30'
                      />
                      <small className={styles.providerFieldHint}>
                        El stock ahora es 100% automatico y se calcula desde inventario.
                      </small>
                    </label>

                    <label className={styles.providerField}>
                      <span>Precio publico</span>
                      <input
                        type='number'
                        min={0}
                        step='0.01'
                        value={providerProductForm.priceGuest}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, priceGuest: event.target.value }))
                        }
                      />
                    </label>

                    <label className={styles.providerField}>
                      <span>Precio afiliado</span>
                      <input
                        type='number'
                        min={0}
                        step='0.01'
                        value={providerProductForm.priceAffiliate}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, priceAffiliate: event.target.value }))
                        }
                      />
                    </label>

                    <label className={styles.providerField}>
                      <span>Tipo</span>
                      <select
                        value={providerProductForm.accountType}
                        onChange={event => {
                          const nextType = event.target.value
                          setProviderProductForm(previous => ({ ...previous, accountType: nextType }))
                          if (nextType === 'profiles') {
                            setShowProviderProfilesModal(true)
                          }
                        }}
                      >
                        <option value='profiles'>Perfiles</option>
                        <option value='full_account'>Cuenta completa</option>
                      </select>
                      {providerProductForm.accountType === 'profiles' && (
                        <small className={styles.providerFieldHint}>
                          Perfiles por cuenta: {providerProductForm.profilesPerAccount}
                        </small>
                      )}
                      {providerProductForm.accountType === 'profiles' && (
                        <button
                          type='button'
                          className={styles.providerFieldInlineButton}
                          onClick={() => setShowProviderProfilesModal(true)}
                        >
                          Configurar perfiles
                        </button>
                      )}
                    </label>

                    <label className={styles.providerField}>
                      <span>Entrega</span>
                      <select
                        value={providerProductForm.deliveryMode}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, deliveryMode: event.target.value }))
                        }
                      >
                        <option value='instant'>Inmediata</option>
                        <option value='on_demand'>A pedido</option>
                      </select>
                    </label>

                    <label className={styles.providerField}>
                      <span>Renovable</span>
                      <select
                        value={providerProductForm.renewable ? 'true' : 'false'}
                        onChange={event =>
                          setProviderProductForm(previous => ({
                            ...previous,
                            renewable: event.target.value === 'true',
                          }))
                        }
                      >
                        <option value='true'>Si</option>
                        <option value='false'>No</option>
                      </select>
                    </label>

                    <label className={styles.providerField}>
                      <span>Precio renovacion</span>
                      <input
                        type='number'
                        min={0}
                        step='0.01'
                        disabled={!providerProductForm.renewable}
                        value={providerProductForm.renewalPrice}
                        onChange={event =>
                          setProviderProductForm(previous => ({ ...previous, renewalPrice: event.target.value }))
                        }
                        placeholder='Opcional'
                      />
                    </label>

                    <label className={styles.providerField}>
                      <span>Estado</span>
                      <select
                        value={providerProductForm.isActive ? 'true' : 'false'}
                        onChange={event =>
                          setProviderProductForm(previous => ({
                            ...previous,
                            isActive: event.target.value === 'true',
                          }))
                        }
                      >
                        <option value='true'>Activo</option>
                        <option value='false'>Inactivo</option>
                      </select>
                    </label>

                    <label className={styles.providerField}>
                      <span>Campos extra (coma)</span>
                      <input
                        type='text'
                        value={providerProductForm.extraRequiredFields}
                        onChange={event =>
                          setProviderProductForm(previous => ({
                            ...previous,
                            extraRequiredFields: event.target.value,
                          }))
                        }
                        placeholder='correo_google, perfil_instagram'
                      />
                    </label>
                  </div>

                  <div className={styles.providerActionRow}>
                    <button
                      type='button'
                      onClick={handleProviderProductSubmit}
                      disabled={
                        isProviderImageUploading ||
                        isProviderSaving ||
                        (editingProviderProductId === null && (providerCreationBlocked || providerLimitUnknown))
                      }
                    >
                      {isProviderSaving ? 'Guardando...' : editingProviderProductId ? 'Actualizar producto' : 'Crear producto'}
                    </button>
                  </div>
                  {editingProviderProductId === null && providerCreationBlocked && providerProductLimit !== null && (
                    <p className={styles.inlineError}>
                      Limite alcanzado: {providerProductLimit} productos. Pide al owner que aumente tu limite.
                    </p>
                  )}
                  {editingProviderProductId === null && providerLimitUnknown && (
                    <p className={styles.inlineError}>
                      No se pudo validar tu limite. Verifica `provider_limits` + policy `SELECT`.
                    </p>
                  )}
                    </section>
                  </div>
                )}
                {showProviderProfilesModal && (
                  <div className={styles.providerProfilesModalBackdrop} role='presentation'>
                    <section
                      className={styles.providerProfilesModalCard}
                      role='dialog'
                      aria-modal='true'
                      aria-labelledby='provider-profiles-title'
                    >
                      <h4 id='provider-profiles-title'>Configurar perfiles</h4>
                      <p>¿Cuántos perfiles van por cada cuenta contenedora?</p>
                      <input
                        type='number'
                        min={1}
                        step={1}
                        value={providerProductForm.profilesPerAccount}
                        onChange={event =>
                          setProviderProductForm(previous => ({
                            ...previous,
                            profilesPerAccount: event.target.value,
                          }))
                        }
                        placeholder='Ej: 5'
                      />
                      <div className={styles.providerProfilesModalActions}>
                        <button type='button' onClick={() => setShowProviderProfilesModal(false)}>
                          Cerrar
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            const parsed = Math.floor(
                              toNumber(parseDecimalInput(providerProductForm.profilesPerAccount), NaN)
                            )
                            if (!Number.isFinite(parsed) || parsed < 1) {
                              setProviderMsgType('error')
                              setProviderMsg('Ingresa una cantidad valida de perfiles (minimo 1).')
                              return
                            }
                            setProviderProductForm(previous => ({
                              ...previous,
                              profilesPerAccount: String(parsed),
                            }))
                            setShowProviderProfilesModal(false)
                          }}
                        >
                          Guardar
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                <section
                  className={`${styles.providerBlock} ${selectedProviderProduct ? styles.providerInventoryStage : ''}`}
                >
                  {!selectedProviderProduct && (
                    <>
                      <div className={styles.providerBlockHead}>
                        <h3>Tus productos 🔥</h3>
                        <div className={styles.providerProductsHeadActions}>
                          <span>{filteredProviderProducts.length}</span>
                          <button
                            type='button'
                            className={styles.providerAddInlineButton}
                            disabled={
                              (providerCreationBlocked || providerLimitUnknown) &&
                              !showProviderProductForm &&
                              editingProviderProductId === null
                            }
                            onClick={handleProviderCreateProductClick}
                          >
                            {providerLimitUnknown && !showProviderProductForm
                              ? 'Limite no disponible'
                              : providerCreationBlocked && !showProviderProductForm
                                ? 'Limite alcanzado'
                                : showProviderProductForm
                                  ? 'Cerrar agregar'
                                  : 'Agregar producto'}
                          </button>
                        </div>
                      </div>

                      <div className={styles.providerCatalogToolbar}>
                        <input
                          type='search'
                          value={providerProductSearch}
                          onChange={event => setProviderProductSearch(event.target.value)}
                          placeholder='Buscar producto...'
                        />
                      </div>

                      {isProviderLoading && <p className={styles.panelEmpty}>Cargando productos...</p>}
                      {!isProviderLoading && filteredProviderProducts.length === 0 && (
                        <p className={styles.panelEmpty}>No hay productos con ese filtro.</p>
                      )}

                      <div className={styles.providerProductList}>
                        {paginatedProviderProducts.map(product => (
                          (() => {
                            const onDemandProduct = isOnDemandMode(product.deliveryMode)
                            const isProfileProduct = isProfilesAccountType(product.accountType)
                            const renewalAmount = product.renewable
                              ? formatMoney(product.renewalPrice ?? product.priceAffiliate)
                              : 'No renovable'
                            const stockBadge = onDemandProduct
                              ? '🧾 Stock: sin stock manual'
                              : isProfileProduct
                                ? `🪻 Stock: ${product.stock} slots`
                                : `📦 Stock: ${product.stock}`
                            const renewableBadge = product.renewable ? '🔄 Renovable' : '🚫 No renovable'
                            const deliveryBadge = onDemandProduct ? '🛎️ A pedido' : '⚡ Entrega inmediata'
                            const durationBadge = `⏳ ${formatDurationDays(product.durationDays)}`
                            return (
                              <article
                                key={`provider-product-${product.id}`}
                                className={`${styles.providerProductCard} ${
                                  selectedProviderProductId === product.id ? styles.providerProductCardSelected : ''
                                }`}
                              >
                                <div className={styles.providerProductCardMain}>
                                  <div
                                    className={styles.providerProductThumbWrap}
                                    role='button'
                                    tabIndex={0}
                                    onClick={() => {
                                      void openProviderInventoryManager(product)
                                    }}
                                    onKeyDown={event => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        void openProviderInventoryManager(product)
                                      }
                                    }}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={resolveProductLogo(product.name, product.logo)}
                                      alt={product.name}
                                      className={styles.providerProductThumb}
                                    />
                                  </div>

                                  <div className={styles.providerProductCardBody}>
                                    <div className={styles.providerProductHead}>
                                      <div>
                                        <strong>🔸 {product.name}</strong>
                                        <p className={styles.providerProductSubline}>
                                          {isProfileProduct ? '🪻 👉 Perfil' : '😈 👉 Cuenta completa'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className={styles.providerProductPriceRow}>
                                      <span className={`${styles.providerPill} ${styles.providerPillLime}`}>
                                        👤 Usuario final {formatMoney(product.priceGuest)}
                                      </span>
                                      <span className={`${styles.providerPill} ${styles.providerPillLime}`}>
                                        👥 Distribuidor {formatMoney(product.priceAffiliate)}
                                      </span>
                                      <span className={`${styles.providerPill} ${styles.providerPillDark}`}>
                                        🔁 Renovación {renewalAmount}
                                      </span>
                                    </div>

                                    <div className={styles.providerProductStateRow}>
                                      <span className={`${styles.providerPill} ${styles.providerPillDark}`}>{stockBadge}</span>
                                      <span
                                        className={`${styles.providerPill} ${
                                          product.renewable ? styles.providerPillBlue : styles.providerPillWarn
                                        }`}
                                      >
                                        {renewableBadge}
                                      </span>
                                      <span
                                        className={`${styles.providerPill} ${
                                          onDemandProduct ? styles.providerPillBlue : styles.providerPillDark
                                        }`}
                                      >
                                        {deliveryBadge}
                                      </span>
                                      <span className={`${styles.providerPill} ${styles.providerPillDark}`}>{durationBadge}</span>
                                    </div>
                                  </div>

                                  <div className={styles.providerProductQuickActions}>
                                    <button
                                      type='button'
                                      className={styles.providerEditIconButton}
                                      onClick={() => {
                                        startProviderProductEdit(product)
                                      }}
                                    >
                                      <span className={styles.providerEditLogoWrap}>
                                        <Image
                                          src='/logo-mark.png'
                                          alt='CRYX'
                                          width={265}
                                          height={320}
                                          className={styles.providerEditLogoImage}
                                        />
                                      </span>
                                      <span className={styles.providerEditIconGlyph}>✏️</span>
                                    </button>
                                    <button
                                      type='button'
                                      className={styles.providerToggleUnderButton}
                                      onClick={() => {
                                        void handleProviderToggleActive(product)
                                      }}
                                    >
                                      {product.isActive ? '🔴 Desactivar' : '🟢 Activar'}
                                    </button>
                                  </div>
                                </div>
                              </article>
                            )
                          })()
                        ))}
                      </div>
                      {filteredProviderProducts.length > PROVIDER_PRODUCTS_PAGE_SIZE && (
                        <div className={styles.providerPagination}>
                          <button
                            type='button'
                            onClick={() => setProviderProductsPage(previous => Math.max(1, previous - 1))}
                            disabled={providerProductsCurrentPage <= 1}
                          >
                            Anterior
                          </button>
                          <span>
                            Página {providerProductsCurrentPage} de {providerProductsTotalPages}
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              setProviderProductsPage(previous =>
                                Math.min(providerProductsTotalPages, previous + 1)
                              )
                            }
                            disabled={providerProductsCurrentPage >= providerProductsTotalPages}
                          >
                            Siguiente
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {selectedProviderProduct && (
                    <>
                      <header className={styles.providerInventoryHeader}>
                        <button type='button' onClick={closeProviderInventoryManager}>
                          ← Volver a productos
                        </button>
                        <p>
                          🔸 {selectedProviderProduct.name} - {formatAccountType(selectedProviderProduct.accountType)}
                        </p>
                      </header>

                      <div className={styles.providerInventoryToolbar}>
                        <input
                          type='search'
                          value={providerInventorySearch}
                          onChange={event => setProviderInventorySearch(event.target.value)}
                          placeholder='Buscar cuenta'
                        />
                        <button
                          type='button'
                          onClick={() => setProviderInventoryActiveOnly(previous => !previous)}
                        >
                          {providerInventoryActiveOnly ? 'Quitando filtro' : 'Agregar filtro'}
                        </button>
                        {!isOnDemandMode(selectedProviderProduct.deliveryMode) ? (
                          <button
                            type='button'
                            className={styles.providerInventoryAddButton}
                            onClick={() => {
                              resetProviderInventoryForm(selectedProviderProduct)
                              setShowProviderInventoryModal(true)
                            }}
                          >
                            + Agregar
                          </button>
                        ) : (
                          <span className={styles.providerSideHint}>Solo visual (A pedido)</span>
                        )}
                      </div>

                      <div className={styles.providerInventoryTitleRow}>
                        <h3>
                          {filteredProviderInventoryAccounts.length} Cuenta
                          {filteredProviderInventoryAccounts.length === 1 ? '' : 's'} de producto 🔥
                        </h3>
                        <span>{providerInventoryActiveOnly ? 'Solo activas' : 'Todas'}</span>
                      </div>

                      {providerInventoryMsg && (
                        <article
                          className={`${styles.providerInventoryNotice} ${
                            providerInventoryMsgType === 'error'
                              ? styles.providerNoticeCardError
                              : styles.providerNoticeCardOk
                          }`}
                        >
                          {providerInventoryMsg}
                        </article>
                      )}

                      {isProviderInventoryLoading && <p className={styles.panelEmpty}>Cargando inventario del producto...</p>}
                      {!isProviderInventoryLoading && filteredProviderInventoryAccounts.length === 0 && (
                        <p className={styles.panelEmpty}>No hay cuentas cargadas para este producto.</p>
                      )}

                      <div className={styles.providerInventoryList}>
                        {paginatedProviderInventoryAccounts.map(account => {
                          const isProfilesInventoryAccount = isProfilesAccountType(
                            selectedProviderProduct.accountType
                          )
                          const uploadDateLabel = formatDateOnly(account.createdAt)
                          const productDurationDays = selectedProviderProduct.durationDays
                          const startedAtIso = account.assignedAt ?? account.createdAt
                          const startedAtLabel = formatDateOnly(startedAtIso)
                          const hasValidStartDate =
                            startedAtIso !== null && !Number.isNaN(new Date(startedAtIso).getTime())
                          const expectedEndDateIso =
                            account.expiresAt ||
                            (hasValidStartDate && productDurationDays !== null && productDurationDays > 0
                              ? new Date(new Date(startedAtIso as string).getTime() + productDurationDays * 86400000).toISOString()
                              : null)
                          const endDateLabel = expectedEndDateIso ? formatDateOnly(expectedEndDateIso) : 'Sin limite'
                          const daysLeft = calculateDaysLeft(expectedEndDateIso)
                          const remainingLabel =
                            daysLeft === null ? 'Sin limite' : daysLeft <= 0 ? 'Vencido' : `Quedan ${daysLeft} dias`
                          const canEditDays = Boolean(account.orderId)
                          const isEditingDays = providerInventoryDaysEditingId === account.id
                          const daysDraftValue =
                            providerInventoryDaysDraft[account.id] ??
                            (daysLeft === null ? '' : String(Math.max(daysLeft, 0)))

                          const buyerNameLabel = account.buyerName.trim() || 'Sin comprador'
                          const buyerPhone = normalizeWhatsappPhone(account.buyerPhone || '')
                          const hasBuyer =
                            account.buyerId.trim().length > 0 || account.buyerName.trim().length > 0
                          const hasSlotAssignment = account.slots.some(slot => {
                            const status = slot.status.trim().toLowerCase()
                            return (
                              slot.buyerId.trim().length > 0 ||
                              [
                                'occupied',
                                'ocupado',
                                'delivered',
                                'entregado',
                                'reserved',
                                'reservado',
                                'used',
                                'taken',
                                'asignado',
                              ].includes(status)
                            )
                          })
                          const toggleBlockedByDays =
                            (hasBuyer || hasSlotAssignment || Boolean(account.orderId)) &&
                            (daysLeft === null || daysLeft > 0)
                          const statusRaw = account.assignmentStatus.trim().toLowerCase()
                          const isBusy =
                            ['occupied', 'ocupado', 'delivered', 'entregado', 'reserved', 'reservado', 'used', 'taken', 'asignado'].includes(
                              statusRaw
                            ) || hasBuyer

                          let statusLabel: 'ocupado' | 'libre' | 'inactiva' = 'libre'
                          if (isBusy) {
                            statusLabel = 'ocupado'
                          } else if (!account.isActive) {
                            statusLabel = 'inactiva'
                          }

                          const statusClass =
                            statusLabel === 'ocupado'
                              ? styles.providerInventoryTagBusy
                              : statusLabel === 'libre'
                                ? styles.providerInventoryTagFree
                                : styles.providerInventoryTagInactive
                          const isPasswordVisible = Boolean(providerInventoryVisiblePasswords[account.id])
                          const sortedSlots = [...account.slots].sort((a, b) => a.slotIndex - b.slotIndex)
                          const loginUserDisplay = isProfilesInventoryAccount
                            ? stripInventoryProfileSuffix(account.loginUser)
                            : account.loginUser

                          return (
                            <article key={`provider-inventory-account-${account.id}`} className={styles.providerInventoryCard}>
                              <div className={styles.providerInventoryCredentialLines}>
                                <p>
                                  <span>Usuario:</span>
                                  <strong>{loginUserDisplay || '-'}</strong>
                                  <button
                                    type='button'
                                    className={styles.providerInventoryCopyIcon}
                                    aria-label='Copiar usuario'
                                    onClick={() => void copyProviderInventoryField('Usuario', loginUserDisplay || '')}
                                  >
                                    📋
                                  </button>
                                </p>
                                <p>
                                  <span>Clave:</span>
                                  <strong>
                                    {isPasswordVisible ? account.loginPassword || '-' : '••••••••'}
                                  </strong>
                                  <button
                                    type='button'
                                    className={styles.providerInventoryCopyIcon}
                                    aria-label='Mostrar u ocultar clave'
                                    onClick={() => toggleProviderInventoryPassword(account.id)}
                                  >
                                    <span
                                      aria-hidden='true'
                                      className={`${styles.providerInventoryEyeIcon} ${
                                        isPasswordVisible ? styles.providerInventoryEyeIconOff : ''
                                      }`}
                                    >
                                      👁
                                    </span>
                                  </button>
                                  <button
                                    type='button'
                                    className={styles.providerInventoryCopyIcon}
                                    aria-label='Copiar clave'
                                    onClick={() => void copyProviderInventoryField('Clave', account.loginPassword || '')}
                                  >
                                    📋
                                  </button>
                                </p>
                              </div>
                              {isProfilesInventoryAccount && (
                                <div className={styles.providerInventoryProfilesPanel}>
                                  <strong>Perfiles cargados: {sortedSlots.length}</strong>
                                  {sortedSlots.length > 0 ? (
                                    <div className={styles.providerInventorySlotsGrid}>
                                      {sortedSlots.map(slot => (
                                        <span
                                          key={`provider-slot-badge-${account.id}-${slot.id}`}
                                          className={styles.providerInventorySlot}
                                        >
                                          👤 {formatProfileSlotLabel(slot.slotLabel, slot.slotIndex)}
                                          {` · PIN ${slot.profilePin || '-'}`}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className={styles.providerInventorySlotsEmpty}>
                                      Sin perfiles configurados en esta cuenta.
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className={styles.providerInventoryTopTags}>
                                {isEditingDays && canEditDays ? (
                                  <form
                                    className={styles.providerInventoryDaysInlineForm}
                                    onSubmit={event => {
                                      event.preventDefault()
                                      void handleProviderInventoryExpiryDaysSave(account)
                                    }}
                                  >
                                    <input
                                      type='number'
                                      min={-3650}
                                      step={1}
                                      value={daysDraftValue}
                                      onChange={event =>
                                        setProviderInventoryDaysDraft(previous => ({
                                          ...previous,
                                          [account.id]: event.target.value,
                                        }))
                                      }
                                      className={styles.providerInventoryDaysInlineInput}
                                      autoFocus
                                    />
                                    <button type='submit' className={styles.providerInventoryDaysInlineAction}>
                                      OK
                                    </button>
                                    <button
                                      type='button'
                                      className={styles.providerInventoryDaysInlineAction}
                                      onClick={() => setProviderInventoryDaysEditingId(null)}
                                    >
                                      X
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    type='button'
                                    className={`${styles.providerInventoryTagAccent} ${styles.providerInventoryDaysTrigger}`}
                                    onClick={() => {
                                      if (!canEditDays) return
                                      setProviderInventoryDaysDraft(previous => ({
                                        ...previous,
                                        [account.id]:
                                          previous[account.id] ?? (daysLeft === null ? '0' : String(Math.max(daysLeft, 0))),
                                      }))
                                      setProviderInventoryDaysEditingId(account.id)
                                    }}
                                    disabled={!canEditDays}
                                    title={
                                      canEditDays ? 'Click para editar dias restantes' : 'Sin compra vinculada'
                                    }
                                  >
                                    {remainingLabel}
                                  </button>
                                )}
                                <span className={styles.providerInventoryTagSoft}>🗂 {uploadDateLabel}</span>
                              </div>

                              <div className={styles.providerInventoryBottomRow}>
                                {hasBuyer ? (
                                  <button
                                    type='button'
                                    className={`${styles.providerInventoryTagSoft} ${styles.providerInventoryBuyerButton}`}
                                    onClick={() =>
                                      setProviderBuyerModal({
                                        name: buyerNameLabel,
                                        phone: buyerPhone,
                                      })
                                    }
                                  >
                                    💳 {buyerNameLabel}
                                  </button>
                                ) : (
                                  <span className={styles.providerInventoryTagSoft}>💳 Sin comprador</span>
                                )}
                                <span className={styles.providerInventoryTagSoft}>📆 {startedAtLabel}</span>
                                <span className={styles.providerInventoryTagSoft}>💀 {endDateLabel}</span>
                                <span className={`${styles.providerInventoryTagSoft} ${statusClass}`}>
                                  🚨 {statusLabel}
                                </span>
                                <div className={styles.providerInventoryInlineActions}>
                                  <button type='button' onClick={() => void copyProviderInventoryCredentials(account)}>
                                    Copiar todo
                                  </button>
                                  <button
                                    type='button'
                                    className={styles.providerInventoryEditButton}
                                    onClick={() => openProviderInventoryEditModal(account)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type='button'
                                    className={styles.providerInventoryDeleteButton}
                                    onClick={() => void handleProviderInventoryDeleteAccount(account)}
                                    disabled={Boolean(isProviderInventoryDeleting[account.id])}
                                  >
                                    {isProviderInventoryDeleting[account.id] ? 'Borrando...' : 'Borrar'}
                                  </button>
                                  {!isOnDemandMode(selectedProviderProduct.deliveryMode) && (
                                    <button
                                      type='button'
                                      onClick={() => void handleProviderInventoryAccountToggle(account)}
                                      disabled={toggleBlockedByDays}
                                      title={
                                        toggleBlockedByDays
                                          ? 'Solo puedes cambiar estado cuando la cuenta ya tenga 0 dias o menos.'
                                          : undefined
                                      }
                                    >
                                      {account.isActive ? 'Desactivar' : 'Activar'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                      {filteredProviderInventoryAccounts.length > PROVIDER_INVENTORY_PAGE_SIZE && (
                        <div className={styles.providerPagination}>
                          <button
                            type='button'
                            onClick={() => setProviderInventoryPage(previous => Math.max(1, previous - 1))}
                            disabled={providerInventoryCurrentPage <= 1}
                          >
                            Anterior
                          </button>
                          <span>
                            Página {providerInventoryCurrentPage} de {providerInventoryTotalPages}
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              setProviderInventoryPage(previous =>
                                Math.min(providerInventoryTotalPages, previous + 1)
                              )
                            }
                            disabled={providerInventoryCurrentPage >= providerInventoryTotalPages}
                          >
                            Siguiente
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>

                <aside className={styles.providerSideRail}>
                  <div className={styles.providerSideCounters}>
                    <button
                      type='button'
                      className={`${styles.providerSideTabButton} ${
                        providerSideTab === 'orders' ? styles.providerSideTabActive : ''
                      }`}
                      onClick={() => setProviderSideTab('orders')}
                    >
                      🛒 Pedidos ({providerOrdersLive.length})
                    </button>
                    <button
                      type='button'
                      className={`${styles.providerSideTabButton} ${
                        providerSideTab === 'tickets' ? styles.providerSideTabActive : ''
                      }`}
                      onClick={() => setProviderSideTab('tickets')}
                    >
                      🚨 Reportes ({providerTicketsLive.length})
                    </button>
                    <button
                      type='button'
                      className={styles.providerSideRefreshButton}
                      onClick={() => void loadProviderDashboardData()}
                      disabled={isProviderLoading}
                    >
                      {isProviderLoading ? '...' : '↻'}
                    </button>
                  </div>

                  {providerSideTab === 'orders' ? (
                    <section className={styles.providerBlock}>
                      <div className={styles.providerBlockHead}>
                        <h3>Pedidos</h3>
                        <span>{providerOrdersLive.length}</span>
                      </div>
                      <p className={styles.providerSideHint}>Solo pedidos A pedido pendientes de entrega.</p>

                      {isProviderLoading && <p className={styles.panelEmpty}>Cargando pedidos...</p>}
                      {!isProviderLoading && providerOrdersLive.length === 0 && (
                        <p className={styles.panelEmpty}>No hay pedidos activos por ahora.</p>
                      )}

                      <div className={styles.providerSideList}>
                        {providerOrdersLive.map(order => {
                          const orderKey = String(order.id)
                          const isSelected = providerSelectedOrderId === orderKey
                          const clientPhone = normalizeWhatsappPhone(order.buyerPhone || '')
                          const whatsappText = encodeURIComponent(
                            `Hola ${order.buyerName || ''}, te escribo por tu pedido #${order.id} de ${order.productName}.`
                          )
                          const whatsappHref = clientPhone ? `https://wa.me/${clientPhone}?text=${whatsappText}` : ''

                          return (
                            <article
                              key={`provider-order-${order.id}`}
                              className={`${styles.providerOrderStripCard} ${
                                isSelected ? styles.providerOrderStripCardActive : ''
                              }`}
                              role='button'
                              tabIndex={0}
                              onClick={() => setProviderSelectedOrderId(orderKey)}
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setProviderSelectedOrderId(orderKey)
                                }
                              }}
                            >
                              <div className={styles.providerOrderStripMain}>
                                <span className={styles.providerOrderStripImageWrap}>
                                  <Image
                                    src={order.productLogo || '/logo-mark.png'}
                                    alt={order.productName}
                                    fill
                                    sizes='96px'
                                    className={styles.providerOrderStripImage}
                                  />
                                </span>

                                <div className={styles.providerOrderStripBody}>
                                  <strong className={styles.providerOrderStripTitle}>{order.productName}</strong>
                                  <span className={styles.providerOrderStripLine}>🧳 {providerDisplayName}</span>
                                  <span className={styles.providerOrderStripLine}>👤 {order.buyerName || '-'}</span>
                                  <span className={styles.providerOrderStripLine}>
                                    🧾 Pedido #{order.id} · {formatOrderStatus(order.status)}
                                  </span>
                                </div>

                                {whatsappHref ? (
                                  <a
                                    href={whatsappHref}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className={styles.providerOrderStripWhatsapp}
                                    aria-label='Contactar comprador por WhatsApp'
                                    onClick={event => event.stopPropagation()}
                                  >
                                    <Image src='/whatsapp.png' alt='WhatsApp' width={30} height={30} />
                                  </a>
                                ) : (
                                  <span className={styles.providerOrderStripWhatsappOff} title='Sin numero valido'>
                                    <Image src='/whatsapp.png' alt='WhatsApp' width={30} height={30} />
                                  </span>
                                )}
                              </div>
                            </article>
                          )
                        })}
                      </div>

                      {providerSelectedOrder && (() => {
                        const orderDraft = providerOrderDrafts[String(providerSelectedOrder.id)] ?? {
                          resolutionSummary: '',
                          loginUser: '',
                          loginPassword: '',
                          profilePin: '',
                        }
                        const clientPhone = normalizeWhatsappPhone(providerSelectedOrder.buyerPhone || '')
                        const whatsappText = encodeURIComponent(
                          `Hola ${providerSelectedOrder.buyerName || ''}, te escribo por tu pedido #${
                            providerSelectedOrder.id
                          } de ${providerSelectedOrder.productName}.`
                        )
                        const whatsappHref = clientPhone ? `https://wa.me/${clientPhone}?text=${whatsappText}` : ''

                        return (
                          <div className={styles.providerOrderModalBackdrop} role='presentation'>
                            <section
                              className={styles.providerOrderModalCard}
                              role='dialog'
                              aria-modal='true'
                              aria-labelledby='provider-order-modal-title'
                              onClick={event => event.stopPropagation()}
                            >
                              <header className={styles.providerOrderModalHead}>
                                <span className={styles.providerOrderModalThumb}>
                                  <Image
                                    src={providerSelectedOrder.productLogo || '/logo-mark.png'}
                                    alt={providerSelectedOrder.productName}
                                    fill
                                    sizes='60px'
                                    className={styles.providerOrderStripImage}
                                  />
                                </span>
                                <div className={styles.providerOrderModalTitleWrap}>
                                  <strong id='provider-order-modal-title'>{providerSelectedOrder.productName}</strong>
                                  <span>
                                    Pedido #{providerSelectedOrder.id} · {formatOrderStatus(providerSelectedOrder.status)}
                                  </span>
                                </div>
                                <button
                                  type='button'
                                  className={styles.providerOrderModalClose}
                                  onClick={() => setProviderSelectedOrderId(null)}
                                  aria-label='Cerrar pedido'
                                >
                                  ×
                                </button>
                              </header>

                              <div className={styles.providerOrderModalScroll}>
                                <div className={styles.providerOrderModalSummary}>
                                  <span>🧳 Proveedor: {providerDisplayName}</span>
                                  <span>👤 Comprador: {providerSelectedOrder.buyerName || '-'}</span>
                                  <span>📲 Telefono comprador: {providerSelectedOrder.buyerPhone || '-'}</span>
                                  <span>💵 Monto: {formatMoney(providerSelectedOrder.amount)}</span>
                                  <span>⏳ Duracion: {formatDurationDays(providerSelectedOrder.durationDays)}</span>
                                  <span>🕒 Fecha: {formatDateOnly(providerSelectedOrder.createdAt)}</span>
                                  <span>💬 Datos cliente final: {providerSelectedOrder.customerExtra || '-'}</span>
                                </div>

                                <div className={styles.providerOrderModalActions}>
                                  {whatsappHref ? (
                                    <a
                                      href={whatsappHref}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className={styles.providerOrderStripWhatsapp}
                                      aria-label='Contactar comprador por WhatsApp'
                                    >
                                      <Image src='/whatsapp.png' alt='WhatsApp' width={32} height={32} />
                                    </a>
                                  ) : (
                                    <span className={styles.providerOrderStripWhatsappOff} title='Sin numero valido'>
                                      <Image src='/whatsapp.png' alt='WhatsApp' width={32} height={32} />
                                    </span>
                                  )}
                                </div>

                                <div className={styles.providerOrderInlineForm}>
                                  <label className={styles.providerField}>
                                    <span>Resumen resolucion</span>
                                    <input
                                      type='text'
                                      value={orderDraft.resolutionSummary}
                                      onChange={event =>
                                        handleProviderOrderDraftChange(providerSelectedOrder.id, {
                                          resolutionSummary: event.target.value,
                                        })
                                      }
                                      placeholder='Cuenta entregada y validada'
                                    />
                                  </label>
                                  <label className={styles.providerField}>
                                    <span>Login user</span>
                                    <input
                                      type='text'
                                      value={orderDraft.loginUser}
                                      onChange={event =>
                                        handleProviderOrderDraftChange(providerSelectedOrder.id, {
                                          loginUser: event.target.value,
                                        })
                                      }
                                      placeholder='correo@servicio.com'
                                    />
                                  </label>
                                  <label className={styles.providerField}>
                                    <span>Login password</span>
                                    <input
                                      type='text'
                                      value={orderDraft.loginPassword}
                                      onChange={event =>
                                        handleProviderOrderDraftChange(providerSelectedOrder.id, {
                                          loginPassword: event.target.value,
                                        })
                                      }
                                      placeholder='Password'
                                    />
                                  </label>
                                  {isProfilesAccountType(providerSelectedOrder.accountType) && (
                                    <label className={styles.providerField}>
                                      <span>PIN perfil (opcional)</span>
                                      <input
                                        type='text'
                                        value={orderDraft.profilePin}
                                        onChange={event =>
                                          handleProviderOrderDraftChange(providerSelectedOrder.id, {
                                            profilePin: event.target.value,
                                          })
                                        }
                                        placeholder='Ej: 1234'
                                      />
                                    </label>
                                  )}
                                  <div className={styles.providerActionRow}>
                                    <button
                                      type='button'
                                      className={styles.providerDangerButton}
                                      onClick={() => void handleProviderOnDemandOrderReject(providerSelectedOrder)}
                                      disabled={Boolean(providerOrderSaving[String(providerSelectedOrder.id)])}
                                    >
                                      {providerOrderSaving[String(providerSelectedOrder.id)]
                                        ? 'Guardando...'
                                        : 'Rechazar pedido'}
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => void handleProviderOnDemandOrderSave(providerSelectedOrder)}
                                      disabled={Boolean(providerOrderSaving[String(providerSelectedOrder.id)])}
                                    >
                                      {providerOrderSaving[String(providerSelectedOrder.id)]
                                        ? 'Guardando...'
                                        : 'Entregar pedido'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </section>
                          </div>
                        )
                      })()}
                    </section>
                  ) : (
                    <section className={styles.providerBlock}>
                      <div className={styles.providerBlockHead}>
                        <h3>Tickets / reportes</h3>
                        <span>{providerTicketsLive.length}</span>
                      </div>
                      <p className={styles.providerSideHint}>Solo reportes de soporte (no pedidos).</p>

                      {isProviderLoading && <p className={styles.panelEmpty}>Cargando tickets...</p>}
                      {!isProviderLoading && providerTicketsLive.length === 0 && (
                        <p className={styles.panelEmpty}>No hay tickets para atender en este momento.</p>
                      )}

                      <div className={styles.providerSideList}>
                        {providerTicketsLive.map(ticket => {
                          const ticketKey = String(ticket.id)
                          const isSelected = providerSelectedTicketId === ticketKey
                          return (
                            <article
                              key={`provider-ticket-${ticket.id}`}
                              className={`${styles.providerTicketStripCard} ${
                                isSelected ? styles.providerTicketStripCardActive : ''
                              }`}
                              role='button'
                              tabIndex={0}
                              onClick={() => setProviderSelectedTicketId(ticketKey)}
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setProviderSelectedTicketId(ticketKey)
                                }
                              }}
                            >
                              <div className={styles.providerTicketStripMain}>
                                <span className={styles.providerOrderStripImageWrap}>
                                  <Image
                                    src={ticket.productLogo || '/logo-mark.png'}
                                    alt={ticket.productName}
                                    fill
                                    sizes='96px'
                                    className={styles.providerOrderStripImage}
                                  />
                                </span>
                                <div className={styles.providerTicketStripBody}>
                                  <strong className={styles.providerOrderStripTitle}>{ticket.subject}</strong>
                                  <span className={styles.providerOrderStripLine}>📦 {ticket.productName}</span>
                                  <span className={styles.providerOrderStripLine}>👤 {ticket.buyerName || '-'}</span>
                                  <span className={styles.providerOrderStripLine}>🧾 Ticket #{ticket.id}</span>
                                </div>
                                <span className={styles.providerTicketStripStatus}>{formatOrderStatus(ticket.status)}</span>
                              </div>
                            </article>
                          )
                        })}
                      </div>

                      {providerSelectedTicket && (() => {
                        const draft = providerTicketDrafts[String(providerSelectedTicket.id)] ?? {
                          status: providerSelectedTicket.status,
                          resolutionSummary: providerSelectedTicket.resolutionSummary,
                          resolutionDetail: providerSelectedTicket.resolutionDetail,
                          loginUser: providerSelectedTicket.credentialLoginUser,
                          loginPassword: providerSelectedTicket.credentialLoginPassword,
                          profileLabel: providerSelectedTicket.credentialProfileLabel,
                          profilePin: providerSelectedTicket.credentialProfilePin,
                        }
                        const hasLinkedOrder = providerSelectedTicket.orderId !== null
                        const isProfilesTicket = isProfilesAccountType(providerSelectedTicket.orderAccountType)
                        const clientPhone = normalizeWhatsappPhone(providerSelectedTicket.buyerPhone || '')
                        const whatsappText = encodeURIComponent(
                          `Hola ${providerSelectedTicket.buyerName || ''}, te escribo por tu ticket #${
                            providerSelectedTicket.id
                          } (${providerSelectedTicket.productName}).`
                        )
                        const whatsappHref = clientPhone ? `https://wa.me/${clientPhone}?text=${whatsappText}` : ''

                        return (
                          <div className={styles.providerOrderModalBackdrop} role='presentation'>
                            <section
                              className={styles.providerOrderModalCard}
                              role='dialog'
                              aria-modal='true'
                              aria-labelledby='provider-ticket-modal-title'
                              onClick={event => event.stopPropagation()}
                            >
                              <header className={styles.providerOrderModalHead}>
                                <span className={styles.providerOrderModalThumb}>
                                  <Image
                                    src={providerSelectedTicket.productLogo || '/logo-mark.png'}
                                    alt={providerSelectedTicket.productName}
                                    fill
                                    sizes='60px'
                                    className={styles.providerOrderStripImage}
                                  />
                                </span>
                                <div className={styles.providerOrderModalTitleWrap}>
                                  <strong id='provider-ticket-modal-title'>{providerSelectedTicket.subject}</strong>
                                  <span>
                                    Ticket #{providerSelectedTicket.id} ·{' '}
                                    {formatOrderStatus(providerSelectedTicket.status)}
                                  </span>
                                </div>
                                <button
                                  type='button'
                                  className={styles.providerOrderModalClose}
                                  onClick={() => setProviderSelectedTicketId(null)}
                                  aria-label='Cerrar ticket'
                                >
                                  ×
                                </button>
                              </header>

                              <div className={styles.providerOrderModalScroll}>
                                <p className={styles.providerTicketBody}>{providerSelectedTicket.description}</p>
                                <div className={styles.providerOrderModalSummary}>
                                  <span>📦 Producto: {providerSelectedTicket.productName}</span>
                                  <span>👤 Comprador: {providerSelectedTicket.buyerName || '-'}</span>
                                  <span>📲 Telefono comprador: {providerSelectedTicket.buyerPhone || '-'}</span>
                                  <span>🏷 Tipo: {providerSelectedTicket.type || '-'}</span>
                                  <span>
                                    🧾 Pedido vinculado:{' '}
                                    {providerSelectedTicket.orderId !== null ? `#${providerSelectedTicket.orderId}` : '-'}
                                  </span>
                                  <span>🧪 Nombre cliente final: {providerSelectedTicket.customerName || '-'}</span>
                                  <span>📞 Telefono cliente final: {providerSelectedTicket.customerPhone || '-'}</span>
                                  <span>💬 Extra cliente final: {providerSelectedTicket.customerExtra || '-'}</span>
                                </div>

                                <div className={styles.providerOrderModalActions}>
                                  {whatsappHref ? (
                                    <a
                                      href={whatsappHref}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className={styles.providerOrderStripWhatsapp}
                                      aria-label='Contactar comprador por WhatsApp'
                                    >
                                      <Image src='/whatsapp.png' alt='WhatsApp' width={32} height={32} />
                                    </a>
                                  ) : (
                                    <span className={styles.providerOrderStripWhatsappOff} title='Sin numero valido'>
                                      <Image src='/whatsapp.png' alt='WhatsApp' width={32} height={32} />
                                    </span>
                                  )}
                                </div>

                                <div className={styles.providerTicketFormGrid}>
                                  <label className={styles.providerField}>
                                    <span>Estado</span>
                                    <select
                                      value={draft.status}
                                      onChange={event =>
                                        handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                          status: event.target.value,
                                        })
                                      }
                                    >
                                      <option value='open'>Abierto</option>
                                      <option value='in_progress'>En proceso</option>
                                      <option value='resolved'>Resuelto</option>
                                    </select>
                                  </label>

                                  <label className={styles.providerField}>
                                    <span>Resumen resolucion</span>
                                    <input
                                      type='text'
                                      value={draft.resolutionSummary}
                                      onChange={event =>
                                        handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                          resolutionSummary: event.target.value,
                                        })
                                      }
                                      placeholder='Que se hizo'
                                    />
                                  </label>

                                  <label className={styles.providerField}>
                                    <span>Detalle</span>
                                    <input
                                      type='text'
                                      value={draft.resolutionDetail}
                                      onChange={event =>
                                        handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                          resolutionDetail: event.target.value,
                                        })
                                      }
                                      placeholder='Cambios aplicados'
                                    />
                                  </label>

                                  {hasLinkedOrder && (
                                    <>
                                      <label className={styles.providerField}>
                                        <span>Correo / login</span>
                                        <input
                                          type='text'
                                          value={draft.loginUser}
                                          onChange={event =>
                                            handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                              loginUser: event.target.value,
                                            })
                                          }
                                          placeholder='correo@servicio.com'
                                        />
                                      </label>

                                      <label className={styles.providerField}>
                                        <span>Contrasena</span>
                                        <input
                                          type='text'
                                          value={draft.loginPassword}
                                          onChange={event =>
                                            handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                              loginPassword: event.target.value,
                                            })
                                          }
                                          placeholder='Nueva contrasena'
                                        />
                                      </label>

                                      {isProfilesTicket && (
                                        <>
                                          <label className={styles.providerField}>
                                            <span>Perfil</span>
                                            <input
                                              type='text'
                                              value={draft.profileLabel}
                                              onChange={event =>
                                                handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                                  profileLabel: event.target.value,
                                                })
                                              }
                                              placeholder='Ej: Perfil 1'
                                            />
                                          </label>

                                          <label className={styles.providerField}>
                                            <span>PIN perfil</span>
                                            <input
                                              type='text'
                                              value={draft.profilePin}
                                              onChange={event =>
                                                handleProviderTicketDraftChange(providerSelectedTicket.id, {
                                                  profilePin: event.target.value,
                                                })
                                              }
                                              placeholder='Ej: 1234'
                                            />
                                          </label>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>

                                <div className={styles.providerActionRow}>
                                  <button
                                    type='button'
                                    onClick={() => void handleProviderTicketSave(providerSelectedTicket)}
                                    disabled={Boolean(providerTicketSaving[String(providerSelectedTicket.id)])}
                                  >
                                    {providerTicketSaving[String(providerSelectedTicket.id)]
                                      ? 'Guardando...'
                                      : 'Guardar ticket'}
                                  </button>
                                </div>
                              </div>
                            </section>
                          </div>
                        )
                      })()}
                    </section>
                  )}
                </aside>
              </div>

              {providerBuyerModal && (() => {
                const buyerPhone = normalizeWhatsappPhone(providerBuyerModal.phone || '')
                const buyerWhatsappText = encodeURIComponent(
                  `Hola ${providerBuyerModal.name || ''}, te escribo por tu compra en la plataforma.`
                )
                const buyerWhatsappHref = buyerPhone
                  ? `https://wa.me/${buyerPhone}?text=${buyerWhatsappText}`
                  : ''
                return (
                  <div className={styles.providerBuyerModalBackdrop} role='presentation'>
                    <section
                      className={styles.providerBuyerModalCard}
                      role='dialog'
                      aria-modal='true'
                      aria-labelledby='provider-buyer-modal-title'
                    >
                      <span className={styles.providerBuyerModalAvatar}>
                        <Image src='/whatsapp.png' alt='WhatsApp' width={48} height={48} />
                      </span>
                      <strong id='provider-buyer-modal-title' className={styles.providerBuyerModalName}>
                        {providerBuyerModal.name || 'Sin comprador'}
                      </strong>
                      <span className={styles.providerBuyerModalSub}>Titular de la compra</span>

                      {buyerWhatsappHref ? (
                        <a
                          href={buyerWhatsappHref}
                          target='_blank'
                          rel='noopener noreferrer'
                          className={styles.providerBuyerModalAction}
                        >
                          Contactar
                        </a>
                      ) : (
                        <button
                          type='button'
                          className={`${styles.providerBuyerModalAction} ${styles.providerBuyerModalActionDisabled}`}
                          disabled
                        >
                          Sin WhatsApp
                        </button>
                      )}

                      <button
                        type='button'
                        className={styles.providerBuyerModalClose}
                        onClick={() => setProviderBuyerModal(null)}
                      >
                        Cerrar
                      </button>
                    </section>
                  </div>
                )
              })()}

              {showProviderInventoryModal && selectedProviderProduct && (
                <div className={styles.providerInventoryModalBackdrop} role='presentation'>
                  {(() => {
                    const isProfilesInventoryProduct = isProfilesAccountType(selectedProviderProduct.accountType)
                    return (
                  <section
                    className={styles.providerInventoryModalCard}
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='provider-inventory-modal-title'
                  >
                    <h4 id='provider-inventory-modal-title'>+ Agregar stock</h4>
                    <p>
                      Carga cuentas y credenciales para <strong>{selectedProviderProduct.name}</strong>.
                    </p>

                    <div className={styles.providerFormGrid}>
                      <label className={styles.providerField}>
                        <span>
                          {isProfilesInventoryProduct
                            ? 'Usuario/Login'
                            : 'Usuarios/Login (separados por coma)'}
                        </span>
                        <input
                          type='text'
                          value={providerInventoryForm.loginUser}
                          onChange={event =>
                            setProviderInventoryForm(previous => ({ ...previous, loginUser: event.target.value }))
                          }
                          placeholder={
                            isProfilesInventoryProduct
                              ? 'cuenta_streaming@gmail.com'
                              : 'streamplus01@gmail.com, playtv02@gmail.com, premium03@gmail.com'
                          }
                        />
                        {isProfilesInventoryProduct && (
                          <small className={styles.providerFieldHint}>Para perfiles se carga 1 cuenta por envio.</small>
                        )}
                      </label>

                      <label className={styles.providerField}>
                        <span>Password (obligatorio)</span>
                        <input
                          type='text'
                          value={providerInventoryForm.loginPassword}
                          onChange={event =>
                            setProviderInventoryForm(previous => ({ ...previous, loginPassword: event.target.value }))
                          }
                          placeholder={
                            isProfilesInventoryProduct
                              ? 'Contraseña de la cuenta'
                              : 'clave123 o clave1, clave2, clave3'
                          }
                        />
                        {isProfilesInventoryProduct ? (
                          <div className={styles.providerActionRow}>
                            <button
                              type='button'
                              className={styles.providerFieldInlineButton}
                              onClick={() => setShowProviderInventoryProfilesModal(true)}
                            >
                              ⚙️ Configurar perfiles
                            </button>
                            <small className={styles.providerFieldHint}>
                              Perfiles cargados: {
                                providerInventoryProfileInputs.filter(
                                  item => item.slotLabel.trim().length > 0 || item.profilePin.trim().length > 0
                                ).length
                              }
                            </small>
                            <small className={styles.providerFieldHint}>
                              Cada perfil configurado se guarda como registro separado.
                            </small>
                          </div>
                        ) : (
                          <small className={styles.providerFieldHint}>
                            Puedes usar una sola clave para todas las cuentas o una lista separada por comas.
                          </small>
                        )}
                      </label>
                    </div>

                    <div className={styles.providerProfilesModalActions}>
                      <button type='button' onClick={() => setShowProviderInventoryModal(false)}>
                        Cancelar
                      </button>
                      <button
                        type='button'
                        onClick={() => void handleProviderInventorySubmit()}
                        disabled={isProviderInventorySaving}
                      >
                        {isProviderInventorySaving ? 'Guardando...' : 'Guardar stock'}
                      </button>
                    </div>
                  </section>
                    )
                  })()}
                </div>
              )}
              {showProviderInventoryProfilesModal &&
                selectedProviderProduct &&
                isProfilesAccountType(selectedProviderProduct.accountType) && (
                  <div className={styles.providerProfilesModalBackdrop} role='presentation'>
                    <section
                      className={styles.providerProfilesModalCard}
                      role='dialog'
                      aria-modal='true'
                      aria-labelledby='provider-inventory-profiles-title'
                    >
                      <h4 id='provider-inventory-profiles-title'>⚙️ Configurar perfiles de la cuenta</h4>
                      <p>
                        Completa solo los perfiles que quieres subir. Lo vacio no se registra.
                      </p>
                      <div className={styles.providerInventoryProfilesList}>
                        {providerInventoryProfileInputs.map((item, index) => (
                          <div key={`inventory-profile-input-${index + 1}`} className={styles.providerInventoryProfilesRow}>
                            <label className={styles.providerField}>
                              <span>Perfil #{index + 1}</span>
                              <input
                                type='text'
                                value={item.slotLabel}
                                onChange={event =>
                                  setProviderInventoryProfileInputs(previous =>
                                    previous.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, slotLabel: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                                placeholder={`Ej: ${index + 1}`}
                              />
                            </label>
                            <label className={styles.providerField}>
                              <span>PIN (opcional)</span>
                              <input
                                type='text'
                                value={item.profilePin}
                                onChange={event =>
                                  setProviderInventoryProfileInputs(previous =>
                                    previous.map((entry, entryIndex) =>
                                      entryIndex === index
                                        ? { ...entry, profilePin: event.target.value }
                                        : entry
                                    )
                                  )
                                }
                                placeholder='1234'
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className={styles.providerProfilesModalActions}>
                        <button type='button' onClick={() => setShowProviderInventoryProfilesModal(false)}>
                          Cerrar
                        </button>
                        <button type='button' onClick={() => setShowProviderInventoryProfilesModal(false)}>
                          Guardar
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              {providerInventoryEditingAccount && selectedProviderProduct && (
                <div className={styles.providerProfilesModalBackdrop} role='presentation'>
                  <section
                    className={styles.providerProfilesModalCard}
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='provider-inventory-edit-title'
                  >
                    <h4 id='provider-inventory-edit-title'>✍️ Editar cuenta/perfil</h4>
                    <p>Ajusta credenciales y datos del perfil para este registro.</p>

                    <div className={styles.providerFormGrid}>
                      <label className={styles.providerField}>
                        <span>Usuario/Login</span>
                        <input
                          type='text'
                          value={providerInventoryEditForm.loginUser}
                          onChange={event =>
                            setProviderInventoryEditForm(previous => ({
                              ...previous,
                              loginUser: event.target.value,
                            }))
                          }
                          placeholder='correo@servicio.com'
                        />
                      </label>

                      <label className={styles.providerField}>
                        <span>Password</span>
                        <input
                          type='text'
                          value={providerInventoryEditForm.loginPassword}
                          onChange={event =>
                            setProviderInventoryEditForm(previous => ({
                              ...previous,
                              loginPassword: event.target.value,
                            }))
                          }
                          placeholder='Nueva contraseña'
                        />
                      </label>

                      {isProfilesAccountType(selectedProviderProduct.accountType) && (
                        <>
                          <label className={styles.providerField}>
                            <span>Perfil</span>
                            <input
                              type='text'
                              value={providerInventoryEditForm.slotLabel}
                              onChange={event =>
                                setProviderInventoryEditForm(previous => ({
                                  ...previous,
                                  slotLabel: event.target.value,
                                }))
                              }
                              placeholder='Ej: Perfil 1'
                            />
                          </label>

                          <label className={styles.providerField}>
                            <span>PIN</span>
                            <input
                              type='text'
                              value={providerInventoryEditForm.profilePin}
                              onChange={event =>
                                setProviderInventoryEditForm(previous => ({
                                  ...previous,
                                  profilePin: event.target.value,
                                }))
                              }
                              placeholder='Ej: 1234'
                            />
                          </label>
                        </>
                      )}
                    </div>

                    <div className={styles.providerProfilesModalActions}>
                      <button type='button' onClick={closeProviderInventoryEditModal}>
                        Cerrar
                      </button>
                      <button
                        type='button'
                        onClick={() => void handleProviderInventoryEditSave()}
                        disabled={isProviderInventoryEditingSaving}
                      >
                        {isProviderInventoryEditingSaving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </section>
                </div>
              )}

            </>
          )}
        </section>
      )
    }

    if (currentSectionId === 'administrador-cuentas') {
      return (
        <section className={styles.ownerStage}>
          {!isOwnerOrAdmin && <p className={styles.panelEmpty}>Modulo exclusivo de owner/admin.</p>}

          {isOwnerOrAdmin && (
            <>
              <header className={styles.ownerHero}>
                <div className={styles.ownerHeroCopy}>
                  <p className={styles.ownerKicker}>Owner</p>
                  <h3>Centro de control global 🛡️</h3>
                  <p>Gestiona usuarios, proveedores, productos, pedidos, tickets, recargas y afiliacion.</p>
                  <div className={styles.ownerHeroChips}>
                    <span>Roles y aprobaciones ⚙️</span>
                    <span>Saldos separados 💸</span>
                    <span>Control de riesgo 🔒</span>
                  </div>
                </div>
              </header>

              <div className={styles.ownerOverviewGrid}>
                {ownerQuickCards.map(card => (
                  <button
                    key={`owner-card-${card.label}`}
                    type='button'
                    className={`${styles.ownerOverviewCard} ${styles.ownerOverviewCardButton} ${
                      ownerActiveTab === card.tab ? styles.ownerOverviewCardActive : ''
                    }`}
                    onClick={() => setOwnerActiveTab(card.tab)}
                  >
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </button>
                ))}
              </div>

              {ownerActiveTab === 'resumen' && (
                <>
                  <section className={styles.providerBlock}>
                    <div className={styles.providerBlockHead}>
                      <h3>Actividad reciente</h3>
                      <span>{ownerRecentActivity.length}</span>
                    </div>

                    {ownerRecentActivity.length === 0 ? (
                      <p className={styles.panelEmpty}>Sin actividad registrada todavia.</p>
                    ) : (
                      <div className={styles.ownerActivityList}>
                        {ownerRecentActivity.map(activity => (
                          <article key={activity.id} className={styles.ownerActivityItem}>
                            <div>
                              <strong>{activity.title}</strong>
                              <p>{activity.detail}</p>
                            </div>
                            <span>{formatDate(activity.createdAt)}</span>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {ownerActiveTab === 'usuarios' && (
                <>
                  <div className={styles.ownerToolbar}>
                <input
                  type='search'
                  value={ownerSearch}
                  onChange={event => setOwnerSearch(event.target.value)}
                  placeholder='Buscar usuario o rol...'
                />
                <select value={ownerRoleFilter} onChange={event => setOwnerRoleFilter(event.target.value)}>
                  <option value='all'>Todos los roles</option>
                  {ownerRoleOptions.map(roleValue => (
                    <option key={`owner-filter-role-${roleValue}`} value={roleValue}>
                      {formatOwnerRole(roleValue)}
                    </option>
                  ))}
                </select>
                <select
                  value={ownerApprovalFilter}
                  onChange={event => setOwnerApprovalFilter(event.target.value as OwnerApprovalFilter)}
                >
                  <option value='all'>Todos los estados</option>
                  <option value='approved'>Solo aprobados</option>
                  <option value='pending'>Solo pendientes</option>
                </select>
                <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                  {isOwnerLoading ? 'Actualizando...' : 'Actualizar panel'}
                </button>
                  </div>

                  <p className={styles.ownerResultText}>
                Mostrando <strong>{filteredOwnerUsers.length}</strong> de <strong>{ownerUsers.length}</strong> usuarios.
                  </p>

                  {isOwnerLoading && <p className={styles.panelEmpty}>Cargando usuarios...</p>}
                  {!isOwnerLoading && filteredOwnerUsers.length === 0 && (
                    <p className={styles.panelEmpty}>No se encontraron usuarios para este filtro.</p>
                  )}

                  <div className={`${styles.ownerUsersList} ${styles.ownerUsersListCompact}`}>
                {filteredOwnerUsers.map(user => {
                  const ordersCount = ownerOrderCountByBuyer.get(user.id) ?? 0
                  const ticketsCount = ownerTicketCountByBuyer.get(user.id) ?? 0
                  const referrerName = ownerReferrerByUser.get(user.id)
                  const effectiveRole = normalizeAppRole(ownerRoleDraft[user.id] ?? user.role)
                  const isLockedOwnerRole = normalizeAppRole(user.role) === 'owner'
                  const isProviderRole = effectiveRole === 'provider'
                  const providerItem = ownerProviders.find(item => item.id === user.id) ?? {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    approved: user.approved,
                    productLimit: null,
                    productsCreated: 0,
                    providerBalance: user.providerBalance ?? 0,
                    openTickets: 0,
                    salesAmount: 0,
                  }

                  return (
                    <article key={`owner-user-${user.id}`} className={`${styles.ownerUserCard} ${styles.ownerUserCardCompact}`}>
                      <div className={styles.ownerUserHead}>
                        <div>
                          <strong>{user.username}</strong>
                          <p>ID: {formatCompactId(user.id)}</p>
                        </div>
                        <span className={user.approved ? styles.ownerStateOk : styles.ownerStatePending}>
                          {user.approved ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </div>

                      <div className={`${styles.ownerUserMeta} ${styles.ownerUserMetaCompact}`}>
                        <span>Rol actual: {formatOwnerRole(user.role)}</span>
                        <span>Afiliador: {referrerName ? referrerName : '-'}</span>
                        <span>Compras: {ordersCount}</span>
                        <span>Tickets: {ticketsCount}</span>
                        <span>Balance: {formatMoney(user.balance)}</span>
                        {isProviderRole && <span>Balance proveedor: {formatMoney(user.providerBalance ?? 0)}</span>}
                        <span>Registro: {formatDate(user.createdAt)}</span>
                      </div>

                      <div className={`${styles.ownerControlsGrid} ${styles.ownerControlsGridCompact}`}>
                        <div className={`${styles.ownerControlCard} ${styles.ownerControlCardCompact}`}>
                          <h4>Permisos</h4>
                          <div className={`${styles.ownerEditGrid} ${styles.ownerEditGridCompact}`}>
                            <label className={styles.providerField}>
                              <span>Rol</span>
                              <select
                                value={isLockedOwnerRole ? '__owner_locked__' : ownerRoleDraft[user.id] ?? user.role}
                                disabled={isLockedOwnerRole}
                                onChange={event =>
                                  setOwnerRoleDraft(previous => ({
                                    ...previous,
                                    [user.id]: event.target.value,
                                  }))
                                }
                              >
                                {isLockedOwnerRole ? (
                                  <option value='__owner_locked__'>Owner (bloqueado)</option>
                                ) : (
                                  assignableOwnerRoles.map(roleValue => (
                                    <option key={`${user.id}-role-${roleValue}`} value={roleValue}>
                                      {formatOwnerRole(roleValue)}
                                    </option>
                                  ))
                                )}
                              </select>
                            </label>

                            {isProviderRole && (
                              <label className={styles.providerField}>
                                <span>Limite tarjetas</span>
                                <input
                                  type='number'
                                  min={0}
                                  value={ownerProviderLimitDraft[user.id] ?? ''}
                                  onChange={event =>
                                    setOwnerProviderLimitDraft(previous => ({
                                      ...previous,
                                      [user.id]: event.target.value,
                                    }))
                                  }
                                  placeholder='0'
                                />
                              </label>
                            )}
                          </div>
                          <div className={`${styles.ownerActionRow} ${styles.ownerActionRowCompact}`}>
                            <button
                              type='button'
                              onClick={() => {
                                const actionLabel = user.approved ? 'quitar aprobacion' : 'aprobar'
                                showOwnerConfirm(
                                  `¿Seguro que quieres ${actionLabel} a ${user.username}?`,
                                  () => {
                                    void handleOwnerToggleApprove(user)
                                  }
                                )
                              }}
                              disabled={Boolean(ownerSaving[user.id])}
                            >
                              {user.approved ? 'Revocar aprobacion' : 'Aprobar usuario'}
                            </button>
                            <button
                              type='button'
                              onClick={() => {
                                showOwnerConfirm(`¿Guardar rol para ${user.username}?`, () => {
                                  void handleOwnerSaveRole(user)
                                })
                              }}
                              disabled={Boolean(ownerSaving[user.id]) || isLockedOwnerRole}
                            >
                              Guardar rol
                            </button>
                            {isProviderRole && (
                              <button
                                type='button'
                                onClick={() => {
                                  showOwnerConfirm(`¿Guardar límite para ${user.username}?`, () => {
                                    void handleOwnerSaveProviderLimit(providerItem)
                                  })
                                }}
                                disabled={Boolean(ownerSaving[user.id])}
                              >
                                Guardar limite
                              </button>
                            )}
                          </div>
                        </div>

                        <div className={`${styles.ownerControlCard} ${styles.ownerControlCardCompact}`}>
                          <h4>Saldos</h4>
                          <div className={`${styles.ownerEditGrid} ${styles.ownerEditGridCompact}`}>
                            <label className={styles.providerField}>
                              <span>Ajuste saldo (S/)</span>
                              <input
                                type='number'
                                step='0.01'
                                value={ownerBalanceDraft[user.id] ?? ''}
                                onChange={event =>
                                  setOwnerBalanceDraft(previous => ({
                                    ...previous,
                                    [user.id]: event.target.value,
                                  }))
                                }
                                placeholder='Ej: 15 o -5'
                              />
                            </label>

                            {isProviderRole && ownerProviderBalanceColumn && (
                              <label className={styles.providerField}>
                                <span>Ajuste saldo proveedor (S/)</span>
                                <input
                                  type='number'
                                  step='0.01'
                                  value={ownerProviderBalanceDraft[user.id] ?? ''}
                                  onChange={event =>
                                    setOwnerProviderBalanceDraft(previous => ({
                                      ...previous,
                                      [user.id]: event.target.value,
                                    }))
                                  }
                                  placeholder='Ej: 20 o -10'
                                />
                              </label>
                            )}
                          </div>
                          <div className={`${styles.ownerActionRow} ${styles.ownerActionRowCompact}`}>
                            <button
                              type='button'
                              onClick={() => {
                                showOwnerConfirm(`¿Aplicar ajuste de saldo para ${user.username}?`, () => {
                                  void handleOwnerApplyBalance(user)
                                })
                              }}
                              disabled={Boolean(ownerSaving[user.id])}
                            >
                              Aplicar saldo
                            </button>
                            {isProviderRole && ownerProviderBalanceColumn && (
                              <button
                                type='button'
                                onClick={() => {
                                  showOwnerConfirm(
                                    `¿Aplicar saldo proveedor para ${user.username}?`,
                                    () => {
                                      void handleOwnerApplyProviderBalance(user)
                                    }
                                  )
                                }}
                                disabled={Boolean(ownerSaving[user.id])}
                              >
                                Aplicar saldo proveedor
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
                  </div>
                </>
              )}

              {ownerActiveTab === 'proveedores' && (
                <>
                  <div className={styles.ownerToolbar}>
                    <input
                      type='search'
                      value={ownerSearch}
                      onChange={event => setOwnerSearch(event.target.value)}
                      placeholder='Buscar proveedor por username o ID...'
                    />
                    <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                      {isOwnerLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>

                  <p className={styles.ownerResultText}>
                    Proveedores visibles: <strong>{filteredOwnerProviders.length}</strong>
                  </p>

                  {filteredOwnerProviders.length === 0 ? (
                    <p className={styles.panelEmpty}>No hay proveedores con actividad para mostrar.</p>
                  ) : (
                    <div className={styles.providerProductList}>
                      {filteredOwnerProviders.map(provider => (
                        <article key={`owner-provider-${provider.id}`} className={styles.providerProductCard}>
                          <div className={styles.providerProductHead}>
                            <div>
                              <strong>{provider.username}</strong>
                              <p>{provider.id}</p>
                            </div>
                            <span className={provider.approved ? styles.ownerStateOk : styles.ownerStatePending}>
                              {provider.approved ? 'Aprobado' : 'Pendiente'}
                            </span>
                          </div>
                          <div className={styles.providerProductMeta}>
                            <span>Rol: {formatOwnerRole(provider.role)}</span>
                            <span>Productos creados: {provider.productsCreated}</span>
                            <span>Limite: {provider.productLimit ?? '-'}</span>
                            <span>Tickets abiertos: {provider.openTickets}</span>
                            <span>Saldo proveedor: {formatMoney(provider.providerBalance)}</span>
                            <span>Ventas: {formatMoney(provider.salesAmount)}</span>
                          </div>
                          <div className={styles.ownerInlineActions}>
                            <label className={styles.providerField}>
                              <span>Nuevo limite</span>
                              <input
                                type='number'
                                min={0}
                                value={ownerProviderLimitDraft[provider.id] ?? ''}
                                onChange={event =>
                                  setOwnerProviderLimitDraft(previous => ({
                                    ...previous,
                                    [provider.id]: event.target.value,
                                  }))
                                }
                                placeholder='0'
                              />
                            </label>
                            <button
                              type='button'
                              onClick={() => {
                                showOwnerConfirm(`¿Actualizar límite de ${provider.username}?`, () => {
                                  void handleOwnerSaveProviderLimit(provider)
                                })
                              }}
                              disabled={Boolean(ownerSaving[provider.id])}
                            >
                              Guardar limite
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <section className={`${styles.providerBlock} ${styles.ownerLogoManagerCompact}`}>
                    <div className={styles.providerBlockHead}>
                      <h3>Carrusel de logos en Productos</h3>
                      <span>{ownerProductNameFilters.length}</span>
                    </div>

                    <p className={styles.ownerResultText}>
                      Crea logos por palabra clave. Ejemplo: keyword <strong>netflix</strong> mostrara productos con
                      ese nombre.
                    </p>

                    <div className={styles.ownerLogoCreateGrid}>
                      <label className={styles.providerField}>
                        <span>Nombre visible</span>
                        <input
                          type='text'
                          value={ownerNewFilterName}
                          onChange={event => setOwnerNewFilterName(event.target.value)}
                          placeholder='Netflix'
                        />
                      </label>
                      <label className={styles.providerField}>
                        <span>Keyword de coincidencia</span>
                        <input
                          type='text'
                          value={ownerNewFilterKeyword}
                          onChange={event => setOwnerNewFilterKeyword(event.target.value)}
                          placeholder='netflix'
                        />
                      </label>
                      <label className={styles.providerField}>
                        <span>Logo subido</span>
                        <div className={styles.providerImageActions}>
                          <button
                            type='button'
                            className={styles.providerGhostButton}
                            disabled={Boolean(ownerSaving['owner-name-filter-upload-create'])}
                            onClick={() => ownerNewFilterImageInputRef.current?.click()}
                          >
                            {ownerSaving['owner-name-filter-upload-create'] ? 'Subiendo...' : 'Subir desde archivos'}
                          </button>
                          {ownerNewFilterImageUrl.trim() && (
                            <button
                              type='button'
                              className={styles.providerGhostButton}
                              onClick={() => setOwnerNewFilterImageUrl('')}
                              disabled={Boolean(ownerSaving['owner-name-filter-upload-create'])}
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                        <input
                          ref={ownerNewFilterImageInputRef}
                          className={styles.providerHiddenInput}
                          type='file'
                          accept='image/png,image/jpeg,image/webp,image/avif'
                          onChange={handleOwnerNewFilterImageFileChange}
                        />
                        <input
                          type='text'
                          value={ownerNewFilterImageUrl}
                          readOnly
                          placeholder='Sube un archivo para generar la URL'
                        />
                      </label>
                      <label className={styles.providerField}>
                        <span>Orden</span>
                        <input
                          type='number'
                          min={0}
                          value={ownerNewFilterSortOrder}
                          onChange={event => setOwnerNewFilterSortOrder(event.target.value)}
                          placeholder='0'
                        />
                      </label>
                    </div>

                    <div className={styles.ownerActionRow}>
                      <button
                        type='button'
                        onClick={() => void handleOwnerCreateProductNameFilter()}
                        disabled={Boolean(ownerSaving['owner-name-filter-create'])}
                      >
                        {ownerSaving['owner-name-filter-create'] ? 'Guardando...' : 'Agregar logo filtro'}
                      </button>
                      <button
                        type='button'
                        onClick={() => void loadOwnerProductNameFilters()}
                        disabled={isOwnerProductNameFiltersLoading}
                      >
                        {isOwnerProductNameFiltersLoading ? 'Actualizando...' : 'Actualizar logos'}
                      </button>
                    </div>

                    {isOwnerProductNameFiltersLoading ? (
                      <p className={styles.panelEmpty}>Cargando logos filtro...</p>
                    ) : ownerProductNameFilters.length === 0 ? (
                      <p className={styles.panelEmpty}>Aun no tienes logos filtro creados.</p>
                    ) : (
                      <div className={styles.ownerLogoFilterList}>
                        {ownerProductNameFilters.map(item => {
                          const draft = ownerProductNameFilterDrafts[item.id] ?? {
                            name: item.name,
                            keyword: item.keyword,
                            imageUrl: item.imageUrl,
                            sortOrder: String(item.sortOrder),
                          }
                          return (
                            <article key={`owner-logo-filter-${item.id}`} className={styles.ownerLogoFilterCard}>
                              <div className={styles.ownerLogoFilterPreview}>
                                <Image
                                  src={draft.imageUrl || '/logo.png'}
                                  alt={draft.name || item.name}
                                  width={58}
                                  height={58}
                                  className={styles.ownerLogoFilterImage}
                                  unoptimized={draft.imageUrl.startsWith('/')}
                                />
                                <span className={item.active ? styles.ownerStateOk : styles.ownerStatePending}>
                                  {item.active ? 'Activo' : 'Oculto'}
                                </span>
                              </div>

                              <div className={styles.ownerLogoFilterFields}>
                                <label className={styles.providerField}>
                                  <span>Nombre</span>
                                  <input
                                    type='text'
                                    value={draft.name}
                                    onChange={event =>
                                      setOwnerProductNameFilterDrafts(previous => ({
                                        ...previous,
                                        [item.id]: {
                                          ...draft,
                                          name: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </label>
                                <label className={styles.providerField}>
                                  <span>Keyword</span>
                                  <input
                                    type='text'
                                    value={draft.keyword}
                                    onChange={event =>
                                      setOwnerProductNameFilterDrafts(previous => ({
                                        ...previous,
                                        [item.id]: {
                                          ...draft,
                                          keyword: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </label>
                                <label className={styles.providerField}>
                                  <span>Logo</span>
                                  <div className={styles.providerImageActions}>
                                    <button
                                      type='button'
                                      className={styles.providerGhostButton}
                                      onClick={() => {
                                        setOwnerEditingFilterImageId(item.id)
                                        ownerEditFilterImageInputRef.current?.click()
                                      }}
                                      disabled={Boolean(ownerSaving[`owner-name-filter-upload-${item.id}`])}
                                    >
                                      {ownerSaving[`owner-name-filter-upload-${item.id}`]
                                        ? 'Subiendo...'
                                        : 'Reemplazar archivo'}
                                    </button>
                                    {draft.imageUrl.trim() && (
                                      <button
                                        type='button'
                                        className={styles.providerGhostButton}
                                        onClick={() =>
                                          setOwnerProductNameFilterDrafts(previous => ({
                                            ...previous,
                                            [item.id]: {
                                              ...draft,
                                              imageUrl: '',
                                            },
                                          }))
                                        }
                                        disabled={Boolean(ownerSaving[`owner-name-filter-upload-${item.id}`])}
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type='text'
                                    value={draft.imageUrl}
                                    readOnly
                                    placeholder='Sube un archivo para generar la URL'
                                  />
                                </label>
                                <label className={styles.providerField}>
                                  <span>Orden</span>
                                  <input
                                    type='number'
                                    min={0}
                                    value={draft.sortOrder}
                                    onChange={event =>
                                      setOwnerProductNameFilterDrafts(previous => ({
                                        ...previous,
                                        [item.id]: {
                                          ...draft,
                                          sortOrder: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </label>
                              </div>

                              <div className={styles.ownerActionRow}>
                                <button
                                  type='button'
                                  onClick={() => void handleOwnerSaveProductNameFilter(item)}
                                  disabled={Boolean(ownerSaving[`owner-name-filter-save-${item.id}`])}
                                >
                                  {ownerSaving[`owner-name-filter-save-${item.id}`] ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  type='button'
                                  onClick={() => void handleOwnerToggleProductNameFilterActive(item)}
                                  disabled={Boolean(ownerSaving[`owner-name-filter-toggle-${item.id}`])}
                                >
                                  {ownerSaving[`owner-name-filter-toggle-${item.id}`]
                                    ? 'Procesando...'
                                    : item.active
                                      ? 'Ocultar'
                                      : 'Mostrar'}
                                </button>
                                <button
                                  type='button'
                                  onClick={() =>
                                    showOwnerConfirm(
                                      `¿Eliminar el logo filtro "${item.name}"?`,
                                      () => {
                                        void handleOwnerDeleteProductNameFilter(item)
                                      },
                                      'Eliminar'
                                    )
                                  }
                                  disabled={Boolean(ownerSaving[`owner-name-filter-delete-${item.id}`])}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    )}
                  </section>
                  <input
                    ref={ownerEditFilterImageInputRef}
                    className={styles.providerHiddenInput}
                    type='file'
                    accept='image/png,image/jpeg,image/webp,image/avif'
                    onChange={handleOwnerEditFilterImageFileChange}
                  />
                </>
              )}

              {ownerActiveTab === 'productos' && (
                <>
                  <div className={styles.ownerFiltersRow}>
                    <div className={styles.providerSelectorWrap}>
                      <span className={styles.providerSelectorBadge}>Proveedor</span>
                      <select
                        className={styles.providerSelectorSpecial}
                        value={ownerProductProviderFilter}
                        onChange={event => setOwnerProductProviderFilter(event.target.value)}
                      >
                        <option value='all'>Todos los proveedores</option>
                        {ownerProviderOptions.map(option => (
                          <option key={`owner-provider-option-${option.id}`} value={option.id}>
                            {option.username}
                          </option>
                        ))}
                      </select>
                    </div>
                    <select value={ownerProductTypeFilter} onChange={event => setOwnerProductTypeFilter(event.target.value)}>
                      <option value='all'>Todos los tipos</option>
                      <option value='profiles'>Perfiles</option>
                      <option value='full_account'>Cuenta completa</option>
                    </select>
                    <select
                      value={ownerProductDeliveryFilter}
                      onChange={event => setOwnerProductDeliveryFilter(event.target.value)}
                    >
                      <option value='all'>Todas las entregas</option>
                      <option value='instant'>Inmediata</option>
                      <option value='on_demand'>A pedido</option>
                      <option value='a_pedido'>A pedido</option>
                    </select>
                    <select value={ownerProductStateFilter} onChange={event => setOwnerProductStateFilter(event.target.value)}>
                      <option value='all'>Todos los estados</option>
                      <option value='active'>Activo</option>
                      <option value='paused'>Pausado</option>
                      <option value='agotado'>Agotado</option>
                    </select>
                    <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                      {isOwnerLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>

                  <p className={styles.ownerResultText}>
                    Productos visibles: <strong>{filteredOwnerProducts.length}</strong>
                  </p>

                  {filteredOwnerProducts.length === 0 ? (
                    <p className={styles.panelEmpty}>No hay productos con los filtros actuales.</p>
                  ) : (
                    <div className={styles.providerProductList}>
                      {filteredOwnerProducts.map(product => {
                        const productStatus = product.active ? (product.stock > 0 ? 'Activo' : 'Agotado') : 'Pausado'
                        return (
                          <article key={`owner-product-${product.id}`} className={styles.providerProductCard}>
                            <div className={styles.providerProductHead}>
                              <div>
                                <strong>{product.name}</strong>
                                <p>
                                  {product.providerName} | #{product.id}
                                </p>
                              </div>
                              <span
                                className={
                                  productStatus === 'Activo'
                                    ? styles.ownerStateOk
                                    : productStatus === 'Pausado'
                                      ? styles.ownerStatePending
                                      : styles.providerStateInactive
                                }
                              >
                                {productStatus}
                              </span>
                            </div>

                            <div className={styles.providerProductMeta}>
                              <span>Descripcion: {product.description || '-'}</span>
                              <span>Tipo: {formatAccountType(product.accountType)}</span>
                              <span>Entrega: {formatDeliveryMode(product.deliveryMode)}</span>
                              <span>Duracion: {formatDurationDays(product.durationDays)}</span>
                              <span>Stock: {product.stock}</span>
                              <span>Renovable: {product.renewable ? 'Si' : 'No'}</span>
                              <span>Precio publico: {formatMoney(product.priceGuest)}</span>
                              <span>Precio afiliado: {formatMoney(product.priceAffiliate)}</span>
                              <span>Creado: {formatDate(product.createdAt)}</span>
                            </div>

                            <div className={styles.ownerActionRow}>
                              <button
                                type='button'
                                onClick={() => {
                                  showOwnerConfirm(`¿Cambiar estado de ${product.name}?`, () => {
                                    void handleOwnerToggleProductActive(product)
                                  })
                                }}
                                disabled={Boolean(ownerSaving[`product-${product.id}`])}
                              >
                                {product.active ? 'Pausar producto' : 'Activar producto'}
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {ownerActiveTab === 'recargas' && (
                <>
                  <section className={styles.providerBlock}>
                    <div className={styles.providerBlockHead}>
                      <h3>Recarga manual de saldo</h3>
                    </div>
                    <div className={styles.providerFormGrid}>
                      <label className={styles.providerField}>
                        <span>Username exacto</span>
                        <input
                          type='text'
                          value={ownerTopupUsername}
                          onChange={event => setOwnerTopupUsername(event.target.value)}
                          placeholder='usuario'
                        />
                      </label>
                      <label className={styles.providerField}>
                        <span>Monto (S/)</span>
                        <input
                          type='number'
                          step='0.01'
                          value={ownerTopupAmount}
                          onChange={event => setOwnerTopupAmount(event.target.value)}
                          placeholder='0.00'
                        />
                      </label>
                    </div>
                    <div className={styles.providerActionRow}>
                      <button
                        type='button'
                        onClick={() => {
                          showOwnerConfirm('¿Confirmar recarga manual de saldo?', () => {
                            void handleOwnerManualTopup()
                          }, 'Recargar')
                        }}
                        disabled={isOwnerTopupSaving}
                      >
                        {isOwnerTopupSaving ? 'Procesando...' : 'Agregar saldo'}
                      </button>
                    </div>
                  </section>

                  <div className={styles.ownerToolbar}>
                    <input
                      type='search'
                      value={ownerSearch}
                      onChange={event => setOwnerSearch(event.target.value)}
                      placeholder='Buscar recarga manual por usuario, metodo o ID...'
                    />
                    <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                      {isOwnerLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>

                  <p className={styles.ownerResultText}>
                    Recargas manuales registradas: <strong>{filteredOwnerRecharges.length}</strong>
                  </p>

                  {filteredOwnerRecharges.length === 0 ? (
                    <p className={styles.panelEmpty}>
                      Sin recargas manuales en historial. Flujo activo: QR + comprobante por WhatsApp + recarga manual owner.
                    </p>
                  ) : (
                    <div className={styles.providerTicketList}>
                      {filteredOwnerRecharges.map(request => (
                        <article key={`owner-recharge-${request.id}`} className={styles.providerTicketCard}>
                          <div className={styles.providerTicketHead}>
                            <div>
                              <strong>{request.username}</strong>
                              <p>
                                {request.method} | {formatDate(request.createdAt)}
                              </p>
                            </div>
                            <span>Manual</span>
                          </div>
                          <div className={styles.providerProductMeta}>
                            <span>ID: {request.id}</span>
                            <span>Monto: {formatMoney(request.amount)}</span>
                            <span>Origen: {request.sourceTable}</span>
                            <span>Nota: {request.note || '-'}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}

              {ownerActiveTab === 'pedidos' && (
                <>
                  <div className={styles.ownerFiltersRow}>
                    <input
                      type='search'
                      value={ownerSearch}
                      onChange={event => setOwnerSearch(event.target.value)}
                      placeholder='Buscar pedido por comprador, proveedor o producto...'
                    />
                    <select value={ownerOrderStatusFilter} onChange={event => setOwnerOrderStatusFilter(event.target.value)}>
                      <option value='all'>Todos los estados</option>
                      {OWNER_ORDER_STATUS_OPTIONS.map(status => (
                        <option key={`owner-order-filter-${status}`} value={status}>
                          {formatOrderStatus(status)}
                        </option>
                      ))}
                    </select>
                    <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                      {isOwnerLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>

                  <p className={styles.ownerResultText}>
                    Pedidos visibles: <strong>{filteredOwnerOrders.length}</strong>
                  </p>

                  {filteredOwnerOrders.length === 0 ? (
                    <p className={styles.panelEmpty}>No hay pedidos para los filtros actuales.</p>
                  ) : (
                    <div className={styles.providerTicketList}>
                      {filteredOwnerOrders.map(order => (
                        <article key={`owner-order-${order.id}`} className={styles.providerTicketCard}>
                          <div className={styles.providerTicketHead}>
                            <div>
                              <strong>Pedido #{order.id}</strong>
                              <p>
                                {order.buyerName} {'->'} {order.providerName}
                              </p>
                            </div>
                            <span>{formatOrderStatus(order.status)}</span>
                          </div>
                          <div className={styles.providerProductMeta}>
                            <span>Producto: {order.productName}</span>
                            <span>Tipo: {formatAccountType(order.accountType)}</span>
                            <span>Entrega: {formatDeliveryMode(order.deliveryMode)}</span>
                            <span>Duracion: {formatDurationDays(order.durationDays)}</span>
                            <span>Dias restantes: {formatDaysLeft(order.daysLeft)}</span>
                            <span>Monto: {formatMoney(order.amount)}</span>
                            <span>Fecha: {formatDate(order.createdAt)}</span>
                            <span>Inicio: {formatDate(order.startsAt)}</span>
                            <span>Vence: {formatDate(order.expiresAt)}</span>
                          </div>
                          <div className={styles.ownerInlineActions}>
                            <label className={styles.providerField}>
                              <span>Estado</span>
                              <select
                                value={ownerOrderStatusDraft[String(order.id)] ?? order.status}
                                onChange={event =>
                                  setOwnerOrderStatusDraft(previous => ({
                                    ...previous,
                                    [String(order.id)]: event.target.value,
                                  }))
                                }
                              >
                                {OWNER_ORDER_STATUS_OPTIONS.map(status => (
                                  <option key={`owner-order-${order.id}-${status}`} value={status}>
                                    {formatOrderStatus(status)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type='button'
                              onClick={() => {
                                showOwnerConfirm(`¿Guardar estado para pedido #${order.id}?`, () => {
                                  void handleOwnerSaveOrderStatus(order)
                                })
                              }}
                              disabled={Boolean(ownerSaving[`order-${order.id}`])}
                            >
                              Guardar estado
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}

              {ownerActiveTab === 'tickets' && (
                <>
                  <div className={styles.ownerFiltersRow}>
                    <input
                      type='search'
                      value={ownerSearch}
                      onChange={event => setOwnerSearch(event.target.value)}
                      placeholder='Buscar ticket por asunto, cliente o proveedor...'
                    />
                    <select value={ownerTicketStatusFilter} onChange={event => setOwnerTicketStatusFilter(event.target.value)}>
                      <option value='all'>Todos los estados</option>
                      {OWNER_TICKET_STATUS_OPTIONS.map(status => (
                        <option key={`owner-ticket-filter-${status}`} value={status}>
                          {formatOrderStatus(status)}
                        </option>
                      ))}
                    </select>
                    <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                      {isOwnerLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>

                  <p className={styles.ownerResultText}>
                    Tickets visibles: <strong>{filteredOwnerTickets.length}</strong>
                  </p>

                  {filteredOwnerTickets.length === 0 ? (
                    <p className={styles.panelEmpty}>No hay tickets para los filtros actuales.</p>
                  ) : (
                    <div className={styles.providerTicketList}>
                      {filteredOwnerTickets.map(ticket => (
                        <article key={`owner-ticket-${ticket.id}`} className={styles.providerTicketCard}>
                          <div className={styles.providerTicketHead}>
                            <div>
                              <strong>{ticket.subject}</strong>
                              <p>
                                {ticket.buyerName} {'->'} {ticket.providerName}
                              </p>
                            </div>
                            <span>{formatOrderStatus(ticket.status)}</span>
                          </div>
                          <div className={styles.providerProductMeta}>
                            <span>Tipo: {ticket.type}</span>
                            <span>Producto: {ticket.productName}</span>
                            <span>Creado: {formatDate(ticket.createdAt)}</span>
                            <span>Actualizado: {formatDate(ticket.updatedAt)}</span>
                          </div>
                          <div className={styles.ownerInlineActions}>
                            <label className={styles.providerField}>
                              <span>Estado</span>
                              <select
                                value={ownerTicketStatusDraft[String(ticket.id)] ?? ticket.status}
                                onChange={event =>
                                  setOwnerTicketStatusDraft(previous => ({
                                    ...previous,
                                    [String(ticket.id)]: event.target.value,
                                  }))
                                }
                              >
                                {OWNER_TICKET_STATUS_OPTIONS.map(status => (
                                  <option key={`owner-ticket-${ticket.id}-${status}`} value={status}>
                                    {formatOrderStatus(status)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type='button'
                              onClick={() => {
                                showOwnerConfirm(`¿Guardar estado para ticket #${ticket.id}?`, () => {
                                  void handleOwnerSaveTicketStatus(ticket)
                                })
                              }}
                              disabled={Boolean(ownerSaving[`ticket-${ticket.id}`])}
                            >
                              Guardar estado
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}

              {ownerActiveTab === 'afiliacion' && (
                <>
                  <div className={styles.ownerToolbar}>
                    <input
                      type='search'
                      value={ownerReferralSearch}
                      onChange={event => setOwnerReferralSearch(event.target.value)}
                      placeholder='Buscar por afiliador o afiliado...'
                    />
                    <button type='button' onClick={() => void loadOwnerDashboardData()} disabled={isOwnerLoading}>
                      {isOwnerLoading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                  </div>

                  <section className={styles.providerBlock}>
                    <div className={styles.providerBlockHead}>
                      <h3>Resumen por afiliador</h3>
                      <span>{ownerReferralSummary.length}</span>
                    </div>

                    {ownerReferralSummary.length === 0 ? (
                      <p className={styles.panelEmpty}>No hay vinculaciones registradas.</p>
                    ) : (
                      <div className={styles.providerProductList}>
                        {ownerReferralSummary
                          .filter(item => {
                            const term = ownerReferralSearch.trim().toLowerCase()
                            if (!term) return true
                            return (
                              item.referrerUsername.toLowerCase().includes(term) ||
                              item.referrerId.toLowerCase().includes(term)
                            )
                          })
                          .map(item => (
                            <article key={`owner-referrer-${item.referrerId}`} className={styles.providerProductCard}>
                              <div className={styles.providerProductHead}>
                                <div>
                                  <strong>{item.referrerUsername}</strong>
                                </div>
                                <span className={styles.ownerStateOk}>{item.total} afiliados</span>
                              </div>
                              <div className={styles.providerProductMeta}>
                                <span>Afiliados: {item.total}</span>
                                <span>Ventas de red: {formatMoney(item.sales)}</span>
                                <span>Ultimo enlace: {formatDate(item.lastLinkedAt)}</span>
                              </div>
                            </article>
                          ))}
                      </div>
                    )}
                  </section>

                  <section className={styles.providerBlock}>
                    <div className={styles.providerBlockHead}>
                      <h3>Enlaces afiliador - afiliado</h3>
                      <span>{filteredOwnerReferrals.length}</span>
                    </div>

                    {filteredOwnerReferrals.length === 0 ? (
                      <p className={styles.panelEmpty}>No hay coincidencias para la busqueda actual.</p>
                    ) : (
                      <div className={styles.providerTicketList}>
                        {filteredOwnerReferrals.map(item => (
                          <article key={`${item.referrerId}-${item.referredId}`} className={styles.providerTicketCard}>
                            <div className={styles.providerTicketHead}>
                              <div>
                                <strong>
                                  {item.referrerUsername} {'->'} {item.referredUsername}
                                </strong>
                              </div>
                              <span>{formatDate(item.linkedAt)}</span>
                            </div>
                            <div className={styles.providerProductMeta}>
                              <span>Ventas del afiliado: {formatMoney(item.referredSales)}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {ownerDialogOpen && (
                <div className={styles.ownerModalBackdrop} role='dialog' aria-modal='true'>
                  <article
                    className={`${styles.ownerModalCard} ${
                      ownerDialogType === 'error'
                        ? styles.ownerModalError
                        : ownerDialogType === 'confirm'
                          ? styles.ownerModalConfirm
                          : styles.ownerModalOk
                    }`}
                  >
                    <div className={styles.ownerModalGlow} />
                    <p className={styles.ownerModalBadge}>
                      {ownerDialogType === 'error'
                        ? '🚨 Mensaje de sistema'
                        : ownerDialogType === 'confirm'
                          ? '🧪 Confirmación requerida'
                          : '✨ Todo correcto'}
                    </p>
                    <h4>{ownerDialogTitle}</h4>
                    <p>{ownerDialogMessage}</p>
                    <div className={styles.ownerModalActions}>
                      {ownerDialogAction && (
                        <button
                          type='button'
                          className={styles.ownerModalCancel}
                          onClick={closeOwnerDialog}
                        >
                          {ownerDialogCancelLabel}
                        </button>
                      )}
                      <button
                        type='button'
                        className={styles.ownerModalConfirmButton}
                        onClick={handleOwnerDialogPrimary}
                      >
                        {ownerDialogConfirmLabel}
                      </button>
                    </div>
                  </article>
                </div>
              )}
            </>
          )}
        </section>
      )
    }

    if (currentSectionId === 'administrador') {
      return (
        <>
          <h2 className={styles.adminComingTitleFloat}>PROXIMAMENTE...</h2>
        </>
      )
    }

    if (currentSectionId === 'codigo-soporte') {
      return (
        <>
          <p className={styles.panelEmpty}>
            Usa este codigo cuando soporte te pida validar tu cuenta o compra.
          </p>
          <article className={styles.supportCodeCard}>
            <span className={styles.supportCodeLabel}>Códigos auto</span>
            <strong className={styles.supportCodeValue}>
              {supportCodeRaw ? (showSupportCode ? supportCodeRaw : supportCodeMasked) : 'No disponible'}
            </strong>
            {supportCodeRaw ? (
              <button
                type='button'
                className={styles.inlineGhostButton}
                onClick={() => setShowSupportCode(previous => !previous)}
              >
                {showSupportCode ? 'Ocultar codigo' : 'Mostrar codigo'}
              </button>
            ) : null}
          </article>

          <a href={SUPPORT_URL} target='_blank' rel='noopener noreferrer' className={styles.actionButton}>
            Contactar soporte
          </a>
        </>
      )
    }

    if (currentSectionId === 'comunidad') {
      return (
        <section className={styles.communitySection} aria-label='Canales de soporte y comunidad'>
          <header className={styles.communityHeader}>
            <h3>
              Se parte de <span>nuestra</span> Comunidad
            </h3>
          </header>

          <div className={styles.communityRows}>
            <article className={styles.communityRow}>
              <div className={styles.communityChannel}>
                <div className={styles.communityLogoWrap}>
                  <Image
                    src='/whatsapp.png'
                    alt='Canal de WhatsApp'
                    width={64}
                    height={64}
                    className={styles.communityLogo}
                  />
                </div>
                <div className={styles.communityChannelText}>
                  <h4>Canal de WhatsApp</h4>
                  <p>Vendedores</p>
                </div>
              </div>

              <div className={styles.communityMeta}>
                <span>Acceso</span>
                <strong>Solo logueados</strong>
              </div>
              <div className={styles.communityMeta}>
                <span>Contenido</span>
                <strong>Ofertas y anuncios</strong>
              </div>
              <div className={styles.communityMeta}>
                <span>Estado</span>
                <strong>Activo</strong>
              </div>

              {profile ? (
                <a href={COMMUNITY_URL} target='_blank' rel='noopener noreferrer' className={styles.communityActionGhost}>
                  Unirme
                </a>
              ) : (
                <span className={styles.communityActionDisabled} title='Debes iniciar sesion para entrar'>
                  Bloqueado
                </span>
              )}
            </article>

            <article className={styles.communityRow}>
              <div className={styles.communityChannel}>
                <div className={styles.communityLogoWrap}>
                  <Image
                    src='/whatsapsoporte.png'
                    alt='Soporte de WhatsApp'
                    width={64}
                    height={64}
                    className={styles.communityLogo}
                  />
                </div>
                <div className={styles.communityChannelText}>
                  <h4>Soporte de WhatsApp</h4>
                  <p>Clientes</p>
                </div>
              </div>

              <div className={styles.communityMeta}>
                <span>Acceso</span>
                <strong>Publico</strong>
              </div>
              <div className={styles.communityMeta}>
                <span>Atencion</span>
                <strong>Directa por chat</strong>
              </div>
              <div className={styles.communityMeta}>
                <span>Estado</span>
                <strong>Activo</strong>
              </div>

              <a href={SUPPORT_URL} target='_blank' rel='noopener noreferrer' className={styles.communityActionPrimary}>
                Contactar
              </a>
            </article>

            <article className={styles.communityRow}>
              <div className={styles.communityChannel}>
                <div className={styles.communityLogoWrap}>
                  <Image
                    src='/discord.png'
                    alt='Canal de Discord'
                    width={64}
                    height={64}
                    className={styles.communityLogo}
                  />
                </div>
                <div className={styles.communityChannelText}>
                  <h4>Canal de Discord</h4>
                  <p>Mixto</p>
                </div>
              </div>

              <div className={styles.communityMeta}>
                <span>Acceso</span>
                <strong>Cerrado</strong>
              </div>
              <div className={styles.communityMeta}>
                <span>Formato</span>
                <strong>Comunidad mixta</strong>
              </div>
              <div className={styles.communityMeta}>
                <span>Estado</span>
                <strong>Proximo</strong>
              </div>

              <span className={styles.communityActionDisabled}>Proximamente</span>
            </article>
          </div>
        </section>
      )
    }

    return (
      <>
        <p className={styles.panelEmpty}>{section.emptyState}</p>

        {section.external ? (
          <a
            href={section.ctaHref}
            target='_blank'
            rel='noopener noreferrer'
            className={styles.actionButton}
          >
            {section.ctaLabel}
          </a>
        ) : (
          <Link href={section.ctaHref} className={styles.actionButton}>
            {section.ctaLabel}
          </Link>
        )}
      </>
    )
  }

  const userOrderEditModalOrder = userOrderEditModal
    ? ownedProducts.find(order => order.id === userOrderEditModal.orderId) ?? null
    : null
  const userOrderEditSaving = userOrderEditModal ? Boolean(userOrderContactSaving[userOrderEditModal.orderId]) : false
  const userOrderEditFeedback = userOrderEditModal ? userOrderContactFeedback[userOrderEditModal.orderId] ?? null : null
  const userOrderEditHasChanges =
    userOrderEditModalOrder !== null &&
    userOrderEditModal !== null &&
    (userOrderEditModal.field === 'customerName'
      ? userOrderEditModal.value.trim() !== userOrderEditModalOrder.customerName.trim()
      : userOrderEditModal.value.trim() !== userOrderEditModalOrder.customerPhone.trim())
  const userSupportModalOrder = userSupportModal
    ? ownedProducts.find(order => order.id === userSupportModal.orderId) ?? null
    : null

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href='/inicio' className={styles.brand}>
          <Image src='/logo-mark.png' alt='CRYXTEAM' width={265} height={320} className={styles.brandLogo} />
          <span className={styles.brandText}>CRYXTEAM</span>
        </Link>

        <label className={styles.topSearch}>
          <input
            type='search'
            value={menuSearch}
            onChange={event => setMenuSearch(event.target.value)}
            placeholder='Buscar seccion...'
            aria-label='Buscar seccion del dashboard'
          />
        </label>

        <nav className={styles.topNav}>
          <Link href='/inicio' className={topLinkClass(pathname === '/inicio')}>
            Inicio
          </Link>
          <Link href='/productos' className={topLinkClass(pathname === '/productos')}>
            Productos
          </Link>
          <Link
            href={profile ? '/dashboard' : '/login'}
            className={topLinkClass(pathname === '/dashboard', true)}
          >
            {accountLabel}
          </Link>
        </nav>

        <button
          type='button'
          className={styles.mobileToggle}
          onClick={() => setMenuOpen(v => !v)}
          aria-label='Menu'
        >
          Menu
        </button>
      </header>

      {menuOpen && (
        <button
          type='button'
          className={styles.mobileOverlay}
          onClick={() => setMenuOpen(false)}
          aria-label='Cerrar menu'
        />
      )}

      <section className={styles.shell}>
        <aside
          className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''} ${
            isBlockingOverlayOpen ? styles.sidebarSuppressed : ''
          }`}
        >
          <p className={styles.sidebarKicker}>Panel de usuario</p>
          <h1 className={styles.sidebarTitle}>Dashboard</h1>

          <div className={styles.menuList}>
            {filteredMenuItems.length === 0 && <p className={styles.emptyMenu}>No hay coincidencias.</p>}
            {filteredMenuItems.map(item => (
              <button
                key={item.id}
                type='button'
                className={`${styles.menuItem} ${item.id === 'proveedor' ? styles.menuItemProvider : ''} ${
                  item.id === 'administrador-cuentas' ? styles.menuItemOwner : ''
                } ${currentSectionId === item.id ? styles.menuItemActive : ''} ${
                  item.id === 'proveedor' && currentSectionId === item.id ? styles.menuItemProviderActive : ''
                } ${item.id === 'administrador-cuentas' && currentSectionId === item.id ? styles.menuItemOwnerActive : ''}`}
                title={item.label}
                aria-label={item.label}
                onClick={() => {
                  handleMenuSectionClick(item.id)
                }}
              >
                <span className={styles.menuIconWrap}>
                  <DashboardMenuIcon id={item.id} />
                </span>
                {item.id === 'administrador-cuentas' ? (
                  <span className={styles.menuOwnerText}>
                    <span className={styles.menuLabel}>OWNER</span>
                    <span className={styles.menuOwnerHint}>Full access</span>
                  </span>
                ) : (
                  <span className={styles.menuLabel}>{item.label}</span>
                )}
              </button>
            ))}

            <button
              type='button'
              className={`${styles.menuItem} ${styles.mobileLogoutItem}`}
              onClick={handleSignOut}
              disabled={isSigningOut}
              title='Cerrar sesion'
              aria-label='Cerrar sesion'
            >
              <span className={styles.menuIconWrap}>
                <svg viewBox='0 0 24 24' aria-hidden='true'>
                  <path d='M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' />
                  <path d='M10 17l5-5-5-5' />
                  <path d='M15 12H4' />
                </svg>
              </span>
              <span className={styles.menuLabel}>
                {isSigningOut ? 'Saliendo...' : 'Cerrar sesion'}
              </span>
            </button>
          </div>

          <button
            type='button'
            className={styles.logoutButton}
            onClick={handleSignOut}
            disabled={isSigningOut}
            title='Cerrar sesion'
            aria-label='Cerrar sesion'
          >
            <span className={styles.menuIconWrap}>
              <svg viewBox='0 0 24 24' aria-hidden='true'>
                <path d='M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' />
                <path d='M10 17l5-5-5-5' />
                <path d='M15 12H4' />
              </svg>
            </span>
            <span className={styles.menuLabel}>
              {isSigningOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
            </span>
          </button>
        </aside>

        <section
          className={`${styles.main} ${currentSectionId === 'afiliacion' ? styles.mainAffiliation : ''}`}
        >
          {currentSectionId !== 'afiliacion' && currentSectionId !== 'administrador-cuentas' && (
            <div className={styles.breadcrumb}>
              <span>Dashboard</span>
              <span>/</span>
              <strong>{section.title}</strong>
            </div>
          )}

          {isLoading && <p className={styles.info}>Cargando datos...</p>}
          {msg && <p className={styles.error}>{msg}</p>}

          {profile && (
            <>
              <div
                className={`${styles.contentGrid} ${!isMyProductsSection ? styles.contentGridSingle : ''} ${
                  currentSectionId === 'afiliacion' ? styles.contentGridNoGap : ''
                }`}
              >
                <article
                  className={`${styles.panelCard} ${
                    currentSectionId === 'recargar' ||
                    currentSectionId === 'afiliacion' ||
                    currentSectionId === 'administrador' ||
                    currentSectionId === 'comunidad' ||
                    currentSectionId === 'administrador-cuentas'
                      ? styles.panelCardRecargar
                      : ''
                  }`}
                >
                  {currentSectionId !== 'recargar' &&
                    currentSectionId !== 'afiliacion' &&
                    currentSectionId !== 'administrador' &&
                    currentSectionId !== 'comunidad' &&
                    currentSectionId !== 'administrador-cuentas' && (
                    <>
                      <h2 className={styles.panelTitle}>{section.title}</h2>
                      {section.description ? <p className={styles.panelDescription}>{section.description}</p> : null}
                    </>
                  )}

                  {isMyProductsSection ? (
                    <>
                      <div className={styles.userStatsGrid}>
                        <article className={styles.userStatCard}>
                          <span className={styles.userStatIcon} aria-hidden='true'>
                            🛒
                          </span>
                          <div className={styles.userStatBody}>
                            <strong className={styles.userStatValue}>{userPurchasesCount}</strong>
                            <span className={styles.userStatLabel}>Total compras</span>
                          </div>
                        </article>

                        <article className={styles.userStatCard}>
                          <span className={styles.userStatIcon} aria-hidden='true'>
                            👥
                          </span>
                          <div className={styles.userStatBody}>
                            <strong className={styles.userStatValue}>{affiliateMembers.length}</strong>
                            <span className={styles.userStatLabel}>Total referidos</span>
                          </div>
                        </article>

                        <article className={styles.userStatCard}>
                          <span className={styles.userStatIcon} aria-hidden='true'>
                            💳
                          </span>
                          <div className={styles.userStatBody}>
                            <strong className={styles.userStatValue}>{formatMoney(profile.balance)}</strong>
                            <span className={styles.userStatLabel}>Saldo actual</span>
                          </div>
                        </article>
                      </div>

                      {isOrdersLoading && <p className={styles.panelEmpty}>Cargando compras y tickets...</p>}
                      {!isOrdersLoading && ordersMsg && <p className={styles.inlineError}>{ordersMsg}</p>}

                      {!isOrdersLoading && ownedProducts.length === 0 && (
                        <p className={styles.panelEmpty}>
                          Aun no tienes compras. Cuando compres, veras aqui credenciales y acceso rapido a soporte.
                        </p>
                      )}

                      <div className={styles.userProductsTableWrap}>
                        <table className={styles.userProductsTable}>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>ID</th>
                              <th>PRODUCTO</th>
                              <th>CORREO</th>
                              <th>CONTRASEÑA</th>
                              <th>N° PERFIL</th>
                              <th>PIN</th>
                              <th>CLIENTE</th>
                              <th>PROVEEDOR</th>
                              <th>CELULAR</th>
                              <th>INICIO</th>
                              <th>FIN</th>
                              <th>DÍAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ownedProducts.map((order, index) => {
                              const customerWhatsappLink = buildSendToCustomerLink(order)
                              const providerWhatsappLink = buildProviderHelpLink(order)
                              const expiryReminderLink = buildExpiryReminderLink(order)
                              const credentialsVisible = Boolean(visibleCredentials[order.id])
                              const credentialInfo = resolveOrderCredentialForMessage(order)
                              const usernameValue = credentialInfo.emailValue
                              const profileNumberValue = credentialInfo.profileValue
                              const pinValue = credentialInfo.pinValue
                              const passwordValue =
                                credentialInfo.passwordValue === '-'
                                  ? '-'
                                  : credentialsVisible
                                    ? credentialInfo.passwordValue
                                    : '••••••••'
                              const deliveredLabel = isPaidLikeOrderStatus(order.status)
                                ? 'Entregado'
                                : 'No entregado'
                              const startDateIso =
                                order.startsAt || order.paidAt || order.deliveredAt || order.createdAt || null
                              const computedEndDateIso =
                                order.expiresAt ||
                                (startDateIso && order.durationDays !== null && order.durationDays > 0
                                  ? new Date(
                                      new Date(startDateIso).getTime() + order.durationDays * 86400000
                                    ).toISOString()
                                  : null)
                              const computedDaysLeft = calculateDaysLeft(computedEndDateIso)
                              const startDateLabel = formatDateOnly(startDateIso)
                              const endDateLabel = formatDateOnly(computedEndDateIso)
                              const daysBubbleValue = computedDaysLeft === null ? '-' : String(computedDaysLeft)
                              const daysBubbleToneClass =
                                computedDaysLeft === null
                                  ? styles.userDaysBubbleMuted
                                  : computedDaysLeft <= 0
                                    ? styles.userDaysBubbleRed
                                    : computedDaysLeft <= 7
                                      ? styles.userDaysBubbleYellow
                                      : styles.userDaysBubbleGreen
                              const contactFeedback = userOrderContactFeedback[order.id]
                              const renewFeedback = userOrderRenewFeedback[order.id]
                              const isRenewingOrder = Boolean(userOrderRenewing[order.id])
                              const canRenewOrder =
                                order.productId !== null &&
                                order.providerId.trim().length > 0 &&
                                order.renewableLabel.trim().toLowerCase() === 'renovable'

                              return (
                                <tr key={order.id}>
                                  <td data-label='#'>{index + 1}</td>
                                  <td data-label='ID'>
                                    <button
                                      type='button'
                                      className={styles.userCellButton}
                                      onClick={() => void navigator.clipboard.writeText(order.id)}
                                      title='Copiar ID completo'
                                    >
                                      Copiar
                                    </button>
                                  </td>
                                  <td data-label='PRODUCTO'>
                                    <div className={styles.userProductCellMain}>
                                      <strong>{order.productName}</strong>
                                      <span>{deliveredLabel}</span>
                                      <button
                                        type='button'
                                        className={styles.userProductSupportButton}
                                        onClick={() => openUserSupportModal(order)}
                                      >
                                        Soporte
                                      </button>
                                    </div>
                                  </td>
                                  <td data-label='CORREO'>{usernameValue}</td>
                                  <td data-label='CONTRASEÑA'>
                                    <div className={styles.userPasswordCell}>
                                      <span>{passwordValue}</span>
                                      {credentialInfo.passwordValue !== '-' && (
                                        <button
                                          type='button'
                                          className={styles.userPasswordToggle}
                                          onClick={() => toggleCredentials(order.id)}
                                        >
                                          {credentialsVisible ? 'Ocultar' : 'Ver'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td data-label='N° PERFIL'>{profileNumberValue}</td>
                                  <td data-label='PIN'>{pinValue}</td>
                                  <td data-label='CLIENTE'>
                                    <div className={styles.userCellStack}>
                                      <div className={styles.userInlineValueWithEdit}>
                                        <span>{order.customerName || '-'}</span>
                                        <button
                                          type='button'
                                          className={styles.userEmojiEditButton}
                                          title='Editar cliente'
                                          aria-label='Editar cliente'
                                          onClick={() => openUserOrderEditModal(order, 'customerName')}
                                        >
                                          ✏️
                                        </button>
                                      </div>
                                      <div className={styles.userCellActionsRow}>
                                        {customerWhatsappLink ? (
                                          <a
                                            href={customerWhatsappLink}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className={styles.userIconLink}
                                            title='Enviar credenciales por WhatsApp'
                                            aria-label='Enviar credenciales por WhatsApp'
                                          >
                                            <Image src='/whatsapp.png' alt='WhatsApp' width={18} height={18} />
                                          </a>
                                        ) : (
                                          <span className={styles.userIconOff} title='Sin WhatsApp'>
                                            ∅
                                          </span>
                                        )}
                                      </div>
                                      {contactFeedback && (
                                        <span
                                          className={
                                            contactFeedback.type === 'ok' ? styles.userInlineOk : styles.userInlineError
                                          }
                                        >
                                          {contactFeedback.text}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td data-label='PROVEEDOR'>
                                    <div className={styles.userCellStack}>
                                      <span>{order.providerName}</span>
                                      {providerWhatsappLink ? (
                                        <a
                                          href={providerWhatsappLink}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                          className={styles.userIconLink}
                                          title='Contactar proveedor por WhatsApp'
                                          aria-label='Contactar proveedor por WhatsApp'
                                        >
                                          <Image src='/whatsapp.png' alt='WhatsApp' width={18} height={18} />
                                        </a>
                                      ) : (
                                        <span className={styles.userIconOff} title='Sin WhatsApp'>
                                          ∅
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td data-label='CELULAR'>
                                    <div className={styles.userInlineValueWithEdit}>
                                      <span>{order.customerPhone || '-'}</span>
                                      <button
                                        type='button'
                                        className={styles.userEmojiEditButton}
                                        title='Editar celular'
                                        aria-label='Editar celular'
                                        onClick={() => openUserOrderEditModal(order, 'customerPhone')}
                                      >
                                        ✏️
                                      </button>
                                    </div>
                                  </td>
                                  <td data-label='INICIO'>{startDateLabel}</td>
                                  <td data-label='FIN'>{endDateLabel}</td>
                                  <td data-label='DÍAS'>
                                    <div className={styles.userDaysCell}>
                                      {expiryReminderLink && computedDaysLeft !== null ? (
                                        <a
                                          href={expiryReminderLink}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                          className={`${styles.userDaysBubble} ${daysBubbleToneClass}`}
                                          title='Enviar aviso de vencimiento'
                                          aria-label='Enviar aviso de vencimiento'
                                        >
                                          {daysBubbleValue}
                                        </a>
                                      ) : (
                                        <span className={`${styles.userDaysBubble} ${daysBubbleToneClass}`}>
                                          {daysBubbleValue}
                                        </span>
                                      )}
                                      <button
                                        type='button'
                                        className={styles.userRenewButton}
                                        disabled={!canRenewOrder || isRenewingOrder}
                                        onClick={() => void handleUserRenewOrder(order)}
                                      >
                                        {isRenewingOrder ? 'Renovando...' : 'Renovar'}
                                      </button>
                                    </div>
                                    {renewFeedback && (
                                      <span
                                        className={
                                          renewFeedback.type === 'ok' ? styles.userInlineOk : styles.userInlineError
                                        }
                                      >
                                        {renewFeedback.text}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    renderSectionContent()
                  )}
                </article>

                {isMyProductsSection && (
                  <article className={styles.panelCard}>
                    <h2 className={styles.panelTitle}>Tickets</h2>
                    <p className={styles.panelDescription}>Aqui veras el estado de tus soportes y pedidos a pedido.</p>

                    {isOrdersLoading && <p className={styles.panelEmpty}>Cargando tickets...</p>}
                    {!isOrdersLoading && resolvedTickets.length === 0 && (
                      <p className={styles.panelEmpty}>No tienes tickets activos.</p>
                    )}

                    <div className={styles.ticketList}>
                      {resolvedTickets.map(ticket => {
                        const isResolved = isResolvedStatus(ticket.status)
                        const ticketFeedback = userTicketFeedback[ticket.id]
                        const isConfirming = Boolean(userTicketConfirming[ticket.id])

                        return (
                          <article
                            key={ticket.id}
                            className={`${styles.ticketCard} ${isResolved ? styles.ticketCardResolved : styles.ticketCardOpen}`}
                          >
                            <div className={styles.ticketHeader}>
                              <strong>{ticket.subject}</strong>
                              <span>{formatOrderStatus(ticket.status)}</span>
                            </div>

                            <p className={styles.ticketLine}>Producto: {ticket.productName}</p>
                            <p className={styles.ticketLine}>Compra vinculada: {ticket.orderId}</p>
                            <p className={styles.ticketLine}>Problema: {ticket.description}</p>
                            <p className={styles.ticketLine}>Resumen de solucion: {ticket.resolutionSummary}</p>
                            <p className={styles.ticketLine}>Detalle: {ticket.resolutionDetail}</p>
                            <p className={styles.ticketDates}>
                              Ultima actualizacion: {formatDate(ticket.updatedAt)} | Resuelto:{' '}
                              {formatDate(ticket.resolvedAt)}
                            </p>

                            {isResolved && (
                              <div className={styles.ticketActions}>
                                <button
                                  type='button'
                                  className={styles.ticketConfirmButton}
                                  onClick={() => void handleUserConfirmTicket(ticket)}
                                  disabled={isConfirming}
                                >
                                  {isConfirming ? 'Confirmando...' : 'Confirmar solucion'}
                                </button>
                              </div>
                            )}

                            {ticketFeedback && (
                              <p className={ticketFeedback.type === 'ok' ? styles.userInlineOk : styles.inlineError}>
                                {ticketFeedback.text}
                              </p>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  </article>
                )}
              </div>
            </>
          )}
        </section>
      </section>

      {userSupportModal && (
        <div className={styles.userSupportTicketBackdrop} role='dialog' aria-modal='true'>
          <article className={styles.userSupportTicketCard}>
            <button
              type='button'
              className={styles.userSupportTicketClose}
              onClick={closeUserSupportModal}
              aria-label='Cerrar'
            >
              X
            </button>

            <h4 className={styles.userSupportTicketTitle}>Enviar soporte al proveedor</h4>
            <p className={styles.userSupportTicketSubtitle}>
              {userSupportModalOrder ? `${userSupportModalOrder.productName} · Pedido #${userSupportModalOrder.id}` : ''}
            </p>

            <label className={styles.userSupportTicketField}>
              <span>Asunto</span>
              <input
                type='text'
                value={userSupportModal.subject}
                onChange={event => handleUserSupportModalChange('subject', event.target.value)}
                placeholder='Ej: No puedo ingresar a la cuenta'
              />
            </label>

            <label className={styles.userSupportTicketField}>
              <span>Detalle</span>
              <textarea
                value={userSupportModal.description}
                onChange={event => handleUserSupportModalChange('description', event.target.value)}
                placeholder='Describe el problema para que el proveedor lo revise.'
                rows={5}
              />
            </label>

            {userSupportModalFeedback && (
              <p className={userSupportModalFeedback.type === 'ok' ? styles.userInlineOk : styles.userInlineError}>
                {userSupportModalFeedback.text}
              </p>
            )}

            <div className={styles.userSupportTicketActions}>
              <button type='button' className={styles.userSupportTicketGhost} onClick={closeUserSupportModal}>
                Cancelar
              </button>
              <button
                type='button'
                className={styles.userSupportTicketSend}
                onClick={() => void handleUserSupportModalSubmit()}
                disabled={userSupportModalSaving || !userSupportModalOrder}
              >
                {userSupportModalSaving ? 'Enviando...' : 'Enviar soporte'}
              </button>
            </div>
          </article>
        </div>
      )}

      {userOrderEditModal && (
        <div className={styles.userOrderEditBackdrop} role='dialog' aria-modal='true'>
          <article className={styles.userOrderEditCard}>
            <button
              type='button'
              className={styles.userOrderEditClose}
              onClick={closeUserOrderEditModal}
              aria-label='Cerrar'
            >
              X
            </button>

            <h4 className={styles.userOrderEditTitle}>
              {userOrderEditModal.field === 'customerName' ? 'Editar cliente' : 'Editar celular'}
            </h4>
            <p className={styles.userOrderEditSubtitle}>
              Pedido #{userOrderEditModalOrder?.id ?? userOrderEditModal.orderId}
            </p>

            <label className={styles.userOrderEditField}>
              <span>{userOrderEditModal.field === 'customerName' ? 'Cliente' : 'Celular'}</span>
              <input
                type='text'
                value={userOrderEditModal.value}
                onChange={event => handleUserOrderEditModalChange(event.target.value)}
                placeholder={userOrderEditModal.field === 'customerName' ? 'Nombre del cliente' : 'Numero celular'}
                inputMode={userOrderEditModal.field === 'customerPhone' ? 'tel' : 'text'}
              />
            </label>

            {userOrderEditFeedback && (
              <p className={userOrderEditFeedback.type === 'ok' ? styles.userInlineOk : styles.userInlineError}>
                {userOrderEditFeedback.text}
              </p>
            )}

            <div className={styles.userOrderEditActions}>
              <button type='button' className={styles.userOrderEditGhost} onClick={closeUserOrderEditModal}>
                Cancelar
              </button>
              <button
                type='button'
                className={styles.userOrderEditSave}
                disabled={!userOrderEditModalOrder || !userOrderEditHasChanges || userOrderEditSaving}
                onClick={() => {
                  if (!userOrderEditModalOrder) return
                  const nextCustomerName =
                    userOrderEditModal.field === 'customerName'
                      ? userOrderEditModal.value
                      : userOrderEditModalOrder.customerName
                  const nextCustomerPhone =
                    userOrderEditModal.field === 'customerPhone'
                      ? userOrderEditModal.value
                      : userOrderEditModalOrder.customerPhone
                  void handleUserOrderContactSave(
                    userOrderEditModalOrder,
                    nextCustomerName,
                    nextCustomerPhone
                  )
                }}
              >
                {userOrderEditSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </article>
        </div>
      )}

      {showSupportMaintenanceModal && (
        <div className={styles.supportMaintenanceBackdrop} role='dialog' aria-modal='true'>
          <div className={styles.supportMaintenanceBackdropHit} aria-hidden='true' />

          <article className={styles.supportMaintenanceCard}>
            <button
              type='button'
              className={styles.supportMaintenanceClose}
              onClick={() => setShowSupportMaintenanceModal(false)}
              aria-label='Cerrar'
            >
              X
            </button>
            <Image
              src='/logo-mark.png'
              alt='CRYXTEAM'
              width={88}
              height={88}
              className={styles.supportMaintenanceLogo}
            />
            <h4 className={styles.supportMaintenanceTitle}>Mantenimiento</h4>
            <p className={styles.supportMaintenanceText}>Estamos ajustando este modulo</p>
            <p className={styles.supportMaintenanceSubtext}>Vuelve pronto...</p>
          </article>
        </div>
      )}
    </main>
  )
}
