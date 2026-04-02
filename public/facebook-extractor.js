(function() {
  function extractFacebookPost() {
    const data = {
      text: '',
      images: [],
      url: window.location.href
    };

    const selectors = [
      '[data-ad-comet-preview="message"]',
      '[data-ad-preview="message"]',
      '[dir="auto"][style*="text-align"]',
      '.userContent',
      '[data-testid="post_message"]',
      'div[dir="auto"] > span'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText) {
        data.text = element.innerText.trim();
        break;
      }
    }

    if (!data.text) {
      const divs = document.querySelectorAll('div[dir="auto"]');
      for (const div of divs) {
        const text = div.innerText.trim();
        if (text.length > 50) {
          data.text = text;
          break;
        }
      }
    }

    const imageSelectors = [
      'img[src*="scontent"]',
      'img[src*="fbcdn"]',
      'img[data-visualcompletion="media-vc-image"]'
    ];

    const imageSet = new Set();
    for (const selector of imageSelectors) {
      const images = document.querySelectorAll(selector);
      images.forEach(img => {
        if (img.src && !img.src.includes('emoji') && !img.src.includes('static')) {
          const src = img.src.split('?')[0];
          if (src.includes('scontent') || src.includes('fbcdn')) {
            imageSet.add(src);
          }
        }
      });
    }

    data.images = Array.from(imageSet).slice(0, 10);

    if (!data.text) {
      alert('Nie znaleziono tekstu posta. Upewnij się, że jesteś na stronie z postem.');
      return null;
    }

    return data;
  }

  function sendToCesly(data) {
    const apiUrl = 'https://nuvafrdwxbzxyowrtnxp.supabase.co/functions/v1/parse-facebook-post';

    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51dmFmcmR3eGJ6eHlvd3J0bnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NzI0MzgsImV4cCI6MjA5MDA0ODQzOH0.vvnBgE7a4Mr2YsE1bs6qJBmGIzOX1qxrro8AydmKWN0'
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        window.open('https://cesly.pl/add?parsed=' + encodeURIComponent(JSON.stringify(result.data)), '_blank');
      } else {
        alert('Błąd parsowania: ' + (result.error || 'Nieznany błąd'));
      }
    })
    .catch(error => {
      alert('Błąd połączenia: ' + error.message);
    });
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:999999;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:white;padding:30px;border-radius:12px;max-width:500px;box-shadow:0 10px 40px rgba(0,0,0,0.3);';

  modal.innerHTML = `
    <h2 style="margin:0 0 20px 0;color:#333;font-size:24px;">Wyciąganie danych z posta...</h2>
    <div id="cesly-status" style="color:#666;margin-bottom:20px;">Przetwarzanie...</div>
    <button id="cesly-cancel" style="background:#e74c3c;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:16px;">Anuluj</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('cesly-cancel').onclick = function() {
    document.body.removeChild(overlay);
  };

  setTimeout(() => {
    const postData = extractFacebookPost();

    if (postData) {
      document.getElementById('cesly-status').innerHTML = `
        <div style="color:#27ae60;margin-bottom:10px;">✓ Znaleziono tekst (${postData.text.length} znaków)</div>
        <div style="color:#27ae60;margin-bottom:20px;">✓ Znaleziono ${postData.images.length} zdjęć</div>
        <div style="color:#666;">Wysyłanie do Cesly.pl...</div>
      `;

      sendToCesly(postData);

      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 2000);
    } else {
      document.body.removeChild(overlay);
    }
  }, 500);
})();
