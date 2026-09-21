/**
 * Katalog stron kategorii mieszka w `supabase/functions/_shared`, bo korzysta
 * z niego także funkcja brzegowa `seo-page` renderująca te same strony dla
 * crawlerów. Aplikacja sięga po niego przez ten re-eksport, żeby nie importować
 * z głębi katalogu funkcji w kilkunastu miejscach.
 */
export * from '../../supabase/functions/_shared/seoCategories';
