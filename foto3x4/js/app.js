/**
 * foto3x4 — Processador de imagens client-side
 * Remoção de fundo: MediaPipe SelfieSegmentation
 * Redimensionamento 500×500 · Conversão JPEG · Download
 */

/* ─────────────────────────────────────────
   1. Elementos DOM
───────────────────────────────────────── */
const uploadSection     = document.getElementById('uploadSection');
const uploadZone        = document.getElementById('uploadZone');
const fileInput         = document.getElementById('fileInput');
const selectBtn         = document.getElementById('selectBtn');
const uploadError       = document.getElementById('uploadError');

const processSection    = document.getElementById('processSection');
const previewOrig       = document.getElementById('previewOriginal');
const previewResult     = document.getElementById('previewResult');
const resultPH          = document.getElementById('resultPlaceholder');

const optRemoveBg       = document.getElementById('optRemoveBg');
const qualitySlider     = document.getElementById('qualitySlider');
const qualityValue      = document.getElementById('qualityValue');

const resetBtn          = document.getElementById('resetBtn');
const processBtn        = document.getElementById('processBtn');
const processBtnText    = document.getElementById('processBtnText');
const processBtnSpinner = document.getElementById('processBtnSpinner');
const downloadBtn       = document.getElementById('downloadBtn');

const progressWrap      = document.getElementById('progressWrap');
const progressFill      = document.getElementById('progressFill');
const progressText      = document.getElementById('progressText');

/* ─────────────────────────────────────────
   2. Estado global
───────────────────────────────────────── */
let originalFile  = null;
let resultDataURL = null;

const MAX_SIZE_MB = 10;
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const OUTPUT_PX   = 500;

/* ─────────────────────────────────────────
   3. IA de Segmentação (MediaPipe)
───────────────────────────────────────── */
let segmentationModel = null;
let segmentationPromiseResolve = null;

async function getSegmentationModel() {
  if (segmentationModel) return segmentationModel;

  if (typeof SelfieSegmentation === 'undefined') {
    throw new Error('A biblioteca MediaPipe não carregou. Verifique sua conexão e recarregue a página.');
  }

  setProgress(10, 'Baixando modelo de IA (pode demorar na 1ª vez)…');
  
  segmentationModel = new SelfieSegmentation({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
    }
  });

  segmentationModel.setOptions({
    modelSelection: 0, // 0 = General (máxima precisão para corpo/retrato)
  });

  segmentationModel.onResults((results) => {
    if (segmentationPromiseResolve) {
      segmentationPromiseResolve(results.segmentationMask);
      segmentationPromiseResolve = null;
    }
  });

  await segmentationModel.initialize();
  return segmentationModel;
}

// Pré-carregamento silencioso
setTimeout(() => {
  if (!segmentationModel && typeof SelfieSegmentation !== 'undefined') {
    getSegmentationModel().catch(() => {});
  }
}, 2000);

/* ─────────────────────────────────────────
   5. Eventos de upload
───────────────────────────────────────── */
selectBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});
uploadZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

/* ─────────────────────────────────────────
   6. Validação e exibição do arquivo
───────────────────────────────────────── */
function handleFile(file) {
  showUploadError('');

  if (!VALID_TYPES.includes(file.type)) {
    return showUploadError('Formato inválido. Use JPG, PNG ou WEBP.');
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return showUploadError(`Arquivo muito grande. Máximo: ${MAX_SIZE_MB} MB.`);
  }

  originalFile = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    previewOrig.src = e.target.result;
    previewResult.hidden = true;
    previewResult.src = '';
    resultPH.style.display = 'flex';
    resultDataURL = null;
    downloadBtn.hidden = true;
    resetProgress();
    uploadSection.hidden = true;
    processSection.hidden = false;
  };
  reader.readAsDataURL(file);
}

function showUploadError(msg) {
  uploadError.hidden = !msg;
  uploadError.textContent = msg;
}

/* ─────────────────────────────────────────
   7. Controles de UI
───────────────────────────────────────── */
qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = qualitySlider.value + '%';
});

resetBtn.addEventListener('click', () => {
  originalFile  = null;
  resultDataURL = null;
  fileInput.value = '';
  processSection.hidden = true;
  uploadSection.hidden  = false;
  showUploadError('');
  resetProgress();
});

downloadBtn.addEventListener('click', () => {
  if (!resultDataURL) return;
  const a = document.createElement('a');
  a.href     = resultDataURL;
  a.download = 'foto_3x4.jpg';
  a.click();
});

/* ─────────────────────────────────────────
   8. Pipeline de processamento
───────────────────────────────────────── */
processBtn.addEventListener('click', runPipeline);

