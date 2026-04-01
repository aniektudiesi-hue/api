/**
 * RO-Anime API v10.0 Integration Module
 * 
 * This module handles the integration between the RO-Anime API and the existing player.
 * It manages state, HLS loading, multi-server fallback, quality switching, 
 * sub/dub toggling, and intro/outro skip timestamps.
 */

const API_BASE = '/api/v10'; // Based on prompt: GET /api/v10/stream/{episodeId}

const state = {
    episodeId:     null,
    type:          'sub',        // 'sub' | 'dub'
    servers:       [],
    serverIndex:   0,            // currently active server
    qualityIndex:  0,            // currently active quality within server
    timestamps:    { intro: null, outro: null },
    subtitles:     [],
    hls:           null,
    skipShown:     { intro: false, outro: false },
    stallTimer:    null,
    lastTime:      -1,
};

/**
 * Initialize the integration for a specific episode.
 * @param {string} episodeId 
 * @param {Object} playerInstance 
 */
export async function init(episodeId, playerInstance) {
    state.episodeId = episodeId;
    state.player = playerInstance;
    
    // Initial load
    await fetchStreamData();
}

/**
 * Fetch stream data from the API
 */
async function fetchStreamData() {
    try {
        state.player.showLoading(true);
        const response = await fetch(`${API_BASE}/stream/${state.episodeId}?type=${state.type}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        
        // Cache response in state
        state.servers = data.servers || [];
        state.timestamps = data.timestamps || { intro: null, outro: null };
        state.subtitles = data.subtitles || [];
        state.serverIndex = 0;
        
        if (state.servers.length === 0) {
            throw new Error("No servers available for this episode.");
        }
        
        loadActiveServer();
        setupSubtitles();
        setupTimestamps();
        
        // Update UI components (Server list, Sub/Dub toggle)
        updatePlayerUI();
        
    } catch (error) {
        console.error("[RO-INTEGRATION] Fetch failed:", error);
        state.player.showError(error.message || "Failed to load stream data.");
    } finally {
        state.player.showLoading(false);
    }
}

/**
 * Load the currently active server
 */
function loadActiveServer() {
    const server = state.servers[state.serverIndex];
    if (!server) {
        state.player.showError("All servers exhausted. Please try again.");
        return;
    }
    
    // Initial quality: first available or Auto
    state.qualityIndex = 0; 
    const quality = server.qualities[state.qualityIndex];
    const url = quality ? quality.url : server.m3u8Url;
    
    loadHLS(url, server.referer);
}

/**
 * Setup and load HLS.js
 */
function loadHLS(url, referer) {
    // Clean up previous instance
    if (state.hls) {
        state.hls.destroy();
        state.hls = null;
    }
    
    stopStallWatchdog();
    
    const video = state.player.getVideoElement();
    const currentTime = video.currentTime;
    
    if (Hls.isSupported()) {
        state.hls = new Hls({
            xhrSetup: (xhr, url) => {
                if (referer) {
                    // Note: Browser security might restrict setting Referer header.
                    // If it fails, we might need a proxy or different approach.
                    // But the prompt specifically asks for this.
                    xhr.setRequestHeader('Referer', referer);
                }
            }
        });
        
        state.hls.loadSource(url);
        state.hls.attachMedia(video);
        
        state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (currentTime > 0) {
                video.currentTime = currentTime;
            }
            video.play().catch(() => {
                // Handle autoplay restriction
                console.log("[RO-INTEGRATION] Autoplay blocked, waiting for user.");
            });
            startStallWatchdog();
        });
        
        state.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal || (data.response && [403, 404].includes(data.response.code))) {
                console.warn("[RO-INTEGRATION] HLS Fatal/Network Error:", data);
                tryNextServer();
            } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                console.warn("[RO-INTEGRATION] HLS Network Error:", data);
                // For non-fatal network errors, we can try to recover or fallback
                if (data.details === 'manifestLoadError') {
                    tryNextServer();
                }
            }
        });
        
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
            if (currentTime > 0) video.currentTime = currentTime;
            video.play();
            startStallWatchdog();
        }, { once: true });
        
        video.addEventListener('error', () => {
            tryNextServer();
        }, { once: true });
    }
}

/**
 * Try the next available server
 */
function tryNextServer() {
    state.serverIndex++;
    if (state.serverIndex < state.servers.length) {
        console.log(`[RO-INTEGRATION] Falling back to server ${state.serverIndex}: ${state.servers[state.serverIndex].serverName}`);
        loadActiveServer();
    } else {
        state.player.showError("All servers unavailable. Please try again.");
    }
}

/**
 * Stall Watchdog
 */
function startStallWatchdog() {
    stopStallWatchdog();
    const video = state.player.getVideoElement();
    state.lastTime = -1;
    
    state.stallTimer = setInterval(() => {
        if (!video.paused && video.currentTime === state.lastTime) {
            console.warn("[RO-INTEGRATION] Playback stalled, trying next server.");
            tryNextServer();
        }
        state.lastTime = video.currentTime;
    }, 5000);
}

function stopStallWatchdog() {
    if (state.stallTimer) {
        clearInterval(state.stallTimer);
        state.stallTimer = null;
    }
}

/**
 * UI Updates & Event Handlers
 */
function updatePlayerUI() {
    // 1. Update Server List
    if (state.player.updateServerList) {
        state.player.updateServerList(state.servers, state.serverIndex, (index) => {
            if (index === state.serverIndex) return;
            state.serverIndex = index;
            loadActiveServer();
        });
    }
    
    // 2. Update Quality List
    const currentServer = state.servers[state.serverIndex];
    if (state.player.updateQualityList) {
        const qualities = currentServer ? currentServer.qualities : [];
        // Hide if only one quality "Auto"
        const shouldShow = qualities.length > 1 || (qualities.length === 1 && qualities[0].label !== "Auto");
        
        state.player.updateQualityList(shouldShow ? qualities : [], state.qualityIndex, (index) => {
            if (index === state.qualityIndex) return;
            state.qualityIndex = index;
            const quality = qualities[index];
            if (quality) {
                loadHLS(quality.url, currentServer.referer);
            }
        });
    }
    
    // 3. Sub/Dub Toggle
    if (state.player.setAudioType) {
        state.player.setAudioType(state.type, (newType) => {
            if (newType === state.type) return;
            state.type = newType;
            fetchStreamData(); // Re-fetch on type change
        });
    }
}

/**
 * Subtitle Handling
 */
function setupSubtitles() {
    if (!state.player.setSubtitles) return;
    
    const tracks = state.subtitles.map(s => ({
        label: s.label,
        src: s.file,
        isDefault: s.default || s.label.toLowerCase().includes('english')
    }));
    
    state.player.setSubtitles(tracks);
}

/**
 * Timestamp / Skip Handling
 */
function setupTimestamps() {
    const video = state.player.getVideoElement();
    state.skipShown = { intro: false, outro: false };
    
    const onTimeUpdate = () => {
        const t = video.currentTime;
        const { intro, outro } = state.timestamps;
        
        if (intro && intro.length === 2) {
            const isInside = t >= intro[0] && t < intro[1];
            showSkipPrompt('intro', isInside, intro[1]);
        }
        
        if (outro && outro.length === 2) {
            const isInside = t >= outro[0] && t < outro[1];
            showSkipPrompt('outro', isInside, outro[1]);
        }
    };
    
    video.removeEventListener('timeupdate', state._timeUpdateHandler);
    state._timeUpdateHandler = onTimeUpdate;
    video.addEventListener('timeupdate', onTimeUpdate);
}

function showSkipPrompt(type, visible, skipTo) {
    if (visible && !state.skipShown[type]) {
        state.player.showSkipButton(type, true, () => {
            const video = state.player.getVideoElement();
            video.currentTime = skipTo;
            state.player.showSkipButton(type, false);
            state.skipShown[type] = true;
        });
    } else if (!visible && state.player.isSkipButtonVisible && state.player.isSkipButtonVisible(type)) {
        state.player.showSkipButton(type, false);
    }
}
