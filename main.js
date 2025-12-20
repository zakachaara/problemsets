// Mock API URLs (replace with your actual endpoints)
const API_BASE_URL = 'http://localhost:3001';
const SEND_CODE_URL = `${API_BASE_URL}/send-verification`;
const VERIFY_CODE_URL = `${API_BASE_URL}/verify-code`;

function display_log_in_form() {
    const loginForm = document.querySelector('.log-in-form');
    const mainContent = document.querySelector('.main');
    
    // Display login form with animation
    loginForm.style.display = 'block';
    
    // Add a subtle fade effect to main content
    mainContent.style.display = "none"
    mainContent.style.opacity = '0.7';
    mainContent.style.transform = 'scale(0.98)';
    mainContent.style.transition = 'all 0.3s ease';
    
    // Scroll to login form
    loginForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closePopup() {
    const popUp = document.querySelector('.pop-up');
    const overlay = document.querySelector('.overlay');

    popUp.style.display = 'none';
    overlay.style.display = 'none';
}


function send_and_display_code_placeholder(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    const codePlaceholder = document.querySelector('.code-placeholder');
    const popUp = document.querySelector('.pop-up');
    const overlay = document.querySelector('.overlay');

    if (!email || !email.includes('@')) {
        showErrorPopup('Please enter a valid email address');
        emailInput.focus();
        return;
    }

    codePlaceholder.style.display = 'flex';

    popUp.style.display = 'block';
    overlay.style.display = 'block';

    // Attach listeners once
    overlay.onclick = closePopup;
    popUp.onclick = e => e.stopPropagation();
    
    // Send GET request to send verification code
    fetch(`${SEND_CODE_URL}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to send verification code');
            }
            return response.json();
        })
        .then(data => {
            console.log('The last Verification code was:', data.previousCode);
            // In a real implementation, you might show a success message
        })
        .catch(error => {
            console.error('Error sending verification code:', error);
            // The pop-up already shows the error message
        });
    
    // // Auto-hide pop-up after 8 seconds
    // setTimeout(() => {
    //     popUp.style.display = 'none';
    //     overlay.style.display = 'none';
    // }, 8000);
}

function verify(event) {
    event.preventDefault(); // Prevent form submission
    
    const emailInput = document.getElementById('email');
    const codeInput = document.querySelector('input[name="code"]');
    const email = emailInput.value.trim();
    const code = codeInput.value.trim();
    
    // Validate inputs
    if (!code) {
        showErrorPopup('Please enter verification code');
        return;
    }
    
    // Prepare request data
    const requestData = {
        email: email,
        code: code
    };
    
    // Send POST request to verify code
    fetch(VERIFY_CODE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (response.status === 200) {
            // Successful verification - display success page
            response.json().then(data => {    
                // Now pass the data to displaySuccessPage
                displaySuccessPage(data);
            });
        } else if (response.status === 401) {
            // Incorrect code
            showErrorPopup('You are not allowed to log in, code incorrect');
            codeInput.value = '';
            codeInput.focus();
        } else {
            // Other errors
            throw new Error('Verification failed');
        }
    })
    .catch(error => {
        console.error('Error verifying code:', error);
        showErrorPopup('An error occurred during verification. Please try again.');
    });
}

function displaySuccessPage(data) {
    // Hide all existing content
    document.querySelector('.nav-bar').style.display = 'none';
    document.querySelector('.main').style.display = 'none';
    document.querySelector('.log-in-form').style.display = 'none';
    
    // Create and display success page
    const successPage = document.createElement('div');
    successPage.className = 'success-page';
    successPage.innerHTML = `
        <div class="success-icon">✓</div>
        <h1>Login Successful!</h1>
        <p>Welcome back! You have successfully verified your account.</p>
        <p>You now have access to the precious information.</p>
        <p style="margin-top: 30px; font-size: 0.9em; color: #718096;">
            Your Token is ${data.token}.
        </p>
    `;
    
    document.body.appendChild(successPage);
    
    // Add a home button
    const homeButton = document.createElement('button');
    homeButton.textContent = 'Return Home';
    homeButton.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 8px;
        font-size: 1em;
        font-weight: 600;
        cursor: pointer;
        margin-top: 20px;
        transition: all 0.3s ease;
    `;
    homeButton.onmouseenter = () => homeButton.style.transform = 'translateY(-2px)';
    homeButton.onmouseleave = () => homeButton.style.transform = 'translateY(0)';
    homeButton.onclick = () => location.reload();
    
    successPage.appendChild(homeButton);
}

function showErrorPopup(message) {
    // Remove existing error popups
    const existingError = document.querySelector('.error-popup');
    if (existingError) {
        existingError.remove();
    }
    
    // Create new error popup
    const errorPopup = document.createElement('div');
    errorPopup.className = 'error-popup';
    errorPopup.textContent = message;
    
    document.body.appendChild(errorPopup);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (errorPopup.parentNode) {
            errorPopup.remove();
        }
    }, 3000);
}

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = () => {
        overlay.style.display = 'none';
        document.querySelector('.pop-up').style.display = 'none';
    };
    document.body.appendChild(overlay);
    return overlay;
}

// Add overlay to HTML if not present
if (!document.querySelector('.overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'none';
    document.body.insertBefore(overlay, document.body.firstChild);
}

// Add click event to Home span in main content
document.addEventListener('DOMContentLoaded', () => {
    const homeSpan = document.querySelector('.main span');
    if (homeSpan) {
        homeSpan.onclick = display_log_in_form;
    }
});

// Function to display source code image
function display_source_code() {
    const modal = document.querySelector('.source-code-modal');
    const image = document.getElementById('sourceCodeImage');
    
    // You can use a local path or URL
    image.src = './images/source-code.png'; 
    
    // Display the modal
    modal.style.display = 'flex';
    
    // Prevent scrolling on the background
    document.body.style.overflow = 'hidden';
}

// Function to close the source code modal
function close_source_code() {
    const modal = document.querySelector('.source-code-modal');
    modal.style.display = 'none';
    
    // Restore scrolling
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside the content
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.querySelector('.source-code-modal');
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            close_source_code();
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            close_source_code();
        }
    });
});