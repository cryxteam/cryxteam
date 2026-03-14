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
  const [activeSection, setActiveSection] = useState('nuevo')
  const [selectedCategory, setSelectedCategory] = useState('Todo')
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [quantityInput, setQuantityInput] = useState('1000')
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
    const options = uniquePlatforms.map(item => ({ id: item, label: item }))
    return [{ id: 'Todo', label: 'Todo' }, ...options]
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
    const term = searchTerm.trim().toLowerCase()
    return packages.filter(pkg => {
      const matchesCategory = selectedCategory === 'Todo' ? true : pkg.plataforma === selectedCategory
      const matchesSearch =
        term.length === 0 ||
        `${pkg.plataforma} ${pkg.servicio} ${pkg.categoria}`.toLowerCase().includes(term)
      return matchesCategory && matchesSearch
    })
  }, [packages, searchTerm, selectedCategory])

  useEffect(() => {
    const first = filteredPackages[0]?.id ?? null
    setSelectedServiceId(first)
  }, [filteredPackages])

  const selectedPackage = useMemo(
    () => filteredPackages.find(pkg => pkg.id === selectedServiceId) ?? filteredPackages[0] ?? null,
    [filteredPackages, selectedServiceId]
  )

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
                  <span>Buscar servicio</span>
                  <input
                    className={styles.searchInput}
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
                          {`${pkg.plataforma} ${pkg.servicio} | ${pkg.categoria} | S/ ${pkg.precio_por_mil} por 1000`}
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
