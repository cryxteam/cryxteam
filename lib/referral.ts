export function generateReferralCode(username: string) {
    const random = Math.random().toString(36).substring(2, 6);
    return `${username}-${random}`.toUpperCase();
  }
  