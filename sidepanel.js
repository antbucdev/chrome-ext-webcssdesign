// Store for selected element CSS
let selectedElementCSS = null;
let currentLanguage = 'en';

// Restore saved state when popup opens
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['designCss', 'selectedElementCSS', 'comparisonResults', 'resultsTitle', 'darkMode', 'language', 'commonPropsOnly'], (data) => {
        // Language Setup
        if (data.language) {
            currentLanguage = data.language;
        } else {
            // Auto-detect browser language
            const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
            if (browserLang.startsWith('es')) {
                currentLanguage = 'es';
            } else if (browserLang.startsWith('pt')) {
                currentLanguage = 'pt';
            } else if (browserLang.startsWith('it')) {
                currentLanguage = 'it';
            } else if (browserLang.startsWith('de')) {
                currentLanguage = 'de';
            } else if (browserLang.startsWith('nl')) {
                currentLanguage = 'nl';
            } else if (browserLang.startsWith('zh')) {
                currentLanguage = 'zh';
            } else if (browserLang.startsWith('ja')) {
                currentLanguage = 'ja';
            } else {
                currentLanguage = 'en';
            }
            // Save initial default
            chrome.storage.local.set({ language: currentLanguage });
        }

        // Set dropdown value and apply translations
        const langSelect = document.getElementById('languageSelect');
        if (langSelect) langSelect.value = currentLanguage;
        applyTranslations(currentLanguage);

        // Restore inputs
        if (data.designCss) {
            document.getElementById('designCss').value = data.designCss;
        }
        if (data.selectedElementCSS) {
            selectedElementCSS = data.selectedElementCSS;
        }

        // Restore results view
        if (data.comparisonResults) {
            document.getElementById('resultsHeader').style.display = 'flex';

            // If it was a default title, translate it. If custom (like Error), we might need logic,
            // but usually we just reset to the translated default or keep the old one if it's static.
            // For simplicity, let's allow the stored title but try to translate standard ones if they match known keys?
            // Actually, simpler: just use textContent if it exists, but usually we want to re-translate headers if possible unless it's dynamic.
            // Let's stick to restoring what was there, but maybe refresh the default title if it was the default one.
            document.getElementById('resultsTitle').textContent = data.resultsTitle || locales[currentLanguage].resultsTitleDefault;
            document.getElementById('results').innerHTML = data.comparisonResults;

            // Re-attach listeners to existing checkboxes
            rebindResultCheckboxes();
        }

        // Restore Dark Mode
        if (data.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('checkbox').checked = true;
        }

        // Restore Common Props Only toggle
        if (data.commonPropsOnly) {
            document.getElementById('commonPropsToggle').checked = true;
        }
    });
});

function applyTranslations(lang) {
    currentLanguage = lang;
    const texts = locales[lang];
    if (!texts) return;

    // Static elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) {
            el.textContent = texts[key];
        }
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[key]) {
            el.placeholder = texts[key];
        }
    });

    // Dynamic Updates (that might need refresh)
    const incognitoBtn = document.getElementById('incognitoBtn');
    if (incognitoBtn && incognitoBtn.disabled) {
        incognitoBtn.textContent = texts.statusActive;
    } else if (incognitoBtn) {
        incognitoBtn.textContent = texts.btnEnable;
    }
}

// Language Toggle
document.getElementById('languageSelect').addEventListener('change', (e) => {
    const newLang = e.target.value;
    currentLanguage = newLang;
    chrome.storage.local.set({ language: newLang });
    applyTranslations(newLang);

    // Refresh Incognito button text if visible
    checkIncognitoStatus();
});

// Dark Mode Toggle
const toggleSwitch = document.getElementById('checkbox');
toggleSwitch.addEventListener('change', function (e) {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        chrome.storage.local.set({ darkMode: true });
    } else {
        document.body.classList.remove('dark-mode');
        chrome.storage.local.set({ darkMode: false });
    }
});

// Common Properties Only Toggle
const commonPropsToggle = document.getElementById('commonPropsToggle');
commonPropsToggle.addEventListener('change', function (e) {
    chrome.storage.local.set({ commonPropsOnly: e.target.checked });
});

// Settings Modal Logic
const modal = document.getElementById("settingsModal");
const btn = document.getElementById("settingsBtn");
const span = document.getElementsByClassName("close")[0];

btn.onclick = function () {
    modal.style.display = "block";
    checkIncognitoStatus();
}

function checkIncognitoStatus() {
    chrome.extension.isAllowedIncognitoAccess((isAllowed) => {
        const incognitoBtn = document.getElementById('incognitoBtn');
        const texts = locales[currentLanguage];
        if (isAllowed) {
            incognitoBtn.textContent = texts.statusActive;
            incognitoBtn.disabled = true;
            incognitoBtn.style.opacity = '0.6';
            incognitoBtn.style.cursor = 'default';
        } else {
            incognitoBtn.textContent = texts.btnEnable;
            incognitoBtn.disabled = false;
            incognitoBtn.style.opacity = '1';
            incognitoBtn.style.cursor = 'pointer';
            incognitoBtn.onclick = () => {
                chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
            };
        }
    });
}

