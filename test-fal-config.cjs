// Diagnostic script to test FAL configuration
console.log('\n=== FAL Configuration Diagnostic ===\n');

// 1. Load dotenv
console.log('1. Loading .env file...');
require('dotenv').config();

console.log('2. Environment variables:');
console.log('   FAL_KEY:', process.env.FAL_KEY ? `${process.env.FAL_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('   FAL_KEY_ID:', process.env.FAL_KEY_ID || 'NOT SET');
console.log('   FAL_KEY_SECRET:', process.env.FAL_KEY_SECRET ? '***' : 'NOT SET');

// 2. Test what FAL SDK will use
console.log('\n3. FAL SDK credential resolution:');
const fal = require('@fal-ai/serverless-client');

// Get the config before calling fal.config()
console.log('   Before fal.config(): Checking default behavior...');

// Now configure it like the app does
console.log('\n4. Calling fal.config() like in fal.ts...');
fal.config({
    credentials: process.env.FAL_KEY || '',
});

console.log('   Configured with:', process.env.FAL_KEY ? `${process.env.FAL_KEY.substring(0, 20)}...` : 'EMPTY STRING');

// Test with a simple API call (this will fail but show us what key is being used)
console.log('\n5. Testing FAL SDK configuration...');
console.log('   The SDK is now configured. If you make a real API call,');
console.log('   it will use the credentials set in fal.config().');

console.log('\n=== Full .env FAL_KEY value ===');
console.log(process.env.FAL_KEY);

console.log('\n=== Diagnostic Complete ===\n');
