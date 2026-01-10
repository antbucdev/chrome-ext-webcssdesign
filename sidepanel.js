// Store for selected element CSS
let selectedElementCSS = null;

// Restore saved state when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['figmaCss', 'selectedElementCSS', 'comparisonResults', 'resultsTitle', 'darkMode'], (data) => {
        // Restore inputs
        if (data.figmaCss) {
            document.getElementById('figmaCss').value = data.figmaCss;
        }
        if (data.selectedElementCSS) {
            selectedElementCSS = data.selectedElementCSS;
        }

        // Restore results view
        if (data.comparisonResults) {
            document.getElementById('resultsHeader').style.display = 'block';
            document.getElementById('resultsTitle').textContent = data.resultsTitle || '📊 Selected Element CSS';
            document.getElementById('results').innerHTML = data.comparisonResults;
        }

        // Restore Dark Mode
        if (data.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('checkbox').checked = true;
        }
    });
});

// Dark Mode Toggle
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
toggleSwitch.addEventListener('change', function (e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        chrome.storage.local.set({ darkMode: true });
    } else {
        document.body.classList.remove('dark-mode');
        chrome.storage.local.set({ darkMode: false });
    }
});

// Settings Modal Logic
const modal = document.getElementById("settingsModal");
const btn = document.getElementById("settingsBtn");
const span = document.getElementsByClassName("close")[0];

btn.onclick = function () {
    modal.style.display = "block";
}

