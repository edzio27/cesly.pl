function extractFacebookPostData() {
  const data = {
    description: '',
    images: [],
    price: '',
    sourceUrl: window.location.href
  };

  const postElement = document.querySelector('[role="article"]') || document.querySelector('[data-pagelet^="FeedUnit"]');

  if (!postElement) {
    return { error: 'Nie znaleziono posta na tej stronie' };
  }

  const textElements = postElement.querySelectorAll('[dir="auto"]');
  let fullText = '';
  textElements.forEach(el => {
    const text = el.textContent.trim();
    if (text && text.length > 20) {
      fullText += text + '\n';
    }
  });
  data.description = fullText.trim();

  const priceMatch = fullText.match(/(\d[\d\s]*)\s*(zł|pln|PLN|złotych)/i);
  if (priceMatch) {
    data.price = priceMatch[1].replace(/\s/g, '');
  }

  const images = postElement.querySelectorAll('img[src*="scontent"]');
  images.forEach(img => {
    let src = img.src;
    src = src.replace(/&_nc_cat=\d+/, '');
    src = src.replace(/\?.*$/, '');

    if (src && !data.images.includes(src) && !src.includes('emoji') && !src.includes('avatar')) {
      data.images.push(src);
    }
  });

  const makeModels = [
    'BMW', 'Mercedes', 'Audi', 'VW', 'Volkswagen', 'Ford', 'Opel', 'Toyota', 'Honda',
    'Mazda', 'Nissan', 'Volvo', 'Skoda', 'Seat', 'Renault', 'Peugeot', 'Citroen', 'Fiat'
  ];

  for (const make of makeModels) {
    const regex = new RegExp(make, 'i');
    if (regex.test(fullText)) {
      data.make = make;
      break;
    }
  }

  const yearMatch = fullText.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    data.year = yearMatch[0];
  }

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractFacebookPostData();
    sendResponse(data);
  }
  return true;
});
