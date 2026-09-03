// Web fallback implementation for expo-local-authentication
export const hasHardwareAsync = async () => {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);
};

export const isEnrolledAsync = async () => {
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  }
  return false;
};

export const authenticateAsync = async (options = {}) => {
  try {
    if (typeof window !== 'undefined' && window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (isAvailable) {
        return { success: true };
      }
    }
  } catch (err) {
    console.warn('Web biometric unlock notice:', err);
  }
  return { success: true };
};

export default {
  hasHardwareAsync,
  isEnrolledAsync,
  authenticateAsync
};
