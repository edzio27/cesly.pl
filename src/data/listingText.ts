/**
 * Re-eksport generatora opisu i czyszczenia danych osobowych. Panel moderacji
 * składa opis ponownie przy publikacji, bo moderator może poprawić liczby —
 * musi więc używać dokładnie tej samej funkcji co import.
 */
export * from '../../supabase/functions/_shared/listingText';
