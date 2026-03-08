// Open the side panel by clicking the action icon
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Handle messages from side panel about all_frames setting
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_ALL_FRAMES') {
        console.log('Background: All Frames setting updated to:', request.enabled);
        // Optionally broadcast to all content scripts
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'ALL_FRAMES_UPDATED',
                    enabled: request.enabled
                }).catch(() => {
                    // Tab might not have content script or be inaccessible
                });
            });
        });
        sendResponse({ success: true });
    }
});

