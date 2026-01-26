import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('--- Configuration Check ---');
const mongoUri = process.env.MONGODB_URI || '';
console.log(`MONGODB_URI: ${mongoUri.includes('<password>') ? 'PLACEHOLDER' : 'SET'}`);

const smtpHost = process.env.SMTP_HOST || '';
console.log(`SMTP_HOST: ${smtpHost === 'smtp.example.com' ? 'PLACEHOLDER' : smtpHost}`);

const smtpUser = process.env.SMTP_USER || '';
console.log(`SMTP_USER: ${smtpUser === 'your_smtp_user' ? 'PLACEHOLDER' : 'SET'}`);

const smtpPass = process.env.SMTP_PASS || '';
console.log(`SMTP_PASS: ${smtpPass === 'your_smtp_password' ? 'PLACEHOLDER' : 'SET'}`);
console.log('---------------------------');
