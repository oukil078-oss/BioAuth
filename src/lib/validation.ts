export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length !== 5) return 'Username must be exactly 5 characters';
  if (!/^[A-Za-z]{5}$/.test(username))
    return 'Only letters allowed (no numbers, spaces, or special characters)';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length !== 8) return 'Password must be exactly 8 characters';
  if (!/^[A-Za-z0-9]{8}$/.test(password))
    return 'Only letters and numbers allowed (no spaces or special characters)';
  return null;
}
