let currentPage = 1;
let camerasPerPage = 9; // Default, will be updated from selector
const cameraGrid = document.getElementById('camera-grid');
const paginationControls = document.getElementById('pagination-controls');
const viewSelect = document.getElementById('view-select');

function init() {
    if (!cameraGrid || !paginationControls || !viewSelect) {
        console.error("Required HTML elements not found for camera view initialization.");
        return;
    }

    // Set initial camerasPerPage from the select and update grid class
    camerasPerPage = parseInt(viewSelect.value, 10);
    updateGridColumns();


    viewSelect.addEventListener('change', (event) => {
        camerasPerPage = parseInt(event.target.value, 10);
        currentPage = 1; // Reset to first page
        updateGridColumns();
        renderCameras();
    });

    if (typeof camerasData !== 'undefined' && Array.isArray(camerasData)) {
        renderCameras();
    } else {
        console.error("camerasData is not available or not an array.");
        if (cameraGrid) {
            cameraGrid.innerHTML = '<p>No camera data loaded or an error occurred.</p>';
        }
    }
}

function updateGridColumns() {
    const columns = Math.sqrt(camerasPerPage);
    if (Number.isInteger(columns)) { // Ensure it's a perfect square for 2x2, 3x3, 4x4
         cameraGrid.className = 'camera-grid grid-cols-' + columns;
    } else {
         cameraGrid.className = 'camera-grid'; // Fallback or handle non-square numbers if needed
         console.warn(`Cameras per page (${camerasPerPage}) does not form a perfect square grid (2x2, 3x3, 4x4). Using default grid styling.`);
    }
}

