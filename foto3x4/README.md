# foto3x4 — Processador de Imagens Client-Side

Aplicação web gratuita para remoção de fundo, redimensionamento e conversão de fotos 3x4.  
**100% client-side** — nenhuma imagem é enviada a servidores externos.

---

## 📁 Estrutura de Pastas

```
foto3x4/
├── index.html          # Estrutura da página
├── css/
│   └── style.css       # Estilos e design system
├── js/
│   └── app.js          # Lógica da aplicação
└── README.md
```

---

## 🚀 Como Rodar Localmente

### Opção 1 — VS Code + Live Server (recomendado)
1. Instale a extensão **Live Server** no VS Code
2. Abra a pasta `foto3x4/` no VS Code
3. Clique com botão direito em `index.html` → **Open with Live Server**

### Opção 2 — Python (sem instalar nada extra)
```bash
cd foto3x4
python3 -m http.server 8080
# Acesse: http://localhost:8080
```

### Opção 3 — Node.js (npx serve)
```bash
cd foto3x4
npx serve .
# Acesse: http://localhost:3000
```

> ⚠️ **Importante:** A aplicação **não funciona ao abrir o `index.html` diretamente** no navegador (`file://`)  
> por restrições de CORS do browser com módulos ES. Use sempre um servidor HTTP local.

---

## 🧠 Bibliotecas Utilizadas

### Remoção de Fundo
| Biblioteca | Tipo | Custo | Como funciona |
|---|---|---|---|
| **[@imgly/background-removal](https://github.com/imgly/background-removal-js)** ✅ usado | Open Source (Apache 2.0) | Gratuito | ONNX Runtime + U²-Net no browser |
| [remove.bg API](https://www.remove.bg/api) | SaaS | 50 img/mês grátis | API externa (envia imagem) |
| [Transformers.js](https://github.com/xenova/transformers.js) | Open Source | Gratuito | HuggingFace models no browser |

A biblioteca escolhida (`@imgly/background-removal`) roda **inteiramente no navegador** via WebAssembly + ONNX, sem enviar dados a nenhum servidor. O modelo U²-Net (~43 MB) é baixado do CDN do jsDelivr na primeira vez e armazenado em cache no IndexedDB.

### Outras Dependências
- **ONNX Runtime Web** — motor de inferência de IA para o browser
- Fontes: **DM Serif Display** + **DM Sans** (Google Fonts)

---

## ⚙️ Funcionalidades

| Feature | Status |
|---|---|
| Upload por clique ou drag & drop | ✅ |
| Validação de tipo (JPG/PNG/WEBP) e tamanho (máx 10 MB) | ✅ |
| Remoção de fundo com IA (U²-Net, ONNX) | ✅ |
| Toggle para ativar/desativar remoção de fundo | ✅ |
| Redimensionamento para 500×500 px (aspect ratio mantido) | ✅ |
| Fundo branco no redimensionamento | ✅ |
| Conversão para JPEG com qualidade ajustável | ✅ |
| Preview antes/depois | ✅ |
| Barra de progresso com etapas | ✅ |
| Download como `foto_3x4.jpg` | ✅ |
| Responsivo (mobile + desktop) | ✅ |
| Zero backend | ✅ |

---

## 🔧 Personalização

### Alterar tamanho de saída
Em `js/app.js`, linha:
```js
const OUTPUT_PX = 500; // altere para 413 (3x4 cm a 150 DPI), por exemplo
```

### Alterar qualidade padrão
No HTML, no `<input id="qualitySlider">`:
```html
value="92"  <!-- 60–100 -->
```

### Usar remove.bg em vez da IA local
Substitua a função `loadBgRemoval()` e chame:
```js
const formData = new FormData();
formData.append('image_file', imageBlob);
formData.append('size', 'auto');
const res = await fetch('https://api.remove.bg/v1.0/removebg', {
  method: 'POST',
  headers: { 'X-Api-Key': 'SUA_CHAVE_AQUI' },
  body: formData,
});
const blob = await res.blob();
```

---

## 📏 Tamanhos Reais de Foto 3x4

| Resolução | Pixels |
|---|---|
| 72 DPI (web) | 85 × 113 px |
| 150 DPI (impressão básica) | 177 × 236 px |
| 300 DPI (impressão profissional) | 354 × 472 px |
| **Este app (quadrado)** | **500 × 500 px** |

Para imprimir em tamanho exato, ajuste `OUTPUT_PX` e use aspect ratio 3:4 no canvas.

---

## 📄 Licença
MIT — use livremente para projetos pessoais ou comerciais.
