$(function () {
  "use strict";

  const $form = $("#disclosure-form");
  const $card = $form.closest(".card");
  const $emailInput = $("#student_email");
  const $noAiCheckbox = $("#no_ai_used");
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
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("course_id");
    const assignmentId = params.get("assignment_id");

    if (courseId) {
      $contextCourse.text("Course: " + courseId).prop("hidden", false);
      $contextBar.prop("hidden", false);
      $form.data("courseId", courseId);
    }

    if (assignmentId) {
      $contextAssignment.text("Assignment: " + assignmentId).prop("hidden", false);
      $contextBar.prop("hidden", false);
      $form.data("assignmentId", assignmentId);
    }
  }

  /* ------------------------------------------------------------------
     Toggle the log textarea based on the "no AI used" checkbox
     ------------------------------------------------------------------ */
  function syncLogFieldState() {
    const noAiUsed = $noAiCheckbox.is(":checked");
    $logField.toggleClass("is-collapsed", noAiUsed);
    $logTextarea.prop("disabled", noAiUsed);
    if (noAiUsed) {
      clearFieldError("ai_log");
    }
  }

  $noAiCheckbox.on("change", syncLogFieldState);

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
    clearFieldError("ai_log");

    const email = $emailInput.val().trim();
    if (!email) {
      setFieldError("student_email", "Enter your email address.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError("student_email", "Enter a valid email address.");
      valid = false;
    }

    if (!$form.data("courseId")) {
      setStatus(
        "This link is missing a course ID. Please use the link your instructor provided.",
        "error"
      );
      valid = false;
    }

    if (!$noAiCheckbox.is(":checked") && !$logTextarea.val().trim()) {
      setFieldError(
        "ai_log",
        "Paste your conversation log, or check the box above if you didn't use AI."
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
    const $confirmation = $(
      '<div class="confirmation">' +
        '<div class="confirmation__icon">&#10003;</div>' +
        '<h2 class="confirmation__title">Disclosure submitted</h2>' +
        '<p class="confirmation__text">Thanks — your AI usage report has been recorded.</p>' +
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

    const payload = {
      course_id: $form.data("courseId") || null,
      student_email: $emailInput.val().trim(),
      used_ai: !$noAiCheckbox.is(":checked"),
      ai_log: $noAiCheckbox.is(":checked") ? null : $logTextarea.val().trim(),
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
        $submitBtn.find(".submit-btn__label").text("Submit disclosure");
      });
  }

  $form.on("submit", handleSubmit);

  hydrateFromQueryParams();
  syncLogFieldState();
});