#!/usr/bin/env node
/**
 * Validação automatizada dos fluxos do protótipo Seguro IN.
 * Executar: node qa/validate-flows.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function loadSeguroIN() {
  const ctx = { window: {}, console, setTimeout, clearTimeout, Promise };
  ctx.window = ctx;
  const files = ["config.js", "catalog.js", "lead-adapter.js"];
  files.forEach((f) => {
    const code = fs.readFileSync(path.join(root, "assets/js", f), "utf8");
    vm.runInNewContext(code, ctx);
  });
  return ctx.window.SeguroIN;
}

function assert(cond, msg) {
  if (!cond) throw new Error("FALHA: " + msg);
}

function validatePhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith("55")) digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  if (/^(\d)\1+$/.test(digits)) return null;
  return "+55" + digits;
}

function validateNextStepParams(catalog, fluxo, produto, atividade) {
  if (!["cotacao", "atendimento"].includes(fluxo)) return false;
  const product = produto ? catalog.getProduct(produto) : null;
  if (fluxo === "cotacao") {
    if (!product || product.journey !== "quote") return false;
  }
  if (fluxo === "atendimento" && produto && !product) return false;
  if (atividade) {
    if (!product || product.id !== "rc-profissional") return true;
    if (!catalog.isValidActivity(atividade)) return true;
  }
  return true;
}

async function run() {
  const SI = loadSeguroIN();
  const { catalog, leadAdapter, config } = SI;
  let passed = 0;

  // Catálogo
  assert(catalog.products.length === 13, "13 produtos");
  assert(catalog.activities.length === 8, "8 atividades");
  assert(catalog.getProduct("auto").journey === "quote", "auto é cotação");
  assert(catalog.getProduct("cyber").journey === "assisted", "cyber é atendimento");
  passed++;

  // Telefone
  assert(validatePhone("(11) 97658-4982") === "+5511976584982", "telefone formatado");
  assert(validatePhone("+55 11 99999-9999") === "+5511999999999", "telefone +55");
  assert(validatePhone("1111111111") === null, "telefone repetido rejeitado");
  passed++;

  // Next step URLs
  assert(validateNextStepParams(catalog, "cotacao", "auto", null), "cotacao auto válida");
  assert(!validateNextStepParams(catalog, "cotacao", "cyber", null), "cotacao cyber inválida");
  assert(validateNextStepParams(catalog, "atendimento", "cyber", null), "atendimento cyber válida");
  assert(validateNextStepParams(catalog, "atendimento", null, null), "atendimento sem produto");
  assert(!validateNextStepParams(catalog, "invalido", "auto", null), "fluxo inválido");
  passed++;

  // Lead adapter simulado
  const result = await leadAdapter.submit({
    intent: "quote",
    productId: "auto",
    activityId: null,
    name: "Teste",
    phone: "+5511999999999",
    email: null,
    contactPermission: true,
    entryPoint: "hero"
  });
  assert(result.ok && result.simulated, "submit simulado ok");
  assert(leadAdapter.getInMemoryLeads().length === 1, "lead em memória");
  passed++;

  // Falha controlada
  config.demoFailureOnce = true;
  leadAdapter.resetFailureFlag();
  let failed = false;
  try {
    await leadAdapter.submit({
      intent: "quote", productId: "vida", activityId: null,
      name: "Teste", phone: "+5511888888888", email: null,
      contactPermission: true, entryPoint: "catalog"
    });
  } catch (e) {
    failed = true;
  }
  assert(failed, "demoFailureOnce falha na 1ª tentativa");
  const result2 = await leadAdapter.submit({
    intent: "quote", productId: "vida", activityId: null,
    name: "Teste", phone: "+5511888888888", email: null,
    contactPermission: true, entryPoint: "catalog"
  });
  assert(result2.ok, "demoFailureOnce sucesso na 2ª");
  config.demoFailureOnce = false;
  passed++;

  // Arquivos essenciais
  const required = [
    "index.html", "proxima-etapa.html",
    "assets/css/styles.css",
    "assets/js/app.js", "assets/js/next-step.js",
    "assets/img/brand-mark.svg", "assets/img/logo.svg",
    "assets/img/favicon.svg", "assets/img/hero-protection.svg"
  ];
  required.forEach((f) => {
    assert(fs.existsSync(path.join(root, f)), "arquivo existe: " + f);
  });
  passed++;

  console.log("✓ Todos os testes passaram (" + passed + " grupos)");
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
