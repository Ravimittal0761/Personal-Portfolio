/* =========================================================
   NAV — mobile menu toggle
   ========================================================= */
const menuBtn = document.getElementById("menu-btn");
const navLinks = document.getElementById("nav-links");

if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
    });
  });
}

/* =========================================================
   PROJECT FILTER — MixItUp
   The previous overlap bug happened because MixItUp's default
   animation engine reads each card's bounding box and animates
   a transform between the "before" and "after" layout. That math
   assumes a float/inline-block flow, not CSS Grid — so when the
   grid reflowed, cards got translated to the wrong spot and
   landed on top of each other.
   Fix: turn the animation off. MixItUp still filters instantly
   (show/hide), and since the grid does the actual positioning,
   it always lays the visible cards out correctly.
   ========================================================= */
if (window.mixitup) {
  const projectGrid = document.querySelector(".project__grid");
  if (projectGrid) {
    mixitup(projectGrid, {
      animation: {
        enable: false,
      },
      selectors: {
        target: ".mix",
      },
    });
  }
}

document.querySelectorAll(".project__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".project__btn")
      .forEach((b) => b.classList.remove("mixitup-control-active"));
    btn.classList.add("mixitup-control-active");
  });
});

/* =========================================================
   3D TILT — pointer-tracking tilt for [data-tilt] elements
   ========================================================= */
const tiltEls = document.querySelectorAll("[data-tilt]");

tiltEls.forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / rect.height) * -10;
    const rotateY = ((x - rect.width / 2) / rect.width) * 10;
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  el.addEventListener("mouseleave", () => {
    el.style.transform = "";
  });
});

/* =========================================================
   SCROLL REVEAL
   ========================================================= */
if (window.ScrollReveal) {
  const sr = ScrollReveal({
    distance: "32px",
    duration: 700,
    easing: "cubic-bezier(0.5, 0, 0, 1)",
    reset: false,
  });

  sr.reveal(".header__content > *", { interval: 80 });
  sr.reveal(".header__stack", { origin: "right", delay: 200 });
  sr.reveal(".about__image", { origin: "left" });
  sr.reveal(".about__content > *", { interval: 80 });
  sr.reveal(".banner__card", { interval: 100 });
  sr.reveal(".project__card", { interval: 80 });
  sr.reveal(".service__card", { interval: 80 });
  sr.reveal(".grid-item", { interval: 40 });
  sr.reveal(".research__card");
  sr.reveal(".blog__card", { interval: 100 });
}

/* =========================================================
   CONTACT MODAL
   ========================================================= */
const modal = document.getElementById("contact-modal");
const formPanel = document.getElementById("modal-panel-form");
const successPanel = document.getElementById("modal-panel-success");
const contactForm = document.getElementById("contact-form");
const formErrorNote = document.getElementById("form-error");
let lastFocusedEl = null;

function openModal() {
  if (!modal) return;
  lastFocusedEl = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const firstField = modal.querySelector("input, textarea");
  if (firstField) firstField.focus();
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocusedEl) lastFocusedEl.focus();
}

function resetModalToForm() {
  if (formPanel) formPanel.classList.remove("is-hidden");
  if (successPanel) successPanel.classList.remove("is-active");
}

document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    resetModalToForm();
    openModal();
  });
});

document.querySelectorAll("[data-modal-close]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    closeModal();
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.classList.contains("is-open")) {
    closeModal();
  }
});

/* =========================================================
   CONTACT FORM — client-side validation + AJAX submit to PHP
   ========================================================= */
function setFieldInvalid(field, isInvalid) {
  field.closest(".field")?.classList.toggle("is-invalid", isInvalid);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContactForm(form) {
  let valid = true;

  const firstName = form.querySelector("#first_name");
  const lastName = form.querySelector("#last_name");
  const email = form.querySelector("#email");
  const message = form.querySelector("#message");

  [firstName, lastName, message].forEach((field) => {
    const ok = field.value.trim().length > 0;
    setFieldInvalid(field, !ok);
    if (!ok) valid = false;
  });

  const emailOk = isValidEmail(email.value.trim());
  setFieldInvalid(email, !emailOk);
  if (!emailOk) valid = false;

  return valid;
}

if (contactForm) {
  // live-clear the invalid state once the person starts fixing a field
  contactForm.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => setFieldInvalid(field, false));
  });

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formErrorNote) formErrorNote.textContent = "";

    if (!validateContactForm(contactForm)) {
      if (formErrorNote) {
        formErrorNote.textContent = "Please fill in every field correctly.";
      }
      return;
    }

    // honeypot — if a bot filled this hidden field, silently drop the request
    const honeypot = contactForm.querySelector("#company_website");
    if (honeypot && honeypot.value.trim() !== "") {
      return;
    }

    const submitBtn = contactForm.querySelector(".modal__submit");
    submitBtn?.classList.add("is-loading");
    submitBtn?.setAttribute("disabled", "true");

    const formData = new FormData(contactForm);

    try {
      const response = await fetch("contact.php", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      });

      const data = await response.json().catch(() => ({
        success: false,
        message: "Unexpected response from the server.",
      }));

      if (data.success) {
        contactForm.reset();
        if (formPanel) formPanel.classList.add("is-hidden");
        if (successPanel) successPanel.classList.add("is-active");
      } else {
        if (formErrorNote) {
          formErrorNote.textContent =
            data.message || "Something went wrong — please try again.";
        }
      }
    } catch (err) {
      if (formErrorNote) {
        formErrorNote.textContent =
          "Couldn't reach the server. Check your connection and try again.";
      }
    } finally {
      submitBtn?.classList.remove("is-loading");
      submitBtn?.removeAttribute("disabled");
    }
  });
}