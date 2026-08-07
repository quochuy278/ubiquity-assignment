import { PasswordService } from '../../../../../src/api/v1/auth/services/password.service';

describe('Password hashing and verification', () => {
  const passwords = new PasswordService();

  it('stores a salted Argon2id hash instead of the plaintext password', async () => {
    const password = 'correct-horse-battery-staple';
    const passwordHash = await passwords.hash(password);

    expect(passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(passwordHash).not.toContain(password);
    await expect(passwords.verify(passwordHash, password)).resolves.toBe(true);
    await expect(passwords.verify(passwordHash, 'incorrect-password')).resolves.toBe(false);
  });
});
