// --------- Yardımcılar
const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function formatNow() {
  const d = new Date();
  return d.toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' });
}

function showToast(msg, timeout=2200){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  window.setTimeout(()=> el.classList.remove('show'), timeout);
}

// --------- Kalıcı kullanım süresi
const USAGE_KEY = 'AYIK_USAGE_TEXT_V1';
function getOrCreateUsageText() {
  const saved = localStorage.getItem(USAGE_KEY);
  if (saved) return saved;

  // ilk kez üret — SONRA HEP BUNU KULLAN
  const pick = Math.random() < 0.5 ? 'short' : 'long';
  let text;
  if (pick === 'short') {
    const days = Math.floor(Math.random()*180) + 1; // 1-180 gün
    const hours = Math.floor(Math.random()*24);
    text = `${days} gün ${hours} saat`;
  } else {
    const years = Math.floor(Math.random()*2);
    const months = Math.floor(Math.random()*12);
    const days = Math.floor(Math.random()*30);
    const parts = [];
    if (years) parts.push(`${years} yıl`);
    if (months) parts.push(`${months} ay`);
    parts.push(`${days} gün`);
    text = parts.join(' ');
  }
  localStorage.setItem(USAGE_KEY, text);
  return text;
}

// --------- Global durum
let hasEPC = false;

// --------- Modal (kullanım süresi)
function openWelcomeModal(){
  const textFromField = $('#kullanimSuresi').textContent.trim();
  $('#welcomeText').textContent = `Bant ${textFromField} süredir çalışıyor.`;
  $('#welcomeModal').classList.add('show');
}
$('#closeModal').addEventListener('click', ()=> $('#welcomeModal').classList.remove('show'));

// --------- Başlangıç
function initHeader(){
  // Zaman etiketi
  $('#readTime').textContent = formatNow();

  // Sabit kullanım süresi
  const usageText = getOrCreateUsageText();
  $('#kullanimSuresi').textContent = usageText;

  // Kaplama defaultları (güvence)
  const ust = $('#ustKaplama'); if (ust) ust.textContent = '4 mm';
  const alt = $('#altKaplama'); if (alt) alt.textContent = '3 mm';
}
initHeader();
openWelcomeModal();

// --------- EPC & Durum
$('#btnBindEPC').addEventListener('click', ()=>{
  hasEPC = !hasEPC;
  $('#epc').textContent = hasEPC ? '3008 33B2 009A 0011 7C9F 0042' : '—';
  $('#epc').classList.toggle('muted', !hasEPC);
  showToast(hasEPC ? 'EPC başarıyla eşleştirildi.' : 'EPC kaldırıldı.');
});

const statuses = ['Taslak','Onaylı','Kullanımda','Çıktı'];
$('#btnChangeStatus').addEventListener('click', ()=>{
  const cur = $('#durum').textContent.trim();
  const idx = (statuses.indexOf(cur) + 1) % statuses.length;
  const next = statuses[idx];
  $('#durum').textContent = next;
  const badge = $('#statusBadge');
  badge.textContent = next;
  const map = {
    'Taslak': ['#e8f2fb','#d6e7f7','#1E73BE'],
    'Onaylı': ['#e8fbf0','#c8f1d7','#16a34a'],
    'Kullanımda': ['#fff7ed','#fde7c7','#f59e0b'],
    'Çıktı': ['#f1f5f9','#e2e8f0','#64748b']
  };
  const c = map[next];
  badge.style.background = c[0];
  badge.style.borderColor = c[1];
  badge.style.color = c[2];
  showToast(`Durum: ${next}`);
});

// --------- Notlar
// Varsayılan tek not (metin sabit)
const notes = [
  {ts:'2025-08-01 09:00', user:'A. Yılmaz', text:'Ek bölgesinde kontrol yapıldı, sorun yok.'}
];

function renderNotes(){
  const ul = $('#notesList');
  ul.innerHTML = '';
  notes.forEach((n, i)=>{
    const li = document.createElement('li');
    li.className = 'note';
    li.innerHTML = `
      <div class="note-head">
        <span class="note-meta">${n.ts} • ${n.user}</span>
        <button class="btn small ghost" data-i="${i}" aria-label="Notu sil">Sil</button>
      </div>
      <p class="note-text">${n.text}</p>
    `;
    ul.appendChild(li);
  });
  // Sil
  $$('#notesList .note .btn').forEach(b=>{
    b.addEventListener('click', (e)=>{
      const i = +e.currentTarget.dataset.i;
      notes.splice(i,1);
      renderNotes();
      showToast('Not silindi');
    }, {passive:true});
  });
}
renderNotes();

// --- Not Ekle modalı kontrolü (tek hamle)
const noteModal = $('#noteModal');
const noteName  = $('#noteName');
const noteText  = $('#noteText');
const noteCancel= $('#noteCancel');
const noteSave  = $('#noteSave');

$('#btnAddNote').addEventListener('click', ()=>{
  noteName.value = '';
  noteText.value = '';
  noteModal.classList.add('show');
  window.setTimeout(()=> noteName.focus(), 50);
});

noteSave.addEventListener('click', ()=>{
  const user = noteName.value.trim();
  const text = noteText.value.trim();
  if(!user || !text){
    showToast('Lütfen ad soyad ve notu doldurun');
    return;
  }
  const now = new Date();
  const ts = now.toLocaleString('tr-TR', { dateStyle:'short', timeStyle:'short' });
  notes.unshift({ts, user, text});
  renderNotes();
  noteModal.classList.remove('show');
  showToast('Not eklendi');
});

