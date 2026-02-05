
import { GoogleAuthState } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

/**
 * INSTRUCTIONS TO FIX ERROR 400:
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Click "+ CREATE CREDENTIALS" -> "OAuth client ID"
 * 3. Select "Web application"
 * 4. Add "Authorized JavaScript origins": 
 *    - http://localhost:XXXX (your local dev URL)
 *    - https://[your-app-id].onrender.com (your production URL)
 * 5. Leave "Authorized redirect URIs" EMPTY (not needed for this popup flow).
 * 6. Copy the "Client ID" and paste it below.
 */
const CLIENT_ID = '612545912090-klomt6jihng3hmhqiqnhopvbutk48osf.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/drive.readonly';

let tokenClient: any = null;

export const initGoogleAuth = (onTokenResponse: (token: string) => void) => {
  return new Promise<void>((resolve) => {
    const checkGSI = setInterval(() => {
      if (window.google) {
        clearInterval(checkGSI);
        
        if (CLIENT_ID === 'YOUR_CLIENT_ID.apps.googleusercontent.com') {
          console.warn('CRITICAL: You are using the placeholder CLIENT_ID. Google login will fail with Error 400 until you replace it in services/googleAuth.ts');
          return;
        }

        try {
          tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            ux_mode: 'popup',
            callback: (response: any) => {
              if (response.error) {
                console.error('GSI Auth Error:', response.error, response.error_description);
                if (response.error === 'idpiframe_initialization_failed') {
                  alert('Auth failed. Check if your browser blocks third-party cookies or if the Origin is not whitelisted in Google Console.');
                }
                return;
              }
              if (response.access_token) {
                onTokenResponse(response.access_token);
              }
            },
          });
          resolve();
        } catch (err) {
          console.error('Failed to initialize Google Auth Client.', err);
        }
      }
    }, 100);
  });
};

export const requestToken = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    const msg = CLIENT_ID === 'YOUR_CLIENT_ID.apps.googleusercontent.com' 
      ? 'You must replace "YOUR_CLIENT_ID..." in services/googleAuth.ts with your real Client ID from Google Cloud Console.'
      : 'Auth client not ready. Refresh the page or check the console for errors.';
    console.error(msg);
    alert(msg);
  }
};

export const revokeToken = (token: string) => {
  if (window.google) {
    window.google.accounts.oauth2.revoke(token, () => {
      console.log('Token revoked');
    });
  }
};
