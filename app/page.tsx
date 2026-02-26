"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const WHATSAPP_LINK = "https://chat.whatsapp.com/DAq3BQwm4YgA2Ao1loPxFO";
  const AFFILIATE_LINK =
    "https://wa.me/51929436705?text=Hola%2C%20que%20tal.%20Quiero%20afiliarme%20a%20CRYXTEAM.";

  const isMobile = useMemo(
    () => (typeof window !== "undefined" ? window.innerWidth <= 900 : false),
    []
  );
  const [openMenu, setOpenMenu] = useState(false);
  const [isSessionCheckLoading, setIsSessionCheckLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verifyExistingSession = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!error && user) {
        router.replace("/inicio");
        return;
      }

      setIsSessionCheckLoading(false);
    };

    void verifyExistingSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (isSessionCheckLoading) {
    return <main className={styles.container} />;
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.leftHeader}>
          <button
            className={`${styles.menuButton} ${openMenu ? styles.menuOpen : ""}`}
            onClick={() => setOpenMenu(!openMenu)}
            aria-label="Abrir menu"
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className={styles.brand}>
            <Image src="/logo.png" alt="CRYXTEAM" width={200} height={200} />
            <span>CRYXTEAM</span>
          </Link>
        </div>

        <nav className={styles.navLinks}>
          <Link href="/inicio">Inicio</Link>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
            Comunidad
          </a>
          <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer">
            Afiliate
          </a>
        </nav>

        <div className={styles.ctaHeader}>
          <a href="/register" className={styles.ctaPrimary}>
            Registrate
          </a>
          <a href="/login" className={styles.ctaSecondary}>
            Iniciar sesion
          </a>
        </div>
      </header>

      {openMenu && (
        <div className={styles.mobileMenu}>
          <Link href="/inicio" onClick={() => setOpenMenu(false)}>
            Inicio
          </Link>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpenMenu(false)}
          >
            Comunidad
          </a>
          <a
            href={AFFILIATE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpenMenu(false)}
          >
            Afiliate
          </a>
        </div>
      )}

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              QUE ESPERAS <br />
              <span>GENERA INGRESOS</span>
            </motion.h1>

            <div className={styles.heroButtons}>
              <a href="/register" className={styles.ctaPrimary}>
                Registrate ahora
              </a>
              <a href="/login" className={styles.ctaSecondary}>
                Iniciar sesion 👤
              </a>
            </div>
          </div>

          <div className={styles.heroLogoWrapper}>
            <motion.img
              src="/hero-logo.png"
              alt="Cryx AI"
              className={styles.heroLogo}
              animate={isMobile ? { x: [-140, 14, -140] } : { y: [0, 18, 0] }}
              transition={{
                duration: isMobile ? 5 : 6,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerLine} />

        <div className={styles.socials}>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/instagram.svg" alt="Instagram" width={24} height={24} />
          </a>

          <a
            href="https://www.tiktok.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/tiktok.svg" alt="TikTok" width={24} height={24} />
          </a>

          <a
            href="https://www.youtube.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src="/youtube.svg" alt="YouTube" width={24} height={24} />
          </a>
        </div>

        <span>© 2025 CRYXTEAM</span>
      </footer>
    </main>
  );
}
