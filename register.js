const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const sendOtpBtn = document.getElementById("sendOtpBtn");

const AUTH_BASE_URL = "http://localhost:5159";
let originalOTP = null;

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

  if (input.type === "password") {
    input.type = "text";
    element.textContent = "🙈";
  } else {
    input.type = "password";
    element.textContent = "👁";
  }
}

sendOtpBtn.addEventListener("click", async function () {
  clearMessage();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    showMessage("Please enter your email first.");
    return;
  }

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
    console.log("Protected originalOTP:", originalOTP);
  } catch (err) {
    console.error("Send OTP error:", err);
    showMessage(err.message || "Failed to send OTP.");
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
