# Manual Testing Guidelines for Ezviz Web Viewer

## Prerequisites for Testing

*   The application is set up and running as per the instructions in `README.md`. This includes a successful Auth0 setup and a correctly configured `.env` file.
*   An Auth0 test user account (email and password) is available and has been registered with the Auth0 application used by Ezviz Web Viewer.

## Test Cases

### Authentication Flow

*   **TC1: Access Home Page (Not Logged In)**
    *   **Steps:**
        1.  Open a new browser window (or incognito mode to ensure no active session).
        2.  Navigate to the application's root URL (e.g., `http://localhost:5000/`).
    *   **Expected Result:**
        *   The home page loads.
        *   A welcome message is displayed.
        *   A "Login" link is visible.
        *   No user-specific information (like username or email) is displayed. Links to "Settings" or "View Cameras" might be absent or non-functional if they are user-specific.

*   **TC2: Login Process**
    *   **Steps:**
        1.  From the home page (as in TC1), click the "Login" link.
        2.  The browser should redirect to the Auth0 universal login page.
        3.  Enter the credentials of the Auth0 test user account.
        4.  Successfully authenticate.
    *   **Expected Result:**
        *   After successful authentication, the user is redirected back to the application's home page (`/`).
        *   The home page now displays user-specific information (e.g., "Hello, [User's Name/Email]!").
        *   A "Logout" link is visible.
        *   Links to "Go to Settings" and "View Cameras" are visible and active.

