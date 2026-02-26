import {
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

export type CountryOption = {
  iso: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

function isoToFlag(iso: string) {
  return iso
    .toUpperCase()
    .split("")
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getCountryName(iso: CountryCode) {
  const display = new Intl.DisplayNames(["es"], { type: "region" });
  return display.of(iso) || iso;
}

export function buildCountryOptions(): CountryOption[] {
  return getCountries()
    .map(iso => ({
      iso,
      name: getCountryName(iso),
      dialCode: `+${getCountryCallingCode(iso)}`,
      flag: isoToFlag(iso),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function toE164(dialCode: string, rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  const cleanDial = dialCode.replace(/\D/g, "");
  return `+${cleanDial}${digits}`;
}

export function isValidPhone(dialCode: string, rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return false;
  return isPossiblePhoneNumber(toE164(dialCode, rawPhone));
}
