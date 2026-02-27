'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import styles from './inicio.module.css'

type ProfileRow = {
  username: string
  is_approved: boolean
  role: string
}

type ViewerMode = 'guest' | 'affiliate'

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
  providerName: string
  providerAvatarUrl: string
  accountType: string
  deliveryMode: string
  renewable: boolean
}

type BrandLogo = {
  id: string
  src: string
  alt: string
  tone: 'white' | 'silver'
}

const AFFILIATE_NUMBER = '51929436705'
const WHATSAPP_SUPPORT_LINK = `https://wa.me/${AFFILIATE_NUMBER}?text=${encodeURIComponent(
  'Hola, quiero soporte en CRYXTEAM.'
)}`
const WHATSAPP_COMMUNITY_LINK = 'https://chat.whatsapp.com/DAq3BQwm4YgA2Ao1loPxFO'
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
  if (typeof value !== 'string' || value.trim() === '') return guessLogoFromName(name)
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  if (value.startsWith('particles/')) return `/${value}`
  return `/${value}`
}

function toText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const cleaned = value.trim()
    return cleaned.length > 0 ? cleaned : fallback
  }
  return fallback
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

function formatRenewable(value: boolean) {
  return value ? 'Renovable' : 'No renovable'
}

function formatDuration(days: number | null) {
  if (days === null) return 'Sin limite'
  if (days <= 1) return '1 dia'
  return `${days} dias`
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
      const durationDays = toNullableNumber(
        row.duration_days ?? row.subscription_days ?? row.durationDays ?? row.plan_days
      )

      return {
        id: Math.max(1, Math.floor(toNumber(row.id ?? row.product_id, index + 1))),
        name,
        logo: resolveLogo(name, row.logo_url ?? row.image_url ?? row.logo ?? row.image ?? row.icon),
        stock,
        summary: toText(row.description ?? row.cycle ?? row.plan ?? row.duration, 'Producto digital'),
        durationDays: durationDays === null ? null : Math.max(1, Math.floor(durationDays)),
        priceGuest,
        priceAffiliate,
        renewalPrice,
        providerName,
        providerAvatarUrl,
        accountType: toText(row.account_type, 'profiles'),
        deliveryMode: toText(row.delivery_mode, 'instant'),
        renewable: Boolean(row.renewable),
      }
    })
}