*   **TC3: Access Protected Page (Not Logged In)**
    *   **Steps:**
        1.  Ensure you are logged out (perform TC4 if necessary, or use a new incognito window).
        2.  Attempt to navigate directly to the settings page (e.g., `http://localhost:5000/settings`).
        3.  Attempt to navigate directly to the camera view page (e.g., `http://localhost:5000/cameras`).
    *   **Expected Result:**
        *   For both `/settings` and `/cameras`, the user is redirected to the Auth0 login page (or the application's login route which then redirects to Auth0).
        *   Access to these pages is denied until successful login.

*   **TC4: Logout Process**
    *   **Steps:**
        1.  Ensure you are logged in (perform TC2 if necessary).
        2.  From any page where it's available, click the "Logout" link.
    *   **Expected Result:**
        *   The user's session within the Ezviz Web Viewer application is cleared.
        *   The user is redirected to the application's home page (`/`).
        *   The home page now displays the "Login" link. User-specific information is no longer visible.
        *   The Auth0 session should also be terminated. (Verification: trying to access a protected resource again or logging in again should prompt for Auth0 credentials, not automatically log in).

### Settings Page

*   **TC5: Access Settings Page (Logged In)**
    *   **Steps:**
        1.  Log in to the application (TC2).
        2.  Navigate to the settings page by clicking the "Go to Settings" link or by directly visiting `/settings`.
    *   **Expected Result:**
        *   The settings page (`/settings`) is displayed.
        *   A form for entering/updating the "Ezviz App Key" is visible.

*   **TC6: Save Ezviz App Key (Valid Key)**
    *   **Steps:**
        1.  Access the settings page as a logged-in user (TC5).
        2.  Enter a non-empty, dummy string (e.g., "MY_DUMMY_EZVIZ_KEY_12345") into the "Ezviz App Key" input field.
        3.  Click the "Save App Key" button.
    *   **Expected Result:**
        *   The page reloads (or appears to).
        *   A success message, such as "App key saved successfully!", is displayed.
        *   The input field for the app key might be cleared for security, or it might show the saved key (if its `type="password"`, the actual characters will be masked).

*   **TC7: Save Ezviz App Key (Empty Key)**
    *   **Steps:**
        1.  Access the settings page as a logged-in user (TC5).
        2.  Ensure the "Ezviz App Key" input field is empty.
        3.  Click the "Save App Key" button.
    *   **Expected Result:**
        *   The page reloads (or appears to).
        *   An error message, such as "App key cannot be empty.", is displayed.

*   **TC8: Verify App Key Persistence and Decryption**
    *   **Steps:**
        1.  Successfully save a unique dummy app key (TC6, e.g., "PERSISTENCE_TEST_KEY").
        2.  Navigate away from the settings page (e.g., to the Home page).
        3.  Navigate back to the settings page (`/settings`).
    *   **Expected Result:**
        *   The "Ezviz App Key" input field should be populated with the previously saved key ("PERSISTENCE_TEST_KEY"). If the input field is of `type="password"`, the presence of a value (even if masked) indicates retrieval. (This implicitly tests that the key was stored, can be retrieved for the correct user, and decrypted for display/use).

### Camera View Page (Using Stubbed API)

*   **TC9: Access Camera View Page (No App Key Set)**
    *   **Steps:**
        1.  Log in to the application.
        2.  Ensure no Ezviz App Key is saved for this user. (If a key was previously saved, this test case may be difficult to achieve without a "delete key" feature. If the app always requires a key to show `/cameras`, then the redirect is the primary check).
        3.  Navigate to the camera view page (`/cameras`).
    *   **Expected Result:**
        *   The user is redirected to the settings page (`/settings`).
        *   A message like "Please configure your Ezviz App Key in settings." is displayed on the settings page.
        *   Alternatively, if the `/cameras` page loads, it should display a clear message indicating that the app key is missing and no cameras can be shown.

*   **TC10: Access Camera View Page (App Key Set)**
    *   **Steps:**
        1.  Log in to the application.
        2.  Ensure a dummy Ezviz App Key is saved via the settings page (TC6).
        3.  Navigate to the camera view page (`/cameras`).
    *   **Expected Result:**
        *   The camera view page loads successfully.
        *   A list of camera players is displayed, corresponding to the dummy camera data provided in `ezviz_api.py`.
        *   Each camera player should display the `deviceName` from the stubbed data.
        *   Video elements should be present for each camera.

*   **TC11: Camera Grid Selection**
    *   **Steps:**
        1.  Access the camera view page with a saved app key (TC10).
        2.  Locate the "Cameras per page" dropdown selector.
        3.  Select "4" from the dropdown.
        4.  Select "9" from the dropdown.
        5.  Select "16" from the dropdown.
    *   **Expected Result:**
        *   When "4" is selected, the grid updates to show a maximum of 4 camera players. The CSS class for the grid should reflect a 2x2 layout.
        *   When "9" is selected, the grid updates to show a maximum of 9 camera players (3x3 layout).
        *   When "16" is selected, the grid updates to show a maximum of 16 camera players (4x4 layout), or fewer if the total number of stubbed cameras is less than 16.
        *   The layout change should be visually apparent.

*   **TC12: Video Player Initialization (HLS.js with Stubs)**
    *   **Steps:**
        1.  Access the camera view page with a saved app key and visible cameras (TC10).
        2.  Observe the individual camera players for cameras that are "online" (e.g., `status: 1` in stub data).
    *   **Expected Result:**
        *   Initially, a "Loading stream..." message (or similar) might appear within the player.
        *   Since the `ezviz_api.py` stubs provide dummy stream URLs (e.g., `https://dummy.stream.com/.../playlist.m3u8`), HLS.js will attempt to load these.
        *   If the dummy URL is ill-formatted or unreachable, HLS.js should display an error message within the video player area (e.g., "Network error," "Media error," or a generic stream load error).
        *   The key is to observe that HLS.js is initialized and attempts to load the stream. Check the browser's developer console (Network and Console tabs) for HLS.js logs, requests to the dummy URLs, or error messages.
        *   For cameras stubbed as "offline" (`status: 0`), a message like "Camera is offline" should be displayed, and no stream loading attempt should be made.

*   **TC13: Pagination (If > Max Cameras per View)**
    *   **Setup:** To test this, ensure the number of cameras in `ezviz_api.py`'s dummy list is greater than the smallest number of cameras per page (e.g., if `camerasPerPage` can be 4, have at least 5 cameras in the stub).
    *   **Steps:**
        1.  Access the camera view page (TC10). Select a "Cameras per page" value that is less than the total number of stubbed cameras.
        2.  Observe if pagination controls (e.g., "Next," "Previous" buttons, page numbers) appear.
        3.  If controls appear, click "Next."
        4.  Click "Previous."
    *   **Expected Result:**
        *   Pagination controls are visible if the total number of cameras exceeds `camerasPerPage`.
        *   Clicking "Next" loads and displays the subsequent set of cameras in the grid. The page indicator updates.
        *   Clicking "Previous" loads and displays the previous set of cameras. The page indicator updates.
        *   "Previous" button should be disabled on the first page. "Next" button should be disabled on the last page.

### Responsiveness

*   **TC14: Test on Different Screen Sizes**
    *   **Steps:**
        1.  Access various pages of the application (Home, Settings, Camera View).
        2.  Resize the browser window to simulate different device widths:
            *   Large desktop (e.g., >1200px)
            *   Tablet (e.g., ~768px - 992px)
            *   Mobile (e.g., <768px, and specifically <576px)
        3.  Alternatively, use browser developer tools for device emulation.
    *   **Expected Result:**
        *   The layout adjusts fluidly to the screen size.
        *   Text remains readable and does not overflow.
        *   Buttons and interactive elements are easily clickable/tappable.
        *   On the camera view page, the camera grid should re-flow as defined in the CSS media queries (e.g., stacking to a single column on small mobile screens, changing from 4-col to 3-col to 2-col etc. on larger screens).
        *   Navigation should remain accessible.

## Reporting Issues

When a bug or unexpected behavior is found, please report it by including the following details:

*   **Test Case ID:** (e.g., TC5)
*   **Feature:** (e.g., Settings Page)
*   **Steps to Reproduce:** Detailed, numbered steps that consistently lead to the issue.
*   **Expected Result:** What the application should have done.
*   **Actual Result:** What the application actually did.
*   **Browser/OS (if relevant):** (e.g., Chrome on Windows 10, Safari on iOS)
*   **Screenshots/Videos (if helpful):** Visual evidence of the bug.
