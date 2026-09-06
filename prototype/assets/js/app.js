window.SeguroIN = window.SeguroIN || {};

(function () {
  "use strict";

  var catalog = window.SeguroIN.catalog;
  var config = window.SeguroIN.config;
  var leadAdapter = window.SeguroIN.leadAdapter;

  /* ── State ── */
  var state = {
    draft: {
      productId: "",
      activityId: "",
      name: "",
      phone: "",
      email: "",
      contactPermission: false
    },
    intent: "quote",
    entryPoint: "hero",
    formState: "editing",
    submitToken: 0,
    catalogExpanded: false,
    lastTrigger: null
  };

  /* ── DOM refs (populated on init) ── */
  var els = {};

  /* ── Utilities ── */
  function logEvent(name, detail) {
    if (!config.debugEvents) return;
    var safe = { event: name };
    if (detail) {
      if (detail.productId) safe.productId = detail.productId;
      if (detail.entryPoint) safe.entryPoint = detail.entryPoint;
      if (detail.intent) safe.intent = detail.intent;
    }
    console.info("[SeguroIN]", safe);
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ── Validation ── */
  var validators = {
    product: function (value, intent) {
      if (intent === "contact") return null;
      if (!value) return "Selecione o seguro que você procura.";
      return null;
    },
    activity: function (value, productId) {
      if (productId !== "rc-profissional") return null;
      if (!value) return "Selecione sua atividade profissional.";
      return null;
    },
    name: function (value) {
      var trimmed = value.trim();
      if (!trimmed || trimmed.length < 2) return "Informe seu nome, com pelo menos 2 caracteres.";
      if (/^\d+$/.test(trimmed)) return "Informe seu nome, com pelo menos 2 caracteres.";
      if (trimmed.length > 100) return "Use até 100 caracteres para informar seu nome.";
      return null;
    },
    phone: function (value) {
      var digits = value.replace(/\D/g, "");
      if (digits.length === 12 || digits.length === 13) {
        if (digits.indexOf("55") === 0) digits = digits.slice(2);
      }
      if (digits.length !== 10 && digits.length !== 11) {
        return "Informe um telefone com DDD, com 10 ou 11 dígitos.";
      }
      if (/^(\d)\1+$/.test(digits)) {
        return "Informe um telefone com DDD, com 10 ou 11 dígitos.";
      }
      return null;
    },
    email: function (value) {
      if (!value.trim()) return null;
      var input = document.createElement("input");
      input.type = "email";
      input.value = value.trim();
      if (!input.checkValidity()) return "Confira o formato do e-mail ou deixe este campo em branco.";
      if (value.trim().length > 254) return "Confira o formato do e-mail ou deixe este campo em branco.";
      return null;
    },
    permission: function (checked) {
      if (!checked) return "Autorize o contato sobre esta solicitação para continuar.";
      return null;
    }
  };

  function normalizePhone(value) {
    var digits = value.replace(/\D/g, "");
    if (digits.length === 12 || digits.length === 13) {
      if (digits.indexOf("55") === 0) digits = digits.slice(2);
    }
    return "+55" + digits;
  }

  function formatPhoneDisplay(value) {
    var digits = value.replace(/\D/g, "");
    if (digits.length === 12 || digits.length === 13) {
      if (digits.indexOf("55") === 0) digits = digits.slice(2);
    }
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length <= 10) {
      return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
    }
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7, 11);
  }

  function showFieldError(fieldId, message) {
    var field = els[fieldId];
    if (!field) return;
    var errorEl = els.errors[fieldId];
    if (message) {
      field.setAttribute("aria-invalid", "true");
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add("is-visible");
      }
    } else {
      field.removeAttribute("aria-invalid");
      if (errorEl) {
        errorEl.textContent = "";
        errorEl.classList.remove("is-visible");
      }
    }
  }

  function validateField(fieldId, touched) {
    if (!touched && state.formState === "editing") return true;
    var d = state.draft;
    var msg = null;
    switch (fieldId) {
      case "product": msg = validators.product(d.productId, state.intent); break;
      case "activity": msg = validators.activity(d.activityId, d.productId); break;
      case "name": msg = validators.name(d.name); break;
      case "phone": msg = validators.phone(d.phone); break;
      case "email": msg = validators.email(d.email); break;
      case "permission": msg = validators.permission(d.contactPermission); break;
    }
    showFieldError(fieldId, msg);
    return !msg;
  }

  function validateAll() {
    var fields = ["product", "activity", "name", "phone", "email", "permission"];
    var firstError = null;
    var allValid = true;
    fields.forEach(function (f) {
      if (f === "activity" && state.draft.productId !== "rc-profissional") {
        showFieldError("activity", null);
        return;
      }
      if (f === "product" && state.intent === "contact") {
        showFieldError("product", null);
        return;
      }
      var valid = validateField(f, true);
      if (!valid && !firstError) firstError = f;
      if (!valid) allValid = false;
    });
    if (firstError) {
      var focusMap = {
        product: els.product,
        activity: els.activity,
        name: els.name,
        phone: els.phone,
        email: els.email,
        permission: els.permission
      };
      if (focusMap[firstError]) focusMap[firstError].focus();
    }
    return allValid;
  }

  /* ── Select population ── */
  function populateProductSelect(selectEl, includeOrientation) {
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione um seguro";
    selectEl.appendChild(placeholder);

    if (includeOrientation) {
      var orient = document.createElement("option");
      orient.value = "";
      orient.textContent = "Preciso de orientação";
      orient.dataset.orientation = "true";
      selectEl.appendChild(orient);
    }

    ["personal", "professional", "business"].forEach(function (groupKey) {
      var group = catalog.groups[groupKey];
      var optgroup = document.createElement("optgroup");
      optgroup.label = group.optgroupLabel;
      catalog.getProductsByGroup(groupKey).forEach(function (p) {
        var opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.label;
        optgroup.appendChild(opt);
      });
      selectEl.appendChild(optgroup);
    });
  }

  function populateActivitySelect(selectEl) {
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecione sua atividade";
    selectEl.appendChild(placeholder);
    catalog.activities.forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.label;
      selectEl.appendChild(opt);
    });
  }

  function populateHeroSelect() {
    populateProductSelect(els.heroProduct, false);
  }

  /* ── UI sync ── */
  function syncHeroSelect() {
    if (els.heroProduct && state.draft.productId) {
      els.heroProduct.value = state.draft.productId;
    }
  }

  function updateActivityVisibility() {
    if (!els.activityField) return;
    var show = state.draft.productId === "rc-profissional";
    els.activityField.hidden = !show;
    if (!show) {
      state.draft.activityId = "";
      if (els.activity) els.activity.value = "";
      showFieldError("activity", null);
    }
  }

  function updateDialogCopy() {
    var isContact = state.intent === "contact";
    els.dialogTitle.textContent = isContact ? "Converse com um corretor." : "Comece sua cotação.";
    var product = catalog.getProduct(state.draft.productId);
    var journey = catalog.resolveJourney(state.draft.productId, state.intent);
    if (isContact) {
      els.dialogSupport.textContent = "Deixe um contato para conversar sobre o seguro escolhido.";
    } else if (journey === "assisted") {
      els.dialogSupport.textContent = "Deixe um contato para conversar sobre o seguro escolhido.";
    } else {
      els.dialogSupport.textContent = "Deixe um contato antes de seguir para o ambiente de cotação.";
    }
    els.productField.hidden = false;
    if (isContact) {
      els.productLabel.textContent = "Seguro (opcional)";
    } else {
      els.productLabel.textContent = "Seguro";
    }
  }

  function syncFormFields() {
    if (els.product) els.product.value = state.draft.productId;
    if (els.activity) els.activity.value = state.draft.activityId;
    if (els.name) els.name.value = state.draft.name;
    if (els.phone) els.phone.value = state.draft.phone;
    if (els.email) els.email.value = state.draft.email;
    if (els.permission) els.permission.checked = state.draft.contactPermission;
    updateActivityVisibility();
    updateDialogCopy();
  }

  function readFormFields() {
    state.draft.productId = els.product ? els.product.value : "";
    state.draft.activityId = els.activity ? els.activity.value : "";
    state.draft.name = els.name ? els.name.value : "";
    state.draft.phone = els.phone ? els.phone.value : "";
    state.draft.email = els.email ? els.email.value : "";
    state.draft.contactPermission = els.permission ? els.permission.checked : false;
    syncHeroSelect();
    updateActivityVisibility();
  }

  /* ── Dialog states ── */
  function showDialogState(name) {
    state.formState = name;
    qsa(".dialog-state", els.dialog).forEach(function (el) {
      el.classList.toggle("is-active", el.dataset.state === name);
    });
    if (els.liveRegion) {
      if (name === "success") els.liveRegion.textContent = "Solicitação simulada concluída.";
      if (name === "error") els.liveRegion.textContent = "Erro na simulação.";
      if (name === "submitting") els.liveRegion.textContent = "Preparando próxima etapa…";
    }
  }

  function buildNextStepUrl() {
    var journey = catalog.resolveJourney(state.draft.productId, state.intent);
    var fluxo = journey === "quote" ? "cotacao" : "atendimento";
    var params = new URLSearchParams();
    params.set("fluxo", fluxo);
    if (state.draft.productId) params.set("produto", state.draft.productId);
    if (state.draft.productId === "rc-profissional" && state.draft.activityId) {
      params.set("atividade", state.draft.activityId);
    }
    return config.nextStepPath + "?" + params.toString();
  }

  function updateSuccessView() {
    var journey = catalog.resolveJourney(state.draft.productId, state.intent);
    var isQuote = journey === "quote";
    els.successTitle.textContent = isQuote ? "Continue sua cotação." : "O próximo passo é conversar.";
    els.successText.textContent = isQuote
      ? "Na próxima etapa, você informará os dados específicos do seguro escolhido."
      : "Este pedido segue com orientação de um corretor.";
    els.successNotice.textContent = isQuote
      ? "Fluxo demonstrativo. Nenhum dado foi enviado."
      : "Fluxo demonstrativo. Nenhum atendimento foi solicitado.";
    els.successLink.textContent = isQuote ? "Continuar para cotação" : "Ver próximo passo";
    els.successLink.href = buildNextStepUrl();
  }

  /* ── Open / Close dialog ── */
  function openLeadForm(options) {
    options = options || {};
    state.intent = options.intent || "quote";
    state.entryPoint = options.entryPoint || "hero";
    state.lastTrigger = options.trigger || null;

    if (options.productId !== undefined) state.draft.productId = options.productId;
    if (options.activityId !== undefined) state.draft.activityId = options.activityId;

    populateProductSelect(els.product, state.intent === "contact");
    syncFormFields();
    showDialogState("editing");

    if (!els.dialog.open) els.dialog.showModal();
    document.body.style.overflow = "hidden";

    logEvent("lead_form_open", {
      productId: state.draft.productId,
      entryPoint: state.entryPoint,
      intent: state.intent
    });

    var focusTarget = null;
    if (options.focusProduct || (!state.draft.productId && state.intent === "quote")) {
      focusTarget = els.product;
    } else {
      focusTarget = els.name;
    }
    if (focusTarget) setTimeout(function () { focusTarget.focus(); }, 50);
  }

  function closeLeadForm() {
    if (state.formState === "submitting") {
      state.submitToken++;
    }
    if (els.dialog.open) els.dialog.close();
    document.body.style.overflow = "";
    var trigger = state.lastTrigger;
    if (trigger && document.contains(trigger)) {
      trigger.focus();
    } else if (els.heroPrimary) {
      els.heroPrimary.focus();
    }
  }

  function openPrivacyInfo() {
    state.entryPoint = "footer";
    els.dialogTitle.textContent = "Privacidade do protótipo";
    qsa(".dialog-state", els.dialog).forEach(function (el) {
      el.classList.remove("is-active");
    });
    els.formView.hidden = true;
    els.privacyOnlyView.hidden = false;
    state.lastTrigger = document.activeElement;
    if (!els.dialog.open) els.dialog.showModal();
    document.body.style.overflow = "hidden";
    var closeBtn = qs("#privacy-close");
    if (closeBtn) closeBtn.focus();
  }

  function closePrivacyInfo() {
    els.formView.hidden = false;
    els.privacyOnlyView.hidden = true;
    showDialogState("editing");
    closeLeadForm();
  }

  /* ── Submit ── */
  function handleSubmit(e) {
    e.preventDefault();
    if (state.formState === "submitting") return;

    readFormFields();
    if (!validateAll()) {
      state.formState = "invalid";
      return;
    }

    var token = ++state.submitToken;
    showDialogState("submitting");
    els.submitBtn.disabled = true;

    var payload = {
      intent: state.intent === "contact" ? "contact" : "quote",
      productId: state.draft.productId || null,
      activityId: state.draft.productId === "rc-profissional" ? (state.draft.activityId || null) : null,
      name: state.draft.name.trim(),
      phone: normalizePhone(state.draft.phone),
      email: state.draft.email.trim() || null,
      contactPermission: state.draft.contactPermission,
      entryPoint: state.entryPoint
    };

    leadAdapter.submit(payload).then(function () {
      if (token !== state.submitToken) return;
      updateSuccessView();
      showDialogState("success");
      els.submitBtn.disabled = false;
    }).catch(function () {
      if (token !== state.submitToken) return;
      showDialogState("error");
      els.submitBtn.disabled = false;
    });
  }

  function retrySubmit() {
    showDialogState("editing");
    handleSubmit(new Event("submit"));
  }

  /* ── Mobile menu ── */
  function initMobileMenu() {
    var toggle = els.menuToggle;
    var nav = els.mobileNav;
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      nav.classList.toggle("is-open", !expanded);
    });

    qsa(".mobile-nav__links a", nav).forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  /* ── Tabs ── */
  function initTabs() {
    var tablist = els.tablist;
    if (!tablist) return;
    var tabs = qsa("[role=tab]", tablist);
    var panels = qsa("[role=tabpanel]");

    function activateTab(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.id === tab.getAttribute("aria-controls"));
        p.hidden = p.id !== tab.getAttribute("aria-controls");
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { activateTab(tab); });
      tab.addEventListener("keydown", function (e) {
        var idx = tabs.indexOf(tab);
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") next = tabs[0];
        if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); activateTab(next); next.focus(); }
      });
    });

    activateTab(tabs[0]);
  }

  /* ── Catalog expand ── */
  function initCatalogExpand() {
    var btn = els.expandBtn;
    var extra = els.catalogExtra;
    if (!btn || !extra) return;

    if (state.catalogExpanded) {
      extra.classList.add("is-visible");
      btn.setAttribute("aria-expanded", "true");
      btn.textContent = "Mostrar menos";
    }

    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      state.catalogExpanded = !expanded;
      btn.setAttribute("aria-expanded", state.catalogExpanded ? "true" : "false");
      btn.textContent = state.catalogExpanded ? "Mostrar menos" : "Ver mais seguros";
      extra.classList.toggle("is-visible", state.catalogExpanded);

      if (expanded && extra.contains(document.activeElement)) {
        btn.focus();
      }
    });
  }

  /* ── CTA handlers ── */
  function initCTAs() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;

      var action = btn.dataset.action;
      var productId = btn.dataset.productId || "";
      var activityId = btn.dataset.activityId || "";
      var entryPoint = btn.dataset.entryPoint || "catalog";

      logEvent("cta_click", { productId: productId, entryPoint: entryPoint });

      if (action === "open-quote") {
        e.preventDefault();
        var heroVal = els.heroProduct ? els.heroProduct.value : "";
        openLeadForm({
          intent: "quote",
          productId: productId || heroVal || state.draft.productId,
          activityId: activityId,
          entryPoint: entryPoint,
          trigger: btn,
          focusProduct: !productId && !heroVal && !state.draft.productId
        });
      }

      if (action === "open-contact") {
        e.preventDefault();
        openLeadForm({
          intent: "contact",
          productId: productId || state.draft.productId,
          entryPoint: entryPoint,
          trigger: btn
        });
      }

      if (action === "open-assistance") {
        e.preventDefault();
        openLeadForm({
          intent: "quote",
          productId: productId,
          activityId: activityId,
          entryPoint: entryPoint,
          trigger: btn
        });
      }

      if (action === "open-privacy") {
        e.preventDefault();
        openPrivacyInfo();
      }

      if (action === "edit-form") {
        e.preventDefault();
        showDialogState("editing");
      }

      if (action === "retry-submit") {
        e.preventDefault();
        retrySubmit();
      }

      if (action === "next-step") {
        logEvent("next_step_click", {
          productId: state.draft.productId,
          entryPoint: state.entryPoint
        });
      }
    });
  }

  /* ── Form field listeners ── */
  function initFormListeners() {
    var touched = {};

    function onBlur(fieldId) {
      touched[fieldId] = true;
      readFormFields();
      validateField(fieldId, true);
    }

    if (els.product) {
      els.product.addEventListener("change", function () {
        readFormFields();
        validateField("product", touched.product);
      });
      els.product.addEventListener("blur", function () { onBlur("product"); });
    }
    if (els.activity) {
      els.activity.addEventListener("change", function () {
        readFormFields();
        validateField("activity", touched.activity);
      });
      els.activity.addEventListener("blur", function () { onBlur("activity"); });
    }
    if (els.name) {
      els.name.addEventListener("blur", function () { onBlur("name"); });
    }
    if (els.phone) {
      els.phone.addEventListener("input", function () {
        var pos = els.phone.selectionStart;
        var oldLen = els.phone.value.length;
        els.phone.value = formatPhoneDisplay(els.phone.value);
        var newLen = els.phone.value.length;
        els.phone.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
      });
      els.phone.addEventListener("blur", function () { onBlur("phone"); });
    }
    if (els.email) {
      els.email.addEventListener("blur", function () { onBlur("email"); });
    }
    if (els.permission) {
      els.permission.addEventListener("change", function () {
        readFormFields();
        if (touched.permission) validateField("permission", true);
      });
      els.permission.addEventListener("blur", function () { onBlur("permission"); });
    }

    if (els.heroProduct) {
      els.heroProduct.addEventListener("change", function () {
        state.draft.productId = els.heroProduct.value;
      });
    }

    if (els.leadForm) {
      els.leadForm.addEventListener("submit", handleSubmit);
    }

    if (els.dialogClose) {
      els.dialogClose.addEventListener("click", closeLeadForm);
    }

    if (els.privacyToggle) {
      els.privacyToggle.addEventListener("click", function () {
        els.privacyExpand.classList.toggle("is-open");
      });
    }

    if (els.privacyClose) {
      els.privacyClose.addEventListener("click", closePrivacyInfo);
    }

    els.dialog.addEventListener("close", function () {
      document.body.style.overflow = "";
    });

    els.dialog.addEventListener("click", function (e) {
      if (e.target === els.dialog) {
        e.preventDefault();
      }
    });

    els.dialog.addEventListener("cancel", function (e) {
      if (els.privacyOnlyView && !els.privacyOnlyView.hidden) {
        closePrivacyInfo();
        e.preventDefault();
        return;
      }
      if (state.formState === "submitting") {
        state.submitToken++;
      }
    });
  }

  /* ── Init ── */
  function cacheElements() {
    els.dialog = qs("#lead-dialog");
    els.dialogTitle = qs("#dialog-title");
    els.dialogSupport = qs("#dialog-support");
    els.dialogClose = qs("#dialog-close");
    els.leadForm = qs("#lead-form");
    els.formView = qs("#form-view");
    els.privacyOnlyView = qs("#privacy-only-view");
    els.liveRegion = qs("#dialog-live");

    els.product = qs("#field-product");
    els.activity = qs("#field-activity");
    els.name = qs("#field-name");
    els.phone = qs("#field-phone");
    els.email = qs("#field-email");
    els.permission = qs("#field-permission");
    els.productField = qs("#product-field");
    els.activityField = qs("#activity-field");
    els.productLabel = qs("#product-label");
    els.submitBtn = qs("#submit-btn");

    els.heroProduct = qs("#hero-product");
    els.heroPrimary = qs("#hero-primary");

    els.errors = {
      product: qs("#error-product"),
      activity: qs("#error-activity"),
      name: qs("#error-name"),
      phone: qs("#error-phone"),
      email: qs("#error-email"),
      permission: qs("#error-permission")
    };

    els.successTitle = qs("#success-title");
    els.successText = qs("#success-text");
    els.successNotice = qs("#success-notice");
    els.successLink = qs("#success-link");

    els.menuToggle = qs("#menu-toggle");
    els.mobileNav = qs("#mobile-nav");
    els.tablist = qs("#catalog-tabs");
    els.expandBtn = qs("#expand-catalog");
    els.catalogExtra = qs("#catalog-extra");
    els.privacyToggle = qs("#privacy-toggle");
    els.privacyExpand = qs("#privacy-expand");
    els.privacyClose = qs("#privacy-close");
  }

  function resetDraft() {
    state.draft = {
      productId: "",
      activityId: "",
      name: "",
      phone: "",
      email: "",
      contactPermission: false
    };
    state.intent = "quote";
    state.formState = "editing";
    state.submitToken = 0;
  }

  function init() {
    cacheElements();
    resetDraft();
    populateHeroSelect();
    populateActivitySelect(els.activity);
    initMobileMenu();
    initTabs();
    initCatalogExpand();
    initCTAs();
    initFormListeners();
    showDialogState("editing");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
