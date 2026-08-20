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
    if ($form.length) $form[0].reset();
  }

  $("#new-course-btn").on("click", function () {
    openModal($("#new-course-overlay"));
  });

  // Each course group has its own "+ New assignment" trigger now that
  // courses/assignments live in one merged column. Read the course id
  // off the button and point the form at that course before opening.
  $("[data-new-assignment]").on("click", function () {
    const courseId = $(this).data("course-id");
    const courseLabel = $(this)
      .closest(".course-group")
      .find(".course-group__code")
      .text();

    $("#new-assignment-form").attr(
      "action",
      "/instructor/courses/" + encodeURIComponent(courseId) + "/assignments"
    );
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