// Restore saved Figma CSS and comparison results when popup opens
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['figmaCss', 'comparisonResults'], (data) => {
    if (data.figmaCss) {
      document.getElementById('figmaCss').value = data.figmaCss;
    }
    if (data.comparisonResults) {
      document.getElementById('resultsHeader').style.display = 'block';
      document.getElementById('results').innerHTML = data.comparisonResults;
    }
  });
});

// Save Figma CSS to storage whenever user types
document.getElementById('figmaCss').addEventListener('input', (e) => {
  chrome.storage.local.set({ figmaCss: e.target.value });
});

document.getElementById('selectElement').onclick = async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return new Promise((resolve) => {
          const style = document.createElement('style');
          style.innerHTML = `.css-compare-highlight { outline: 2px solid #0057b7 !important; }`;
          document.head.appendChild(style);

          function onClick(e) {
            e.preventDefault();
            e.stopPropagation();
            const el = e.target;
            el.classList.add('css-compare-highlight');
            document.removeEventListener('click', onClick, true);

            // Get computed styles as CSS
            const computed = window.getComputedStyle(el);
            const cssObj = {};
            for (let key of ['font-size', 'font-weight', 'font-family', 'color', 'background-color', 'border-width', 'border-color', 'border-style', 'margin', 'padding', 'width', 'height']) {
              cssObj[key] = computed[key];
            }

            setTimeout(() => {
              el.classList.remove('css-compare-highlight');
              style.remove();
            }, 1500);

            resolve(cssObj);
          }

          document.addEventListener('click', onClick, true);
        });
      }
    }, (results) => {
      if (results && results[0] && results[0].result) {
        compareCSS(results[0].result);
      }
    });
  });
};

// Clear button handler
document.getElementById('clearData').onclick = () => {
  document.getElementById('figmaCss').value = '';
  document.getElementById('resultsHeader').style.display = 'none';
  document.getElementById('results').innerHTML = '';
  chrome.storage.local.clear();
};

function cssStringToObject(str) {
  const obj = {};
  str.split(';').forEach(line => {
    let [key, value] = line.split(':');
    if (key && value) obj[key.trim()] = value.trim();
  });
  return obj;
}

function compareCSS(siteCssObj) {
  const figmaInput = document.getElementById("figmaCss").value;
  const figmaObj = cssStringToObject(figmaInput);

  let html = "";
  Object.keys(figmaObj).forEach(key => {
    let siteValue = siteCssObj[key] || '';
    let figmaValue = figmaObj[key];
    let css = (siteValue.replace(/\s/g, '').toLowerCase() === figmaValue.replace(/\s/g, '').toLowerCase())
      ? "match" : "diff";
    html += `<div class="${css}"><b>${key}:</b> Figma: <code>${figmaValue}</code> &rarr; Site: <code>${siteValue}</code></div>`;
  });

  // Show results header and display comparison
  document.getElementById('resultsHeader').style.display = 'block';
  document.getElementById("results").innerHTML = html;

  // Save comparison results to storage so they persist when popup reopens
  chrome.storage.local.set({ comparisonResults: html });
}
