const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
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

/**
 * Creates a verification code
 * @returns {string} - The generated verification code
 */
async function createCode() {
    try {
        const a = 783129;
        const b = 1000000;
        
        // Read previous codes 
        const [previousCode, _] = await readCodeFile();
        
        
        // If there's no previous code, use the default seed
        if (!previousCode || previousCode.trim() === '') {
            const defaultSeed = 177218; 
            const newCode = (defaultSeed * a) % b;
            
            // Format as 6-digit string with leading zeros
            return newCode.toString().padStart(6, '0');
        }
        
        // Convert previous code to integer
        const previousNum = parseInt(previousCode.trim(), 10);
        
        
        const newCode = (previousNum * a) % b;
        
        return newCode.toString().padStart(6, '0');
        
    } catch (error) {
        console.error('Error in createCode:', error);
    }
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
    try {
        

        // Read current codes from file
        const [_, previousCode] = await readCodeFile();
        
        // Generate new code (implement createCode function)
        const newCode = await createCode();
        
        if (!newCode) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate verification code'
            });
        }
        
        await writeCodeFile(previousCode, newCode);
        
        // Log the action (in production, you would actually send an email here)
        console.log(`Verification code ${newCode} generated for email`);
        console.log(`Previous code: ${previousCode}`);
        
        // Return response
        res.json({
            success: true,
            message: 'Verification code generated successfully',
            previousCode: previousCode,
            note: 'In production, this code would be sent via email'
        });

    } catch (error) {
        console.error('Error in /send-verification:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
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

// /**
//  * GET /status endpoint (optional - for debugging)
//  * Returns the current state of the code file
//  */
// app.get('/status', async (req, res) => {
//     try {
//         const [previousCode, currentCode] = await readCodeFile();
        
//         res.json({
//             success: true,
//             data: {
//                 previousCode: previousCode,
//                 currentCode: currentCode,
//                 fileExists: true
//             }
//         });
//     } catch (error) {
//         console.error('Error in /status:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Internal server error'
//         });
//     }
// });

/**
 * Root endpoint
 */
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