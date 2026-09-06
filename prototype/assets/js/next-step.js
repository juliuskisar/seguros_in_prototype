window.SeguroIN = window.SeguroIN || {};

(function () {
  var catalog = window.SeguroIN.catalog;
  var config = window.SeguroIN.config;

  var VALID_FLUXOS = { cotacao: "cotacao", atendimento: "atendimento" };

  function getParam(params, key) {
    return params.get(key) || "";
  }

  function buildTitle(fluxo, product, activity) {
    if (fluxo === "cotacao" && product) {
      return "Aqui começaria a cotação de " + product.label + ".";
    }
    if (fluxo === "atendimento") {
      return "Aqui começaria o atendimento.";
    }
    return "Escolha um seguro para continuar";
  }

  function buildExplanation(fluxo) {
    if (fluxo === "cotacao") {
      return "No site publicado, você continuaria no ambiente de cotação indicado pela Seguro IN. Esta tela demonstra apenas o encaminhamento.";
    }
    if (fluxo === "atendimento") {
      return "No site publicado, sua solicitação seria encaminhada para orientação sobre o seguro escolhido. Nenhum contato foi solicitado nesta demonstração.";
    }
    return "Os parâmetros informados não correspondem a um fluxo válido. Volte e escolha um seguro para continuar.";
  }

  function validateParams(params) {
    var fluxo = getParam(params, "fluxo");
    var produtoId = getParam(params, "produto");
    var atividadeId = getParam(params, "atividade");

    if (!VALID_FLUXOS[fluxo]) {
      return { valid: false, fluxo: null, product: null, activity: null };
    }

    var product = produtoId ? catalog.getProduct(produtoId) : null;

    if (fluxo === "cotacao") {
      if (!product || product.journey !== "quote") {
        return { valid: false, fluxo: fluxo, product: null, activity: null };
      }
    }

    if (fluxo === "atendimento" && produtoId && !product) {
      return { valid: false, fluxo: fluxo, product: null, activity: null };
    }

    var activity = null;
    if (atividadeId) {
      if (!product || product.id !== "rc-profissional" || !catalog.isValidActivity(atividadeId)) {
        activity = null;
      } else {
        activity = catalog.getActivity(atividadeId);
      }
    }

    return { valid: true, fluxo: fluxo, product: product, activity: activity };
  }

  function render() {
    var params = new URLSearchParams(window.location.search);
    var result = validateParams(params);

    var titleEl = document.getElementById("next-step-title");
    var explanationEl = document.getElementById("next-step-explanation");
    var productTagEl = document.getElementById("next-step-product");
    var activityTagEl = document.getElementById("next-step-activity");

    if (!titleEl || !explanationEl) return;

    if (!result.valid) {
      titleEl.textContent = "Escolha um seguro para continuar";
      explanationEl.textContent = buildExplanation(null);
      if (productTagEl) productTagEl.hidden = true;
      if (activityTagEl) activityTagEl.hidden = true;
      return;
    }

    titleEl.textContent = buildTitle(result.fluxo, result.product, result.activity);
    explanationEl.textContent = buildExplanation(result.fluxo);

    if (productTagEl) {
      if (result.product) {
        productTagEl.hidden = false;
        productTagEl.textContent = result.product.label;
      } else {
        productTagEl.hidden = true;
      }
    }

    if (activityTagEl) {
      if (result.activity) {
        activityTagEl.hidden = false;
        activityTagEl.textContent = result.activity.label;
      } else {
        activityTagEl.hidden = true;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", render);
})();
