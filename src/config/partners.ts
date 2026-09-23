/**
 * Partner finansowy, do którego trafiają zgłoszenia z formularza leadowego.
 *
 * Dopóki jest `null`, formularz zbiera zgłoszenia WYŁĄCZNIE dla Cesly i tak
 * brzmi zgoda pod nim. Przekazanie danych osobowych podmiotowi, którego nie
 * wymieniliśmy z nazwy w chwili zbierania zgody, byłoby niezgodne z tym, na co
 * użytkownik się zgodził — dlatego nazwa partnera musi trafić tutaj ZANIM
 * zaczniemy cokolwiek komukolwiek przekazywać.
 *
 * Po uzupełnieniu dopisz partnera także do polityki prywatności, do sekcji
 * o odbiorcach danych.
 */
export type FinancingPartner = {
  /** Pełna nazwa, która pojawi się w treści zgody. */
  name: string;
  /** Opcjonalny adres strony partnera. */
  url?: string;
};

export const FINANCING_PARTNER: FinancingPartner | null = null;
