$(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Modal open/close
     ------------------------------------------------------------------ */
  function openModal($overlay) {
    $overlay.prop("hidden", false);
    $overlay.find("input[type='text']").first().trigger("focus");
  }

  function closeModal($overlay) {
    $overlay.prop("hidden", true);
    const $form = $overlay.find("form");
    if ($form.length) {
      $form[0].reset();
      $form.find(".status").text("").removeClass("is-error is-success");
    }
  }

  $("#new-course-btn").on("click", function () {
    openModal($("#new-course-overlay"));
  });

  // Each course group has its own "+ New Assignment" trigger now that
  // courses/assignments live in one merged column. Read the course id
  // off the button, stash it on the form (used both as the AJAX URL
  // and to build the redirect after a successful create), and show
  // which course the modal applies to.
  $("[data-new-assignment]").on("click", function () {
    const courseId = $(this).data("course-id");
    const courseLabel = $(this)
      .closest(".course-group")
      .find(".course-group__code")
      .text();

    const $form = $("#new-assignment-form");
    $form.data("courseId", courseId);

    $("#new-assignment-subtitle").text(courseLabel ? "For " + courseLabel : "");

    openModal($("#new-assignment-overlay"));
  });

  $("[data-close-modal]").on("click", function () {
    closeModal($("#" + $(this).data("close-modal")));
  });

  // Close on overlay click (outside the modal box).
  $(".modal-overlay").on("click", function (event) {
    if (event.target === this) {
      closeModal($(this));
    }
  });

  // Close on Escape.
  $(document).on("keydown", function (event) {
    if (event.key === "Escape") {
      $(".modal-overlay").each(function () {
        if (!$(this).prop("hidden")) closeModal($(this));
      });
    }
  });

  /* ------------------------------------------------------------------
     Shared status/loading helpers for the two create forms
     ------------------------------------------------------------------ */
  function setStatus($form, message, type) {
    const $status = $form.find(".status");
    $status.text(message).removeClass("is-success is-error");
    if (type) $status.addClass("is-" + type);
  }

  function setLoading($btn, isLoading, loadingLabel, defaultLabel) {
    $btn.prop("disabled", isLoading);
    $btn.text(isLoading ? loadingLabel : defaultLabel);
  }

  /* ------------------------------------------------------------------
     New course — submit via AJAX, redirect to the new course on success
     ------------------------------------------------------------------ */
  const $newCourseForm = $("#new-course-form");
  const $createCourseBtn = $("#create-course-btn");

  $newCourseForm.on("submit", function (event) {
    event.preventDefault();

    const payload = {
      name: $("#course-name").val().trim(),
      code: $("#course-code").val().trim(),
    };

    setLoading($createCourseBtn, true, "Creating...", "Create course");
    setStatus($newCourseForm, "", null);

    $.ajax({
      url: "/api/instructor/new-course",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function (data) {
    
        window.location.href = `/instructor/dashboard?course=${data.course_id}`

      })
      .fail(function (xhr) {
        const message = xhr?.responseJSON?.error || "Couldn't create the course. Please try again.";
        setStatus($newCourseForm, message, "error");
        setLoading($createCourseBtn, false, "Creating...", "Create course");
      });
  });

  /* ------------------------------------------------------------------
     New assignment — submit via AJAX, redirect to the new assignment
     ------------------------------------------------------------------ */
  const $newAssignmentForm = $("#new-assignment-form");
  const $createAssignmentBtn = $("#create-assignment-btn");

  $newAssignmentForm.on("submit", function (event) {
    event.preventDefault();

    const courseId = $newAssignmentForm.data("courseId");
    const payload = {
        course_id: courseId,
        name: $("#assignment-name").val().trim(),
    };

    setLoading($createAssignmentBtn, true, "Creating...", "Create assignment");
    setStatus($newAssignmentForm, "", null);

    $.ajax({
      url: '/api/instructor/new-assignment',
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function (data) {
        window.location.href = `/instructor/dashboard?course=${data.course_id}&assignment=${data.assignment_id}`
      })
      .fail(function (xhr) {
        const message = xhr?.responseJSON?.error || "Couldn't create the assignment. Please try again.";
        setStatus($newAssignmentForm, message, "error");
        setLoading($createAssignmentBtn, false, "Creating...", "Create assignment");
      });
  });

  /* ------------------------------------------------------------------
     Copy submission link
     ------------------------------------------------------------------ */
  $("#copy-link-btn").on("click", function () {
    const $input = $("#share-link-input");
    const link = $input.val();
    const $btn = $(this);

    function onCopied() {
      const original = $btn.text();
      $btn.text("Copied!");
      setTimeout(() => $btn.text(original), 1500);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(onCopied);
    } else {
      // Fallback for non-HTTPS/local contexts where the Clipboard API is unavailable.
      $input.trigger("select");
      document.execCommand("copy");
      onCopied();
    }
  });
});