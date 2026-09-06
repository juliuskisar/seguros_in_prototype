window.SeguroIN = window.SeguroIN || {};

(function () {
  var groups = {
    personal: { id: "personal", label: "Para você", optgroupLabel: "Você" },
    professional: { id: "professional", label: "Sua profissão", optgroupLabel: "Sua profissão" },
    business: { id: "business", label: "Sua empresa", optgroupLabel: "Sua empresa" }
  };

  var products = [
    { id: "auto", label: "Automóvel", group: "personal", journey: "quote", description: "Encontre opções para proteger seu carro e seguir com mais tranquilidade." },
    { id: "residencial", label: "Residencial", group: "personal", journey: "quote", description: "Proteção para sua casa, seus bens e os imprevistos da rotina." },
    { id: "vida", label: "Vida", group: "personal", journey: "quote", description: "Planeje proteção financeira para você e para quem conta com você." },
    { id: "moto", label: "Moto", group: "personal", journey: "quote", description: "Escolha uma proteção que acompanhe você sobre duas rodas." },
    { id: "viagem", label: "Viagem", group: "personal", journey: "quote", description: "Considere proteção para imprevistos antes de fazer as malas." },
    { id: "celular", label: "Celular", group: "personal", journey: "quote", description: "Conheça opções de proteção para um item presente no seu dia a dia." },
    { id: "bike", label: "Bike", group: "personal", journey: "quote", description: "Encontre opções para proteger sua bicicleta." },
    { id: "roubo-furto", label: "Roubo e furto", group: "personal", journey: "quote", description: "Conheça essa alternativa de proteção para seu veículo." },
    { id: "rc-profissional", label: "Responsabilidade civil profissional", group: "professional", journey: "assisted", description: "Converse sobre os riscos da sua atividade e as opções de proteção." },
    { id: "patrimonial-empresarial", label: "Patrimônio empresarial", group: "business", journey: "assisted", description: "Avalie a proteção dos bens e das instalações da sua empresa." },
    { id: "riscos-corporativos", label: "Riscos corporativos", group: "business", journey: "assisted", description: "Conte com orientação para necessidades de proteção mais complexas." },
    { id: "cyber", label: "Riscos cibernéticos", group: "business", journey: "assisted", description: "Avalie riscos digitais e opções de proteção para o seu negócio." },
    { id: "eventos", label: "Eventos", group: "business", journey: "assisted", description: "Converse sobre as necessidades de proteção do seu evento." }
  ];

  var activities = [
    { id: "advocacia", label: "Advocacia" },
    { id: "contabilidade", label: "Contabilidade" },
    { id: "corretagem-imoveis", label: "Corretagem de imóveis" },
    { id: "odontologia", label: "Odontologia" },
    { id: "engenharia-arquitetura", label: "Engenharia e arquitetura" },
    { id: "medicina", label: "Medicina" },
    { id: "corretagem-seguros", label: "Corretagem de seguros" },
    { id: "outra-profissao", label: "Outra profissão" }
  ];

  var productMap = {};
  products.forEach(function (p) { productMap[p.id] = p; });

  var activityMap = {};
  activities.forEach(function (a) { activityMap[a.id] = a; });

  var personalFeatured = ["auto", "residencial", "vida", "moto"];
  var personalExtra = ["viagem", "celular", "bike", "roubo-furto"];

  window.SeguroIN.catalog = {
    groups: groups,
    products: products,
    activities: activities,
    productMap: productMap,
    activityMap: activityMap,
    personalFeatured: personalFeatured,
    personalExtra: personalExtra,

    getProduct: function (id) {
      return productMap[id] || null;
    },

    getActivity: function (id) {
      return activityMap[id] || null;
    },

    getProductsByGroup: function (groupId) {
      return products.filter(function (p) { return p.group === groupId; });
    },

    isValidProduct: function (id) {
      return !!productMap[id];
    },

    isValidActivity: function (id) {
      return !!activityMap[id];
    },

    resolveJourney: function (productId, intent) {
      if (intent === "contact") return "assisted";
      var product = productMap[productId];
      return product ? product.journey : null;
    }
  };
})();
