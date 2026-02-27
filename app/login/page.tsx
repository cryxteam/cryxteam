"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
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
import styles from "./login.module.css";

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

type ProfileLoginRow = {
  purchase_pin: string;
  phone_e164: string | null;
  is_approved: boolean;
};

type MessageType = "error" | "success";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      appearance?: "always" | "execute" | "interaction-only";
    }
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const turnstileSiteKey = (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAACi75ZwU7Wr-i6Qz"
  ).trim();

  const WHATSAPP_LINK = "https://chat.whatsapp.com/DAq3BQwm4YgA2Ao1loPxFO";
  const AFFILIATE_NUMBER = "51929436705";
  const AFFILIATE_TEXT = encodeURIComponent("Hola, que tal. Quiero afiliarme a CRYXTEAM.");
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
  const [step, setStep] = useState<"credentials" | "pin">("credentials");
  const [expectedPin, setExpectedPin] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);
  const [isSessionCheckLoading, setIsSessionCheckLoading] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);

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
      left: `${(i * 31 + (i % 5) * 7) % 100}%`,
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

  const resetTurnstile = useCallback((clearVerified: boolean = true) => {
    setTurnstileToken("");
    if (clearVerified) {
      setIsTurnstileVerified(false);
    }
    if (window.turnstile && turnstileWidgetId.current) {
      window.turnstile.reset(turnstileWidgetId.current);
    }
  }, []);

  const renderTurnstile = useCallback(() => {
    if (!turnstileSiteKey || !turnstileRef.current || turnstileWidgetId.current) return;
    if (!window.turnstile) return;

    turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      theme: "dark",
      appearance: "always",
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      "expired-callback": () => {
        setTurnstileToken("");
        setIsTurnstileVerified(false);
      },
      "error-callback": () => {
        setTurnstileToken("");
        setIsTurnstileVerified(false);
      },
    });
  }, [turnstileSiteKey]);

  const verifyTurnstileToken = useCallback(async () => {
    if (!turnstileSiteKey) {
      showError("Falta configurar Turnstile en el frontend.");
      return false;
    }

    if (!turnstileToken) {
      showError("Completa el captcha de seguridad.");
      return false;
    }

    try {
      const response = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; errors?: string[] }
        | null;

      if (!response.ok || !payload?.success) {
        const code = payload?.errors?.[0] ?? "turnstile-failed";
        showError(`No se pudo validar el captcha (${code}). Intenta de nuevo.`);
        resetTurnstile();
        return false;
      }

      return true;
    } catch {
      showError("No se pudo validar el captcha por red.");
      resetTurnstile();
      return false;
    }
  }, [resetTurnstile, turnstileSiteKey, turnstileToken]);

  useEffect(() => {
    if (step !== "credentials") return;
    const intervalId = window.setInterval(() => {
      renderTurnstile();
    }, 250);
    renderTurnstile();
    return () => {
      window.clearInterval(intervalId);
    };
  }, [renderTurnstile, step]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setIsSubmittingCredentials(true);

    try {
      if (!selectedCountry) {
        showError("Selecciona un codigo de pais");
        return;
      }

      if (!isValidPhone(selectedCountry.dialCode, phone)) {
        showError("Numero de telefono invalido");
        return;
      }

      const captchaOk = await verifyTurnstileToken();
      if (!captchaOk) return;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username.trim()}@local.app`,
        password,
      });

      if (error || !data.user) {
        const authMessage = error?.message?.toLowerCase() ?? "";
        if (authMessage.includes("database error granting user") || authMessage.includes("unexpected_failure")) {
          showError("No se pudo iniciar sesion. Si ya te registraste, espera aprobacion del owner.");
          return;
        }
        showError("Usuario o contrasena incorrectos");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("purchase_pin, phone_e164, is_approved")
        .eq("id", data.user.id)
        .maybeSingle<ProfileLoginRow>();

      if (profileError) {
        await supabase.auth.signOut();
        const profileMessage = (profileError.message || "").toLowerCase();
        if (profileMessage.includes("column") && profileMessage.includes("approved")) {
          showError("Error de base de datos: aun hay una policy usando 'approved'. Debe usar 'is_approved'.");
          return;
        }
        if (
          profileMessage.includes("permission denied") ||
          profileMessage.includes("row-level security") ||
          profileMessage.includes("policy")
        ) {
          showError("No se pudo leer tu perfil por permisos (RLS). Revisa las policies de profiles.");
          return;
        }
        showError(`No se pudo cargar tu perfil: ${profileError.message}`);
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();
        showError("No se encontro tu perfil o aun no tienes permisos. Si te acabas de registrar, espera aprobacion.");
        return;
      }

      if (!profile.is_approved) {
        await supabase.auth.signOut();
        showError("Tu cuenta aun no esta aprobada por el owner");
        return;
      }

      const inputPhone = toE164(selectedCountry.dialCode, phone);
      if (!profile.phone_e164 || profile.phone_e164 !== inputPhone) {
        await supabase.auth.signOut();
        showError("Telefono o codigo de pais incorrecto");
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        showError("No se pudo preparar la verificacion final. Intenta otra vez.");
        return;
      }

      setExpectedPin(profile.purchase_pin.trim());
      setPin("");
      setIsTurnstileVerified(true);
      setStep("pin");
      showSuccess("Datos correctos. Ahora ingresa tu codigo de compra.");
    } finally {
      resetTurnstile(false);
      setIsSubmittingCredentials(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setIsSubmittingPin(true);

    try {
      if (!isTurnstileVerified) {
        showError("Vuelve al paso anterior y completa el captcha.");
        setStep("credentials");
        return;
      }

      if (!isValidPin(pin)) {
        showError("Ingresa tu codigo de compra de 4 digitos");
        return;
      }

      if (!expectedPin || pin !== expectedPin) {
        showError("Codigo de compra incorrecto");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username.trim()}@local.app`,
        password,
      });

      if (error || !data.user) {
        setExpectedPin(null);
        setPin("");
        setStep("credentials");
        setIsTurnstileVerified(false);
        showError("Tu sesion caduco. Vuelve a iniciar sesion.");
        return;
      }

      const { data: verifiedProfile, error: verifiedProfileError } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", data.user.id)
        .maybeSingle<{ is_approved: boolean }>();

      if (verifiedProfileError || !verifiedProfile) {
        await supabase.auth.signOut();
        setExpectedPin(null);
        setPin("");
        setStep("credentials");
        setIsTurnstileVerified(false);
        showError("No se pudo validar la aprobacion de tu cuenta");
        return;
      }

      if (!verifiedProfile.is_approved) {
        await supabase.auth.signOut();
        setExpectedPin(null);
        setPin("");
        setStep("credentials");
        setIsTurnstileVerified(false);
        showError("Tu cuenta aun no esta aprobada por el owner");
        return;
      }

      showSuccess("Acceso correcto. Entrando a inicio...");
      router.push("/inicio");
    } catch {
      showError("No se pudo completar el ingreso. Intenta otra vez.");
    } finally {
      resetTurnstile();
      setIsSubmittingPin(false);
    }
  };

  async function backToCredentials() {
    await supabase.auth.signOut();
    setExpectedPin(null);
    setPin("");
    setStep("credentials");
    resetTurnstile();
    setMsg("");
  }

  if (isSessionCheckLoading) {
    return <div className={styles.page} />;
  }

  return (
    <div className={styles.page}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          renderTurnstile();
        }}
      />

      <header className={styles.header}>
        <Link href="/" className={styles.left}>
          <Image src="/logo.png" alt="CRYXTEAM" width={200} height={200} className={styles.logo} />
          <span className={styles.brand}>CRYXTEAM</span>
        </Link>

        <nav className={styles.nav}>
          <button className={styles.navItem} onClick={() => router.push("/inicio")}>
            Inicio
          </button>
          <button className={styles.navItem} onClick={() => window.open(WHATSAPP_LINK, "_blank")}>
            Comunidad
          </button>
          <button className={styles.navItem} onClick={() => window.open(AFFILIATE_LINK, "_blank")}>
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
          <button onClick={() => window.open(WHATSAPP_LINK, "_blank")}>Comunidad</button>
          <button onClick={() => window.open(AFFILIATE_LINK, "_blank")}>Afiliate</button>
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
          <h1 className={styles.title}>Iniciar sesion</h1>
          <p className={styles.subtitle}>Accede a CRYXTEAM</p>

          {step === "credentials" ? (
            <form className={styles.form} onSubmit={handleCredentialsLogin}>
              <label className={styles.fieldLabel} htmlFor="login-username">
                Escribe tu usuario:
              </label>
              <input
                id="login-username"
                className={styles.input}
                placeholder="Tu usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />

              <label className={styles.fieldLabel} htmlFor="login-password">
                Escribe tu contrasena:
              </label>
              <div className={styles.passwordBox}>
                <input
                  id="login-password"
                  className={styles.input}
                  type={show ? "text" : "password"}
                  placeholder="Tu contrasena"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className={styles.eye} onClick={() => setShow(s => !s)}>
                  {show ? "Ocultar" : "Ver"}
                </button>
              </div>

              <label className={styles.fieldLabel}>Escribe tu telefono (primero elige codigo de pais):</label>
              <CountryPhoneField
                countries={countries}
                countryIso={countryIso}
                phone={phone}
                onCountryChange={setCountryIso}
                onPhoneChange={setPhone}
              />

              <div className={styles.turnstileWrap}>
                {turnstileSiteKey ? (
                  <div ref={turnstileRef} className={styles.turnstileBox} />
                ) : (
                  <p className={styles.turnstileHint}>Falta configurar NEXT_PUBLIC_TURNSTILE_SITE_KEY.</p>
                )}
                {turnstileSiteKey && !turnstileToken && (
                  <p className={styles.turnstileHint}>Completa el captcha para continuar.</p>
                )}
              </div>

              <button
                className={styles.mainBtn}
                type="submit"
                disabled={isSubmittingCredentials || !turnstileToken || !turnstileSiteKey}
              >
                {isSubmittingCredentials ? "Validando..." : "Iniciar sesion"}
              </button>
            </form>
          ) : (
            <div className={styles.pinCard}>
              <h2 className={styles.pinTitle}>Verificacion final</h2>
              <p className={styles.pinText}>Tus datos son correctos. Ingresa ahora tu codigo de compra.</p>
              <form className={styles.form} onSubmit={handlePinLogin}>
                <label className={styles.fieldLabel} htmlFor="login-pin">
                  Escribe tu codigo de compra:
                </label>
                <input
                  id="login-pin"
                  className={styles.input}
                  placeholder="PIN de 4 digitos"
                  value={pin}
                  onChange={e => setPin(normalizePin(e.target.value))}
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                />

                <div className={styles.pinActions}>
                  <button className={styles.mainBtn} type="submit" disabled={isSubmittingPin}>
                    {isSubmittingPin ? "Validando..." : "Entrar a inicio"}
                  </button>
                  <button className={styles.secondaryBtn} type="button" onClick={backToCredentials} disabled={isSubmittingPin}>
                    Cambiar datos
                  </button>
                </div>
              </form>
            </div>
          )}

          {msg && (
            <div className={`${styles.message} ${msgType === "success" ? styles.success : styles.error}`}>
              {msg}
            </div>
          )}

          <p className={styles.link}>
            No tienes cuenta? <span onClick={() => router.push("/register")}>Registrate</span>
          </p>
        </div>
      </main>
    </div>
  );
}
