window.SeguroIN = window.SeguroIN || {};

(function () {
  var failureUsed = false;
  var inMemoryLeads = [];

  function logEvent(name, detail) {
    var cfg = window.SeguroIN.config;
    if (!cfg.debugEvents) return;
    var safe = { event: name };
    if (detail) {
      if (detail.productId) safe.productId = detail.productId;
      if (detail.entryPoint) safe.entryPoint = detail.entryPoint;
      if (detail.intent) safe.intent = detail.intent;
    }
    console.info("[SeguroIN]", safe);
  }

  window.SeguroIN.leadAdapter = {
    submit: function (payload) {
      return new Promise(function (resolve, reject) {
        var cfg = window.SeguroIN.config;

        if (!cfg.prototypeMode) {
          if (!cfg.integrations.leadEndpoint) {
            reject(new Error("Integração de leads indisponível."));
            return;
          }
        }

        logEvent("lead_submit_attempt", {
          productId: payload.productId,
          entryPoint: payload.entryPoint,
          intent: payload.intent
        });

        var delay = cfg.demoDelayMs || 600;

        setTimeout(function () {
          if (cfg.demoFailureOnce && !failureUsed) {
            failureUsed = true;
            logEvent("lead_submit_error_demo", {
              productId: payload.productId,
              entryPoint: payload.entryPoint
            });
            reject(new Error("demo_failure"));
            return;
          }

          inMemoryLeads.push(Object.assign({}, payload, {
            submittedAt: Date.now()
          }));

          logEvent("lead_submit_success_demo", {
            productId: payload.productId,
            entryPoint: payload.entryPoint,
            intent: payload.intent
          });

          resolve({ ok: true, simulated: true });
        }, delay);
      });
    },

    getInMemoryLeads: function () {
      return inMemoryLeads.slice();
    },

    resetFailureFlag: function () {
      failureUsed = false;
    }
  };
})();
