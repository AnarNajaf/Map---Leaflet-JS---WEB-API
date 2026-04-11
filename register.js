const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const sendOtpBtn = document.getElementById("sendOtpBtn");

const AUTH_BASE_URL = "http://localhost:5159";
let originalOTP = null;

const loadingIndicator = document.getElementById("loadingIndicator");
const loadingText = document.getElementById("loadingText");

function showLoading(text) {
  loadingText.textContent = text;
  loadingIndicator.classList.add("visible");
}

function hideLoading() {
  loadingIndicator.classList.remove("visible");
}
function showMessage(message, type = "error") {
  registerMessage.textContent = message;
  registerMessage.className = `message ${type}`;
}

function clearMessage() {
  registerMessage.textContent = "";
  registerMessage.className = "message";
}
function togglePassword(inputId, element) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  element.innerHTML = isHidden
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
       </svg>`;
}

sendOtpBtn.addEventListener("click", async function () {
  clearMessage();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    showMessage("Please enter your email first.");
    return;
  }

  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = "Sending OTP...";
  showLoading("Sending OTP to your email");
  try {
    const response = await fetch(
      `${AUTH_BASE_URL}/api/Identity/SendVerificationEmail?email=${encodeURIComponent(email)}`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to send OTP.");
    }

    // Backend returns protected OTP string directly
    const data = await response.json();
    originalOTP = data.originalOTP;

    if (!originalOTP) {
      throw new Error("Backend did not return originalOTP.");
    }

    showMessage("OTP sent successfully. Check your email.", "success");
  } catch (err) {
    console.error("Send OTP error:", err);
    showMessage(err.message || "Failed to send OTP.");
  } finally {
    hideLoading();
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = "Send OTP";
  }
});

registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  clearMessage();

  const name = document.getElementById("name").value.trim();
  const surname = document.getElementById("surname").value.trim();
  const age = Number(document.getElementById("age").value);
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const otp = document.getElementById("otpCode").value.trim();

  if (
    !name ||
    !surname ||
    !age ||
    !email ||
    !password ||
    !confirmPassword ||
    !otp
  ) {
    showMessage("Please fill in all fields.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.");
    return;
  }

  if (!originalOTP) {
    showMessage("Please click 'Send OTP' first.");
    return;
  }

  try {
    const payload = {
      name: name,
      surname: surname,
      age: age,
      email: email,
      password: password,
      roles: ["User"],
      otp: otp,
      originalOTP: originalOTP,
    };

    const response = await fetch(`${AUTH_BASE_URL}/api/Identity/Registration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Registration failed.");
    }

    showMessage("Registration successful. Redirecting to login...", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  } catch (err) {
    console.error("Registration error:", err);
    showMessage(err.message || "Registration failed.");
  }
});
