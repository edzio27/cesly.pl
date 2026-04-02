let extractedData = null;

const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const extractBtn = document.getElementById('extractBtn');
const openBtn = document.getElementById('openBtn');

function updateStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function showPreview(data) {
  let html = '';

  if (data.description) {
    const shortDesc = data.description.substring(0, 150) + (data.description.length > 150 ? '...' : '');
    html += `<strong>Opis:</strong><p>${shortDesc}</p>`;
  }

  if (data.price) {
    html += `<strong>Cena:</strong><p>${data.price} zł</p>`;
  }

  if (data.make) {
    html += `<strong>Marka:</strong><p>${data.make}</p>`;
  }

  if (data.year) {
    html += `<strong>Rok:</strong><p>${data.year}</p>`;
  }

  if (data.images && data.images.length > 0) {
    html += `<strong>Zdjęcia (${data.images.length}):</strong>`;
    html += '<div class="images">';
    data.images.slice(0, 5).forEach(img => {
      html += `<img src="${img}" alt="Preview">`;
    });
    html += '</div>';
  }

  previewEl.innerHTML = html;
  previewEl.style.display = 'block';
}

extractBtn.addEventListener('click', async () => {
  extractBtn.disabled = true;
  extractBtn.innerHTML = '<span class="spinner"></span>Wyciągam dane...';
  updateStatus('Analizuję post...', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('facebook.com')) {
      updateStatus('Ta strona nie jest Facebookiem!', 'error');
      extractBtn.disabled = false;
      extractBtn.textContent = 'Wyciągnij dane z posta';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractData' }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatus('Błąd: Odśwież stronę Facebook i spróbuj ponownie', 'error');
        extractBtn.disabled = false;
        extractBtn.textContent = 'Wyciągnij dane z posta';
        return;
      }

      if (response.error) {
        updateStatus(response.error, 'error');
        extractBtn.disabled = false;
        extractBtn.textContent = 'Wyciągnij dane z posta';
        return;
      }

      extractedData = response;

      if (!response.description && response.images.length === 0) {
        updateStatus('Nie znaleziono danych. Czy jesteś na poście z ogłoszeniem?', 'error');
        extractBtn.disabled = false;
        extractBtn.textContent = 'Spróbuj ponownie';
        return;
      }

      updateStatus('Dane wyciągnięte pomyślnie!', 'success');
      showPreview(response);
      extractBtn.style.display = 'none';
      openBtn.style.display = 'block';
    });
  } catch (error) {
    updateStatus('Wystąpił błąd: ' + error.message, 'error');
    extractBtn.disabled = false;
    extractBtn.textContent = 'Wyciągnij dane z posta';
  }
});

openBtn.addEventListener('click', () => {
  if (!extractedData) return;

  const params = new URLSearchParams();

  if (extractedData.description) {
    params.set('description', extractedData.description);
  }

  if (extractedData.price) {
    params.set('price', extractedData.price);
  }

  if (extractedData.make) {
    params.set('make', extractedData.make);
  }

  if (extractedData.year) {
    params.set('year', extractedData.year);
  }

  if (extractedData.images && extractedData.images.length > 0) {
    params.set('images', JSON.stringify(extractedData.images));
  }

  if (extractedData.sourceUrl) {
    params.set('source_url', extractedData.sourceUrl);
  }

  const url = `https://cesly.pl/add?${params.toString()}`;

  chrome.tabs.create({ url });

  window.close();
});
