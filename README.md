# Ezviz Web Viewer

## Brief Description

Ezviz Web Viewer is a Python Flask application designed to view and manage Ezviz security cameras through a web interface. It provides a secure and user-friendly way to access your camera feeds.

Key features include:
*   **Secure User Authentication:** Uses Auth0 for robust login and user management.
*   **Ezviz App Key Configuration:** A dedicated settings page to securely store your Ezviz App Key (note: actual API interaction is currently stubbed).
*   **Dynamic Camera View:** Displays cameras in a grid layout. Users can select the number of cameras displayed per page (e.g., 4, 9, or 16).
*   **Pagination:** For users with multiple cameras, pagination allows easy navigation through the camera list.
*   **Low Resource Design:** Optimized for minimal server load, with HLS.js for efficient video streaming and careful resource management on the frontend.

## Core Technologies Used

*   **Backend:** Python (Flask framework)
*   **Frontend:** HTML5, CSS3, JavaScript (with HLS.js for video streaming)
*   **Authentication:** Auth0
*   **Database:** SQLite (for storing user-specific settings like the encrypted Ezviz app key)

## Setup Instructions

### Prerequisites

*   Python 3.7+
*   pip (Python package installer)
*   Git

### 1. Clone the Repository

```bash
git clone https://your-repository-url-here/ezviz_viewer.git 
cd ezviz_viewer
```
(Replace `https://your-repository-url-here/ezviz_viewer.git` with the actual repository URL when available.)

### 2. Install Dependencies

It's recommended to create a virtual environment first:
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```

Then, install the required packages:
```bash
pip install -r requirements.txt
```

### 3. Auth0 Configuration

This application uses Auth0 for user authentication. You'll need a free Auth0 account:

1.  Go to [Auth0](https://auth0.com/) and sign up.
2.  Create a new **Application** of type "Regular Web Application".
3.  Once created, navigate to the "Settings" tab of your Auth0 application. You will need the following values:
    *   **Domain**
    *   **Client ID**
    *   **Client Secret**
4.  In the Auth0 Application Settings, find the "Application URIs" section.
    *   Set **Allowed Callback URLs** to: `http://localhost:5000/callback`
    *   Set **Allowed Logout URLs** to: `http://localhost:5000/`
    *   (Ensure these match the default host and port your Flask app will run on).
5.  Save the changes in your Auth0 application settings.

### 4. Environment Variables

Create a `.env` file in the root of the `ezviz_viewer` project directory. This file will store your sensitive configuration details.

Copy the following template into your `.env` file:

```env
FLASK_SECRET_KEY="YOUR_VERY_OWN_FLASK_SECRET_KEY_PLEASE_CHANGE_ME"
AUTH0_CLIENT_ID="YOUR_AUTH0_CLIENT_ID"
AUTH0_CLIENT_SECRET="YOUR_AUTH0_CLIENT_SECRET"
AUTH0_DOMAIN="YOUR_AUTH0_DOMAIN" 
```

**Important:**
*   Replace `"YOUR_VERY_OWN_FLASK_SECRET_KEY_PLEASE_CHANGE_ME"` with a long, random string. This is crucial for session security. You can generate one using Python: `python -c 'import secrets; print(secrets.token_hex(24))'`
*   Replace `"YOUR_AUTH0_CLIENT_ID"`, `"YOUR_AUTH0_CLIENT_SECRET"`, and `"YOUR_AUTH0_DOMAIN"` with the actual values from your Auth0 application settings. For `AUTH0_DOMAIN`, use the value like `your-tenant.auth0.com` (without `https://`).

### 5. Initialize Database

The SQLite database (`ezviz_viewer.db`) and the necessary tables are created automatically when the application is first run. This is handled by the `init_db()` function call within `app.py`.

## Running the Application

Once the setup is complete, you can run the application:

```bash
python app.py
```

The application will typically be accessible at `http://localhost:5000` in your web browser.

## Ezviz API Note

**IMPORTANT:** The current version of this application uses **stubbed (simulated) Ezviz API interactions** located in `ezviz_api.py`. This means it does not connect to or communicate with the actual Ezviz cloud service.

*   **Dummy Data:** The camera list and stream URLs are placeholders.
*   **Real Implementation:** To view real cameras, you would need to:
    1.  Have an Ezviz Developer account and an App Key/Secret.
    2.  Replace the functions in `ezviz_api.py` with actual Ezviz API calls using your developer credentials. The application's settings page allows you to save your Ezviz App Key, which a real API implementation would then use to fetch tokens, camera lists, and stream URLs.

The existing stub functions provide a framework and demonstrate what data the application expects.

## Features Overview

*   **User Authentication:** Secure login and logout via Auth0.
*   **Settings Page:** Allows users to (theoretically) save their Ezviz App Key. The key is encrypted in the database.
*   **Camera View Page:**
    *   Displays cameras in a grid (currently using dummy data).
    *   Users can select the number of cameras per page (4, 9, or 16).
    *   Pagination for navigating through multiple cameras.
    *   Uses HLS.js for attempting to play video streams.

## To Do / Future Enhancements

*   **Full Ezviz API Integration:** Replace stubbed functions with real API calls.
*   **More Robust Error Handling:** Implement comprehensive error handling for API calls and display user-friendly messages.
*   **Camera Controls:** Add features like Pan/Tilt/Zoom (PTZ) if supported by the API and cameras.
*   **Event History:** Display motion detection or other event history from cameras.
*   **User Preferences:** Allow users to save more preferences (e.g., default grid layout).
*   **Theme Customization:** Light/Dark mode.
*   **Testing:** Add unit and integration tests.

---

Thank you for using Ezviz Web Viewer!