span.onclick = function () {
    modal.style.display = "none";
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Save Design CSS properties whenever user types
document.getElementById('designCss').addEventListener('input', (e) => {
    chrome.storage.local.set({ designCss: e.target.value });
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
        showError(locales[currentLanguage].errorSelect);
        return;
    }
    const designInput = document.getElementById('designCss').value;
    if (!designInput.trim()) {
        showError(locales[currentLanguage].errorPaste);
        return;
    }
    compareCSS(selectedElementCSS);
};

// Clear Data
document.getElementById('clearData').onclick = () => {
    document.getElementById('designCss').value = '';
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
 * Parses Design CSS string. Cleaning:
 * 1. Ignores lines starting with -- or //
 * 2. Only captures valid prop: value pairs
 */
function cssStringToObject(str) {
    const obj = {};
    const lines = str.split(';');

    lines.forEach(line => {
        line = line.trim();
        // Ignore empty lines, comments, or CSS variables often pasted from Design dev mode
        // Design dev mode sometimes outputs: /* layer name */ or --variable: #color
        if (!line || line.startsWith('/*') || (line.startsWith('--') && !line.includes(':'))) return;

        if (line.includes(':')) {
            // Split by first colon only
            const parts = line.split(':');
            const key = parts[0].trim();
            let value = parts.slice(1).join(':').trim();

            // Check for value in comment /* 24px */ or /* 1.5rem */
            const commentMatch = value.match(/\/\*\s*([\d\.]+(?:px|rem|em|%))\s*\*\//);
            if (commentMatch) {
                value = commentMatch[1]; // Use the commented value
            } else {
                // Clean up Design comments at end of line like " /* secondary */"
                value = value.replace(/\/\*.*\*\//g, '').trim();
            }

            // NEW: Handle Design variables with fallbacks
            // Check for syntax: var(--name, #fallback)
            const varMatch = value.match(/var\(--[^,]+,\s*([^)]+)\)/);
            if (varMatch) {
                value = varMatch[1].trim();
            } else if (value.startsWith('--') && value.includes(',')) {
                // Check for syntax: --name, #fallback
                // Extract everything after the first comma
                value = value.substring(value.indexOf(',') + 1).trim();
            }

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
 * Detects base font size from line-height pattern:
 * line-height: 150 % / * 24px * /
 * calculation: 24px / 1.5 = 16px
 */
function detectBaseFontSize(str) {
    // Regex to find "line-height: <num>% /* <num>px */"
    // Handles optional spaces, the % symbol, and optional semicolon
    const regex = /line-height:\s*([\d\.]+)\s*%\s*;?\s*\/\*\s*([\d\.]+)px\s*\*\//i;
    const match = str.match(regex);

    if (match) {
        const percent = parseFloat(match[1]);
        const px = parseFloat(match[2]);

        if (!isNaN(percent) && !isNaN(px) && percent !== 0) {
            // 150% = 1.5
            // px = fontSize * 1.5
            // fontSize = px / 1.5
            // fontSize = px / (percent / 100)
            return px / (percent / 100);
        }
    }
    return 16; // Default
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
/**
 * Converts rem to px.
 * e.g. "1.5rem" -> "24px" (if base is 16)
 */
function normalizeValue(value, basePx = 16) {
    if (!value) return '';
    let val = value.toString().trim().toLowerCase();

    // Convert rem to px
    if (val.endsWith('rem')) {
        const floatVal = parseFloat(val);
        if (!isNaN(floatVal)) {
            val = (floatVal * basePx) + 'px';
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
    updateResults(locales[currentLanguage].resultsTitleDefault, html);
}

function compareCSS(siteCssObj) {
    const designInput = document.getElementById("designCss").value;
    const designObj = cssStringToObject(designInput);
    const basePx = detectBaseFontSize(designInput);

    // Check if "Compare common properties only" is enabled
    const commonPropsOnly = document.getElementById('commonPropsToggle').checked;

    let html = "";
    Object.keys(designObj).forEach(key => {
        let siteValue = siteCssObj[key] || '';
        let designValue = designObj[key];

        // Skip warning results if "Compare common properties only" is enabled
        if (commonPropsOnly && !siteValue) {
            return; // Skip properties not set on the website
        }

        // Normalize for comparison
        const normSite = normalizeValue(siteValue, basePx);
        const normDesign = normalizeValue(designValue, basePx);

        let cssClass = "";
        let displaySiteValue = siteValue;
        if (siteValue && (siteValue.startsWith('rgb') || siteValue.startsWith('rgba'))) {
            displaySiteValue = normSite;
        }

        if (!siteValue) {
            // Not set on element -> Warning (Yellow)
            cssClass = "warning";
            displaySiteValue = '(not set)';
        } else if (normSite === normDesign) {
            // Match -> Match (Green)
            cssClass = "match";
        } else {
            // Diff -> Error (Red)
            cssClass = "diff";
        }

        const designLabel = locales[currentLanguage].lblDesign || 'Design';
        const webLabel = locales[currentLanguage].lblWeb || 'Web';
        html += `<div class="${cssClass}"><b>${key}:</b> ${designLabel}: <code>${designValue}</code> &rarr; ${webLabel}: <code>${displaySiteValue}</code></div>`;
    });

    updateResults(locales[currentLanguage].resultsTitleCompare, html);
}

function updateResults(title, content) {
    document.getElementById('resultsHeader').style.display = 'flex';
    document.getElementById('resultsTitle').textContent = title;
    document.getElementById("results").innerHTML = content;

    chrome.storage.local.set({
        resultsTitle: title,
        comparisonResults: content
    });
}

// Result Filtering Logic
const filterToggle = document.getElementById('filterToggle');
const resultsContainer = document.getElementById('results');
const batchActions = document.getElementById('batchActions');
const checkAll = document.getElementById('checkAll');

filterToggle.addEventListener('change', (e) => {
    toggleEditMode(e.target.checked);
});

checkAll.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const checkboxes = resultsContainer.querySelectorAll('.result-checkbox input');

    checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const wrapper = cb.closest('.result-row-wrapper');
        if (isChecked) {
            wrapper.classList.remove('result-choice-hidden');
        } else {
            wrapper.classList.add('result-choice-hidden');
        }
    });
    saveResults();
});

function toggleEditMode(enabled) {
    if (enabled) {
        resultsContainer.classList.add('edit-mode');
        batchActions.style.display = 'flex';
        injectCheckboxes();
        updateCheckAllState(); // Sync "Hide all" checkbox with current state
    } else {
        resultsContainer.classList.remove('edit-mode');
        batchActions.style.display = 'none';
    }
}

function injectCheckboxes() {
    // Current structure: <div class="match">...</div>
    // Target structure: <div class="result-row-wrapper"><div class="result-checkbox">...</div><div class="match">...</div></div>

    // We iterate over children. Note that if we modify the DOM while iterating using childNodes/children directly, it can be tricky.
    // Using Array.from creates a static list of the initial children.
    const children = Array.from(resultsContainer.children);

    children.forEach(child => {
        // Skip if already wrapped (check class)
        if (child.classList.contains('result-row-wrapper')) {
            return;
        }

        // Skip if it's not a result element (e.g. some other noise, though ideally only match/diff/warning are here)
        if (!child.classList.contains('match') && !child.classList.contains('diff') && !child.classList.contains('warning')) {
            return;
        }

        // Create Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'result-row-wrapper';

        // Create Checkbox Container
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'result-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        // If the wrapper was previously hidden, we wouldn't know easily unless we check the child?
        // Actually, if we are wrapping for the first time, it defaults to visible (checked).
        // If we load from storage, the HTML structure might already be wrapped! 
        // Wait: `saveResults` saves innerHTML. So if we wrapped it, saved it, then reloaded, 
        // `resultsContainer.children` will contain `.result-row-wrapper` elements.
        // So the "Skip if already wrapped" check above is crucial and handles persistence structure.

        checkbox.checked = true; // Default to checked/visible when first creating

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                wrapper.classList.remove('result-choice-hidden');
            } else {
                wrapper.classList.add('result-choice-hidden');
            }

            // Update "Select All" state
            updateCheckAllState();
            saveResults();
        });

        checkboxDiv.appendChild(checkbox);

        // Insert wrapper before child
        resultsContainer.insertBefore(wrapper, child);
        // Move child into wrapper
        wrapper.appendChild(checkboxDiv);
        wrapper.appendChild(child);
    });
}

function updateCheckAllState() {
    const all = resultsContainer.querySelectorAll('.result-checkbox input');
    if (all.length === 0) return;
    const allChecked = Array.from(all).every(c => c.checked);
    checkAll.checked = allChecked;
}

function rebindResultCheckboxes() {
    // This runs on load. The HTML might contain wrappers.
    const checkboxes = resultsContainer.querySelectorAll('.result-checkbox input');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const wrapper = cb.closest('.result-row-wrapper');
            if (e.target.checked) {
                wrapper.classList.remove('result-choice-hidden');
            } else {
                wrapper.classList.add('result-choice-hidden');
            }
            updateCheckAllState();
            saveResults();
        });
    });
}

function saveResults() {
    const html = resultsContainer.innerHTML;
    chrome.storage.local.set({ comparisonResults: html });
}