span.onclick = function () {
    modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Save Figma CSS properties whenever user types
document.getElementById('figmaCss').addEventListener('input', (e) => {
    chrome.storage.local.set({ figmaCss: e.target.value });
});

// Step 1: Select Element logic
document.getElementById('selectElement').onclick = async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                return new Promise((resolve) => {
                    const style = document.createElement('style');
                    style.innerHTML = `
                        .css-compare-highlight { 
                            outline: 2px solid #0057b7 !important; 
                            z-index: 10000 !important;
                        }
                        .css-compare-hover {
                            outline: 2px dashed #4a90e2 !important;
                            cursor: default !important;
                            z-index: 10000 !important;
                        }
                        .css-compare-hover-actionable {
                            outline: 2px solid #ff9900 !important;
                            cursor: default !important;
                            z-index: 10000 !important;
                        }
                        #css-compare-tooltip {
                            position: fixed;
                            z-index: 2147483647;
                            background: rgba(0, 0, 0, 0.9);
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-family: Consolas, Monaco, monospace;
                            font-size: 12px;
                            pointer-events: none;
                            display: none;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                            white-space: nowrap;
                        }
                        #css-compare-tooltip .tag { color: #f28b82; font-weight: bold; }
                        #css-compare-tooltip .id { color: #fbbc04; }
                        #css-compare-tooltip .class { color: #8ab4f8; }
                        #css-compare-tooltip .dim { color: #bdc1c6; margin-left: 5px; }
                    `;
                    document.head.appendChild(style);

                    // Create tooltip
                    const tooltip = document.createElement('div');
                    tooltip.id = 'css-compare-tooltip';
                    document.body.appendChild(tooltip);

                    let currentHovered = null;

                    function isActionable(el) {
                        const tag = el.tagName.toLowerCase();
                        const actionableTags = ['a', 'button', 'input', 'select', 'textarea', 'label'];
                        if (actionableTags.includes(tag)) return true;

                        // Check for cursor: pointer
                        const computed = window.getComputedStyle(el);
                        return computed.cursor === 'pointer';
                    }

                    // Helper to clear hover classes
                    function clearHover() {
                        const hovered = document.querySelectorAll('.css-compare-hover, .css-compare-hover-actionable');
                        hovered.forEach(el => {
                            el.classList.remove('css-compare-hover');
                            el.classList.remove('css-compare-hover-actionable');
                        });
                        tooltip.style.display = 'none';
                    }

                    function updateTooltip(el) {
                        const tag = el.tagName.toLowerCase();
                        const id = el.id ? '#' + el.id : '';
                        const classes = Array.from(el.classList)
                            .filter(c => !c.startsWith('css-compare-'))
                            .map(c => '.' + c)
                            .join('');

                        const rect = el.getBoundingClientRect();
                        const width = Math.round(rect.width * 100) / 100;
                        const height = Math.round(rect.height * 100) / 100;

                        tooltip.innerHTML = `
                            <span class="tag">${tag}</span><span class="id">${id}</span><span class="class">${classes}</span>
                            <span class="dim">${width} x ${height}</span>
                        `;

                        tooltip.style.display = 'block';

                        // Position tooltip
                        const tooltipRect = tooltip.getBoundingClientRect();
                        let top = rect.top - tooltipRect.height - 5;
                        let left = rect.left;

                        // Keep within viewport
                        if (top < 0) top = rect.bottom + 5;
                        if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 5;
                        if (left < 0) left = 5;

                        tooltip.style.top = top + 'px';
                        tooltip.style.left = left + 'px';
                    }

                    function onMouseOver(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Clear previous hover
                        clearHover();

                        const el = e.target;
                        currentHovered = el;

                        if (isActionable(el)) {
                            el.classList.add('css-compare-hover-actionable');
                        } else {
                            el.classList.add('css-compare-hover');
                        }

                        updateTooltip(el);
                    }

                    function onMouseOut(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const el = e.target;
                        el.classList.remove('css-compare-hover');
                        el.classList.remove('css-compare-hover-actionable');
                        tooltip.style.display = 'none';
                    }

                    function onClick(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // Use the current hovered element or target
                        const el = currentHovered || e.target;

                        // Clear hover effects
                        clearHover();

                        // Apply final highlight
                        el.classList.add('css-compare-highlight');

                        // Cleanup listeners and elements
                        document.removeEventListener('click', onClick, true);
                        document.removeEventListener('mouseover', onMouseOver, true);
                        document.removeEventListener('mouseout', onMouseOut, true);
                        tooltip.remove();

                        // Get computed styles
                        const computed = window.getComputedStyle(el);
                        const cssObj = {};

                        // Common properties to extract
                        const commonProps = [
                            'display', 'flex-direction', 'align-items', 'justify-content',
                            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'gap', 'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
                            'background-color', 'background', 'color',
                            'border', 'border-width', 'border-style', 'border-color', 'border-radius',
                            'font-family', 'font-size', 'font-weight', 'line-height', 'text-align',
                            'box-shadow', 'cursor', 'position', 'top', 'right', 'bottom', 'left',
                            'z-index', 'opacity', 'overflow', 'overflow-x', 'overflow-y', 'letter-spacing'
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

                    // Use capture to ensuring we get the event first
                    document.addEventListener('mouseover', onMouseOver, true);
                    document.addEventListener('mouseout', onMouseOut, true);
                    document.addEventListener('click', onClick, true);
                });
            }
        }, (results) => {
            if (results && results[0] && results[0].result) {
                selectedElementCSS = results[0].result;
                chrome.storage.local.set({ selectedElementCSS: selectedElementCSS });
                displayElementCSS(selectedElementCSS);
            }
        });
    });
};

// Compare Logic
document.getElementById('compareBtn').onclick = () => {
    if (!selectedElementCSS) {
        showError('Please select a website element first (Step 1)');
        return;
    }
    const figmaInput = document.getElementById('figmaCss').value;
    if (!figmaInput.trim()) {
        showError('Please paste Figma CSS code first (Step 2)');
        return;
    }
    compareCSS(selectedElementCSS);
};

// Clear Data
document.getElementById('clearData').onclick = () => {
    document.getElementById('figmaCss').value = '';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('results').innerHTML = '';
    selectedElementCSS = null;
    chrome.storage.local.clear();
    // Keep dark mode state
    if (document.body.classList.contains('dark-mode')) {
        chrome.storage.local.set({ darkMode: true });
    }
};

/**
 * Parses Figma CSS string. Cleaning:
 * 1. Ignores lines starting with -- or //
 * 2. Only captures valid prop: value pairs
 */
