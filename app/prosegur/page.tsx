'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
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

type FollowerPackageRow = {
  id: string
  plataforma: string
  servicio: string
  categoria: string
  descripcion: string | null
  detalles: string | null
  notas: string | null
  precio_por_mil: number
  tiempo_promedio: string | null
  activo: boolean | null
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
  const [userId, setUserId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('nuevo')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [quantityInput, setQuantityInput] = useState('1000')
  const [linkInput, setLinkInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptAmount, setReceiptAmount] = useState<number>(0)
  const [receiptBalance, setReceiptBalance] = useState<number | null>(null)
  const [orders, setOrders] = useState<
    Array<{
      id: string
      enlace: string
      cargo: number
      cantidad: number
      estado: string
      servicio: string
      plataforma: string
      tiempo_promedio: string | null
      accepted_at: string | null
      eta_hours: number | null
      created_at: string
    }>
  >([])
  const rechargeRef = useRef<HTMLDivElement | null>(null)
  const [platforms, setPlatforms] = useState<string[]>([])
  const [packages, setPackages] = useState<FollowerPackageRow[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = useState(true)

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
      setUserId(user.id)

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
    [balance]
  )

  const sideNav = [
    { id: 'nuevo', label: 'Nuevo pedido', primary: true },
    { id: 'pedidos', label: 'Pedidos' },
    { id: 'saldo', label: 'Agregar saldo' },
    { id: 'terminos', label: 'Terminos' },
  ]

  const categories: Category[] = useMemo(() => {
    const uniquePlatforms = Array.from(new Set(platforms.map(item => item.trim()).filter(Boolean)))
    return uniquePlatforms.map(item => ({ id: item, label: item }))
  }, [platforms])

  useEffect(() => {
    if (platforms.length === 0) return
    setSelectedCategory(prev => {
      if (prev && platforms.includes(prev)) return prev
      return platforms[0]
    })
  }, [platforms])

  const loadCatalog = useMemo(
    () => async () => {
      setIsCatalogLoading(true)
      const [{ data: platformRows }, { data: packageRows }] = await Promise.all([
        supabase.from('follower_platforms').select('plataforma').order('created_at', { ascending: false }),
        supabase
          .from('follower_packages')
          .select('id,plataforma,servicio,categoria,descripcion,detalles,notas,precio_por_mil,tiempo_promedio,activo')
          .eq('activo', true)
          .order('created_at', { ascending: false }),
      ])
      if (platformRows) setPlatforms(platformRows.map(row => row.plataforma))
      if (packageRows) setPackages(packageRows as FollowerPackageRow[])
      setIsCatalogLoading(false)
    },
    []
  )

  useEffect(() => {
    void loadCatalog()
    const channel = supabase
      .channel('followers-catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follower_platforms' }, () => {
        void loadCatalog()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follower_packages' }, () => {
        void loadCatalog()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadCatalog])

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesCategory = selectedCategory ? pkg.plataforma === selectedCategory : true
      return matchesCategory
    })
  }, [packages, selectedCategory])

  useEffect(() => {
    const first = filteredPackages[0]?.id ?? null
    setSelectedServiceId(first)
  }, [filteredPackages])

  const selectedPackage = useMemo(
    () => filteredPackages.find(pkg => pkg.id === selectedServiceId) ?? filteredPackages[0] ?? null,
    [filteredPackages, selectedServiceId]
  )

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    return `${day}/${month}`
  }
  const formatTime = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
  }

  const slugPart = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')

  const estadoLabel = (value: string) => {
    const cleaned = value.replace(/_/g, ' ')
    return cleaned.length ? cleaned[0].toUpperCase() + cleaned.slice(1) : cleaned
  }

  const progressForOrder = (order: {
    created_at: string
    accepted_at: string | null
    eta_hours: number | null
    tiempo_promedio: string | null
    estado: string
  }) => {
    if (order.estado === 'completado') return 100
    const match = order.tiempo_promedio?.match(/(\d+(?:\\.\\d+)?)\\s*h/i)
    const hoursFromText = match ? Number(match[1]) : null
    const hoursFromOrder = order.eta_hours && order.eta_hours > 0 ? order.eta_hours : null
    const hours = hoursFromOrder ?? hoursFromText
    if (!hours || hours <= 0) return order.estado === 'en_proceso' ? 50 : 0
    const startIso = order.accepted_at || order.created_at
    const start = new Date(startIso).getTime()
    const elapsed = Date.now() - start
    const totalMs = hours * 3600 * 1000
    const pct = Math.max(0, Math.min(100, (elapsed / totalMs) * 100))
    return order.estado === 'pendiente' ? 0 : pct
  }

  useEffect(() => {
    if (!userId) return
    let active = true
    const loadOrders = async () => {
      // Best-effort: auto-complete orders when ETA passes.
      await supabase.rpc('sync_follower_orders_for_user')
      const { data } = await supabase
        .from('orders_followers')
        .select(
          'id,enlace,cargo,cantidad,estado,created_at,accepted_at,eta_hours,follower_packages(servicio,plataforma,tiempo_promedio)'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (!active) return
      const rows =
        data?.map(row => ({
          id: (row as any).id as string,
          enlace: (row as any).enlace || '',
          cargo: Number((row as any).cargo) || 0,
          cantidad: Number((row as any).cantidad) || 0,
          estado: ((row as any).estado as string) || 'pendiente',
          servicio: ((row as any).follower_packages?.servicio as string) || '',
          plataforma: ((row as any).follower_packages?.plataforma as string) || '',
          tiempo_promedio: ((row as any).follower_packages?.tiempo_promedio as string) || null,
          accepted_at: ((row as any).accepted_at as string) || null,
          eta_hours:
            (row as any).eta_hours !== undefined && (row as any).eta_hours !== null
              ? Number((row as any).eta_hours)
              : null,
          created_at: (row as any).created_at as string,
        })) ?? []
      setOrders(rows)
    }
    void loadOrders()
    const channel = supabase
      .channel(`followers-orders-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders_followers', filter: `user_id=eq.${userId}` },
        loadOrders
      )
      .subscribe()
    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const quantity = Math.max(0, Number(quantityInput || 0))
  const unitPrice = selectedPackage?.precio_por_mil ?? 0
  const total = useMemo(() => Math.max(0, quantity / 1000 * unitPrice), [quantity, unitPrice])

  const detailsLines = useMemo(() => {
    const raw = selectedPackage?.detalles || ''
    return raw
      .split(/\r?\n|;/)
      .map(item => item.trim())
      .filter(Boolean)
  }, [selectedPackage])

  const notesLines = useMemo(() => {
    const raw = selectedPackage?.notas || ''
    return raw
      .split(/\r?\n|;/)
      .map(item => item.trim())
      .filter(Boolean)
  }, [selectedPackage])

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
            Seguidores
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
            Seguidores
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

        <nav className={styles.sideNav} aria-label='Menu Seguidores'>
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
                      className={`${styles.chipButton} ${selectedCategory === cat.label ? styles.chipButtonActive : ''}`}
                      onClick={() => setSelectedCategory(cat.label)}
                    >
                      {cat.label}
                    </button>
                  ))}
                  </div>
                </div>

                <label className={styles.inputBlock}>
                  <span>Categoria</span>
                  <div className={styles.selectWrap}>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className={styles.selectControl}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.label}>
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
                      value={selectedPackage?.id ?? ''}
                      onChange={e => setSelectedServiceId(e.target.value)}
                      className={styles.selectControl}
                    >
                      {filteredPackages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {`${pkg.plataforma} - ${pkg.servicio} | ${pkg.categoria} | S/ ${pkg.precio_por_mil} por 1000`}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className={styles.inputBlock}>
                  <span>Enlace</span>
                  <input
                    type='text'
                    placeholder='Pega el enlace o @usuario'
                    value={linkInput}
                    onChange={e => setLinkInput(e.target.value)}
                  />
                </label>

                <label className={styles.inputBlock}>
                  <span>Cantidad</span>
                  <input
                    type='number'
                    min={1}
                    max={1000000}
                    value={quantityInput}
                    onChange={e => setQuantityInput(e.target.value.replace(/^0+(?=\\d)/, ''))}
                  />
                  <small className={styles.helperText}>
                    Min 1 - Max 1000000
                  </small>
                </label>

              <div className={styles.inputBlock}>
                <span>Tiempo promedio</span>
                <div className={styles.readonlyField}>{selectedPackage?.tiempo_promedio ?? 'N/D'}</div>
              </div>

                <div className={styles.pricingRow}>
                  <div>
                    <p className={styles.mutedLabel}>Cargo</p>
                    <div className={styles.readonlyField}>S/ {(unitPrice / 1000 * quantity).toFixed(6)}</div>
                  </div>
                  <div>
                    <p className={styles.mutedLabel}>Total estimado</p>
                    <div className={styles.readonlyField}>S/ {total.toFixed(6)}</div>
                  </div>
                </div>

                <div className={styles.warningBox}>
                  <p>Importante:</p>
                  <ol>
                    <li>No repitas pedidos con el mismo enlace hasta que el primero termine.</li>
                    <li>Revisa la descripcion del servicio antes de enviar.</li>
                  </ol>
                </div>

                <button
                  type='button'
                  className={styles.primaryBtn}
                  disabled={isSubmitting || !selectedPackage || !linkInput.trim()}
                  onClick={async () => {
                    if (!selectedPackage) return
                    setIsSubmitting(true)
                    setSubmitMsg(null)
                    const { data: userResp } = await supabase.auth.getUser()
                    const uid = userResp?.user?.id
                    if (!uid) {
                      setSubmitMsg('Inicia sesion para crear pedidos.')
                      setIsSubmitting(false)
                      return
                    }
                    const { error, data } = await supabase.rpc('place_follower_order', {
                      p_user_id: uid,
                      p_pkg_id: selectedPackage.id,
                      p_enlace: linkInput.trim(),
                      p_cantidad: quantity,
                    })
                    if (error) {
                      setSubmitMsg('No se pudo crear el pedido. Revisa tu saldo o intenta de nuevo.')
                    } else {
                      setSubmitMsg('Pedido creado. Lo veras en Pedidos en segundos.')
                      const payload = Array.isArray(data) ? data[0] : null
                      const newBal = payload?.new_balance ?? null
                      const cargo = payload?.cargo ?? total
                      setReceiptAmount(Number(cargo) || total)
                      setReceiptBalance(newBal !== null ? Number(newBal) : null)
                      setShowReceipt(true)
                      setLinkInput('')
                    }
                    setIsSubmitting(false)
                  }}
                >
                  {isSubmitting ? 'Creando...' : 'Crear pedido'}
                </button>
                {submitMsg && <p className={styles.helperText}>{submitMsg}</p>}
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
                  {selectedPackage?.descripcion && <p className={styles.descLine}>{selectedPackage.descripcion}</p>}

                  <div className={styles.descBox}>
                    <p className={styles.descLabel}>Detalles</p>
                    <ul className={styles.descList}>
                      {detailsLines.length === 0 && <li>Sin detalles.</li>}
                      {detailsLines.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.descBox}>
                    <p className={styles.descLabel}>Notas</p>
                    <ul className={styles.descList}>
                      {notesLines.length === 0 && <li>Sin notas.</li>}
                      {notesLines.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </section>
          {showReceipt && (
            <div className={styles.modalOverlay} role='dialog' aria-modal='true'>
              <div className={styles.modalCard}>
                <h4>Pedido creado</h4>
                <p>Se desconto: <strong>S/ {receiptAmount.toFixed(2)}</strong></p>
                {receiptBalance !== null && <p>Nuevo saldo: <strong>S/ {receiptBalance.toFixed(2)}</strong></p>}
                <p>Veras el pedido en "Pedidos" en segundos.</p>
                <button type='button' className={styles.primaryBtn} onClick={() => setShowReceipt(false)}>
                  Entendido
                </button>
              </div>
            </div>
          )}

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
                <span>Progreso</span>
                <span>Estado</span>
              </div>
              {orders.length === 0 && <div className={styles.tableEmpty}>Aun no hay pedidos aqui.</div>}
              {orders.map(order => {
                const pct = progressForOrder(order)
                const computedEstado = order.estado === 'en_proceso' && pct >= 100 ? 'completado' : order.estado
                return (
                  <div key={order.id} className={styles.ordersRow}>
                    <label className={styles.checkboxCell}>
                      <input type='checkbox' aria-label='Seleccionar pedido' />
                    </label>
                    <span className={styles.truncate}>
                      {order.id.slice(0, 8)}{' '}
                      <button
                        type='button'
                        className={styles.copyBtn}
                        onClick={() => navigator.clipboard?.writeText(order.id).catch(() => {})}
                        aria-label='Copiar ID'
                        title='Copiar'
                      >
                        <svg viewBox='0 0 24 24' aria-hidden='true'>
                          <path d='M9 9h10v10H9V9z' />
                          <path d='M5 5h10v2H7v8H5V5z' />
                        </svg>
                      </button>
                    </span>
                    <span>{formatDate(order.created_at)}</span>
                    <span className={styles.truncate}>{order.enlace}</span>
                    <span>S/ {order.cargo.toFixed(4)}</span>
                    <span>{formatTime(order.created_at)}</span>
                    <span>{order.cantidad}</span>
                    <span>{`${slugPart(order.servicio || 'seguidores')}-${slugPart(order.plataforma || '')}`}</span>
                    <span>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${pct}%` }} aria-label='Progreso' />
                      </div>
                    </span>
                    <span className={`${styles.status} ${styles[`status-${computedEstado}`]}`}>{estadoLabel(computedEstado)}</span>
                  </div>
                )
              })}
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
              {metrics
                .filter(item => item.id !== 'balance')
                .map(item => (
                  <article key={item.id} className={styles.metricCard}>
                    <p className={styles.metricLabel}>{item.label}</p>
                    <p className={styles.metricValue}>{item.value}</p>
                    <p className={styles.metricHint}>{item.hint}</p>
                  </article>
                ))}
            </div>
            <Link href='/dashboard?section=recargar' className={styles.primaryBtn}>
              Ver metodos de pago
            </Link>
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
              <li>Soporte 24/7 via WhatsApp para incidencias con Seguidores.</li>
            </ul>
          </section>
          </section>
        </div>
      </div>
    </main>
  )
}
