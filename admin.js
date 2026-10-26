(function () {
  'use strict';
  var Q = window.Iq, el = Q.el, say = Q.say, S = Q.store('intiqaa:v1:');
  var app = document.getElementById('app');
  var W = S.get('admin', null), tab = 'posts', editP = null, editR = null, dirty = S.get('dirty', {});
  function save(k) { S.set('admin', W); if (k) { dirty[k] = 1; S.set('dirty', dirty); } }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function download(name, obj) { var a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })), download: name }); document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); }
  function field(label, node, hint) { return el('div', null, el('label', { text: label }), node, hint ? el('p', { class: 'hint', text: hint }) : null); }
  function sel(opts, v) { var s = el('select', null, opts.map(function (o) { return el('option', { value: o[0], text: o[1] }); })); s.value = v; return s; }
  function room(id) { return W.rooms.filter(function (r) { return r.id === id; })[0]; }
  function slug(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9ء-ي]+/g, '-').replace(/^-|-$/g, '') || Q.uid('r'); }
  function tabs() { return el('nav', { class: 'row', style: 'margin:14px 0' }, [['posts', 'النصوص'], ['rooms', 'الأماكن'], ['site', 'الموقع']].map(function (t) { return el('button', { class: 'btn' + (tab === t[0] ? ' primary' : ''), type: 'button', text: t[1], onclick: function () { tab = t[0]; build(); } }); })); }
  function exportBar(file, key, obj) {
    return el('div', { class: 'panel' }, el('p', { class: 'hint', text: 'بعد التعديل نزّل الملف وارفعه في المستودع بالاسم نفسه (بلا (1)).' }), dirty[key] ? el('p', { class: 'err', text: 'فيه تعديلات لم تُنزَّل.' }) : null,
      el('button', { class: 'btn primary', type: 'button', text: 'تنزيل ' + file, onclick: function () { download(file, obj()); delete dirty[key]; S.set('dirty', dirty); build(); } }));
  }

  function postsTab() {
    var x = editP || { id: '', room: (W.rooms[0] || {}).id, title: '', body: '', author: '', book: '', link: '', cat: '', img: '', date: today(), hidden: false };
    var isNew = !editP, f = {}, err = el('p', { class: 'err' });
    f.room = sel(W.rooms.map(function (r) { return [r.id, (r.emoji || '') + ' ' + r.name]; }), x.room);
    f.cat = el('select');
    function fillCats() { var r = room(f.room.value); f.cat.textContent = ''; f.cat.appendChild(el('option', { value: '', text: '—' })); ((r && r.cats) || []).forEach(function (c) { f.cat.appendChild(el('option', { value: c.id, text: c.name })); }); f.cat.value = x.cat || ''; f.catw.style.display = ((r && r.cats) || []).length ? '' : 'none'; hint(); }
    f.title = el('input', { type: 'text', value: x.title }); f.author = el('input', { type: 'text', value: x.author }); f.book = el('input', { type: 'text', value: x.book });
    f.link = el('input', { type: 'text', dir: 'ltr', value: x.link, placeholder: 'https://…' }); f.img = el('input', { type: 'text', dir: 'ltr', value: x.img, placeholder: 'img/اسم.jpg' });
    f.date = el('input', { type: 'date', value: x.date }); f.body = el('textarea'); f.body.value = x.body; f.hidden = sel([['0', 'ظاهر'], ['1', 'مخفي']], x.hidden ? '1' : '0');
    var hintEl = el('p', { class: 'hint' }); function hint() { var r = room(f.room.value); hintEl.textContent = r && r.type === 'image' ? 'في هذا المكان الصورة مطلوبة، والنص (اختياري) يكون تعليقك تحتها.' : r && r.type === 'verse' ? 'اكتب كل شطر في سطر، وفراغ بين المقطوعات.' : 'الاسم والمؤلف مطلوبان لضمان النسبة.'; }
    f.catw = field('نوع المشكلة', f.cat); f.room.addEventListener('change', fillCats);
    var box = el('section', { class: 'panel' }, el('h2', { text: isNew ? 'إضافة نص' : 'تعديل نص' }), field('المكان', f.room), hintEl, field('العنوان (اختياري)', f.title), f.catw,
      field('النص', f.body), field('الصورة (لاقتصاص)', f.img, 'ارفع الصورة في مجلد img بالمستودع واكتب مسارها. تأكد أن لك حقاً في عرض الصفحة (كتاب قديم أو مقتطف قصير مع النسبة).'), field('المؤلف/القائل', f.author), field('الكتاب', f.book), field('رابط المصدر (اختياري)', f.link), field('التاريخ', f.date), field('الظهور', f.hidden), err,
      el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { class: 'btn primary', type: 'button', text: isNew ? 'إضافة' : 'حفظ', onclick: function () {
        var r = room(f.room.value), img = f.img.value.trim(), body = f.body.value.replace(/\s+$/, '');
        if (r.type === 'image') { if (!img) { err.textContent = 'اقتصاص يحتاج صورة.'; return; } } else if (!body.trim()) { err.textContent = 'اكتب النص.'; return; }
        if (img && !Q.safeUrl(img)) { err.textContent = 'مسار الصورة غير صحيح.'; return; }
        if (f.link.value.trim() && !Q.safeUrl(f.link.value)) { err.textContent = 'الرابط غير صحيح.'; return; }
        if (r.type !== 'image' && !f.author.value.trim() && !f.book.value.trim()) { err.textContent = 'اكتب المؤلف أو الكتاب (النسبة مطلوبة).'; return; }
        var o = { id: isNew ? Q.uid('t') : x.id, room: r.id, title: f.title.value.trim(), body: body, author: f.author.value.trim(), book: f.book.value.trim(), link: f.link.value.trim(), cat: f.cat.value, img: img, date: f.date.value || today(), hidden: f.hidden.value === '1' };
        if (isNew) W.posts.push(o); else W.posts[W.posts.indexOf(x)] = o;
        save('posts'); editP = null; build(); say('تم.');
      } }), isNew ? null : el('button', { class: 'btn', type: 'button', text: 'إلغاء', onclick: function () { editP = null; build(); } })));
    setTimeout(fillCats, 0);
    var list = el('section', { class: 'panel' }, el('h2', { text: 'النصوص (' + W.posts.length + ')' }));
    if (!W.posts.length) list.appendChild(el('p', { class: 'hint', text: 'لا نصوص بعد.' }));
    W.posts.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).forEach(function (p) {
      var r = room(p.room) || {};
      list.appendChild(el('div', { class: 'line' }, el('div', { style: 'flex:1' }, el('b', { text: p.title || (p.body || '').slice(0, 40) || 'قصاصة' }), el('div', { class: 'hint', text: (r.name || '') + ' · ' + (p.date || '') + (p.hidden ? ' · مخفي' : '') })),
        el('button', { class: 'btn', type: 'button', text: 'تعديل', onclick: function () { editP = p; build(); window.scrollTo(0, 0); } }),
        el('button', { class: 'btn danger', type: 'button', text: 'حذف', onclick: function () { if (!confirm('حذف النص؟')) return; W.posts = W.posts.filter(function (k) { return k !== p; }); save('posts'); build(); } })));
    });
    return el('div', null, box, list, exportBar('posts.json', 'posts', function () { return { version: 1, posts: W.posts }; }));
  }

  function roomsTab() {
    var x = editR || { id: '', name: '', tagline: '', desc: '', emoji: '📖', color: '#555555', type: 'text', status: 'soon', order: W.rooms.length + 1, cats: [] };
    var isNew = !editR, f = {}, err = el('p', { class: 'err' });
    f.name = el('input', { type: 'text', value: x.name }); f.tag = el('input', { type: 'text', value: x.tagline }); f.desc = el('textarea', { style: 'min-height:80px;font-family:inherit;font-size:1rem' }); f.desc.value = x.desc;
    f.emoji = el('input', { type: 'text', value: x.emoji, style: 'max-width:100px' }); f.color = el('input', { type: 'text', dir: 'ltr', value: x.color });
    f.type = sel([['text', 'نص'], ['verse', 'شعر/نثر مقطّع'], ['image', 'صور']], x.type); f.status = sel([['open', 'مفتوح'], ['soon', 'قريباً']], x.status); f.order = el('input', { type: 'number', value: x.order, style: 'max-width:100px' });
    f.cats = el('input', { type: 'text', value: (x.cats || []).map(function (c) { return c.name; }).join('، ') });
    var box = el('section', { class: 'panel' }, el('h2', { text: isNew ? 'إضافة مكان (فكرة فرعية)' : 'تعديل: ' + x.name }), field('الاسم', f.name), field('العنوان الفرعي', f.tag), field('الوصف', f.desc), field('الرمز', f.emoji), field('اللون (hex)', f.color, 'اللون يغيّر شريط العنوان عند دخول المكان.'),
      field('النوع', f.type), field('الحالة', f.status), field('الترتيب', f.order), field('تصنيفات داخلية (مفصولة بفاصلة، اختياري)', f.cats), err,
      el('div', { class: 'row', style: 'margin-top:12px' }, el('button', { class: 'btn primary', type: 'button', text: isNew ? 'إضافة' : 'حفظ', onclick: function () {
        if (!f.name.value.trim()) { err.textContent = 'اكتب الاسم.'; return; }
        var c = f.color.value.trim(); if (!/^#[0-9a-f]{3,8}$/i.test(c)) { err.textContent = 'اللون hex مثل #2f6f5e.'; return; }
        var old = x.cats || [], cats = f.cats.value.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean).map(function (n) { var m = old.filter(function (o) { return o.name === n; })[0]; return m || { id: slug(n), name: n }; });
        var o = { id: isNew ? slug(f.name.value) : x.id, name: f.name.value.trim(), tagline: f.tag.value.trim(), desc: f.desc.value.trim(), emoji: f.emoji.value.trim(), color: c, type: f.type.value, status: f.status.value, order: Number(f.order.value) || 0, cats: cats };
        if (isNew && room(o.id)) o.id = Q.uid('r');
        if (isNew) W.rooms.push(o); else W.rooms[W.rooms.indexOf(x)] = o;
        save('rooms'); editR = null; build(); say('تم.');
      } }), isNew ? null : el('button', { class: 'btn', type: 'button', text: 'إلغاء', onclick: function () { editR = null; build(); } })));
    var list = el('section', { class: 'panel' }, el('h2', { text: 'الأماكن (' + W.rooms.length + ')' }));
    W.rooms.forEach(function (r) {
      list.appendChild(el('div', { class: 'line' }, el('div', { style: 'flex:1' }, el('b', { text: (r.emoji || '') + ' ' + r.name }), el('div', { class: 'hint', text: (r.status === 'open' ? 'مفتوح' : 'قريباً') + ' · ' + W.posts.filter(function (p) { return p.room === r.id; }).length + ' نص' })),
        el('button', { class: 'btn', type: 'button', text: 'تعديل', onclick: function () { editR = r; build(); window.scrollTo(0, 0); } }),
        el('button', { class: 'btn danger', type: 'button', text: 'حذف', onclick: function () {
          var n = W.posts.filter(function (p) { return p.room === r.id; }).length; if (n) { say('لا يمكن الحذف: فيه ' + n + ' نص. انقلها أو احذفها أولاً.', true); return; }
          if (!confirm('حذف المكان؟')) return; W.rooms = W.rooms.filter(function (k) { return k !== r; }); save('rooms'); build();
        } })));
    });
    return el('div', null, box, list, exportBar('rooms.json', 'rooms', function () { return { version: 1, rooms: W.rooms }; }));
  }

  function siteTab() {
    var T = W.site, f = {}, err = el('p', { class: 'err' });
    f.about = el('textarea', { style: 'min-height:90px;font-family:inherit;font-size:1rem' }); f.about.value = T.about || '';
    f.crit = el('textarea', { style: 'min-height:160px;font-family:inherit;font-size:1rem' }); f.crit.value = (T.criteria || []).join('\n');
    f.dis = el('textarea', { style: 'min-height:90px;font-family:inherit;font-size:1rem' }); f.dis.value = T.disclaimer || '';
    f.ask = sel([['0', 'مغلق'], ['1', 'مفتوح']], T.askOpen ? '1' : '0'); f.note = el('input', { type: 'text', value: T.askNote || '' });
    f.em = el('input', { type: 'text', dir: 'ltr', value: (T.contact || {}).email || '' }); f.tg = el('input', { type: 'text', dir: 'ltr', value: (T.contact || {}).telegram || '' });
    return el('div', null, el('section', { class: 'panel' }, el('h2', { text: 'إعدادات الموقع' }), field('تعريف انتقاء', f.about), field('معايير الانتقاء (سطر لكل بند)', f.crit, 'اكتب المعايير بوصف المحتوى لا بتعميم على أشخاص أو فئات، لتكون أوضح وأعدل.'),
      field('تنبيه ترياق', f.dis, 'يظهر في ترياق وتحت كل نص فيه. أنصح بإبقاء جملة طلب المساعدة المختصة.'), field('باب الأسئلة', f.ask), field('نص باب الأسئلة', f.note), field('البريد', f.em), field('تيليجرام', f.tg), err,
      el('button', { class: 'btn primary', type: 'button', style: 'margin-top:12px', text: 'حفظ', onclick: function () {
        if (f.tg.value.trim() && !Q.safeUrl(f.tg.value)) { err.textContent = 'رابط تيليجرام غير صحيح.'; return; }
        T.about = f.about.value.trim(); T.criteria = f.crit.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); T.disclaimer = f.dis.value.trim();
        T.askOpen = f.ask.value === '1'; T.askNote = f.note.value.trim(); T.contact = { email: f.em.value.trim(), telegram: f.tg.value.trim() };
        save('site'); build(); say('تم.');
      } })), exportBar('site.json', 'site', function () { return W.site; }));
  }

  function build() {
    app.textContent = ''; app.appendChild(tabs()); app.appendChild(tab === 'posts' ? postsTab() : tab === 'rooms' ? roomsTab() : siteTab());
    app.appendChild(el('section', { class: 'panel' }, el('p', { class: 'hint', text: 'المسودة في متصفحك فقط.' }), el('button', { class: 'btn danger', type: 'button', text: 'استبدال المسودة بالمنشور', onclick: function () { if (!confirm('ستُمحى مسودتك. متأكد؟')) return; W = null; S.del('admin'); S.set('dirty', {}); dirty = {}; seed(); } })));
  }
  function seed() { Promise.all([Q.load('rooms.json', { rooms: [] }), Q.load('posts.json', { posts: [] }), Q.load('site.json', {})]).then(function (r) { W = { rooms: r[0].rooms || [], posts: r[1].posts || [], site: r[2] || {} }; S.set('admin', W); build(); }); }
  if (W && W.rooms) build(); else seed();
})();
