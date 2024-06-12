import View from "../View.js";
require("dotenv").config();

class LoginView extends View {
  _signupHere = document.querySelector(".signup-here");
  _loginHere = document.querySelector(".login-here");
  addLoginViewHandler(handler) {
    window.addEventListener("load", handler);
  }

  generateSignup() {
    const loginBtn = document.querySelector(".loginsignup-login");
    const signupBtn = document.querySelector(".loginsignup-signup");
    // const modeSwitch = document.querySelector(".switch-mode");
    loginBtn.classList.toggle("hide");
    signupBtn.classList.toggle("hide");

    const loginTitle = document.querySelector(".login-title");
    loginTitle.textContent = "Signup";

    const markup = `
    <input name="username" type="text" placeholder="Your Name" id="username-input"/>
    `;

    const logFields = document.querySelector(".loginsignup-fields");
    logFields.insertAdjacentHTML("afterbegin", markup);
  }

  generateLogin() {
    const loginBtn = document.querySelector(".loginsignup-login");
    const signupBtn = document.querySelector(".loginsignup-signup");
    loginBtn.classList.toggle("hide");
    signupBtn.classList.toggle("hide");
    const logFields = document.querySelector(".loginsignup-fields");
    logFields.innerHTML = "";
    const loginTitle = document.querySelector(".login-title");
    loginTitle.textContent = "Login";
    const markup = `<input name="email" type="email" placeholder="Email Address" />
    <input name="password" type="password" placeholder="Password" />`;
    logFields.insertAdjacentHTML("afterbegin", markup);
  }

  changeMode = function () {
    const modeCheck =
      document.querySelector(".login-title").textContent == "Login";

    const signupFn = this._signupHere.addEventListener(
      "click",
      this.generateSignup
    );

    const loginFn = this._loginHere.addEventListener(
      "click",
      this.generateLogin
    );

    modeCheck ? signupFn : loginFn;
  };

  loginHandler = function (data) {
    try {
      const formData = new FormData();

      formData.append("email", data.email);
      formData.append("password", data.password);

      const login = async function (userFormData) {
        const serverUrl = `${process.env.API_URL}`;
        const port = `${process.env.API_PORT}`;
        try {
          console.log(userFormData);
          let response;
          await fetch(`${serverUrl}/login`, {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "multipart/form-data",
              "Content-Type": "application/json",
              // "X-Custom-Header": "CustomValue",
            },
            body: JSON.stringify(userFormData),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error(response.errors);
              }
              console.log("success!");
              response.json();
            })
            .then((data) => (response = data))
            .catch((err) => console.error("Error:", err));

          if (response.success && response.adminCheck === "admin") {
            localStorage.setItem("auth-token", response.token);
            window.open("../html/bambaYafa.html");
          }
          if (response.success && response.adminCheck === "user") {
            localStorage.setItem("auth-token", response.token);
            window.location.replace("../../index.html");
          } else {
            alert(response.errors);
          }
        } catch (err) {
          console.error(err);
        }
      };

      const signup = async function (formData) {
        const serverUrl = `${process.env.API_URL}`;
        let response;
        await fetch(`${serverUrl}/signup`, {
          method: "POST",
          headers: {
            Accept: "application/form-data",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => response.json())
          .then((data) => (response = data));

        if (response.success) {
          localStorage.setItem("auth-token", response.token);
          window.location.replace("../index.html");
        } else {
          alert(response.errors);
        }
      };

      const modeCheck =
        document.querySelector(".login-title").textContent == "Login";
      modeCheck ? login(formData) : signup(data);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  continueLogin() {
    const continueBtn = document.querySelector(".continue-button");
    continueBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const userEmail = document.getElementById("email-input").value;
      const userPassword = document.getElementById("password-input").value;
      const data = {
        email: userEmail,
        password: userPassword,
      };
      if (userEmail == "" || userPassword == "") {
        alert("Please enter a valid email or password");
      }
      this.loginHandler(data);
    });
  }

  continueSignup() {
    const continueBtn = document.querySelector(".continue-button");
    continueBtn.addEventListener("click", (e) => {
      const userUsername = document.getElementById("username-input").value;
      const userEmail = document.getElementById("email-input").value;
      const userPassword = document.getElementById("password-input").value;
      const data = {
        username: userUsername,
        email: userEmail,
        password: userPassword,
      };
      this.loginHandler(data);
    });
  }

  continueHandler = function () {
    const modeCheck =
      document.querySelector(".login-title").textContent == "Login";

    modeCheck ? this.continueLogin() : this.continueSignup();
  };
}

export default new LoginView();
