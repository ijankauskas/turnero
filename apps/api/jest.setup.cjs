const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  for (const raw of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '../../.env'));

process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.JWT_EXPIRES_IN ||= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ||= '7d';
process.env.LOGIN_RATE_LIMIT ||= '100';
process.env.LOGIN_RATE_WINDOW_MS ||= '60000';
