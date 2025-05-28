import sqlite3
from flask import Flask, session, redirect, url_for, render_template, request, flash, jsonify
import os
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from . import ezviz_api # Assuming ezviz_api.py is in the same directory

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")

DATABASE = 'ezviz_viewer.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL UNIQUE,
            encrypted_app_key BLOB NOT NULL,
            fernet_key BLOB NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db() # Call it here

oauth = OAuth(app)

auth0 = oauth.register(
    'auth0',
    client_id=os.getenv("AUTH0_CLIENT_ID"),
    client_secret=os.getenv("AUTH0_CLIENT_SECRET"),
    api_base_url=f"https://{os.getenv('AUTH0_DOMAIN')}",
    access_token_url=f"https://{os.getenv('AUTH0_DOMAIN')}/oauth/token",
    authorize_url=f"https://{os.getenv('AUTH0_DOMAIN')}/authorize",
    client_kwargs={
        'scope': 'openid profile email',
    }
)

@app.route('/')
def index():
    return render_template('home.html', session=session.get('user'))

@app.route('/settings', methods=['GET', 'POST'])
def settings_page():
    if 'user' not in session:
        return redirect(url_for('login'))

    user_id = session['user']['sub']
    conn = get_db_connection()
    
    if request.method == 'POST':
        app_key_from_form = request.form.get('app_key')
        if app_key_from_form:
            fernet_key = Fernet.generate_key()
            cipher = Fernet(fernet_key)
            encrypted_app_key = cipher.encrypt(app_key_from_form.encode())
            
            try:
                conn.execute(
                    'INSERT OR REPLACE INTO settings (user_id, encrypted_app_key, fernet_key) VALUES (?, ?, ?)',
                    (user_id, encrypted_app_key, fernet_key)
                )
                conn.commit()
                flash('App key saved successfully!', 'success')
            except sqlite3.Error as e:
                flash(f'Database error: {e}', 'danger')
        else:
            flash('App key cannot be empty.', 'danger')
        conn.close()
        return redirect(url_for('settings_page'))

    # GET request
    setting = conn.execute('SELECT encrypted_app_key, fernet_key FROM settings WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()
    
    current_app_key = None
    if setting:
        try:
            fernet_key_from_db = setting['fernet_key']
            encrypted_key_from_db = setting['encrypted_app_key']
            cipher = Fernet(fernet_key_from_db)
            current_app_key = cipher.decrypt(encrypted_key_from_db).decode()
        except Exception as e:
            flash(f'Error decrypting app key: {e}. Please re-enter your key.', 'warning')
            # Optionally, delete the corrupted key entry here
            # conn = get_db_connection()
            # conn.execute('DELETE FROM settings WHERE user_id = ?', (user_id,))
            # conn.commit()
            # conn.close()


    return render_template('settings.html', current_app_key=current_app_key, session=session.get('user'))

@app.route('/cameras')
def cameras(): # Renamed from camera_view_page
    if 'user' not in session:
        flash('Please login to view cameras.', 'warning')
        return redirect(url_for('login'))

    user_id = session['user']['sub']
    conn = get_db_connection()
    setting = conn.execute('SELECT encrypted_app_key, fernet_key FROM settings WHERE user_id = ?', (user_id,)).fetchone()
    
    cameras_list = []
    decryption_error = False

    if not setting:
        flash('Please configure your Ezviz App Key in settings.', 'warning')
        conn.close()
        return redirect(url_for('settings_page'))

    try:
        fernet_key_from_db = setting['fernet_key']
        encrypted_key_from_db = setting['encrypted_app_key']
        cipher = Fernet(fernet_key_from_db)
        decrypted_app_key = cipher.decrypt(encrypted_key_from_db).decode()
    except Exception as e:
        flash(f'Error decrypting app key: {e}. Please re-enter your key.', 'danger')
        decrypted_app_key = None
        decryption_error = True
    
    if decrypted_app_key and not decryption_error:
        access_token = ezviz_api.get_ezviz_access_token(decrypted_app_key)
        if access_token:
            retrieved_cameras = ezviz_api.get_ezviz_camera_list(access_token)
            if retrieved_cameras is not None:
                cameras_list = retrieved_cameras
            else:
                flash('Could not retrieve camera list from Ezviz API.', 'danger')
        else:
            flash('Failed to obtain Ezviz API access token. Check your App Key.', 'danger')
    elif not decryption_error: # Only flash if no prior decryption error
        flash('App key not available or decryption failed.', 'danger')

    conn.close()
    if decryption_error: # If decryption failed, redirect to settings
         return redirect(url_for('settings_page'))
         
    return render_template('cameras.html', cameras_list=cameras_list, session=session.get('user'))

@app.route('/get_stream_url/<device_id>')
def get_stream_url(device_id):
    if 'user' not in session:
        return jsonify({'error': 'User not authenticated'}), 401

    user_id = session['user']['sub']
    conn = get_db_connection()
    setting = conn.execute('SELECT encrypted_app_key, fernet_key FROM settings WHERE user_id = ?', (user_id,)).fetchone()
    conn.close()

    if not setting:
        return jsonify({'error': 'App key not configured'}), 400

    try:
        fernet_key_from_db = setting['fernet_key']
        encrypted_key_from_db = setting['encrypted_app_key']
        cipher = Fernet(fernet_key_from_db)
        decrypted_app_key = cipher.decrypt(encrypted_key_from_db).decode()
    except Exception:
        return jsonify({'error': 'Failed to decrypt app key'}), 500

    access_token = ezviz_api.get_ezviz_access_token(decrypted_app_key)
    if not access_token:
        return jsonify({'error': 'Failed to obtain Ezviz access token'}), 500

    stream_url = ezviz_api.get_ezviz_camera_stream_url(access_token, device_id)
    if stream_url:
        return jsonify({'stream_url': stream_url})
    else:
        return jsonify({'error': 'Could not fetch stream URL from Ezviz API'}), 500

@app.route('/login')
def login():
    return auth0.authorize_redirect(redirect_uri=url_for('callback', _external=True))

@app.route('/callback')
def callback():
    token = auth0.authorize_access_token()
    session['user'] = token['userinfo']
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(
        f"https://{os.getenv('AUTH0_DOMAIN')}/v2/logout?" +
        f"client_id={os.getenv('AUTH0_CLIENT_ID')}&" +
        f"returnTo={url_for('index', _external=True)}"
    )

if __name__ == '__main__':
    # init_db() # Already called at the top
    app.run(debug=True)