function renderCameras() {
    if (!cameraGrid || typeof camerasData === 'undefined') return;

    // Destroy existing HLS instances before clearing the grid
    const existingVideos = cameraGrid.querySelectorAll('video');
    existingVideos.forEach(video => {
        if (video.hlsInstance) {
            video.hlsInstance.destroy();
            console.log(`HLS instance destroyed for video ID: ${video.id}`);
        }
    });

    cameraGrid.innerHTML = ''; // Clear existing cameras
    paginationControls.innerHTML = ''; // Clear existing pagination

    const startIndex = (currentPage - 1) * camerasPerPage;
    const endIndex = startIndex + camerasPerPage;
    const camerasToDisplay = camerasData.slice(startIndex, endIndex);

    if (camerasToDisplay.length === 0 && camerasData.length > 0) {
        cameraGrid.innerHTML = '<p>No cameras on this page.</p>';
        renderPaginationControls(); // Still show pagination if there's data overall
        return;
    }
    if (camerasToDisplay.length === 0 && camerasData.length === 0) {
        // This case should ideally be handled by a message from the backend if no cameras are available at all.
        // If camerasData is empty from the start, the template itself might show a message.
        // However, if it becomes empty dynamically (e.g. after filtering, which isn't implemented here),
        // this is a good place to put a message.
        cameraGrid.innerHTML = '<p>No cameras found.</p>';
        return; // No need for pagination if no cameras at all
    }


    camerasToDisplay.forEach(camera => {
        const cameraItem = document.createElement('div');
        cameraItem.className = 'camera-item';

        const cameraName = document.createElement('h3');
        cameraName.textContent = camera.deviceName || 'Unknown Camera';
        cameraItem.appendChild(cameraName);

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container'; // For styling video and error messages
        
        const videoElement = document.createElement('video');
        videoElement.id = `video-${camera.deviceId}`;
        videoElement.controls = true;
        videoElement.muted = true; // Autoplay often requires muted
        videoElement.autoplay = true; // Attempt to autoplay
        videoElement.poster = camera.picUrl || ''; // Set poster image if available
        videoContainer.appendChild(videoElement);
        cameraItem.appendChild(videoContainer);

        const statusIndicator = document.createElement('p');
        statusIndicator.className = 'stream-status';
        cameraItem.appendChild(statusIndicator);

        // Fetch stream URL only if camera status indicates it's online (e.g., status == 1)
        // The actual meaning of 'status' depends on the Ezviz API. Assuming 1 is online.
        if (camera.status === 1) {
            statusIndicator.textContent = 'Loading stream...';
            const url = getStreamUrlEndpoint.replace('DEVICE_ID_PLACEHOLDER', camera.deviceId);
            
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    const streamUrl = data.stream_url;
                    if (streamUrl) {
                        if (Hls.isSupported()) {
                            const hls = new Hls({
                                // enableWorker: true, // Consider for performance on complex streams
                                // liveSyncDurationCount: 2, // Lower latency for live
                                // lowLatencyMode: true, // If supported and desired
                            });
                            videoElement.hlsInstance = hls; // Store for cleanup
                            hls.loadSource(streamUrl);
                            hls.attachMedia(videoElement);
                            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                videoElement.play().catch(e => console.warn("Autoplay prevented for HLS:", e));
                                statusIndicator.textContent = 'Live';
                                statusIndicator.style.color = 'green';
                            });
                            hls.on(Hls.Events.ERROR, function (event, data) {
                                console.error('HLS.js error:', data);
                                if (data.fatal) {
                                    switch (data.type) {
                                        case Hls.ErrorTypes.NETWORK_ERROR:
                                            statusIndicator.textContent = 'Network error loading stream.';
                                            break;
                                        case Hls.ErrorTypes.MEDIA_ERROR:
                                            statusIndicator.textContent = 'Media error with stream.';
                                            hls.destroy(); // Destroy on fatal media error
                                            break;
                                        default:
                                            statusIndicator.textContent = 'Error loading stream.';
                                            hls.destroy(); // Destroy on other fatal errors
                                            break;
                                    }
                                } else {
                                     statusIndicator.textContent = 'Stream warning/non-fatal error.';
                                }
                                statusIndicator.style.color = 'red';
                            });
                        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                            // For Safari or other browsers that support HLS natively
                            videoElement.src = streamUrl;
                            videoElement.addEventListener('loadedmetadata', () => {
                                videoElement.play().catch(e => console.warn("Autoplay prevented for native HLS:", e));
                                statusIndicator.textContent = 'Live (Native HLS)';
                                statusIndicator.style.color = 'green';
                            });
                             videoElement.addEventListener('error', () => {
                                statusIndicator.textContent = 'Error playing native HLS stream.';
                                statusIndicator.style.color = 'red';
                            });
                        } else {
                            statusIndicator.textContent = 'HLS.js not supported, and native HLS playback failed.';
                            statusIndicator.style.color = 'orange';
                        }
                    } else {
                        statusIndicator.textContent = 'Stream URL not available.';
                        statusIndicator.style.color = 'orange';
                    }
                })
                .catch(error => {
                    console.error(`Failed to fetch stream URL for ${camera.deviceId}:`, error);
                    statusIndicator.textContent = `Error: ${error.message || "Could not load stream."}`;
                    statusIndicator.style.color = 'red';
                });
        } else {
            // Camera is not online (e.g., status is 0 or other)
            statusIndicator.textContent = 'Camera is offline.';
            statusIndicator.style.color = 'grey';
            videoElement.controls = false; // Disable controls for offline cameras
        }
        cameraGrid.appendChild(cameraItem);
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    if (typeof camerasData === 'undefined' || !paginationControls) return;
    paginationControls.innerHTML = ''; // Clear

    const totalPages = Math.ceil(camerasData.length / camerasPerPage);

    if (totalPages <= 1) return; // No pagination needed for single page

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCameras();
        }
    });
    paginationControls.appendChild(prevButton);

    const pageIndicator = document.createElement('span');
    pageIndicator.textContent = ` Page ${currentPage} of ${totalPages} `;
    pageIndicator.style.margin = "0 10px";
    paginationControls.appendChild(pageIndicator);

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderCameras();
        }
    });
    paginationControls.appendChild(nextButton);
}

// Ensure DOM is fully loaded before initializing
document.addEventListener('DOMContentLoaded', init);
