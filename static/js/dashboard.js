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

  // Close on overlay click (outside the modal box) — but only when the
  // mousedown that started this click also landed on the overlay itself.
  // Otherwise, dragging a text selection (e.g. in an input) and releasing
  // the mouse a pixel or two outside the field reports the overlay as the
  // click's target even though the interaction began inside the modal,
  // and the modal would close out from under an in-progress selection.
  let overlayMouseDownTarget = null;

  $(".modal-overlay").on("mousedown", function (event) {
    overlayMouseDownTarget = event.target;
  });

  $(".modal-overlay").on("click", function (event) {
    if (event.target === this && overlayMouseDownTarget === this) {
      closeModal($(this));
    }
    overlayMouseDownTarget = null;
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
     Edit assignment — pencil button opens the rename modal prefilled
     with the current name; on save, update the title and the matching
     sidebar entry in place (no full page reload).
     ------------------------------------------------------------------ */
  const $editAssignmentForm = $("#edit-assignment-form");
  const $saveAssignmentBtn = $("#save-assignment-btn");
  const $assignmentTitle = $("#assignment-title");

  $("#edit-assignment-btn").on("click", function () {
    const assignmentId = $(this).data("assignment-id");

    $editAssignmentForm.data("assignmentId", assignmentId);
    $("#edit-assignment-name").val($assignmentTitle.text().trim());

    openModal($("#edit-assignment-overlay"));
  });

  $editAssignmentForm.on("submit", function (event) {
    event.preventDefault();

    const assignmentId = $editAssignmentForm.data("assignmentId");
    const name = $("#edit-assignment-name").val().trim();
    const payload = { assignment_id: assignmentId, name: name };

    setLoading($saveAssignmentBtn, true, "Saving...", "Save");
    setStatus($editAssignmentForm, "", null);

    $.ajax({
      url: "/api/instructor/update-assignment",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(payload),
    })
      .done(function () {
        $assignmentTitle.text(name);
        $(`.entity-item[data-assignment-id="${assignmentId}"] .entity-item__name`).text(name);
        setLoading($saveAssignmentBtn, false, "Saving...", "Save");
        closeModal($("#edit-assignment-overlay"));
      })
      .fail(function (xhr) {
        const message = xhr?.responseJSON?.error || "Couldn't rename the assignment. Please try again.";
        setStatus($editAssignmentForm, message, "error");
        setLoading($saveAssignmentBtn, false, "Saving...", "Save");
      });
  });

  /* ------------------------------------------------------------------
     View log modal — fetch a submission's ai_log on demand and show it
     ------------------------------------------------------------------ */
  const $logModalOverlay = $("#log-modal-overlay");
  const $logModalBody = $("#log-modal-body");

  $(document).on("click", "[data-view-log]", function () {
    const $btn = $(this);
    const $label = $btn.find(".view-log-btn__label");
    const submissionId = $btn.data("submission-id");

    if ($btn.hasClass("is-loading")) return;

    const originalLabel = $label.text();
    $btn.addClass("is-loading").prop("disabled", true);

    $.ajax({
      url: "/api/instructor/prompt/" + encodeURIComponent(submissionId),
      method: "GET",
    })
      .done(function (data) {
        // .text(), not .html() — a pasted AI transcript can contain
        // arbitrary characters (including things that look like markup),
        // and it must never be interpreted as HTML.
        $logModalBody.text(data.ai_log || "");
        openModal($logModalOverlay);
        $logModalOverlay.find(".modal__close-x").trigger("focus");
      })
      .fail(function (xhr) {
        const message = xhr?.responseJSON?.error || "Couldn't load the log.";
        $label.text(message);
        setTimeout(() => $label.text(originalLabel), 2500);
      })
      .always(function () {
        $btn.removeClass("is-loading").prop("disabled", false);
      });
  });

  /* ------------------------------------------------------------------
     Sortable submissions table (by student email or submitted timestamp)
     ------------------------------------------------------------------ */
  const $submissionsTable = $("#submissions-table");

  $submissionsTable.on("click", ".submissions-table__sortable", function () {
    const $th = $(this);
    const sortKey = $th.data("sort-key");
    const direction = $th.attr("data-sort-dir") === "asc" ? "desc" : "asc";

    $th.siblings(".submissions-table__sortable").removeAttr("data-sort-dir");
    $th.attr("data-sort-dir", direction);

    const $tbody = $submissionsTable.find("tbody");
    const $rows = $tbody.find("tr").get();

    $rows.sort(function (rowA, rowB) {
      const a = ($(rowA).data(sortKey) ?? "").toString().toLowerCase();
      const b = ($(rowB).data(sortKey) ?? "").toString().toLowerCase();
      if (a < b) return direction === "asc" ? -1 : 1;
      if (a > b) return direction === "asc" ? 1 : -1;
      return 0;
    });

    $.each($rows, function (_, row) {
      $tbody.append(row);
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