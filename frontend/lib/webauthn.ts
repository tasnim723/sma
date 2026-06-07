
/**
 * Utility for WebAuthn (FaceID / Biometrics)
 */

export function base64urlToBytes(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function bytesToBase64url(bytes: Uint8Array): string {
  const base64 = window.btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Prepares the options received from the server for navigator.credentials.create
 */
export function prepareRegistrationOptions(options: any) {
  return {
    ...options,
    challenge: base64urlToBytes(options.challenge),
    user: {
      ...options.user,
      id: base64urlToBytes(options.user.id),
    },
    excludeCredentials: options.excludeCredentials?.map((cred: any) => ({
      ...cred,
      id: base64urlToBytes(cred.id),
    })),
  };
}

/**
 * Prepares the options received from the server for navigator.credentials.get
 */
export function prepareAuthenticationOptions(options: any) {
  return {
    ...options,
    challenge: base64urlToBytes(options.challenge),
    allowCredentials: options.allowCredentials?.map((cred: any) => ({
      ...cred,
      id: base64urlToBytes(cred.id),
    })),
  };
}

/**
 * Encodes the credential object for the server
 */
export function encodeCredential(credential: any) {
  const { id, rawId, response, type } = credential;

  const encoded: any = {
    id,
    rawId: bytesToBase64url(new Uint8Array(rawId)),
    type,
    response: {},
  };

  if (response.attestationObject) {
    encoded.response.attestationObject = bytesToBase64url(new Uint8Array(response.attestationObject));
  }
  if (response.clientDataJSON) {
    encoded.response.clientDataJSON = bytesToBase64url(new Uint8Array(response.clientDataJSON));
  }
  if (response.authenticatorData) {
    encoded.response.authenticatorData = bytesToBase64url(new Uint8Array(response.authenticatorData));
  }
  if (response.signature) {
    encoded.response.signature = bytesToBase64url(new Uint8Array(response.signature));
  }
  if (response.userHandle) {
    encoded.response.userHandle = bytesToBase64url(new Uint8Array(response.userHandle));
  }

  return encoded;
}