noteCancel.addEventListener('click', ()=> noteModal.classList.remove('show'));
noteModal.addEventListener('click', (e)=>{
  if(e.target === noteModal) noteModal.classList.remove('show');
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && noteModal.classList.contains('show')){
    noteModal.classList.remove('show');
  }
}, {passive:true});

// --------- Fotoğraflar
const photoInput = $('#photoInput');
const photoGrid = $('#photoGrid');

// Opsiyonel örnek foto alanı
const samplePhotos = [];

function addPhotoFromURL(url){
  const d = document.createElement('div');
  d.className = 'photo';
  d.innerHTML = `<img alt="Fotoğraf" src="${url}"><button class="del" title="Kaldır" aria-label="Fotoğrafı kaldır">×</button>`;
  d.querySelector('.del').addEventListener('click', ()=>{ d.remove(); showToast('Fotoğraf kaldırıldı'); });
  photoGrid.prepend(d);
}
function addPhotoPreview(file){
  const url = URL.createObjectURL(file);
  addPhotoFromURL(url);
}
(function preloadSamplePhotos(){
  samplePhotos.forEach(addPhotoFromURL);
})();

photoInput.addEventListener('change', (e)=>{
  const files = [...e.target.files];
  files.forEach(addPhotoPreview);
  photoInput.value = '';
  if(files.length) showToast(`${files.length} fotoğraf eklendi`);
});

// --------- Vulkanizasyon eğrisi (responsive canvas)
/* Canvas artık container genişliğine göre çizilecek.
   - CSS width:100% (styles.css) 
   - JS: gerçek piksel boyutlarını DPR ile ayarlıyoruz. */
const canvas = $('#curveChart');
const ctx = canvas.getContext('2d');
let curveData = [];

function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  // Minimum yükseklik, orantı koruma
  const cssWidth = Math.max(280, rect.width || 320);
  const cssHeight = Math.max(160, Math.round(cssWidth * 0.5));

  canvas.width  = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);

  // Görsel boyutu (CSS) — retina keskinliği için scale
  canvas.style.width  = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawChart();
}

function drawChart(){
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const pad = {l:48, r:16, t:16, b:36};

  // Temizle
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,W,H);

  // Eksenler
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, H-pad.b);
  ctx.lineTo(W-pad.r, H-pad.b);
  ctx.stroke();

  if(curveData.length === 0){
    ctx.fillStyle = '#6b7280';
    ctx.font = '13px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('Veri hazırlanıyor…', pad.l+8, (H/2));
    return;
  }

  const tMin = 0;
  const tMax = Math.max(...curveData.map(d=>d.t));
  const TMin = Math.min(...curveData.map(d=>d.T));
  const TMax = Math.max(...curveData.map(d=>d.T));
  const x = t => pad.l + ((W - pad.l - pad.r) * (t - tMin) / (tMax - tMin || 1));
  const y = T => (H - pad.b) - ((H - pad.t - pad.b) * (T - TMin) / (TMax - TMin || 1));

  // Grid & etiketler
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  const xTicks = 6, yTicks = 5;
  for(let i=0;i<=xTicks;i++){
    const tt = tMin + (i*(tMax-tMin)/xTicks);
    const xx = x(tt);
    ctx.strokeStyle = '#eef2f7';
    ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, H-pad.b); ctx.stroke();
    ctx.fillText(`${Math.round(tt)} dk`, xx, H-pad.b+18);
  }
  ctx.textAlign = 'right';
  for(let i=0;i<=yTicks;i++){
    const TT = TMin + (i*(TMax-TMin)/yTicks);
    const yy = y(TT);
    ctx.strokeStyle = '#eef2f7';
    ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W-pad.r, yy); ctx.stroke();
    ctx.fillText(`${Math.round(TT)}°C`, pad.l-6, yy+4);
  }

  // Çizgi
  ctx.strokeStyle = '#1E73BE';
  ctx.lineWidth = 2;
  ctx.beginPath();
  curveData.forEach((d,i)=>{
    const xx = x(d.t), yy = y(d.T);
    if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
  });
  ctx.stroke();

  // Dolgu
  const grad = ctx.createLinearGradient(0, pad.t, 0, H-pad.b);
  grad.addColorStop(0,'rgba(30,115,190,.18)');
  grad.addColorStop(1,'rgba(30,115,190,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  curveData.forEach((d,i)=>{
    const xx = x(d.t), yy = y(d.T);
    if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
  });
  ctx.lineTo(x(curveData[curveData.length-1].t), H-pad.b);
  ctx.lineTo(x(curveData[0].t), H-pad.b);
  ctx.closePath();
  ctx.fill();

  // Başlık
  ctx.fillStyle = '#000';
  ctx.font = '12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Vulkanizasyon Eğrisi (Sıcaklık °C / Zaman dk)', pad.l, pad.t+10);
}

// Örnek veri
(function buildSampleCurve(){
  const pts = [];
  for(let t=0;t<=60;t+=2){
    let T;
    if(t<=10) T = 25 + t*10;               // 25 → 125 (ısınma)
    else if(t<=40) T = 125 + Math.sin((t-10)/30 * Math.PI)*5; // plato dalgası
    else T = 125 - (t-40)*4;               // soğuma
    pts.push({t, T});
  }
  curveData = pts;
  resizeCanvas();
})();

// Resize (debounce)
let _rsz;
window.addEventListener('resize', ()=>{
  window.clearTimeout(_rsz);
  _rsz = window.setTimeout(resizeCanvas, 120);
}, {passive:true});

// --------- Yeni okuma simülasyonu
$('#simulateRead').addEventListener('click', ()=>{
  // "Kullanım Süresi" sabit kalacak (yenilemeyi simüle etmiyoruz)
  $('#readTime').textContent = formatNow();
  openWelcomeModal();
  showToast('Yeni RFID okuması alındı');
});
