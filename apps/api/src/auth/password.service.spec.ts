import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password (SEC-002)', async () => {
    const hash = await service.hash('Turnero123!');
    expect(hash).not.toContain('Turnero123!');
    expect(hash.startsWith('$2')).toBe(true);
    await expect(service.verify('Turnero123!', hash)).resolves.toBe(true);
    await expect(service.verify('otra', hash)).resolves.toBe(false);
  });
});
