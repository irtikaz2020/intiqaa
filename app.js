(function () {
  'use strict';
  var Q = window.Iq, el = Q.el, say = Q.say;
  var app = document.getElementById('app'), bt = document.getElementById('bt'), tg = document.getElementById('tg'), rm = document.getElementById('rm');
  var rooms = [], posts = [], site = { criteria: [], contact: {} };
  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {} }
  var BASE = '#2b2623';

  function room(id) { return rooms.filter(function (r) { return r.id === id; })[0]; }
  function post(id) { return posts.filter(function (p) { return p.id === id; })[0]; }
  function vis() { return posts.filter(function (p) { return !p.hidden; }); }
  function inRoom(id) { return vis().filter(function (p) { return p.room === id; }).sort(byDate); }
  function byDate(a, b) { return (b.date || '').localeCompare(a.date || ''); }
  function col(r) { return r && /^#[0-9a-f]{3,8}$/i.test(r.color || '') ? r.color : BASE; }
  function theme(r) {
    document.documentElement.style.setProperty('--room', r ? col(r) : BASE);
    bt.textContent = r ? r.name : (site.name || 'انتقاء'); tg.textContent = r ? (r.tagline || '') : (site.tagline || ''); rm.textContent = r ? (r.emoji || '❖') : '❖';
    document.title = (r ? r.name + ' | ' : '') + (site.name || 'انتقاء');
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', r ? col(r) : BASE);
  }
  function fmtDate(d) { try { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d || ''; } }
  function norm(s) { return String(s || '').toLowerCase().replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه'); }
  function srcLine(p) {
    var parts = [p.author ? p.author : '', p.book ? '«' + p.book + '»' : ''].filter(Boolean);
    var u = p.link ? Q.safeUrl(p.link) : '';
    if (!parts.length && !u) return null;
    return el('div', { class: 'src' }, parts.join(' — '), u ? [' · ', el('a', { href: u, target: '_blank', rel: 'noopener noreferrer', text: 'المصدر' })] : null);
  }
  function excerpt(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }

  function card(p) {
    var r = room(p.room) || {}, c = col(r);
    var u = p.img ? Q.safeUrl(p.img) : '';
    return el('article', { class: 'post', style: '--c:' + c },
      el('div', { class: 'meta' }, el('a', { href: '#/r/' + p.room, text: (r.emoji || '') + ' ' + (r.name || '') }), p.date ? ' · ' + fmtDate(p.date) : '', p.cat && r.cats ? ' · ' + ((r.cats.filter(function (x) { return x.id === p.cat; })[0] || {}).name || '') : ''),
      p.title ? el('h3', null, el('a', { href: '#/post/' + p.id, text: p.title })) : null,
      u && !p.body ? el('a', { href: '#/post/' + p.id }, el('img', { class: 'cut', src: u, alt: p.title || 'قصاصة', loading: 'lazy' })) : el('div', { class: 'ex' + (r.type === 'verse' ? ' verse' : ''), text: excerpt(p.body, 220) }),
      srcLine(p));
  }

  /* ---------- الصفحات ---------- */
  function home() {
    theme(null);
    var box = el('div', null, el('div', { class: 'panel' }, el('h2', { text: 'ما هو انتقاء؟' }), el('p', { text: site.about || '' })));
    box.appendChild(el('div', { class: 'rooms' }, rooms.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).map(function (r) {
      var n = inRoom(r.id).length;
      return el('a', { class: 'room' + (r.status === 'soon' ? ' soon' : ''), href: '#/r/' + r.id, style: '--c:' + col(r) },
        el('span', { class: 'e', text: r.emoji || '' }), el('b', { text: r.name }), el('span', { class: 'd', text: r.tagline || '' }),
        r.status === 'soon' ? el('span', { class: 'soonb', text: 'قريباً' }) : el('span', { class: 'meta', text: n.toLocaleString('ar-EG') + ' نص' }));
    })));
    var q = el('input', { type: 'text', placeholder: 'ابحث في النصوص والمؤلفين والكتب', 'aria-label': 'بحث' });
    q.addEventListener('change', function () { if (q.value.trim()) go('#/search/' + encodeURIComponent(q.value.trim())); });
    box.appendChild(q);
    var latest = vis().sort(byDate).slice(0, 8);
    box.appendChild(el('h3', { text: 'الجديد', style: 'margin:18px 0 4px' }));
    if (latest.length) latest.forEach(function (p) { box.appendChild(card(p)); }); else box.appendChild(el('p', { class: 'hint', text: 'لم تُنشر نصوص بعد.' }));
    return box;
  }
  var catF = '';
  function roomPage(id) {
    var r = room(id); if (!r) return notFound(); theme(r);
    var all = inRoom(id), box = el('div', null, el('div', { class: 'panel' }, el('p', { text: r.desc || '' })));
    if (r.id === 'tiryaq' || (r.cats && r.cats.length)) {
      if (r.cats && r.cats.length) box.appendChild(el('div', { class: 'row', style: 'margin:8px 0' }, [{ id: '', name: 'الكل' }].concat(r.cats).map(function (c) {
        return el('button', { class: 'chip', type: 'button', 'aria-current': catF === c.id ? 'true' : null, text: c.name, onclick: function () { catF = c.id; render(); } });
      })));
    }
    if (r.id === 'tiryaq') box.appendChild(el('p', null, el('a', { class: 'btn', href: '#/ask', text: 'عندك مشكلة أو سؤال؟' })));
    var shown = all.filter(function (p) { return !catF || p.cat === catF; });
    if (r.type === 'image' && shown.length) box.appendChild(el('div', { class: 'grid' }, shown.map(card)));
    else shown.forEach(function (p) { box.appendChild(card(p)); });
    if (!shown.length) box.appendChild(el('div', { class: 'note', text: r.status === 'soon' ? 'هذا المكان قادم قريباً.' : 'لا نصوص هنا بعد.' }));
    if (r.id === 'tiryaq') box.appendChild(el('div', { class: 'note', text: site.disclaimer || '' }));
    return box;
  }
  function postPage(id) {
    var p = post(id); if (!p || p.hidden) return notFound();
    var r = room(p.room) || {}; theme(r);
    var u = p.img ? Q.safeUrl(p.img) : '';
    var box = el('div', null, p.title ? el('h2', { text: p.title, style: 'margin-top:14px' }) : null,
      el('div', { class: 'meta' }, el('a', { href: '#/r/' + p.room, text: (r.emoji || '') + ' ' + (r.name || '') }), p.date ? ' · ' + fmtDate(p.date) : ''),
      u ? el('img', { class: 'cut', src: u, alt: p.title || 'قصاصة', style: 'margin-top:12px' }) : null,
      p.body ? el('div', { class: 'body' + (r.type === 'verse' ? ' verse' : ''), text: p.body }) : null, srcLine(p));
    box.appendChild(el('div', { class: 'row', style: 'margin-top:14px' }, el('button', { class: 'btn', type: 'button', text: 'مشاركة', onclick: function () {
      var link = location.href;
      if (navigator.share) navigator.share({ title: p.title || r.name, text: excerpt(p.body, 140), url: link }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { say('نُسخ الرابط.'); }, function () { say(link); });
      else say(link);
    } }), el('button', { class: 'btn', type: 'button', text: 'نسخ النص', onclick: function () {
      var t = (p.body || '') + (srcLine(p) ? '\n— ' + [p.author, p.book ? '«' + p.book + '»' : ''].filter(Boolean).join(' — ') : '');
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { say('نُسخ النص.'); }, function () { say('تعذّر النسخ.', true); }); else say('تعذّر النسخ.', true);
    } }), el('a', { class: 'btn', href: '#/r/' + p.room, text: 'المزيد في ' + (r.name || '') })));
    if (p.room === 'tiryaq') box.appendChild(el('div', { class: 'note', text: site.disclaimer || '' }));
    return box;
  }
  function searchPage(q) {
    theme(null);
    var w = norm(q).split(/\s+/), res = vis().filter(function (p) { var h = norm([p.title, p.body, p.author, p.book].join(' ')); return w.every(function (x) { return h.indexOf(x) >= 0; }); }).sort(byDate);
    var box = el('div', null, el('h2', { text: 'نتائج «' + q + '» (' + res.length.toLocaleString('ar-EG') + ')', style: 'margin-top:14px' }));
    if (res.length) res.forEach(function (p) { box.appendChild(card(p)); }); else box.appendChild(el('p', { class: 'hint', text: 'لا نتائج.' }));
    return box;
  }
  function askPage() {
    theme(room('tiryaq')); var c = site.contact || {};
    return el('div', null, el('div', { class: 'panel' }, el('h2', { text: 'الأسئلة' }), el('p', { text: site.askNote || '' }),
      el('div', { class: 'row' }, c.email ? el('a', { class: 'btn', href: 'mailto:' + c.email, text: 'راسلنا بالبريد' }) : null, c.telegram ? el('a', { class: 'btn', href: c.telegram, target: '_blank', rel: 'noopener noreferrer', text: 'تيليجرام' }) : null)),
      el('div', { class: 'note', text: site.disclaimer || '' }));
  }
  function standardsPage() {
    theme(null);
    return el('div', null, el('div', { class: 'panel' }, el('h2', { text: 'معايير الانتقاء' }), el('ol', null, (site.criteria || []).map(function (t) { return el('li', { text: t }); })),
      el('p', { class: 'hint', text: 'هذه المعايير تعبّر عن رؤية صاحب الموقع، وقد يخالفه فيها غيره. من رأى خطأ في نص أو نسبة فليراسلنا.' })),
      el('div', { class: 'panel' }, el('h3', { text: 'الخصوصية' }), el('p', { text: 'لا حسابات ولا تتبّع ولا خادم. الخطوط تُحمَّل من Google Fonts. الموقع لا يجمع بياناتك.' }), el('p', { class: 'hint', text: 'صيغة كتبها مساعد ذكاء اصطناعي وليست استشارة قانونية.' })));
  }
  function notFound() { theme(null); return el('div', null, el('p', { text: 'لم أجد هذه الصفحة.' }), el('a', { class: 'btn', href: '#/', text: 'الرئيسية' })); }

  function go(h) { location.hash = h; }
  function render() {
    var p = location.hash.replace(/^#\/?/, '').split('/'), a = p[1] ? decodeURIComponent(p.slice(1).join('/')) : '', v;
    if (p[0] === 'r') v = roomPage(a); else if (p[0] === 'post') v = postPage(a); else if (p[0] === 'search') v = searchPage(a);
    else if (p[0] === 'ask') v = askPage(); else if (p[0] === 'standards') v = standardsPage(); else v = home();
    app.textContent = ''; app.appendChild(v);
    var ir = Q.safeUrl(site.irtikaz || '');
    app.appendChild(el('footer', null, el('div', { class: 'row', style: 'justify-content:center;gap:16px;margin-bottom:8px' }, el('a', { href: '#/', text: 'الرئيسية' }), el('a', { href: '#/standards', text: 'معايير الانتقاء' })),
      'أُنشئ بواسطة ', ir ? el('a', { href: ir, target: '_blank', rel: 'noopener', text: 'ارتكاز' }) : 'ارتكاز'));
  }
  window.addEventListener('hashchange', function () { catF = ''; window.scrollTo(0, 0); render(); });
  Promise.all([Q.load('rooms.json', { rooms: [] }), Q.load('posts.json', { posts: [] }), Q.load('site.json', site)]).then(function (r) {
    rooms = r[0].rooms || []; posts = r[1].posts || []; site = r[2] || site; render();
  });
})();
