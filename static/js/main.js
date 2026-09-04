$(function () {
  "use strict";

  const $form = $("#disclosure-form");
  const $card = $form.closest(".card");
  const $emailInput = $("#student_email");
  const $aiUsageRadios = $('input[name="ai_usage"]');
  const $logField = $("#log-field");
  const $logTextarea = $("#ai_log");
  const $logFile = $("#ai_log_file");
  const $logFileName = $("#ai_log_file-name");
  const $submitBtn = $("#submit-btn");
  const $statusEl = $("#status");

  const ALLOWED_LOG_EXTENSIONS = ["md", "txt", "json"];
  const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

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
    $logFile.prop("disabled", !usedAi);
    if (!usedAi) {
      clearFieldError("ai_log");
      clearFieldError("ai_log_file");
      $logFile.val("");
      $logFileName.text("");
    }
    if (selected) {
      clearFieldError("ai_usage");
    }
  }

  $aiUsageRadios.on("change", syncLogFieldState);

  /* ------------------------------------------------------------------
     File upload (alternative to pasting a log)
     ------------------------------------------------------------------ */
  function getExtension(filename) {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function handleLogFileChange() {
    const fileInput = $logFile[0];
    const file = fileInput.files && fileInput.files[0];

    clearFieldError("ai_log_file");
    clearFieldError("ai_log");

    if (!file) {
      $logFileName.text("");
      return;
    }

    const ext = getExtension(file.name);
    if (ALLOWED_LOG_EXTENSIONS.indexOf(ext) === -1) {
      setFieldError(
        "ai_log_file",
        "Unsupported file type. Please upload a .md, .txt, or .json file."
      );
      fileInput.value = "";
      $logFileName.text("");
      return;
    }

    if (file.size > MAX_LOG_FILE_BYTES) {
      setFieldError("ai_log_file", "File is too large (2 MB max).");
      fileInput.value = "";
      $logFileName.text("");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      $logTextarea.val(e.target.result);
      $logFileName.text("Loaded: " + file.name);
      clearFieldError("ai_log");
    };
    reader.onerror = function () {
      setFieldError("ai_log_file", "Couldn't read that file. Please try again.");
      $logFileName.text("");
    };
    reader.readAsText(file);
  }

  $logFile.on("change", handleLogFileChange);

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