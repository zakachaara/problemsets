const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { log } = require('console');
const app = express();

app.use(express.static(path.join(__dirname, '..')));
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*', // Adjust to match your frontend URL
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Constants
const CODE_FILE_PATH = path.join(__dirname, 'info.txt');

const LOCK_FILE = `${CODE_FILE_PATH}.lock`;

async function acquireLock(retryDelay = 50) {
    while (true) {
        try {
            await fs.open(LOCK_FILE, 'wx'); // atomic
            return;
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
            await new Promise(r => setTimeout(r, retryDelay));
        }
    }
}

async function releaseLock() {
    await fs.unlink(LOCK_FILE);
}

/**
 * Creates a verification code
 * @returns {string} - The generated verification code
 */
function generateNextCode(seed) {
    const a = 783129;
    const b = 1000000;
    const base = seed ? parseInt(seed, 10) : 177218;
    return ((base * a) % b).toString().padStart(6, '0');
}


/**
 * Reads the code file and returns lines
 * @returns {Promise<Array<string>>} - Array of lines from the file
 */
async function readCodeFile() {
    try {
        // Check if file exists
        try {
            await fs.access(CODE_FILE_PATH);
        } catch {
            // File doesn't exist, create it with empty content
            await fs.writeFile(CODE_FILE_PATH, '');
            return ['', ''];
        }

        // Read file content
        const content = await fs.readFile(CODE_FILE_PATH, 'utf8');
        const lines = content.split('\n');
        
        // Ensure we always have at least 2 lines
        return [
            lines[0] || '',
            lines[1] || ''
        ];
    } catch (error) {
        console.error('Error reading code file:', error);
        return ['', ''];
    }
}

/**
 * Writes codes to the file
 * @param {string} previousCode - The code to write on first line
 * @param {string} newCode - The code to write on second line
 */
async function writeCodeFile(previousCode, newCode) {
    try {
        const content = `${previousCode}\n${newCode}`;
        await fs.writeFile(CODE_FILE_PATH, content, 'utf8');
        console.log('Code file updated successfully');
    } catch (error) {
        console.error('Error writing to code file:', error);
        throw error;
    }
}

/**
 * GET /send-verification endpoint
 * Generates a new verification code and updates the file
 */
app.get('/send-verification', async (req, res) => {

    // await acquireLock();
    try {
        

        // Read current codes from file
        const [oldCode, lastCode] = await readCodeFile();

        const newCode = generateNextCode(lastCode);
        
        if (!newCode) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate verification code'
            });
        }
        
        // shift lines correctly
        await writeCodeFile(lastCode, newCode);
        
        // Log the action (in production, you would actually send an email here)
        // console.log(`Verification code ${newCode} generated for email`);
        // console.log(`Previous code: ${lastCode}`);
        log('Verification code generated successfully');
        
        // Return response
        res.json({
            success: true,
            message: 'Verification code generated successfully',
            previousCode: lastCode,
            note: 'In production, this code would be sent via email'
        });

    } catch (error) {
        console.error('Error in /send-verification:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        // await releaseLock();
    }
});

/**
 * POST /verify-code endpoint
 * Verifies the provided code against the stored code
 */
app.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        // Validate input
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Valid email is required'
            });
        }
        
        if (!code || typeof code !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid verification code is required'
            });
        }

        // Read current code from file (second line)
        const [, currentCode] = await readCodeFile();
        
        // Debug log (remove in production)
        console.log(`Verification attempt for ${email}`);
        console.log(`Provided code: ${code}, Stored code: ${currentCode}`);
        
        // Verify the code
        if (currentCode && code === currentCode.trim()) {
            
            res.json({
                success: true,
                message: 'Verification successful',
                user: {
                    email: email,
                    verified: true
                },
                token: 'TKN{YOU_4RE_5Tr0ng}' // In production, generate actual JWT
            });
        } else {
            // Failed verification
            res.status(401).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

    } catch (error) {
        console.error('Error in /verify-code:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        service: 'Email Verification API',
        version: '1.0.0',
        endpoints: {
            sendVerification: 'GET /send-verification?email=user@example.com',
            verifyCode: 'POST /verify-code',
            // status: 'GET /status'
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Code file location: ${CODE_FILE_PATH}`);
    
    // Initialize info.txt file if it doesn't exist
    (async () => {
        try {
            await fs.access(CODE_FILE_PATH);
            console.log('info.txt file found');
        } catch {
            await fs.writeFile(CODE_FILE_PATH, '');
            console.log('info.txt file created');
        }
    })();
});