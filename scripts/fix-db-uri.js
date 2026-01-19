const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔒 MongoDB Connection String Generator');
console.log('=======================================');
console.log('This tool URL-encodes your password to fix "bad auth" errors.\n');

rl.question('1. Enter MongoDB Username: ', (username) => {
  rl.question('2. Enter MongoDB Password (raw, exactly as is): ', (password) => {
    rl.question('3. Enter Cluster Address (e.g., cluster0.xyz.mongodb.net): ', (host) => {
      rl.question('4. Enter Database Name (default: chatbull): ', (db) => {
        
        const dbName = db.trim() || 'chatbull';
        const cleanHost = host.replace('mongodb+srv://', '').split('/')[0];
        
        const encodedUser = encodeURIComponent(username.trim());
        const encodedPass = encodeURIComponent(password); // Don't trim password, spaces might be intentional
        
        const uri = `mongodb+srv://${encodedUser}:${encodedPass}@${cleanHost}/${dbName}?retryWrites=true&w=majority`;
        
        console.log('\n✅ HERE IS YOUR CORRECT CONNECTION STRING:');
        console.log('---------------------------------------------------');
        console.log(uri);
        console.log('---------------------------------------------------');
        console.log('\n👉 ACTION: Copy the string above and update MONGODB_URI in Render Dashboard.');
        
        rl.close();
      });
    });
  });
});
