# Cesly - Rozszerzenie Chrome

Rozszerzenie Chrome do szybkiego dodawania ogłoszeń z Facebooka do Cesly.

## Instalacja

### 1. Przygotuj ikony

⚠️ **WAŻNE:** Przed instalacją musisz dodać ikony! Zobacz szczegóły w pliku `IKONY-INSTRUKCJA.txt`

Rozszerzenie wymaga trzech ikon:
- `icon16.png` (16x16 px)
- `icon48.png` (48x48 px)
- `icon128.png` (128x128 px)

**Najszybsza metoda - placeholder:**
1. Pobierz z przeglądarki:
   - https://via.placeholder.com/128/1e40af/ffffff?text=C → zapisz jako `icon128.png`
   - https://via.placeholder.com/48/1e40af/ffffff?text=C → zapisz jako `icon48.png`
   - https://via.placeholder.com/16/1e40af/ffffff?text=C → zapisz jako `icon16.png`
2. Wszystkie 3 pliki skopiuj do folderu `chrome-extension/`

**Lub użyj logo Cesly:**
- Zmień rozmiar `cesly_logo_cropped_tight_v2.png` na wymagane rozmiary
- Użyj narzędzia online jak https://www.iloveimg.com/resize-image

### 2. Zainstaluj rozszerzenie w Chrome

1. Otwórz Chrome i wejdź na: `chrome://extensions/`
2. Włącz **Tryb programisty** (przełącznik w prawym górnym rogu)
3. Kliknij **Załaduj rozpakowane**
4. Wybierz folder `chrome-extension` z tego projektu
5. Gotowe! Rozszerzenie powinno się pojawić w pasku narzędzi Chrome

## Jak używać

1. Otwórz Facebooka i wejdź na post z ogłoszeniem (w grupie lub na profilu)
2. Kliknij ikonę rozszerzenia Cesly w pasku narzędzi Chrome
3. Kliknij **"Wyciągnij dane z posta"**
4. Rozszerzenie automatycznie wykryje:
   - Opis ogłoszenia
   - Zdjęcia
   - Cenę (jeśli jest w tekście)
   - Markę auta (jeśli jest w tekście)
   - Rok produkcji (jeśli jest w tekście)
5. Sprawdź podgląd i kliknij **"Otwórz formularz na Cesly"**
6. Formularz na Cesly.pl otworzy się z wypełnionymi danymi!

## Co robi rozszerzenie?

- **Wykrywa dane z postów na Facebooku** - automatycznie wyciąga tekst, zdjęcia i metadane
- **Rozpoznaje cenę** - znajduje ceny w formacie "1000 zł", "2000 PLN", itp.
- **Wykrywa markę auta** - rozpoznaje popularne marki (BMW, Mercedes, Audi, itp.)
- **Wyciąga rok** - znajduje rok produkcji (np. 2015, 2020)
- **Pobiera zdjęcia w wysokiej jakości** - automatycznie znajduje wszystkie zdjęcia z posta
- **Przekazuje źródło** - zapisuje link do oryginalnego posta na FB

## Problemy?

### "Nie znaleziono posta"
- Upewnij się, że jesteś na stronie z postem, nie w feedzie głównym
- Spróbuj kliknąć na post, żeby go otworzyć w pełnym widoku

### "Odśwież stronę Facebook"
- Facebook dynamicznie ładuje zawartość - czasami trzeba odświeżyć stronę (F5)

### Nie wykrywa wszystkich danych
- Rozszerzenie działa najlepiej z postami zawierającymi jasno sformatowane ogłoszenia
- Możesz ręcznie uzupełnić brakujące dane w formularzu na Cesly

## Rozwój

Możliwe ulepszenia:
- Lepsza detekcja modeli aut
- Wykrywanie przebiegu
- Support dla innych platform (OLX, Otomoto)
- Automatyczne tagowanie
