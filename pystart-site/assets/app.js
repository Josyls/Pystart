/* Workshop PyStart – comportamento da página. Configurações ficam em /config.js */
(function () {
  "use strict";

  var cfg = window.PYSTART || {};
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- WhatsApp ---------- */
  var MSG = {
    geral: "Oi! Vi o site do Workshop PyStart e quero tirar uma dúvida.",
    mensal: "Oi! Quero garantir minha vaga no Workshop PyStart pagando mensal (2x de R$ 100).",
    espera: "Oi! As vagas da Turma 01 do Workshop PyStart esgotaram e quero entrar na lista de espera."
  };
  var phone = String(cfg.whatsapp || "").replace(/\D/g, "");
  var phoneOk = phone.length >= 10;
  function waLink(kind) {
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(MSG[kind] || MSG.geral);
  }

  /* ---------- Estado da turma ---------- */
  var total = Number(cfg.vagasTotal) || 10;
  var taken = Math.min(Math.max(Number(cfg.vagasConfirmadas) || 0, 0), total);
  var left = total - taken;
  var startMs = new Date(cfg.inicio).getTime();

  function state() {
    if (!isNaN(startMs) && Date.now() >= startMs) return "closed";
    if (left <= 0) return "full";
    return "open";
  }

  /* ---------- Rastreamento (opcional) ---------- */
  if (cfg.pixelId) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", String(cfg.pixelId));
    window.fbq("track", "PageView");
  }
  function track(ev) { try { if (window.fbq) window.fbq("track", ev); } catch (e) { /* ignora */ } }

  /* ---------- Aplica estado nos elementos ---------- */
  function applyState() {
    var st = state();
    document.body.setAttribute("data-state", st);
    $$("[data-when]").forEach(function (el) {
      el.hidden = el.getAttribute("data-when").split(/\s+/).indexOf(st) === -1;
    });

    // textos de vagas
    var txt;
    if (st === "closed") txt = "Turma 01 já começou";
    else if (st === "full") txt = "Vagas esgotadas · lista de espera";
    else if (left === 1) txt = "Resta 1 vaga de " + total;
    else txt = left + " de " + total + " vagas disponíveis";
    $$("[data-seats-text]").forEach(function (el) { el.textContent = txt; });
    $$("[data-seats-fill]").forEach(function (el) { el.style.width = (taken / total * 100) + "%"; });
    return st;
  }

  function wireLinks() {
    $$("[data-pay]").forEach(function (a) {
      a.href = cfg.payLink || "#garanta";
      a.target = "_blank"; a.rel = "noopener";
      a.addEventListener("click", function () { track("InitiateCheckout"); });
    });
    $$("[data-wa]").forEach(function (a) {
      if (!phoneOk) { a.hidden = true; a.setAttribute("data-nowa", "1"); return; }
      a.href = waLink(a.getAttribute("data-wa"));
      a.target = "_blank"; a.rel = "noopener";
      a.addEventListener("click", function () { track("Contact"); });
    });
    var wf = $("#wa-float"); if (wf && !phoneOk) wf.hidden = true;
    if (!phoneOk) {
      var local = location.protocol === "file:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      if (local) { var w = $("#dev-warn"); if (w) w.hidden = false; }
      if (window.console) console.warn("[PyStart] Preencha o número do WhatsApp em config.js");
    }
  }

  var st = applyState();
  wireLinks();
  // wireLinks esconde botões WhatsApp sem número; reaplica estado só nos que têm número
  $$("[data-when]").forEach(function (el) {
    if (el.getAttribute("data-nowa")) el.hidden = true;
  });

  /* ---------- Contagem regressiva ---------- */
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function tick() {
    var diff = startMs - Date.now();
    var closed = isNaN(diff) || diff <= 0;
    if (closed) diff = 0;
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff / 3600000) % 24;
    var m = Math.floor(diff / 60000) % 60;
    var s = Math.floor(diff / 1000) % 60;
    $$("[data-countdown]").forEach(function (box) {
      $$("[data-cd]", box).forEach(function (el) {
        var k = el.getAttribute("data-cd");
        el.textContent = pad(k === "d" ? d : k === "h" ? h : k === "m" ? m : s);
      });
    });
    var note = $("[data-cd-note]");
    if (note) note.textContent = closed ? "A primeira aula já aconteceu" : "para a primeira aula (14/10, 19h30)";
    if (closed && st !== "closed") { st = applyState(); wireLinksState(); }
  }
  function wireLinksState() {
    $$("[data-when]").forEach(function (el) { if (el.getAttribute("data-nowa")) el.hidden = true; });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Barra fixa no celular ---------- */
  var hero = $("#topo"), sticky = $("#sticky");
  if (hero && sticky && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var out = !entries[0].isIntersecting;
      var show = out && state() !== "closed";
      sticky.classList.toggle("is-on", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      $$("a", sticky).forEach(function (a) { a.tabIndex = show ? 0 : -1; });
      document.body.classList.toggle("sticky-on", show);
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- Animação ao rolar ---------- */
  var rev = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rev.forEach(function (el) { io.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add("is-in"); }); }

  /* ---------- "Essa turma é para você?" ---------- */
  var q = $("#qualifier");
  if (q) {
    var boxes = $$("input[type=checkbox]", q);
    var out = $("#qualifier-out");
    var btns = $$("[data-qshow]", q);
    function evalQ() {
      var v = {}; var on = 0;
      boxes.forEach(function (c) { v[c.value] = c.checked; if (c.checked) on++; });
      var key = null, msg;
      var s = state();
      if (on === 0) {
        msg = "Marque o que combina com você.";
      } else if (on === boxes.length) {
        msg = s === "open" ? "Essa turma é para você! 💗 Garanta sua vaga enquanto ainda há lugar."
          : s === "full" ? "Essa turma é para você! 💗 As vagas acabaram, mas você pode entrar na lista de espera."
            : "Essa turma é para você! 💗 A Turma 01 já começou, mas chame a gente no WhatsApp.";
        key = s === "open" ? "pay" : s === "full" ? "wa-espera" : "wa-geral";
      } else if (!v.live && on > 0) {
        msg = "Tudo bem! As aulas ficam gravadas, mas é ao vivo (19h30) que você tira as dúvidas com a professora. Chame a gente no WhatsApp para combinar como fica o seu caso.";
        key = "wa-geral";
      } else if (!v.invest) {
        msg = "Tudo bem! Dá para pagar em 2× de R$ 100. Peça a sua vaga mensal pelo WhatsApp.";
        key = "wa-mensal";
      } else {
        msg = "Você marcou " + on + " de " + boxes.length + ". Marque o resto para ver se a turma combina com você.";
      }
      out.textContent = msg;
      btns.forEach(function (b) {
        var show = b.getAttribute("data-qshow") === key && !b.getAttribute("data-nowa");
        b.hidden = !show;
      });
    }
    boxes.forEach(function (c) { c.addEventListener("change", evalQ); });
    evalQ();
  }

  /* ---------- Primeiro código (simulação) ---------- */
  var nameIn = $("#play-name");
  if (nameIn) {
    var code = $("#play-code"), outEl = $("#play-out");
    function upd() {
      var n = nameIn.value.replace(/["'\\\n\r{}]/g, "").trim() || "Ana";
      code.textContent = 'nome = "' + n + '"\nprint(f"Olá, {nome}! Bem-vinda ao Python 💗")';
      outEl.textContent = "Olá, " + n + "! Bem-vinda ao Python 💗";
    }
    nameIn.addEventListener("input", upd);
  }

  /* ---------- Vídeo da Joseane (incorporado direto na página) ---------- */
  var vbox = $("#video");
  if (vbox && cfg.videoId) {
    var vertical = String(cfg.videoFormato || "").toLowerCase() === "vertical";
    vbox.classList.toggle("video--vertical", vertical);
    vbox.classList.toggle("video--horizontal", !vertical);
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(cfg.videoId) + "?rel=0&playsinline=1";
    f.title = "Vídeo da Joseane Lelis";
    f.loading = "lazy";
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    f.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    vbox.innerHTML = "";
    vbox.appendChild(f);
  }
})();
