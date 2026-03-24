const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const AUTH_BASE_URL = "http://localhost:5159";

function showLoginMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.className = `message ${type}`;
}

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const payload = {
      email: email,
      password: password,
      roles: ["Farmer"],
    };

    const response = await fetch(`${AUTH_BASE_URL}/api/Identity/Login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Login failed.");
    }

    const data = await response.json();

    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);

    showLoginMessage("Login successful. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);
  } catch (err) {
    console.error("Login error:", err);
    showLoginMessage(err.message || "Login failed.");
  }
});
