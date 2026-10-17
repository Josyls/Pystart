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
    else txt = "Vagas limitadas";
    $$("[data-seats-text]").forEach(function (el) { el.textContent = txt; });
    // barra sempre quase cheia (90%) enquanto há vagas; 100% quando esgota
    $$("[data-seats-fill]").forEach(function (el) { el.style.width = (st === "open" ? 90 : 100) + "%"; });
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
  // "28/11, 19h30" a partir de config.inicio (horário de Brasília)
  var startLabel = (function () {
    if (isNaN(startMs)) return "";
    var b = new Date(startMs - 3 * 3600000);
    return pad(b.getUTCDate()) + "/" + pad(b.getUTCMonth() + 1) + ", " + b.getUTCHours() + "h" + pad(b.getUTCMinutes());
  })();
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
    if (note) note.textContent = closed ? "A primeira aula já aconteceu" : "para a primeira aula (" + startLabel + ")";
    if (closed && st !== "closed") { st = applyState(); wireLinksState(); }
  }
  function wireLinksState() {
    $$("[data-when]").forEach(function (el) { if (el.getAttribute("data-nowa")) el.hidden = true; });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Barra fixa no celular ---------- */
  // A barra fixa só liga depois que a pessoa VIU o preço (cartão da turma, no fim da seção da Joseane).
  var hero = $("#topo"), sticky = $("#sticky"), priceCard = $("#garanta");
  if (hero && sticky && priceCard && "IntersectionObserver" in window) {
    var heroOut = false, priceSeen = false;
    function updSticky() {
      var show = priceSeen && heroOut && state() !== "closed";
      sticky.classList.toggle("is-on", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      $$("a", sticky).forEach(function (a) { a.tabIndex = show ? 0 : -1; });
      document.body.classList.toggle("sticky-on", show);
    }
    new IntersectionObserver(function (entries) {
      heroOut = !entries[0].isIntersecting; updSticky();
    }, { threshold: 0 }).observe(hero);
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      // conta como visto quando o preço aparece na tela (ou se a pessoa já passou dele)
      if (e.isIntersecting || e.boundingClientRect.top < 0) { priceSeen = true; updSticky(); }
    }, { threshold: 0.5 }).observe(priceCard);
  }

  /* ---------- WhatsApp flutuante ---------- */
  // Escondido no hero (lá já tem o CTA e o link de dúvidas); aparece quando a pessoa passa de ~80% do hero.
  var waF = $("#wa-float");
  if (waF && hero) {
    var waOn = null;
    var updWa = function () {
      var on = (window.scrollY || window.pageYOffset) > hero.offsetHeight * 0.8;
      if (on === waOn) return;
      waOn = on;
      document.body.classList.toggle("wa-on", on);
      waF.tabIndex = on ? 0 : -1;
      waF.setAttribute("aria-hidden", on ? "false" : "true");
    };
    window.addEventListener("scroll", updWa, { passive: true });
    window.addEventListener("resize", updWa);
    updWa();
  }

  /* ---------- Animação ao rolar ---------- */
  var rev = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    rev.forEach(function (el) { io.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add("is-in"); }); }

  // o bloco dos medos só aparece depois da primeira rolagem
  function unhideFears() {
    if (window.scrollY > 8) {
      document.documentElement.classList.remove("pre-scroll");
      window.removeEventListener("scroll", unhideFears);
    }
  }
  if (document.documentElement.classList.contains("pre-scroll")) {
    window.addEventListener("scroll", unhideFears, { passive: true });
    unhideFears();
  }

  /* ---------- "Qual é o seu maior medo hoje?" ----------
     Os medos marcados ficam salvos só no navegador da pessoa (localStorage)
     e alimentam: obstáculos do jogo, palavras do modo cinema e Missão/Visão. */
  var FEAR_KEY = "pystart_medos";
  var MV = {
    "errar": "Transformar cada erro seu em degrau. Aqui, errar não te diminui: te ensina.",
    "não ser capaz": "Provar, linha por linha, que você sempre foi capaz. Só faltava alguém acreditar junto.",
    "ser julgada": "Criar o lugar onde nenhuma pergunta é boba e nenhuma mulher é julgada por querer aprender.",
    "começar tarde demais": "Mostrar que não existe idade certa para recomeçar. Existe o dia em que você decide.",
    "não conseguir trabalho": "Colocar ferramentas reais nas suas mãos para você disputar o mercado de cabeça erguida.",
    "não ter tempo": "Caber na sua rotina, com aulas ao vivo à noite e gravadas, para você nunca mais se deixar por último.",
    "não ser de exatas": "Ensinar do zero, sem fórmula difícil. Programar é lógica do dia a dia, e isso você já faz.",
    "ficar para trás": "Te puxar pela mão para dentro do futuro. Aqui, nenhuma mulher fica para trás."
  };
  var fearBoxes = $$("#fears input[type=checkbox]");
  var fearListeners = [];
  function getFears() { return fearBoxes.filter(function (c) { return c.checked; }).map(function (c) { return c.value; }); }
  function saveFears() { try { localStorage.setItem(FEAR_KEY, JSON.stringify(getFears())); } catch (e) { /* sem storage: segue */ } }
  function loadFears() {
    try {
      var saved = JSON.parse(localStorage.getItem(FEAR_KEY) || "[]");
      fearBoxes.forEach(function (c) { c.checked = saved.indexOf(c.value) !== -1; });
    } catch (e) { /* ignora */ }
  }
  var mvMissao = $("#mv-missao");
  var mvDefault = mvMissao ? mvMissao.textContent : null;
  function applyFears() {
    var f = getFears();
    if (mvMissao) mvMissao.textContent = (f.length && MV[f[0]]) || mvDefault;
    fearListeners.forEach(function (fn) { fn(f); });
  }
  // lista suspensa: o botão mostra o que foi escolhido e abre/fecha as opções
  var fSel = $("#fears-sel"), fBtn = $("#fears-btn"), fList = $("#fears"), fVal = $("#fears-val");
  function fearLabel(c) { return c.parentNode.textContent.trim(); }
  function syncFearBtn() {
    if (!fVal) return;
    var on = fearBoxes.filter(function (c) { return c.checked; });
    fVal.classList.toggle("is-empty", !on.length);
    fVal.textContent = !on.length ? "Selecione seus medos" :
      on.length <= 2 ? on.map(fearLabel).join(", ") : on.length + " medos selecionados";
  }
  function setFearsOpen(open, focusBtn) {
    if (!fList) return;
    fList.hidden = !open;
    fBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open && focusBtn) fBtn.focus();
  }
  if (fBtn && fList) {
    fBtn.addEventListener("click", function () { setFearsOpen(fList.hidden); });
    $("#fears-ok").addEventListener("click", function () { setFearsOpen(false, true); });
    document.addEventListener("click", function (e) { if (!fList.hidden && !fSel.contains(e.target)) setFearsOpen(false); });
    fSel.addEventListener("keydown", function (e) { if (e.key === "Escape" && !fList.hidden) setFearsOpen(false, true); });
  }
  fearBoxes.forEach(function (c) {
    c.addEventListener("change", function () { saveFears(); applyFears(); syncFearBtn(); });
  });
  loadFears(); applyFears(); syncFearBtn();

  /* ---------- Primeiro código: programa + joguinho ---------- */
  var nameIn = $("#play-name");
  if (nameIn) {
    var jobIn = $("#play-job"), dreamIn = $("#play-dream");
    var codeEl = $("#play-code"), outEl = $("#play-out"), runBtn = $("#play-run");
    var gameBox = $("#play-game"), canvas = $("#play-canvas"), hint = $("#play-hint");
    var ctx = canvas.getContext("2d");
    var dreamCount = $("#play-dream-count");
    // obstáculos do jogo = medos marcados lá em cima (até 5 no jogo); sem nada marcado, os clássicos
    function getObst() {
      var l = getFears().slice(0, 5);
      return l.length ? l : ["medo", "dúvida", "erro"];
    }
    fearListeners.push(function () { if (!running) renderCode(); });

    function clean(v, fb) { return String(v || "").replace(/["'\\\n\r{}]/g, "").trim() || fb; }
    function vals() {
      return { nome: clean(nameIn.value, "Ana"), job: clean(jobIn.value, ""), sonho: clean(dreamIn.value, ""), obst: getObst() };
    }

    // transforma o sonho numa frase de incentivo: "sustentar meu filho" -> "Bia, você pode sustentar seu filho e ter uma vida extraordinária."
    function dreamPhrase(nome, sonho) {
      if (!sonho) return "";
      var d = sonho.replace(/[.!]+$/, "").trim();
      d = d.replace(/^(eu\s+)?(quero|queria|vou|gostaria\s+de|meu\s+sonho\s+(é|e)|sonho\s+em)\s+/i, "");
      d = d.charAt(0).toLowerCase() + d.slice(1);
      var swap = { meu: "seu", minha: "sua", meus: "seus", minhas: "suas", eu: "você", mim: "você", comigo: "consigo" };
      d = d.replace(/(^|[\s,])(meu|minha|meus|minhas|eu|mim|comigo)(?=$|[\s,.!])/gi, function (m, pre, w) { return pre + swap[w.toLowerCase()]; });
      var first = d.split(/\s+/)[0] || "";
      var verbo = /(ar|er|ir|or|ôr)$/i.test(first);
      var frase = nome + ", você pode " + (verbo ? "" : "conquistar ") + d;
      if (!/extraordin/i.test(d)) frase += " e ter uma vida extraordinária";
      return frase + ".";
    }

    // código mostrado (montado com DOM: nada do usuário vira HTML)
    var lineEls = [];
    function renderCode() {
      var v = vals();
      var lines = [];
      L = {};
      function at(name, parts) { L[name] = lines.length; lines.push(parts); }
      at("nome", [["k", "nome"], ["", " = "], ["s", '"' + v.nome + '"']]);
      if (v.job) at("job", [["k", "profissao"], ["", " = "], ["s", '"' + v.job + '"']]);
      if (v.sonho) at("sonho", [["k", "sonho"], ["", " = "], ["s", '"' + v.sonho + '"']]);
      lines.push([]);
      at("obst", [["k", "obstaculos"], ["", " = ["]].concat(v.obst.reduce(function (a, o, i) { if (i) a.push(["", ", "]); a.push(["s", '"' + o + '"']); return a; }, []), [["", "]"]]));
      at("for", [["f", "for"], ["", " obstaculo "], ["f", "in"], ["", " obstaculos:"]]);
      at("pular", [["", "    "], ["f", "pular"], ["", "(obstaculo)"]]);
      lines.push([]);
      at("p1", [["f", "print"], ["", "("], ["s", v.job ? 'f"{nome}, futura {profissao}!"' : 'f"{nome}, você chegou lá!"'], ["", ")"]]);
      if (v.sonho) at("p2", [["f", "print"], ["", "("], ["s", 'f"Você pode: {sonho} 💗"'], ["", ")"]]);
      codeEl.textContent = "";
      lineEls = lines.map(function (parts) {
        var ln = document.createElement("span");
        ln.className = "ln";
        parts.forEach(function (p) {
          var s = document.createElement("span");
          if (p[0]) s.className = "t-" + p[0];
          s.textContent = p[1];
          ln.appendChild(s);
        });
        ln.appendChild(document.createTextNode("\n"));
        codeEl.appendChild(ln);
        return ln;
      });
    }
    var L = {};
    function mark(name) { var i = L[name]; lineEls.forEach(function (l, j) { l.classList.toggle("is-run", j === i); }); }

    // terminal: cada linha = ícone + texto (sempre via textContent)
    function log(icon, txt, cls) {
      if (!outEl) return;
      var d = outEl.querySelector(".term__dim"); if (d) d.remove();
      var row = document.createElement("div");
      row.className = "term__row" + (cls ? " " + cls : "");
      var i = document.createElement("span"); i.className = "term__ic"; i.textContent = icon;
      var t = document.createElement("span"); t.textContent = txt;
      row.appendChild(i); row.appendChild(t);
      outEl.appendChild(row);
      outEl.scrollTop = outEl.scrollHeight;
    }
    function logFinal(title, text) {
      if (!outEl) return;
      var box = document.createElement("div"); box.className = "term__final";
      var b = document.createElement("b"); b.textContent = title; box.appendChild(b);
      if (text) { var p = document.createElement("p"); p.textContent = text; box.appendChild(p); }
      outEl.appendChild(box);
      outEl.scrollTop = outEl.scrollHeight;
    }

    // ---- jogo ----
    var W = 0, H = 0, dpr = 1, G, running = false, raf = 0, last = 0;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = gameBox.clientWidth; H = gameBox.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) draw(0);
    }

    function reset() {
      var v = vals();
      ctx.font = "800 13px system-ui, sans-serif";
      var x = W + 40;
      G = { v: v, phrase: dreamPhrase(v.nome, v.sonho), t: 0, speed: Math.max(190, W * 0.55), ground: H - 26, py: 0, vy: 0, flash: 0, done: false, obs: [], flagX: 0, hits: 0 };
      v.obst.forEach(function (lab) {
        var w = Math.max(54, ctx.measureText(lab).width + 18);
        G.obs.push({ x: x, w: w, h: 34, label: lab, passed: false, hit: false });
        x += Math.max(240, W * 0.7, w + 190);
      });
      G.flagX = x + 40;
    }

    function jump() {
      if (!running || G.done) return;
      if (G.py === 0) G.vy = 560;
      hint.hidden = true;
    }

    function step(dt) {
      G.t += dt;
      var dx = G.speed * dt;
      G.obs.forEach(function (o) { o.x -= dx; });
      G.flagX -= dx;
      // física do pulo
      if (G.py > 0 || G.vy > 0) {
        G.vy -= 1700 * dt; G.py += G.vy * dt;
        if (G.py <= 0) { G.py = 0; G.vy = 0; }
      }
      if (G.flash > 0) G.flash -= dt;

      var px = 46, pw = 30;
      G.obs.forEach(function (o, i) {
        var overlapX = px + pw > o.x + 4 && px < o.x + o.w - 4;
        if (overlapX && G.py < o.h - 4 && !o.hit && !o.passed) {
          o.hit = true; G.hits++; G.flash = 0.7; mark("pular");
          log("↻", "tropeçou em " + o.label + " — levantou e seguiu", "term__warn");
        }
        if (!o.passed && o.x + o.w < px) {
          o.passed = true; mark("pular");
          if (!o.hit) log("✓", "pulou " + o.label, "term__ok");
        }
        if (!o.passed && o.x < W && o.x > px) mark("for");
      });
      if (!G.done && G.flagX < px + pw) finish();
    }

    function finish() {
      G.done = true; running = false; hint.hidden = true;
      mark("p1");
      log("★", G.hits ? G.hits + " tropeço" + (G.hits > 1 ? "s" : "") + ", zero desistência. É assim que se aprende." : "nenhum tropeço. Você nasceu pra isso!", "term__dim2");
      setTimeout(function () {
        if (G.v.sonho) mark("p2");
        logFinal("🎉 " + G.v.nome + (G.v.job ? ", futura " + G.v.job + "!" : ", você chegou lá!"), G.phrase ? G.phrase + " E tudo começa com uma linha de código." : "");
        runBtn.disabled = false; runBtn.textContent = "↻ Rodar de novo";
      }, 450);
      draw(0);
    }

    function rr(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function drawGirl(x0, groundY, py, t) {
      ctx.save(); ctx.translate(x0, groundY - py); ctx.scale(1.4, 1.4);
      var x = 0, y = 0;
      if (G && G.flash > 0 && Math.floor(G.flash * 12) % 2) ctx.globalAlpha = 0.35;
      var leg = py > 0 ? 0 : Math.sin(t * 18) * 4;
      ctx.fillStyle = "#14101C";
      ctx.fillRect(x + 5, y - 10, 4, 10 + leg * 0.5); ctx.fillRect(x + 13, y - 10, 4, 10 - leg * 0.5); // pernas
      ctx.fillStyle = "#F5038B"; rr(x + 1, y - 30, 20, 21, 5); ctx.fill(); // vestido
      ctx.fillStyle = "#F4C9A8"; ctx.beginPath(); ctx.arc(x + 11, y - 38, 8, 0, Math.PI * 2); ctx.fill(); // rosto
      ctx.fillStyle = "#14101C"; ctx.beginPath(); ctx.arc(x + 11, y - 41, 8.5, Math.PI, 0); ctx.fill(); // cabelo
      ctx.beginPath(); ctx.arc(x + 3, y - 36, 4, 0, Math.PI * 2); ctx.fill(); // rabo de cavalo
      ctx.fillRect(x + 15, y - 39, 2, 2); // olho
      ctx.restore(); ctx.globalAlpha = 1;
    }

    function wrap(text, maxW, font) {
      ctx.font = font;
      var words = text.split(" "), out = [], cur = "";
      words.forEach(function (w) {
        var t = cur ? cur + " " + w : w;
        if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
      });
      if (cur) out.push(cur);
      return out;
    }

    function draw(t) {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      var ground = H - 26;
      // chão pontilhado que corre
      ctx.fillStyle = "#14101C"; ctx.fillRect(0, ground, W, 3);
      var off = G ? (G.t * G.speed) % 24 : 0;
      ctx.fillStyle = "rgba(20,16,28,.35)";
      for (var gx = -off; gx < W; gx += 24) ctx.fillRect(gx, ground + 10, 10, 2);

      if (!G) { drawGirl(46, ground, 0, 0); return; }
      ctx.font = "800 13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      G.obs.forEach(function (o) {
        if (o.x > W + 10 || o.x + o.w < -10) return;
        ctx.fillStyle = o.hit ? "#F5038B" : "#14101C";
        rr(o.x, ground - o.h, o.w, o.h, 8); ctx.fill();
        ctx.fillStyle = "#C8F918"; ctx.fillText(o.label, o.x + o.w / 2, ground - o.h / 2);
      });
      // bandeira
      if (G.flagX < W + 10) {
        ctx.fillStyle = "#14101C"; ctx.fillRect(G.flagX, ground - 64, 4, 64);
        ctx.fillStyle = "#C8F918"; ctx.beginPath(); ctx.moveTo(G.flagX + 4, ground - 64); ctx.lineTo(G.flagX + 34, ground - 54); ctx.lineTo(G.flagX + 4, ground - 44); ctx.fill();
        ctx.strokeStyle = "#14101C"; ctx.lineWidth = 2; ctx.stroke();
      }
      drawGirl(46, ground, G.py, G.t);
      if (!G.done) {
        // placa no topo: para onde ela está indo
        ctx.font = "800 12px system-ui, sans-serif"; ctx.textAlign = "left";
        var full = G.v.sonho ? "🎯 Rumo a: " + G.v.sonho : G.v.job ? "🎯 Rumo a: futura " + G.v.job : "🎯 Rumo ao seu objetivo", tag = full, maxW = W - 24;
        while (ctx.measureText(tag).width > maxW && tag.length > 12) tag = tag.slice(0, -2);
        if (tag !== full) tag += "…";
        var tw = ctx.measureText(tag).width + 16;
        ctx.fillStyle = "#14101C"; rr(8, 8, tw, 24, 12); ctx.fill();
        ctx.fillStyle = "#C8F918"; ctx.fillText(tag, 16, 20);
        ctx.textAlign = "center";
      } else {
        ctx.fillStyle = "rgba(20,16,28,.88)"; ctx.fillRect(0, 0, W, H);
        var big = Math.min(21, W / 16), mid = Math.min(14, W / 26);
        var lines = G.phrase ? wrap(G.phrase, W - 40, "italic 700 " + mid + "px system-ui, sans-serif").slice(0, 4) : [];
        var total = big + (G.v.job ? 10 + mid : 0) + (lines.length ? 12 + lines.length * (mid + 5) : 0);
        var y = (H - total) / 2 + big / 2;
        ctx.fillStyle = "#C8F918"; ctx.font = "900 " + big + "px system-ui, sans-serif";
        ctx.fillText("🎉 " + G.v.nome + " chegou lá!", W / 2, y);
        if (G.v.job) {
          y += big / 2 + 10 + mid / 2;
          ctx.fillStyle = "#fff"; ctx.font = "800 " + mid + "px system-ui, sans-serif";
          ctx.fillText("Futura " + G.v.job, W / 2, y);
          y += mid + 12;
        } else {
          y += big / 2 + 12 + mid / 2;
        }
        ctx.fillStyle = "#FFB3DA"; ctx.font = "italic 700 " + mid + "px system-ui, sans-serif";
        lines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += mid + 5; });
      }
    }

    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      step(dt); draw(now);
      if (running) raf = requestAnimationFrame(loop);
    }

    function run() {
      cancelAnimationFrame(raf);
      size(); reset(); renderCode();
      if (outEl) outEl.textContent = "";
      var v = G.v;
      mark("nome");
      log("▸", "olá, " + v.nome + "!" + (v.job ? " rumo a futura " + v.job : ""), "term__dim2");
      log("▸", v.obst.length + " obstáculo" + (v.obst.length > 1 ? "s" : "") + " no caminho: " + v.obst.join(", "), "term__dim2");
      running = true; hint.hidden = false;
      runBtn.disabled = true; runBtn.textContent = "Rodando…";
      gameBox.focus({ preventScroll: true });
      gameBox.scrollIntoView({ block: "center", behavior: "smooth" });
      last = performance.now(); raf = requestAnimationFrame(loop);
    }

    [nameIn, jobIn, dreamIn].forEach(function (el) { el.addEventListener("input", renderCode); el.addEventListener("change", renderCode); });
    function countDream() { dreamCount.textContent = dreamIn.value.length + "/80"; }
    dreamIn.addEventListener("input", countDream); countDream();
    runBtn.addEventListener("click", run);
    gameBox.addEventListener("pointerdown", function (e) { if (running) { e.preventDefault(); jump(); } });
    gameBox.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") { if (running) { e.preventDefault(); jump(); } }
    });
    window.addEventListener("resize", function () { if (!running) size(); });
    renderCode(); size();
  }

  /* ---------- Vídeo da Joseane: abre em tela preta, sem barra de tempo ---------- */
  var vplay = $("#video-play"), vmodal = $("#vmodal"), vframe = $("#vmodal-frame"), vx = $("#vmodal-x"), vtap = $("#vmodal-tap");
  if (vplay && vmodal && cfg.videoId) {
    vplay.hidden = false;
    var vIframe = null, vState = -1, vLastFocus = null;

    // Chuva de medos no fundo preto: as palavras caem e a bonequinha lá embaixo destrói cada uma.
    var rain = (function () {
      var cv = $("#vrain"), c = cv.getContext("2d"), W = 0, H = 0, raf = 0, last = 0, on = false;
      var words = [], bits = [], girl = { x: 0, punch: 0 }, spawnT = 0, seq = [], seqI = 0, t = 0;
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      function buildSeq() {
        var f = getFears().map(function (x) { return "medo de " + x; });
        var base = ["medo", "medo", "fraqueza", "insegurança", "medo", "fraqueza", "dúvida"];
        seq = [];
        base.forEach(function (w, i) { seq.push(w); if (f.length) seq.push(f[i % f.length]); });
        seqI = 0;
      }
      function fit() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!girl.x) girl.x = W / 2;
      }
      function spawn() {
        var txt = seq[seqI++ % seq.length], big = txt.indexOf("medo de") === 0;
        c.font = "900 " + (big ? 20 : 17) + "px system-ui, sans-serif";
        // cada medo vira um tijolinho com o nome dentro
        var w = c.measureText(txt).width + 28, h = big ? 36 : 32;
        words.push({ txt: txt, x: 12 + w / 2 + Math.random() * Math.max(1, W - 24 - w), y: -h, v: 80 + Math.random() * 50, big: big, w: w, h: h, rot: (Math.random() - 0.5) * 0.12 });
      }
      function burst(x, y, col, n, size) {
        for (var i = 0; i < (n || 16); i++) {
          var a = Math.random() * Math.PI * 2, s = 80 + Math.random() * 220;
          bits.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 90, life: 0.8, col: col, sz: size ? size * (0.5 + Math.random()) : 4 });
        }
      }
      function drawBrick(b) {
        var x = -b.w / 2, y = -b.h / 2;
        c.save(); c.translate(b.x, b.y); c.rotate(b.rot);
        c.fillStyle = b.big ? "#C0432B" : "#9C4A36";
        c.fillRect(x, y, b.w, b.h);
        // rejunte (linhas do tijolo)
        c.strokeStyle = "rgba(0,0,0,.35)"; c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
        c.beginPath();
        c.moveTo(x, y + b.h / 2); c.lineTo(x + 8, y + b.h / 2);
        c.moveTo(x + b.w - 8, y + b.h / 2); c.lineTo(x + b.w, y + b.h / 2);
        c.stroke();
        c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(x + 2, y + 2, b.w - 4, 4);
        c.font = "900 " + (b.big ? 18 : 15) + "px system-ui, sans-serif";
        c.fillStyle = "#fff"; c.fillText(b.txt, 0, 1);
        c.restore();
      }
      function drawGirl(x, y, punch) {
        c.save(); c.translate(x - 15, y); c.scale(1.5, 1.5);
        c.fillStyle = "#fff"; c.fillRect(5, -10, 4, 10); c.fillRect(13, -10, 4, 10);
        c.fillStyle = "#F5038B"; c.beginPath(); c.roundRect ? c.roundRect(1, -30, 20, 21, 5) : c.rect(1, -30, 20, 21); c.fill();
        c.fillStyle = "#F4C9A8"; c.beginPath(); c.arc(11, -38, 8, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#3a2a1f"; c.beginPath(); c.arc(11, -41, 8.5, Math.PI, 0); c.fill(); c.beginPath(); c.arc(3, -36, 4, 0, Math.PI * 2); c.fill();
        // braço erguido quando acerta
        c.fillStyle = "#F4C9A8"; c.fillRect(punch > 0 ? 18 : 19, punch > 0 ? -44 : -26, 4, punch > 0 ? 16 : 10);
        c.restore();
      }
      function frame(now) {
        var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        var floor = H - 16, top = floor - 70;
        spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = 0.9 + Math.random() * 0.5; }
        // a bonequinha corre até a palavra mais baixa
        var target = null; words.forEach(function (w) { if (!target || w.y > target.y) target = w; });
        if (target) girl.x += Math.max(-260 * dt, Math.min(260 * dt, target.x - girl.x));
        if (girl.punch > 0) girl.punch -= dt;
        c.clearRect(0, 0, W, H);
        c.textAlign = "center"; c.textBaseline = "middle";
        words = words.filter(function (w) {
          w.y += w.v * dt;
          // o tijolo bate na cabeça da menininha e se despedaça
          if (w.y + w.h / 2 > top && Math.abs(w.x - girl.x) < w.w / 2 + 14) {
            burst(w.x, top, "#C0432B", 14, 9); burst(w.x, top, "#E9C46A", 8, 4); girl.punch = 0.3; return false;
          }
          if (w.y + w.h / 2 > floor) { burst(w.x, floor, "#6b3a2c", 10, 6); return false; }
          drawBrick(w);
          return true;
        });
        bits = bits.filter(function (b) {
          b.life -= dt; b.vy += 500 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
          c.globalAlpha = Math.max(0, b.life / 0.7); c.fillStyle = b.col; c.fillRect(b.x, b.y, b.sz, b.sz);
          return b.life > 0;
        });
        c.globalAlpha = 1;
        c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(0, floor, W, 2);
        drawGirl(girl.x, floor, girl.punch);
        if (girl.punch > 0) { c.font = "900 16px system-ui, sans-serif"; c.fillStyle = "#C8F918"; c.fillText("POW!", girl.x, top - 30); }
        if (on) raf = requestAnimationFrame(frame);
      }
      function resize() { if (on) fit(); }
      window.addEventListener("resize", resize);
      return {
        start: function () {
          if (reduce) return;
          on = true; words = []; bits = []; girl.x = 0; spawnT = 0.2; buildSeq(); fit();
          last = performance.now(); raf = requestAnimationFrame(frame);
        },
        stop: function () { on = false; cancelAnimationFrame(raf); c.clearRect(0, 0, W, H); }
      };
    })();
    function ytPost(obj) {
      if (vIframe && vIframe.contentWindow) vIframe.contentWindow.postMessage(JSON.stringify(obj), "https://www.youtube-nocookie.com");
    }
    function ytCmd(func) { ytPost({ event: "command", func: func, args: [] }); }
    // estado do player: 1 = tocando, 2 = pausado. Enquanto não começou, o toque vai direto pro YouTube
    // (assim funciona mesmo quando o celular bloqueia o autoplay).
    function setState(st) {
      vState = st;
      vframe.classList.toggle("is-live", st === 1 || st === 2 || st === 3);
      vframe.classList.toggle("is-paused", st === 2);
    }
    window.addEventListener("message", function (e) {
      if (!vIframe || e.source !== vIframe.contentWindow) return;
      var d; try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (err) { return; }
      if (!d) return;
      if (d.event === "onStateChange" && typeof d.info === "number") setState(d.info);
      else if (d.info && typeof d.info.playerState === "number") setState(d.info.playerState);
    });
    function openVideo() {
      var vertical = String(cfg.videoFormato || "").toLowerCase() === "vertical";
      vframe.classList.toggle("is-vertical", vertical);
      vIframe = document.createElement("iframe");
      // controls=0 esconde a barra de progresso e o tempo do vídeo
      vIframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(cfg.videoId) +
        "?autoplay=1&controls=0&rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1";
      vIframe.title = "Vídeo da Joseane Lelis";
      vIframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      vIframe.allow = "autoplay; encrypted-media; picture-in-picture";
      vIframe.addEventListener("load", function () { ytPost({ event: "listening", id: 1, channel: "widget" }); });
      vframe.insertBefore(vIframe, vtap);
      setState(-1);
      vLastFocus = document.activeElement;
      vmodal.hidden = false;
      document.documentElement.classList.add("no-scroll");
      vx.focus();
      rain.start();
      track("ViewContent");
    }
    function closeVideo() {
      rain.stop();
      if (vIframe) { vIframe.remove(); vIframe = null; }
      vmodal.hidden = true;
      document.documentElement.classList.remove("no-scroll");
      if (vLastFocus) vLastFocus.focus({ preventScroll: true });
    }
    vplay.addEventListener("click", openVideo);
    vx.addEventListener("click", closeVideo);
    vtap.addEventListener("click", function () {
      if (vState === 1 || vState === 3) { ytCmd("pauseVideo"); setState(2); }
      else { ytCmd("playVideo"); setState(1); }
    });
    vmodal.addEventListener("click", function (e) { if (e.target === vmodal) closeVideo(); });
    document.addEventListener("keydown", function (e) { if (!vmodal.hidden && e.key === "Escape") closeVideo(); });
  }

  /* ---------- Vídeo de fundo do hero ----------
     1ª volta com som (se o navegador deixar), depois segue em loop sem som,
     com o botão no cantinho para ligar de novo. */
  var hv = $("#hero-video"), hs = $("#hero-sound");
  if (hv && hs) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) {
      // fica só a imagem de capa: sem movimento e sem gastar dados
      hv.removeAttribute("preload");
    } else {
      var firstLoop = true, userChose = false, inView = true, modalOpen = false;
      var syncBtn = function () {
        var on = !hv.muted;
        hs.setAttribute("aria-pressed", on ? "true" : "false");
        hs.setAttribute("aria-label", on ? "Desligar o som do vídeo" : "Ligar o som do vídeo");
        $(".hero__sound-txt", hs).textContent = on ? "Desligar som" : "Ligar som";
      };
      var play = function () {
        var p = hv.play();
        if (p && p.catch) p.catch(function () {});
        return p;
      };
      var setSound = function (on) { hv.muted = !on; syncBtn(); };

      // tenta começar com som; a maioria dos navegadores bloqueia, então cai para mudo
      hv.muted = false;
      var first = hv.play();
      if (first && first.catch) {
        first.then(syncBtn).catch(function () { hv.muted = true; syncBtn(); play(); });
      } else { syncBtn(); }
      hs.hidden = false;

      // som bloqueado na 1ª volta: liga no primeiro toque/clique da visitante na página
      var unlock = function (e) {
        if (e && hs.contains(e.target)) return;
        document.removeEventListener("pointerdown", unlock, true);
        document.removeEventListener("keydown", unlock, true);
        if (firstLoop && !userChose && !modalOpen && hv.muted) setSound(true);
      };
      document.addEventListener("pointerdown", unlock, true);
      document.addEventListener("keydown", unlock, true);

      // fim de cada volta: a partir da 2ª, sem som (a não ser que ela tenha ligado no botão)
      hv.addEventListener("ended", function () {
        if (firstLoop) { firstLoop = false; if (!userChose) setSound(false); }
        hv.currentTime = 0;
        if (inView && !modalOpen) play();
      });

      hs.addEventListener("click", function () {
        userChose = true;
        setSound(hv.muted);
        if (hv.paused) play();
      });

      // pausa quando o hero sai da tela (economiza bateria e não toca som escondido)
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          if (inView && !modalOpen) play(); else hv.pause();
        }, { threshold: 0.15 }).observe($("#topo"));
      }

      // vídeo da Joseane aberto: o de fundo pausa
      if (vmodal && "MutationObserver" in window) {
        new MutationObserver(function () {
          modalOpen = !vmodal.hidden;
          if (modalOpen) hv.pause(); else if (inView) play();
        }).observe(vmodal, { attributes: true, attributeFilter: ["hidden"] });
      }
    }
  }
})();