function cssStringToObject(str) {
    const obj = {};
    const lines = str.split(';');

    lines.forEach(line => {
        line = line.trim();
        // Ignore empty lines, comments, or CSS variables often pasted from Figma dev mode
        // Figma dev mode sometimes outputs: /* layer name */ or --variable: #color
        if (!line || line.startsWith('/*') || (line.startsWith('--') && !line.includes(':'))) return;

        if (line.includes(':')) {
            // Split by first colon only
            const parts = line.split(':');
            const key = parts[0].trim();
            let value = parts.slice(1).join(':').trim();

            // Clean up Figma comments at end of line like " /* secondary */"
            value = value.replace(/\/\*.*\*\//g, '').trim();

            if (key && value) {
                obj[key.toLowerCase()] = value;
            }
        } else {
            // Check for standalone hex code (with optional semicolon)
            // Regex for #123, #123456, #12345678 (alpha)
            const hexMatch = line.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8});?$/);
            if (hexMatch) {
                // If it's a raw hex code, assume it's a color
                let val = hexMatch[0];
                if (val.endsWith(';')) val = val.slice(0, -1);
                obj['color'] = val;
            }
        }
    });
    return obj;
}

/**
 * Converts RGB/RGBA string to Hex.
 * e.g. "rgb(255, 0, 0)" -> "#ff0000"
 */
function rgbToHex(rgb) {
    // If already hex or not rgb/rgba, return as is
    if (!rgb || (!rgb.startsWith('rgb') && !rgb.startsWith('rgba'))) return rgb;

    const sep = rgb.indexOf(",") > -1 ? "," : " ";
    const parts = rgb.substring(rgb.indexOf("(") + 1).split(")")[0].split(sep);

    // Extract r, g, b, (a)
    const r = parseInt(parts[0]);
    const g = parseInt(parts[1]);
    const b = parseInt(parts[2]);
    let a = parts[3];

    if (isNaN(r) || isNaN(g) || isNaN(b)) return rgb;

    function componentToHex(c) {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    let hex = "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);

    // Handle alpha if present
    if (a !== undefined) {
        a = parseFloat(a);
        if (!isNaN(a) && a < 1) {
            const alpha = Math.round(a * 255);
            hex += componentToHex(alpha);
        }
    }

    return hex;
}

/**
 * Converts rem to px (assuming 16px root).
 * e.g. "1.5rem" -> "24px"
 */
function normalizeValue(value) {
    if (!value) return '';
    let val = value.toString().trim().toLowerCase();

    // Convert rem to px
    if (val.endsWith('rem')) {
        const floatVal = parseFloat(val);
        if (!isNaN(floatVal)) {
            val = (floatVal * 16) + 'px';
        }
    }

    // Convert rgb/rgba to hex
    if (val.startsWith('rgb')) {
        val = rgbToHex(val);
    }

    // Remove spacing
    return val.replace(/\s/g, '');
}

function displayElementCSS(siteCssObj) {
    let html = "";
    Object.keys(siteCssObj).forEach(key => {
        html += `<div class="match"><b>${key}:</b> <code>${siteCssObj[key]}</code></div>`;
    });
    updateResults('📊 Selected Element CSS', html);
}

function compareCSS(siteCssObj) {
    const figmaInput = document.getElementById("figmaCss").value;
    const figmaObj = cssStringToObject(figmaInput);

    let html = "";
    Object.keys(figmaObj).forEach(key => {
        let siteValue = siteCssObj[key] || '';
        let figmaValue = figmaObj[key];

        // Normalize for comparison
        const normSite = normalizeValue(siteValue);
        const normFigma = normalizeValue(figmaValue);

        let cssClass = "";
        let displaySiteValue = siteValue;

        if (!siteValue) {
            // Not set on element -> Warning (Yellow)
            cssClass = "warning";
            displaySiteValue = '(not set)';
        } else if (normSite === normFigma) {
            // Match -> Match (Green)
            cssClass = "match";
        } else {
            // Diff -> Error (Red)
            cssClass = "diff";
        }

        html += `<div class="${cssClass}"><b>${key}:</b> Figma: <code>${figmaValue}</code> &rarr; Site: <code>${displaySiteValue}</code></div>`;
    });

    updateResults('📊 CSS Comparison Results', html);
}

function updateResults(title, content) {
    document.getElementById('resultsHeader').style.display = 'block';
    document.getElementById('resultsTitle').textContent = title;
    document.getElementById("results").innerHTML = content;

    chrome.storage.local.set({
        resultsTitle: title,
        comparisonResults: content
    });
}

function showError(msg) {
    const html = `<div class="diff"><b>${msg}</b></div>`;
    updateResults('⚠️ Error', html);
}
