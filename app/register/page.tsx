"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isValidPin } from "@/lib/pin";
import {
  buildCountryOptions,
  isValidPhone,
  toE164,
  type CountryOption,
} from "@/lib/phone";
import CountryPhoneField from "@/components/CountryPhoneField";
import styles from "./register.module.css";

type Particle = {
  logo: string;
  left: string;
  duration: string;
  delay: string;
  size: string;
  opacity: number;
  drift: string;
  blur: string;
  parallax: number;
};

type MessageType = "error" | "success";

export default function RegisterPage() {
  const router = useRouter();

  const WHATSAPP_LINK = "https://chat.whatsapp.com/DAq3BQwm4YgA2Ao1loPxFO";
  const AFFILIATE_NUMBER = "51929436705";
  const AFFILIATE_TEXT = encodeURIComponent(
    "Hola, que tal. Quiero afiliarme a CRYXTEAM."
  );
  const AFFILIATE_LINK = `https://wa.me/${AFFILIATE_NUMBER}?text=${AFFILIATE_TEXT}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [countryIso, setCountryIso] = useState("");
  const [phone, setPhone] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<MessageType>("error");
  const [isSessionCheckLoading, setIsSessionCheckLoading] = useState(true);
  const normalizePin = (value: string) => value.replace(/\D/g, "").slice(0, 4);
  const showError = (text: string) => {
    setMsgType("error");
    setMsg(text);
  };
  const showSuccess = (text: string) => {
    setMsgType("success");
    setMsg(text);
  };

  const particles = useMemo<Particle[]>(() => {
    const logos = [
      "spotify.png",
      "netflix.png",
      "steam.png",
      "xbox.png",
      "playstation.png",
      "youtube.png",
      "apple-music.png",
    ];

    return Array.from({ length: 44 }).map((_, i) => ({
      logo: logos[i % logos.length],
      left: `${((i * 31) + (i % 5) * 7) % 100}%`,
      duration: `${11 + ((i * 7) % 12)}s`,
      delay: `${-((i * 1.9) % 18)}s`,
      size: `${24 + ((i * 13) % 30)}px`,
      opacity: 0.2 + (((i * 17) % 55) / 100),
      drift: `${-70 + ((i * 19) % 140)}px`,
      blur: `${((i * 3) % 6) / 10}px`,
      parallax: 0.2 + (((i * 5) % 7) / 10),
    }));
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCountries(buildCountryOptions());
    });
    return () => cancelAnimationFrame(id);
  }, []);

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

  const selectedCountry = countries.find(c => c.iso === countryIso) || null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");

    if (!isValidPin(pin)) {
      showError("El codigo de compra debe tener 4 digitos");
      return;
    }

    if (!selectedCountry) {
      showError("Selecciona un codigo de pais");
      return;
    }

    if (!isValidPhone(selectedCountry.dialCode, phone)) {
      showError("Numero de telefono invalido");
      return;
    }

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      showError("Ingresa un usuario valido");
      return;
    }

    const phoneE164 = toE164(selectedCountry.dialCode, phone);

    const { data, error } = await supabase.auth.signUp({
      email: `${cleanUsername}@local.app`,
      password,
    });

    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes("database error granting user")) {
        showError(
          "No se pudo crear el usuario en Auth (Database error granting user). Revisa la configuracion de Auth/DB en Supabase."
        );
        return;
      }
      if (error?.message?.toLowerCase().includes("already")) {
        showError("Ese usuario ya existe");
        return;
      }
      showError(error?.message || "Error al crear cuenta");
      return;
    }

    const { error: insertProfileError } = await supabase.from("profiles").insert([
      {
        id: data.user.id,
        username: cleanUsername,
        purchase_pin: pin,
        is_approved: false,
        phone_e164: phoneE164,
        country_iso: selectedCountry.iso,
        country_dial: selectedCountry.dialCode,
      },
    ]);

    if (insertProfileError) {
      if (
        insertProfileError.code === "23505" ||
        insertProfileError.message?.toLowerCase().includes("duplicate")
      ) {
        showError("Ese usuario ya existe");
        return;
      }
      showError(
        "Cuenta creada, pero no se pudo guardar el perfil. Revisa permisos y columnas en profiles."
      );
      return;
    }

    await supabase.auth.signOut();
    showSuccess("Cuenta creada. Espera aprobacion del owner.");
    setTimeout(() => router.push("/login"), 1500);
  };

  if (isSessionCheckLoading) {
    return <div className={styles.page} />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.left}>
          <Image
            src="/logo.png"
            alt="CRYXTEAM"
            width={200}
            height={200}
            className={styles.logo}
          />
          <span className={styles.brand}>CRYXTEAM</span>
        </Link>

        <nav className={styles.nav}>
          <button className={styles.navItem} onClick={() => router.push("/inicio")}>
            Inicio
          </button>
          <button
            className={styles.navItem}
            onClick={() => window.open(WHATSAPP_LINK, "_blank")}
          >
            Comunidad
          </button>
          <button
            className={styles.navItem}
            onClick={() => window.open(AFFILIATE_LINK, "_blank")}
          >
            Afiliate
          </button>
        </nav>

        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          <button onClick={() => router.push("/inicio")}>Inicio</button>
          <button onClick={() => window.open(WHATSAPP_LINK, "_blank")}>
            Comunidad
          </button>
          <button onClick={() => window.open(AFFILIATE_LINK, "_blank")}>
            Afiliate
          </button>
        </div>
      )}

      <div
        className={styles.particles}
        onMouseMove={e => {
          const x = (e.clientX / window.innerWidth - 0.5) * 24;
          const y = (e.clientY / window.innerHeight - 0.5) * 24;
          document.documentElement.style.setProperty("--px", `${x}px`);
          document.documentElement.style.setProperty("--py", `${y}px`);
        }}
      >
        {particles.map((p, i) => (
          <span
            key={i}
            className={styles.logoParticle}
            style={
              {
                backgroundImage: `url(/particles/${p.logo})`,
                left: p.left,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                ["--fall-duration" as string]: p.duration,
                ["--fall-delay" as string]: p.delay,
                ["--drift" as string]: p.drift,
                ["--blur" as string]: p.blur,
                ["--parallax" as string]: p.parallax,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <main className={styles.cardWrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>Unete a CRYXTEAM</p>

          <form className={styles.form} onSubmit={handleRegister}>
            <label className={styles.fieldLabel} htmlFor="register-username">
              Escribe tu usuario:
            </label>
            <input
              id="register-username"
              className={styles.input}
              placeholder="Tu usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />

            <label className={styles.fieldLabel} htmlFor="register-password">
              Escribe tu contraseña:
            </label>
            <div className={styles.passwordBox}>
              <input
                id="register-password"
                className={styles.input}
                type={show ? "text" : "password"}
                placeholder="Tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShow(s => !s)}
              >
                {show ? "🙈" : "👁️"}
              </button>
            </div>

            <label className={styles.fieldLabel} htmlFor="register-pin">
              Escribe tu codigo de compra:
            </label>
            <input
              id="register-pin"
              className={styles.input}
              placeholder="Codigo de 4 digitos"
              value={pin}
              onChange={e => setPin(normalizePin(e.target.value))}
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              required
            />

            <label className={styles.fieldLabel}>
              Escribe tu telefono (primero elige codigo de pais):
            </label>
            <CountryPhoneField
              countries={countries}
              countryIso={countryIso}
              phone={phone}
              onCountryChange={setCountryIso}
              onPhoneChange={setPhone}
            />

            <button className={styles.mainBtn} type="submit">
              Crear cuenta
            </button>
          </form>

          {msg && (
            <div
              className={`${styles.message} ${msgType === "success" ? styles.success : styles.error}`}
            >
              {msg}
            </div>
          )}

          <p className={styles.link}>
            Ya tienes cuenta?{" "}
            <span onClick={() => router.push("/login")}>Inicia sesion</span>
          </p>
        </div>
      </main>
    </div>
  );
}
