$(function () {
  "use strict";

  const $form = $("#disclosure-form");
  const $card = $form.closest(".card");
  const $emailInput = $("#student_email");
  const $aiUsageRadios = $('input[name="ai_usage"]');
  const $logField = $("#log-field");
  const $logTextarea = $("#ai_log");
  const $submitBtn = $("#submit-btn");
  const $statusEl = $("#status");

  const $contextBar = $("#context-bar");
  const $contextCourse = $("#context-course");
  const $contextAssignment = $("#context-assignment");

  const SUBMIT_URL = "/api/prompts"; // Adjust to match your Flask route.

  /* ------------------------------------------------------------------
     Course/assignment now come exclusively from the URL, e.g.
     /?course_id=COSI-121A&assignment_id=hw3
     There's no manual course field anymore, so course_id is required
     to be present in the query string for a submission to be valid.
     ------------------------------------------------------------------ */
  function hydrateFromQueryParams() {
    
    const assignmentId = $('#disclosure-form').data("assignment-id");
    $contextBar.prop("hidden", false);
    $form.data("assignmentId", assignmentId);
  }

  /* ------------------------------------------------------------------
     Toggle the log textarea based on the "no AI used" checkbox
     ------------------------------------------------------------------ */
  function syncLogFieldState() {
    const selected = $('input[name="ai_usage"]:checked').val();
    const usedAi = selected === "yes";
    $logField.toggleClass("is-collapsed", !usedAi);
    $logTextarea.prop("disabled", !usedAi);
    if (!usedAi) {
      clearFieldError("ai_log");
    }
    if (selected) {
      clearFieldError("ai_usage");
    }
  }

  $aiUsageRadios.on("change", syncLogFieldState);

  /* ------------------------------------------------------------------
     Validation
     ------------------------------------------------------------------ */
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

    clearFieldError("student_email");
    clearFieldError("ai_usage");
    clearFieldError("ai_log");

    const email = $emailInput.val().trim();
    if (!email) {
      setFieldError("student_email", "Enter your email address.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError("student_email", "Enter a valid email address.");
      valid = false;
    }

    const aiUsage = $('input[name="ai_usage"]:checked').val();
    if (!aiUsage) {
      setFieldError("ai_usage", "Select whether you used AI assistance for this assignment.");
      valid = false;
    } else if (aiUsage === "yes" && !$logTextarea.val().trim()) {
      setFieldError(
        "ai_log",
        "Paste your conversation log."
      );
      valid = false;
    }

    return valid;
  }

  /* ------------------------------------------------------------------
     Status messaging
     ------------------------------------------------------------------ */
  function setStatus(message, type) {
    $statusEl.text(message).removeClass("is-success is-error");
    if (type) $statusEl.addClass("is-" + type);
  }

  function showConfirmation() {
    $("#submit-btn").css('display', 'none');
    const $confirmation = $(
      '<div class="confirmation">' +
        '<div class="confirmation__icon">&#10003;</div>' +
        '<h2 class="confirmation__title">Report submitted</h2>' +
        '<p class="confirmation__text">Your AI usage submission has been recorded.</p>' +
        "</div>"
    );
    $card.append($confirmation).addClass("is-submitted");
  }

  /* ------------------------------------------------------------------
     Submit
     ------------------------------------------------------------------ */
  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      setStatus("Please fix the highlighted fields.", "error");
      return;
    }

    const aiUsage = $('input[name="ai_usage"]:checked').val();
    const payload = {
      student_email: $emailInput.val().trim(),
      used_ai: aiUsage === "yes",
      ai_log: aiUsage === "yes" ? $logTextarea.val().trim() : null,
      assignment_id: $form.data("assignmentId") || null,
    };

    $submitBtn.prop("disabled", true);
    $submitBtn.find(".submit-btn__label").text("Submitting...");
    setStatus("", null);

    $.ajax({
      url: SUBMIT_URL,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function () {
        showConfirmation();
      })
      .fail(function () {
        setStatus(
          "Something went wrong submitting your disclosure. Please try again.",
          "error"
        );
        $submitBtn.prop("disabled", false);
        $submitBtn.find(".submit-btn__label").text("Submit");
      });
  }

  $form.on("submit", handleSubmit);

  hydrateFromQueryParams();
  syncLogFieldState();

  $("#current-year").text(new Date().getFullYear());
});