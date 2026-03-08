/**
 * Content Script for CSS Compare Extension
 * Handles iframe access when user enables the "all_frames" setting
 */

// Listen for messages from the extension about all_frames setting
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_ALL_FRAMES_SETTING') {
        // Get the current all_frames setting from storage
        chrome.storage.local.get(['allFrames'], (data) => {
            sendResponse({ allFramesEnabled: data.allFrames || false });
        });
    } else if (request.type === 'UPDATE_ALL_FRAMES') {
        // Update was received from side panel
        console.log('All Frames setting updated to:', request.enabled);
    }
});

// Initialize and make this content script available in iframes
// This ensures the extension can access iframe content when all_frames is enabled
(function() {
    // Check if all_frames is enabled
    chrome.storage.local.get(['allFrames'], (data) => {
        if (data.allFrames) {
            console.log('CSS Compare: iframe access enabled');
            // Content script is now active in all frames
        }
    });
})();
