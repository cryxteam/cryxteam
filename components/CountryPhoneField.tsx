"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryOption } from "@/lib/phone";
import styles from "./CountryPhoneField.module.css";

type CountryPhoneFieldProps = {
  countries: CountryOption[];
  countryIso: string;
  phone: string;
  onCountryChange: (iso: string) => void;
  onPhoneChange: (value: string) => void;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function CountryPhoneField({
  countries,
  countryIso,
  phone,
  onCountryChange,
  onPhoneChange,
}: CountryPhoneFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCountry = countries.find(c => c.iso === countryIso) || null;

  const filteredCountries = useMemo(() => {
    const query = normalize(search.trim());
    const cleanDial = search.trim().replace(/[^\d+]/g, "");
    const hasDialQuery = cleanDial.length > 0;

    if (!query && !cleanDial) return countries;

    return countries.filter(country => {
      const byName = normalize(country.name).includes(query);
      const byIso = normalize(country.iso).includes(query);
      const byDial = hasDialQuery && country.dialCode.includes(cleanDial);
      const byDialDigits =
        hasDialQuery &&
        country.dialCode
          .replace("+", "")
          .includes(cleanDial.replace("+", ""));
      return byName || byIso || byDial || byDialDigits;
    });
  }, [countries, search]);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className={styles.wrapper} ref={rootRef}>
      <div className={styles.topRow}>
        <input
          className={styles.phoneInput}
          placeholder={
            selectedCountry
              ? `(Ejemplo 985522365) ${selectedCountry.dialCode}`
              : "Primero elige tu codigo de pais"
          }
          value={phone}
          onChange={e => onPhoneChange(e.target.value)}
          inputMode="tel"
          disabled={!selectedCountry}
          required
        />

        <button
          type="button"
          className={styles.codeButton}
          onClick={() => setOpen(v => !v)}
          aria-label="Seleccionar codigo de pais"
        >
          {selectedCountry
            ? `${selectedCountry.flag} ${selectedCountry.dialCode}`
            : "Selecciona codigo"}
        </button>
      </div>

      {open && (
        <div className={styles.dropdown}>
          <input
            className={styles.searchInput}
            placeholder="Buscar pais o codigo"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          <div className={styles.optionsList}>
            {filteredCountries.length === 0 && (
              <div className={styles.empty}>No se encontro ese pais</div>
            )}

            {filteredCountries.map(country => (
              <button
                key={country.iso}
                type="button"
                className={styles.option}
                onClick={() => {
                  onCountryChange(country.iso);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className={styles.optionLeft}>
                  {country.flag} {country.name}
                </span>
                <strong className={styles.optionRight}>{country.dialCode}</strong>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
