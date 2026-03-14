'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import styles from './prosegur.module.css'

type ProfileRow = {
  username: string | null
  balance?: number | null
}

type Category = {
  id: string
  label: string
}

type ServiceOption = {
  id: string
  name: string
  categoryId: string
  pricePerThousand: number
  avgTime: string
  min: number
  max: number
}

function formatUsername(value: string | null | undefined) {
  if (!value) return 'Mi cuenta'
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : 'Mi cuenta'
}

function formatBalance(value: number | null | undefined) {
  if (value === null || value === undefined) return 'S/ 0.00'
  return `S/ ${value.toFixed(2)}`
}

export default function ProsegurPage() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountLabel, setAccountLabel] = useState('Ingresa')
  const [accountHref, setAccountHref] = useState('/login')
  const [balance, setBalance] = useState<number | null>(null)
  const [activeSection, setActiveSection] = useState('nuevo')
  const [selectedCategory, setSelectedCategory] = useState('instagram')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [quantity, setQuantity] = useState(1000)
  const rechargeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!active) return
      if (error || !user) {
        setAccountLabel('Ingresa')
        setAccountHref('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, balance')
        .eq('id', user.id)
        .maybeSingle<ProfileRow>()

      if (!active) return

      const username = formatUsername(profile?.username ?? user.email ?? 'Mi cuenta')
      setAccountLabel(username)
      setBalance(profile?.balance ?? null)
      setAccountHref('/dashboard')
    })()

    return () => {
      active = false
    }
  }, [])

  const navClass = (isActive: boolean, isAccount = false) =>
    `${styles.navLink} ${isActive ? styles.navActive : ''} ${isAccount ? styles.accountLink : ''}`.trim()

  const metrics = useMemo(
    () => [
      {
        id: 'balance',
        label: 'Saldo',
        value: formatBalance(balance),
        hint: 'Recarga y usa el mismo saldo de la plataforma.',
      },
      {
        id: 'orders',
        label: 'Pedidos monitoreados',
        value: '3,142,651',
        hint: 'Seguimiento y filtros anti spam.',
      },
      {
        id: 'uptime',
        label: 'Red estable',
        value: '99.8 %',
        hint: 'Escudos activos 24/7 para tus entregas.',
      },
    ],
    []
  )

  const sideNav = [
    { id: 'nuevo', label: 'Nuevo pedido', primary: true },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'saldo', label: 'Agregar saldo' },
    { id: 'terminos', label: 'Terminos' },
  ]

  const categories: Category[] = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'youtube', label: 'Youtube' },
    { id: 'twitter', label: 'Twitter' },
    { id: 'spotify', label: 'Spotify' },
    { id: 'tiktok', label: 'Tiktok' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'web', label: 'Website' },
    { id: 'otro', label: 'Otro' },
    { id: 'todo', label: 'Todo' },
  ]

  const services: ServiceOption[] = [
    {
      id: 'svc-ig-visitas',
      name: 'Instagram visitas | Instant | 0.0556 por 1000',
      categoryId: 'instagram',
      pricePerThousand: 0.0556,
      avgTime: '44 minutos',
      min: 10,
      max: 1000000,
    },
    {
      id: 'svc-ig-likes',
      name: 'Instagram likes | Rapido | 0.0320 por 1000',
      categoryId: 'instagram',
      pricePerThousand: 0.032,
      avgTime: '30 minutos',
      min: 20,
      max: 500000,
    },
    {
      id: 'svc-yt-views',
      name: 'Youtube views | Alta retencion | 0.1200 por 1000',
      categoryId: 'youtube',
      pricePerThousand: 0.12,
      avgTime: '1-3 horas',
      min: 100,
      max: 2000000,
    },
    {
      id: 'svc-tw-seguidores',
      name: 'Twitter seguidores | Mixto | 0.0850 por 1000',
      categoryId: 'twitter',
      pricePerThousand: 0.085,
      avgTime: '2-6 horas',
      min: 50,
      max: 800000,
    },
    {
      id: 'svc-tiktok-views',
      name: 'Tiktok views | Instant | 0.0440 por 1000',
      categoryId: 'tiktok',
      pricePerThousand: 0.044,
      avgTime: '15-40 minutos',
      min: 10,
      max: 1000000,
    },
    {
      id: 'svc-spotify-plays',
      name: 'Spotify plays | Global | 0.0980 por 1000',
      categoryId: 'spotify',
      pricePerThousand: 0.098,
      avgTime: '3-6 horas',
      min: 100,
      max: 300000,
    },
    {
      id: 'svc-web-traffic',
      name: 'Website traffic | Mixto | 0.0600 por 1000',
      categoryId: 'web',
      pricePerThousand: 0.06,
      avgTime: '1-2 horas',
      min: 100,
      max: 500000,
    },
  ]

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesCategory = selectedCategory === 'todo' ? true : service.categoryId === selectedCategory
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        service.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [services, selectedCategory, searchTerm])

  useEffect(() => {
    const first = filteredServices[0]?.id ?? null
    setSelectedServiceId(first)
  }, [filteredServices])

  const selectedService = useMemo(
    () => filteredServices.find(s => s.id === selectedServiceId) ?? filteredServices[0] ?? null,
    [filteredServices, selectedServiceId]
  )

  const unitPrice = selectedService?.pricePerThousand ?? 0
  const total = useMemo(() => Math.max(0, (quantity || 0) / 1000 * unitPrice), [quantity, unitPrice])

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
          <Link href='/prosegur' className={navClass(pathname === '/prosegur')}>
            Prosegur
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

      {menuOpen && (
        <div className={styles.menuPanel}>
          <Link href='/inicio' className={pathname === '/inicio' ? styles.navActive : ''} onClick={() => setMenuOpen(false)}>
            Inicio
          </Link>
          <Link href='/productos' className={pathname === '/productos' ? styles.navActive : ''} onClick={() => setMenuOpen(false)}>
            Productos
          </Link>
          <Link href='/prosegur' className={pathname === '/prosegur' ? styles.navActive : ''} onClick={() => setMenuOpen(false)}>
            Prosegur
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

      <div className={styles.layout}>
        <aside className={styles.sideRail}>
          <div className={styles.userCard}>
            <p className={styles.userName}>{accountLabel}</p>
            <p className={styles.userBalanceLabel}>Balance</p>
            <p className={styles.userBalanceValue}>{formatBalance(balance)}</p>
          </div>

          <nav className={styles.sideNav} aria-label='Menu Prosegur'>
            {sideNav.map(item => (
              <button
                key={item.id}
                type='button'
                onClick={() => setActiveSection(item.id)}
                className={`${styles.sideNavLink} ${item.primary ? styles.sideNavLinkPrimary : ''} ${
                  activeSection === item.id ? styles.sideNavLinkActive : ''
                }`}
                aria-pressed={activeSection === item.id}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className={styles.contentSurface}>
          <section className={styles.contentArea}>
          <section className={`${styles.contentCard} ${activeSection !== 'nuevo' ? styles.cardHidden : ''}`}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Operaciones</p>
              <h2 className={styles.sectionTitle}>Nuevo pedido</h2>
            </div>
            <p className={styles.sectionLead}>Carga aqui los datos del pedido. Todo queda en este apartado, sin redirigir.</p>

            <div className={styles.orderLayout}>
              <div className={styles.formPanel}>
                <div className={styles.chipPanel}>
                  <div className={styles.chipRowWide}>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type='button'
                        className={`${styles.chipButton} ${selectedCategory === cat.id ? styles.chipButtonActive : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className={styles.inputBlock}>
                  <span>Buscar servicio</span>
                  <input
                    type='text'
                    placeholder='Busca por nombre...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </label>

                <label className={styles.inputBlock}>
                  <span>Categoria</span>
                  <div className={styles.selectWrap}>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className={styles.selectControl}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className={styles.inputBlock}>
                  <span>Servicio</span>
                  <div className={styles.selectWrap}>
                    <select
                      value={selectedService?.id ?? ''}
                      onChange={e => setSelectedServiceId(e.target.value)}
                      className={styles.selectControl}
                    >
                      {filteredServices.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className={styles.inputBlock}>
                  <span>Enlace</span>
                  <input type='text' placeholder='Pega el enlace o @usuario' />
                </label>

                <label className={styles.inputBlock}>
                  <span>Cantidad</span>
                  <input
                    type='number'
                    min={selectedService?.min ?? 1}
                    max={selectedService?.max ?? 1000000}
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                  />
                  <small className={styles.helperText}>
                    Min {selectedService?.min ?? 1} - Max {selectedService?.max ?? 1000000}
                  </small>
                </label>

                <label className={`${styles.inputBlock} ${styles.inlineRow}`}>
                  <span>Drip-feed</span>
                  <input type='checkbox' />
                </label>

                <div className={styles.inputBlock}>
                  <span>Tiempo promedio</span>
                  <div className={styles.readonlyField}>{selectedService?.avgTime ?? 'N/D'}</div>
                </div>

                <div className={styles.pricingRow}>
                  <div>
                    <p className={styles.mutedLabel}>Cargo</p>
                    <div className={styles.readonlyField}>$ {(unitPrice / 1000 * quantity).toFixed(6)}</div>
                  </div>
                  <div>
                    <p className={styles.mutedLabel}>Total estimado</p>
                    <div className={styles.readonlyField}>$ {total.toFixed(6)}</div>
                  </div>
                </div>

                <div className={styles.warningBox}>
                  <p>Importante:</p>
                  <ol>
                    <li>No repitas pedidos con el mismo enlace hasta que el primero termine.</li>
                    <li>Revisa la descripcion del servicio antes de enviar.</li>
                  </ol>
                </div>

                <button type='button' className={styles.primaryBtn}>
                  Crear pedido
                </button>
              </div>

              <aside className={styles.descPanel}>
                <div className={styles.descHeader}>
                  <span className={styles.descIcon}></span>
                  <div>
                    <p className={styles.sectionEyebrow}>Servicio</p>
                    <h3 className={styles.descTitle}>Descripcion</h3>
                  </div>
                </div>
                <div className={styles.descBody}>
                  <p className={styles.descLine}>
                    <span className={styles.bulletBlue}></span> Drop bajo: estabilidad alta, poco riesgo de caida.
                  </p>
                  <p className={styles.descLine}>
                    <span className={styles.bulletYellow}></span> Drop moderado: retencion media, vigila el progreso.
                  </p>
                  <p className={styles.descLine}>
                    <span className={styles.bulletRed}></span> Drop alto: podria perderse rapido, usar con cuidado.
                  </p>
                  <p className={styles.descLine}>
                    <span className={styles.bulletGreen}></span> Refill: se repone si baja el conteo.
                  </p>
                  <p className={styles.descLine}>
                    <span className={styles.bulletGray}></span> Sin refill: no hay reposicion para drops.
                  </p>

                  <div className={styles.descBox}>
                    <p className={styles.descLabel}>Detalles</p>
                    <ul className={styles.descList}>
                      <li>Inicio: 0-20 min</li>
                      <li>Velocidad: rapida</li>
                      <li>Formato de enlace: post o perfil publico</li>
                    </ul>
                  </div>

                  <div className={styles.descBox}>
                    <p className={styles.descLabel}>Notas</p>
                    <ul className={styles.descList}>
                      <li>Usa enlaces publicos, no privados.</li>
                      <li>No hagas dos pedidos con el mismo enlace hasta que termine.</li>
                      <li>Si hay alta demanda, el inicio puede tardar mas.</li>
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className={`${styles.contentCard} ${activeSection !== 'pedidos' ? styles.cardHidden : ''}`}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Historial</p>
              <h2 className={styles.sectionTitle}>Pedidos</h2>
            </div>
            <p className={styles.sectionLead}>Resumen rapido de pedidos recientes.</p>
            <div className={styles.ordersTable}>
              <div className={styles.ordersHeaderRow}>
                <label className={styles.checkboxCell}>
                  <input type='checkbox' aria-label='Seleccionar todos' />
                </label>
                <span>ID</span>
                <span>Fecha</span>
                <span>Enlace</span>
                <span>Cargo</span>
                <span>Inicio</span>
                <span>Cantidad</span>
                <span>Servicio</span>
                <span>Restan</span>
                <span>Estado</span>
              </div>
              <div className={styles.tableEmpty}>Aun no hay pedidos aqui.</div>
            </div>
          </section>

          <section
            id='saldo'
            ref={rechargeRef}
            className={`${styles.contentCard} ${activeSection !== 'saldo' ? styles.cardHidden : ''}`}
          >
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Finanzas</p>
              <h2 className={styles.sectionTitle}>Agregar saldo</h2>
            </div>
            <p className={styles.sectionLead}>Recarga con el mismo estilo que el panel principal.</p>
            <div className={styles.rechargeGrid}>
              {metrics.map(item => (
                <article key={item.id} className={styles.metricCard}>
                  <p className={styles.metricLabel}>{item.label}</p>
                  <p className={styles.metricValue}>{item.value}</p>
                  <p className={styles.metricHint}>{item.hint}</p>
                </article>
              ))}
            </div>
            <button
              type='button'
              className={styles.primaryBtn}
              onClick={() => {
                setActiveSection('saldo')
                rechargeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              Ver metodos de pago
            </button>
          </section>

          <section className={`${styles.contentCard} ${activeSection !== 'terminos' ? styles.cardHidden : ''}`}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Legal</p>
              <h2 className={styles.sectionTitle}>Terminos</h2>
            </div>
            <p className={styles.sectionLead}>Condiciones rapidas para este apartado.</p>
            <ul className={styles.termsList}>
              <li>Los pedidos no son reembolsables una vez enviados.</li>
              <li>Usa enlaces publicos y evita cuentas privadas para evitar bloqueos.</li>
              <li>El saldo aplicado es instantaneo; guarda el comprobante de pago.</li>
              <li>Soporte 24/7 via WhatsApp para incidencias con Prosegur.</li>
            </ul>
          </section>
          </section>
        </div>
      </div>
    </main>
  )
}
