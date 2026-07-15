const header = document.querySelector("header");

window.addEventListener("scroll",()=>{

if(window.scrollY>50){

header.classList.add("scrolled");

}else{

header.classList.remove("scrolled");

}

});

const observer = new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add("active");

}

});

},{
threshold:0.2
});

document.querySelectorAll(".reveal").forEach(item=>{

observer.observe(item);

});

// ================= AUTH SYSTEM =================

// Initialize auth system
function initAuth() {
    const currentUser = localStorage.getItem('currentUser');
    const isFirstVisit = !localStorage.getItem('authInitialized');
    
    if (isFirstVisit) {
        localStorage.setItem('authInitialized', 'true');
        openAuthModal();
    }
    
    updateAuthUI();
}

// Open auth modal
function openAuthModal() {
    document.getElementById('authModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close auth modal
function closeAuthModal() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        document.getElementById('authModal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Switch to register form
function switchToRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginError').innerHTML = '';
    document.getElementById('registerError').innerHTML = '';
}

// Switch to login form
function switchToLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('loginError').innerHTML = '';
    document.getElementById('registerError').innerHTML = '';
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    errorDiv.innerHTML = '';
    
    if (!email || !password) {
        showError(errorDiv, 'Vui lòng nhập email và password');
        return;
    }
    
    if (password.length < 6) {
        showError(errorDiv, 'Password phải có ít nhất 6 ký tự');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            showError(errorDiv, data.message || 'Đăng nhập thất bại');
            return;
        }

        setAuthData(data.user, data.token);
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';

        closeAuthModal();
        updateAuthUI();
        alert('Đăng nhập thành công! Chào mừng ' + data.user.name);
    } catch (error) {
        showError(errorDiv, 'Không thể kết nối tới server. Vui lòng thử lại sau.');
        console.error(error);
    }
}

// Handle register
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorDiv = document.getElementById('registerError');
    
    errorDiv.innerHTML = '';
    
    if (!name || !email || !password || !confirmPassword) {
        showError(errorDiv, 'Vui lòng điền đầy đủ tất cả các trường');
        return;
    }
    
    if (name.length < 3) {
        showError(errorDiv, 'Tên phải có ít nhất 3 ký tự');
        return;
    }
    
    if (password.length < 6) {
        showError(errorDiv, 'Password phải có ít nhất 6 ký tự');
        return;
    }
    
    if (password !== confirmPassword) {
        showError(errorDiv, 'Password không trùng khớp');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            showError(errorDiv, data.message || 'Đăng ký thất bại');
            return;
        }

        setAuthData(data.user, data.token);
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        switchToLogin();
        closeAuthModal();
        updateAuthUI();
        alert('Đăng ký thành công! Chào mừng ' + name);
    } catch (error) {
        showError(errorDiv, 'Không thể kết nối tới server. Vui lòng thử lại sau.');
        console.error(error);
    }
}

// Handle guest login
function handleGuestLogin() {
    const guestUser = {
        name: 'Khách',
        email: '',
        guest: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('currentUser', JSON.stringify(guestUser));
    localStorage.removeItem('authToken');
    updateAuthUI();
    closeAuthModal();
    alert('Bạn đang xem trang dưới tư cách Khách');
}

// Handle logout
function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        clearAuthData();
        updateAuthUI();
        openAuthModal();
    }
}

function setAuthData(user, token) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
}

function clearAuthData() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
}

// Update auth UI
function updateAuthUI() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const authBtn = document.getElementById('authBtn');
    const authSection = document.getElementById('authSection');
    
    if (currentUser) {
        authBtn.style.display = 'none';
        authSection.style.display = 'block';
        document.getElementById('userNameDisplay').textContent = currentUser.name;
        document.getElementById('userEmailDisplay').textContent = currentUser.email;
    } else {
        authBtn.style.display = 'block';
        authSection.style.display = 'none';
    }
}

// Show error message
function showError(errorDiv, message) {
    errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const authModal = document.getElementById('authModal');
    const authContainer = document.querySelector('.auth-container');
    
    if (authModal && event.target === authModal) {
        // Prevent closing if user is not logged in
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            closeAuthModal();
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAuth);