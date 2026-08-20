$(function () {
  "use strict";

  const $form = $("#login-form");
  const $emailInput = $("#email");
  const $passwordInput = $("#password");
  const $loginBtn = $("#login-btn");
  const $statusEl = $("#status");

  const LOGIN_URL = "/api/instructor/login"; // Adjust to match your Flask route.
  const DASHBOARD_URL = "/instructor/dashboard"; // Where to redirect on success.

  function setFieldError(fieldId, message) {
    $("#" + fieldId).attr("aria-invalid", "true");
    $("#" + fieldId + "-error").text(message).addClass("is-visible");
  }

  function clearFieldError(fieldId) {
    $("#" + fieldId).removeAttr("aria-invalid");
    $("#" + fieldId + "-error").text("").removeClass("is-visible");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    let valid = true;

    clearFieldError("email");
    clearFieldError("password");

    const email = $emailInput.val().trim();
    if (!email) {
      setFieldError("email", "Enter your email address.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError("email", "Enter a valid email address.");
      valid = false;
    }

    if (!$passwordInput.val()) {
      setFieldError("password", "Enter your password.");
      valid = false;
    }

    return valid;
  }

  function setStatus(message, type) {
    $statusEl.text(message).removeClass("is-success is-error");
    if (type) $statusEl.addClass("is-" + type);
  }

  function setLoading(isLoading) {
    $loginBtn.prop("disabled", isLoading);
    $loginBtn
      .find(".submit-btn__label")
      .text(isLoading ? "Signing in..." : "Sign in");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      setStatus("Please fix the highlighted fields.", "error");
      return;
    }

    const payload = {
      email: $emailInput.val().trim(),
      password: $passwordInput.val(),
    };

    setLoading(true);
    setStatus("", null);

    $.ajax({
      url: LOGIN_URL,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function () {
        setStatus("Signed in — redirecting...", "success");
        window.location.href = DASHBOARD_URL;
      })
      .fail(function (xhr) {
        const message =
          xhr.status === 401
            ? xhr.responseJSON.error
            : "Something went wrong signing in. Please try again.";
        setStatus(message, "error");
        setLoading(false);
      });
  }

  $form.on("submit", handleSubmit);

  $("#current-year").text(new Date().getFullYear());
});