async function runPipeline() {
  if (!originalFile) return;

  setProcessing(true);
  resetProgress();
  downloadBtn.hidden = true;

  try {
    const imgEl = await fileToImage(originalFile);
    let canvas;

    // ── Passo 1: Remoção de fundo ──
    if (optRemoveBg.checked) {
      setProgress(5, 'Carregando IA MediaPipe…');
      const net = await getSegmentationModel();

      setProgress(40, 'Segmentando pessoa com alta precisão…');
      
      const maskImage = await new Promise(async (resolve) => {
        segmentationPromiseResolve = resolve;
        await net.send({ image: imgEl });
      });

      setProgress(60, 'Aplicando máscara de recorte perfeito…');
      canvas = applyMask(imgEl, maskImage);

    } else {
      canvas = imageToCanvas(imgEl);
      setProgress(60, 'Remoção de fundo ignorada.');
    }

    // ── Passo 2: Redimensionamento 500×500 ───
    setProgress(78, 'Redimensionando para 500×500 px…');
    const resizedCanvas = resizeCanvas(canvas, OUTPUT_PX, OUTPUT_PX);

    // ── Passo 3: Conversão JPEG ───────────────
    setProgress(92, 'Convertendo para JPEG…');
    const quality = parseInt(qualitySlider.value) / 100;
    resultDataURL = resizedCanvas.toDataURL('image/jpeg', quality);

    // ── Passo 4: Exibir resultado ─────────────
    setProgress(100, 'Pronto!');
    previewResult.src      = resultDataURL;
    previewResult.hidden   = false;
    resultPH.style.display = 'none';
    downloadBtn.hidden     = false;

  } catch (err) {
    console.error(err);
    setProgressError(err.message || 'Ocorreu um erro durante o processamento.');
  } finally {
    setProcessing(false);
  }
}

/* ─────────────────────────────────────────
   9. Funções de processamento de imagem
───────────────────────────────────────── */

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem.')); };
    img.src = url;
  });
}

function imageToCanvas(img) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth  || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

/**
 * Aplica máscara usando a composição nativa do canvas (globalCompositeOperation).
 * O modelo do MediaPipe retorna uma máscara onde a pessoa é visível e o fundo é transparente.
 */
function applyMask(img, maskImage) {
  const w = img.naturalWidth  || img.width;
  const h = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Suaviza a renderização
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Desenha a máscara recebida pelo MediaPipe
  ctx.drawImage(maskImage, 0, 0, w, h);

  // 2. Coloca a imagem original por cima. 
  // 'source-in' faz com que a imagem só seja desenhada onde a máscara não é transparente.
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(img, 0, 0, w, h);

  // Restaura o modo de desenho
  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}

function resizeCanvas(srcCanvas, w, h) {
  const out = document.createElement('canvas');
  out.width  = w;
  out.height = h;
  const ctx  = out.getContext('2d');

  // Fundo branco (necessário para JPEG sem transparência)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const scale = Math.min(w / srcCanvas.width, h / srcCanvas.height);
  const nw    = Math.round(srcCanvas.width  * scale);
  const nh    = Math.round(srcCanvas.height * scale);
  const ox    = Math.round((w - nw) / 2);
  const oy    = Math.round((h - nh) / 2);

  ctx.drawImage(srcCanvas, ox, oy, nw, nh);
  return out;
}

/* ─────────────────────────────────────────
   10. Helpers de estado / UI
───────────────────────────────────────── */
function setProcessing(active) {
  processBtn.disabled        = active;
  processBtnText.textContent = active ? 'Processando…' : 'Processar imagem';
  processBtnSpinner.hidden   = !active;
}

function setProgress(pct, msg) {
  progressWrap.hidden           = false;
  progressFill.style.width      = pct + '%';
  progressFill.style.background = 'var(--accent-gradient)';
  progressText.style.color      = '#fff';
  if (msg) progressText.textContent = msg;

  if (pct === 100) {
    progressText.textContent      = '✓ ' + msg;
    progressFill.style.background = 'var(--success)';
    setTimeout(() => { progressWrap.hidden = true; }, 2500);
  }
}

function setProgressError(msg) {
  progressWrap.hidden           = false;
  progressFill.style.width      = '100%';
  progressFill.style.background = 'var(--error)';
  progressText.style.color      = 'var(--error)';
  progressText.textContent      = '✗ ' + msg;
}

function resetProgress() {
  progressFill.style.width      = '0%';
  progressFill.style.background = 'var(--accent-gradient)';
  progressText.style.color      = 'var(--text-muted)';
  progressText.textContent      = '';
  progressWrap.hidden           = true;
}
