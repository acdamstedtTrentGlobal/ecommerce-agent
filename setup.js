const bcrypt = require('bcrypt');
require('dotenv').config();
const pool = require('./database');


const plainPassword = 'asd12345';

async function setup() {
    try {
        console.log('Starting setup...');

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log('Password hashed successfully');

        // Update all user passwords
        const [result] = await pool.query(
            'UPDATE users SET password = ?',
            [hashedPassword]
        );

        console.log(`Updated ${result.affectedRows} user passwords`);

        // TODO: Create embeddings for documents and reviews here in the future

        console.log('Setup completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}

setup();
