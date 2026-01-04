// Store for selected element CSS
let selectedElementCSS = null;

// Restore saved Figma CSS and results when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['figmaCss', 'selectedElementCSS', 'comparisonResults', 'resultsTitle'], (data) => {
        if (data.figmaCss) {
            document.getElementById('figmaCss').value = data.figmaCss;
        }
        if (data.selectedElementCSS) {
            selectedElementCSS = data.selectedElementCSS;
        }
        if (data.comparisonResults) {
            document.getElementById('resultsHeader').style.display = 'block';
            document.getElementById('resultsTitle').textContent = data.resultsTitle || '📊 Selected Element CSS';
            document.getElementById('results').innerHTML = data.comparisonResults;
        }
    });
});

// Save Figma CSS to storage whenever user types
document.getElementById('figmaCss').addEventListener('input', (e) => {
    chrome.storage.local.set({ figmaCss: e.target.value });
});

// Step 1: Select Element - Extract ALL CSS properties
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

                        // Get ALL computed styles from the element
                        const computed = window.getComputedStyle(el);
                        const cssObj = {};

                        // Extract all CSS properties (limited to common ones for readability)
                        const commonProps = [
                            'display', 'flex-direction', 'align-items', 'justify-content',
                            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'gap', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
                            'background-color', 'background', 'color',
                            'border', 'border-width', 'border-style', 'border-color', 'border-radius',
                            'font-family', 'font-size', 'font-weight', 'line-height', 'text-align',
                            'box-shadow', 'cursor', 'position', 'top', 'right', 'bottom', 'left',
                            'z-index', 'opacity', 'overflow', 'overflow-x', 'overflow-y'
                        ];

                        commonProps.forEach(key => {
                            const value = computed.getPropertyValue(key);
                            if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
                                cssObj[key] = value;
                            }
                        });

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
                selectedElementCSS = results[0].result;
                // Save to storage
                chrome.storage.local.set({ selectedElementCSS: selectedElementCSS });
                // Display the selected element CSS
                displayElementCSS(selectedElementCSS);
            }
        });
    });
};

// Step 3: Compare CSS - Compare Figma CSS with selected element
document.getElementById('compareBtn').onclick = () => {
    if (!selectedElementCSS) {
        // Show error message
        document.getElementById('resultsHeader').style.display = 'block';
        document.getElementById('resultsTitle').textContent = '⚠️ Error';
        document.getElementById('results').innerHTML = '<div class="diff"><b>Please select a website element first (Step 1)</b></div>';
        chrome.storage.local.set({
            resultsTitle: '⚠️ Error',
            comparisonResults: '<div class="diff"><b>Please select a website element first (Step 1)</b></div>'
        });
        return;
    }

    const figmaInput = document.getElementById('figmaCss').value;
    if (!figmaInput.trim()) {
        // Show error message
        document.getElementById('resultsHeader').style.display = 'block';
        document.getElementById('resultsTitle').textContent = '⚠️ Error';
        document.getElementById('results').innerHTML = '<div class="diff"><b>Please paste Figma CSS code first (Step 2)</b></div>';
        chrome.storage.local.set({
            resultsTitle: '⚠️ Error',
            comparisonResults: '<div class="diff"><b>Please paste Figma CSS code first (Step 2)</b></div>'
        });
        return;
    }

    compareCSS(selectedElementCSS);
};

// Clear button handler
document.getElementById('clearData').onclick = () => {
    document.getElementById('figmaCss').value = '';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('results').innerHTML = '';
    selectedElementCSS = null;
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

function displayElementCSS(siteCssObj) {
    let html = "";
    Object.keys(siteCssObj).forEach(key => {
        html += `<div class="match"><b>${key}:</b> <code>${siteCssObj[key]}</code></div>`;
    });

    // Show results header and display element CSS
    document.getElementById('resultsHeader').style.display = 'block';
    document.getElementById('resultsTitle').textContent = '📊 Selected Element CSS';
    document.getElementById('results').innerHTML = html;

    // Save to storage
    chrome.storage.local.set({
        resultsTitle: '📊 Selected Element CSS',
        comparisonResults: html
    });
}

function compareCSS(siteCssObj) {
    const figmaInput = document.getElementById("figmaCss").value;
    const figmaObj = cssStringToObject(figmaInput);

    let html = "";
    Object.keys(figmaObj).forEach(key => {
        let siteValue = siteCssObj[key] || '';
        let figmaValue = figmaObj[key];

        // Display "(not set)" if website value is empty
        let displaySiteValue = siteValue.trim() === '' ? '(not set)' : siteValue;

        let css = (siteValue.replace(/\s/g, '').toLowerCase() === figmaValue.replace(/\s/g, '').toLowerCase())
            ? "match" : "diff";
        html += `<div class="${css}"><b>${key}:</b> Figma: <code>${figmaValue}</code> &rarr; Site: <code>${displaySiteValue}</code></div>`;
    });

    // Show results header and display comparison
    document.getElementById('resultsHeader').style.display = 'block';
    document.getElementById('resultsTitle').textContent = '📊 CSS Comparison Results';
    document.getElementById("results").innerHTML = html;

    // Save comparison results to storage so they persist when popup reopens
    chrome.storage.local.set({
        resultsTitle: '📊 CSS Comparison Results',
        comparisonResults: html
    });
}