export default function InicioPage() {
  const pathname = usePathname()
  const [viewerMode, setViewerMode] = useState<ViewerMode>('guest')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAffiliateEnabled, setIsAffiliateEnabled] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountLabel, setAccountLabel] = useState('Ingresa')
  const [accountHref, setAccountHref] = useState('/login')
  const [scrollY, setScrollY] = useState(0)
  const [catalogReloadSeq, setCatalogReloadSeq] = useState(0)

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
            setIsAffiliateEnabled(false)
            setViewerMode('guest')
            setAccountLabel('Ingresa')
            setAccountHref('/login')
            return
          }

          setIsLoggedIn(true)

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, is_approved, role')
            .eq('id', user.id)
            .maybeSingle<ProfileRow>()

          if (!mounted) return

          const username = profile?.username?.trim() || user.email?.split('@')[0] || 'Mi cuenta'
          setAccountLabel(username)
          setAccountHref('/dashboard')

          if (!profile) {
            setIsAffiliateEnabled(false)
            setViewerMode('guest')
            appendMsg('No se pudo cargar tu perfil. Se muestra precio publico.')
            return
          }

          if (!profile?.is_approved) {
            setIsAffiliateEnabled(false)
            setViewerMode('guest')
            appendMsg('Tu cuenta no esta aprobada todavia. Ves precios de visitante.')
            return
          }

          const [{ data: affiliateEnabled }, { data: providerOrOwner }] = await Promise.all([
            supabase.rpc('is_affiliate_enabled'),
            supabase.rpc('is_provider_or_owner'),
          ])

          if (!mounted) return

          const canUseAffiliatePrices = Boolean(affiliateEnabled) || Boolean(providerOrOwner)
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

          const rows = (rowsRaw ?? []) as Record<string, unknown>[]
          if (error || rows.length === 0) {
            setProducts([])
            appendMsg('No se pudo cargar la lista destacada desde DB.')
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

        await Promise.all([loadViewer(), loadProducts()])
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

    const channel = supabase.channel('inicio-live')
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleReload)
      .subscribe()

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY || 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => b.stock - a.stock)
  }, [products])

  const featuredProducts = useMemo(() => sortedProducts.slice(0, 8), [sortedProducts])
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

  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href='/inicio' className={styles.brand}>
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
          COMUNIDAD
        </span>
        <span
          className={styles.sideWordRight}
          style={{ transform: `translateY(calc(-50% - ${sideOffset * 0.75}px))` }}
        >
          CATALOGO
        </span>
      </div>

      {menuOpen && (
        <div className={styles.menuPanel}>
          <Link
            href='/inicio'
            className={pathname === '/inicio' ? styles.navActive : ''}
            onClick={() => setMenuOpen(false)}
          >
            Inicio
          </Link>
          <Link
            href='/productos'
            className={pathname === '/productos' ? styles.navActive : ''}
            onClick={() => setMenuOpen(false)}
          >
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
        {isLoading && <p className={styles.loading}>Cargando inicio...</p>}

        <section className={styles.heroSection}>
          <div className={styles.heroGlow} />
          <article className={styles.heroContent}>
            <p className={styles.heroEyebrow}>Bienvenido a CRYXTEAM</p>
            <h1 className={styles.heroTitle}>Enterate por que somos los mejores</h1>
            <div className={styles.heroActions}>
              <Link href='/productos' className={styles.heroPrimaryBtn}>
                ✅ Ver ofertas de hoy
              </Link>
            </div>
          </article>
        </section>

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

        <section id='productos-destacados' className={styles.featuredSection}>
          <header className={styles.sectionHead}>
            <h3>Productos destacados</h3>
            <div className={styles.sectionHeadRight}>
              {isLoggedIn && !isAffiliateEnabled && (
                <span className={styles.sectionHint}>Activa afiliacion para precio distribuidor.</span>
              )}
              <Link href='/productos'>Ver catalogo completo</Link>
            </div>
          </header>
          <div className={styles.featuredGrid}>
            {featuredProducts.map(item => {
              const price = viewerMode === 'affiliate' ? item.priceAffiliate : item.priceGuest
              const isOnDemand = isOnDemandDeliveryMode(item.deliveryMode)
              const hasRenewalOverride =
                item.renewable &&
                item.renewalPrice !== null &&
                Math.abs(item.renewalPrice - price) > 0.009
              const providerInitial = item.providerName.trim().charAt(0).toUpperCase() || 'P'

              return (
                <article key={item.id} className={styles.productCard}>
                  <Link
                    href={`/productos?q=${encodeURIComponent(item.name)}`}
                    className={styles.productMedia}
                    aria-label={`Ver ${item.name} en productos`}
                    onContextMenu={event => event.preventDefault()}
                    onDragStart={event => event.preventDefault()}
                  >
                    <Image
                      src={item.logo}
                      alt={item.name}
                      width={560}
                      height={360}
                      className={styles.productMediaImage}
                      draggable={false}
                      onContextMenu={event => event.preventDefault()}
                      onDragStart={event => event.preventDefault()}
                    />
                    <span
                      className={`${styles.productRenewBadge} ${
                        item.renewable ? styles.productRenewBadgeOn : styles.productRenewBadgeOff
                      }`}
                    >
                      {item.renewable ? 'Renovable' : 'No renovable'}
                    </span>
                    <span
                      className={`${styles.productStockPill} ${
                        item.stock === 0 && !isOnDemand ? styles.productStockPillEmpty : ''
                      }`}
                    >
                      {isOnDemand ? 'Con stock' : item.stock === 0 ? 'Sin stock' : `${item.stock} con stock`}
                    </span>
                  </Link>

                  <div className={styles.productProviderRow}>
                    <span className={styles.productProviderAvatar}>
                      {item.providerAvatarUrl ? (
                        <Image
                          src={item.providerAvatarUrl}
                          alt={item.providerName}
                          width={24}
                          height={24}
                          className={styles.productProviderAvatarImage}
                          draggable={false}
                          onContextMenu={event => event.preventDefault()}
                          onDragStart={event => event.preventDefault()}
                        />
                      ) : (
                        providerInitial
                      )}
                    </span>
                    <span className={styles.productProviderName}>{item.providerName}</span>
                    <span className={styles.productProviderCheck}>{'\u2714'}</span>
                  </div>

                  <h4 className={styles.productTitle}>
                    <span className={styles.productTitleIcon}>{getAccountTypeIcon(item.accountType)}</span>
                    <span className={styles.productTitleTickerMask} title={item.name}>
                      <span className={styles.productTitleTickerTrack}>
                        <span className={styles.productTitleTickerItem}>{item.name}</span>
                      </span>
                    </span>
                  </h4>
                  <p>
                    <span className={styles.profileInfoIcon} title='Info del producto'>
                      i
                    </span>{' '}
                    {formatAccountType(item.accountType)} | {formatDeliveryMode(item.deliveryMode)} |{' '}
                    {formatRenewable(item.renewable)} | {formatDuration(item.durationDays)}
                  </p>
                  <div className={styles.productMeta}>
                    <strong className={styles.productPriceChip}>{formatPrice(price)}</strong>
                    {viewerMode === 'guest' && (
                      <span>Dist: {formatPrice(item.priceAffiliate)}</span>
                    )}
                  </div>
                  {hasRenewalOverride && (
                    <p className={styles.productRenewalTag}>
                      Renovacion: {formatPrice(item.renewalPrice as number)}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        </section>

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
                  <Image src='/whatsapp.png' alt='Canal de WhatsApp' width={64} height={64} className={styles.communityLogo} />
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

              {isLoggedIn ? (
                <a
                  href={WHATSAPP_COMMUNITY_LINK}
                  target='_blank'
                  rel='noopener noreferrer'
                  className={styles.communityActionGhost}
                >
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

              <a
                href={WHATSAPP_SUPPORT_LINK}
                target='_blank'
                rel='noopener noreferrer'
                className={styles.communityActionPrimary}
              >
                Contactar
              </a>
            </article>

            <article className={styles.communityRow}>
              <div className={styles.communityChannel}>
                <div className={styles.communityLogoWrap}>
                  <Image src='/discord.png' alt='Canal de Discord' width={64} height={64} className={styles.communityLogo} />
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
      </section>
    </main>
  )
}
