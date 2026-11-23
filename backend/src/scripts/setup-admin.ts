import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.log('\n❌ Please provide a password as an argument.');
  console.log('Usage: npx ts-node src/scripts/setup-admin.ts <your-password>');
  console.log('Example: npx ts-node src/scripts/setup-admin.ts mySecretPass2026\n');
  process.exit(1);
}

async function run() {
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);

  console.log('\n========================================');
  console.log('UNATION Admin Password Hash Generated:');
  console.log('========================================');
  console.log(`\nADMIN_PASSWORD_HASH=${hash}\n`);
  console.log('Copy the line above and paste it into your backend/.env file.');
  console.log('Keep this hash confidential and never commit it to public repositories.\n');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
