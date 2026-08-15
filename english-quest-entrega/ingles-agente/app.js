/**
 * Idiomas Quest - agente tutor de idiomas para chicos (PWA, sin backend).
 *
 * Loop del agente, igual idea que el proyecto anterior (English Quest) pero
 * corriendo 100% en el celular, sin servidor ni API externa:
 *
 *   1. PERCIBIR: cada respuesta actualiza el estado guardado en localStorage
 *      (nivel, rachas, y por cada palabra: en que "caja" de repaso esta -
 *      sistema Leitner - y cuantas veces la erro).
 *   2. DECIDIR (decidirPolitica): sube/baja de nivel segun rachas, y decide
 *      si toca forzar el repaso de la palabra mas debil.
 *   3. ACTUAR (elegirPalabra + generarPregunta): elige la proxima palabra con
 *      una seleccion aleatoria PESADA por caja Leitner (las palabras que mas
 *      cuestan aparecen mas seguido) y arma la pregunta segun el nivel.
 *
 * Todo el estado vive en localStorage del telefono: el progreso no se pierde
 * al cerrar la app (a diferencia de la version anterior, que dependia de una
 * cookie de sesion de un servidor).
 */

const LANG_LABEL = { en: "ingles", it: "italiano" };
const LANG_FLAG = { en: "🇬🇧", it: "🇮🇹" };
const LANG_BCP47 = { en: "en-US", it: "it-IT" };
const NIVEL_MAX = 5;
const CAJA_PESO = { 1: 12, 2: 7, 3: 4, 4: 2, 5: 1 };

// Pool plano de vocabulario con su categoria, armado una sola vez.
const POOL = Object.entries(VOCAB).flatMap(([categoria, palabras]) =>
  palabras.map((p) => ({ ...p, categoria }))
);

let lang = null;
let estado = null;
let preguntaActual = null;

// ---------------------------------------------------------------------------
// Estado persistente (localStorage por idioma)
// ---------------------------------------------------------------------------
function storageKey(idioma) {
  return `idiomasQuest_v1_${idioma}`;
}

function estadoInicial() {
  return { nivel: 1, score: 0, streakOk: 0, streakBad: 0, palabras: {} };
}

function cargarEstado(idioma) {
  const raw = localStorage.getItem(storageKey(idioma));
  if (!raw) return estadoInicial();
  try {
    return { ...estadoInicial(), ...JSON.parse(raw) };
  } catch {
    return estadoInicial();
  }
}

function guardarEstado() {
  localStorage.setItem(storageKey(lang), JSON.stringify(estado));
}

// ---------------------------------------------------------------------------
// 2. DECIDIR: politica de nivel y repaso
// ---------------------------------------------------------------------------
function decidirPolitica() {
  let priorizarRepaso = false;
  const nivelAnterior = estado.nivel;

  if (estado.streakOk >= 3) {
    estado.nivel = Math.min(NIVEL_MAX, estado.nivel + 1);
    estado.streakOk = 0;
  }
  if (estado.streakBad >= 2) {
    estado.nivel = Math.max(1, estado.nivel - 1);
    estado.streakBad = 0;
    priorizarRepaso = true;
  }

  return {
    priorizarRepaso,
    subioNivel: estado.nivel > nivelAnterior,
    bajoNivel: estado.nivel < nivelAnterior,
  };
}

// ---------------------------------------------------------------------------
// 3. ACTUAR: elegir palabra + armar pregunta
// ---------------------------------------------------------------------------
function elegirPalabra(priorizarRepaso) {
  if (priorizarRepaso) {
    const debiles = Object.entries(estado.palabras).filter(([, d]) => d.wrong > 0);
    if (debiles.length) {
      debiles.sort((a, b) => b[1].wrong - a[1].wrong || a[1].box - b[1].box);
      const [id] = debiles[0];
      const encontrada = POOL.find((w) => w.en === id);
      if (encontrada) return encontrada;
    }
  }

  const pesos = POOL.map((w) => {
    const d = estado.palabras[w.en];
    const caja = d ? d.box : 1;
    return { w, peso: CAJA_PESO[caja] ?? 1 };
  });
  const total = pesos.reduce((s, x) => s + x.peso, 0);
  let r = Math.random() * total;
  for (const { w, peso } of pesos) {
    r -= peso;
    if (r <= 0) return w;
  }
  return pesos[pesos.length - 1].w;
}

function generarPregunta(priorizarRepaso) {
  const palabra = elegirPalabra(priorizarRepaso);
  const pool = POOL.filter((w) => w.categoria === palabra.categoria && w.en !== palabra.en);
  const fuente = pool.length >= 2 ? pool : POOL.filter((w) => w.en !== palabra.en);
  const distractores = muestrear(fuente, 2);

  let prompt;
  if (estado.nivel <= 2) {
    prompt = `${palabra.emoji}  ¿Cómo se dice "${palabra.es}" en ${LANG_LABEL[lang]}?`;
  } else {
    const plantillas = PLANTILLAS[lang];
    const plantilla = plantillas[Math.floor(Math.random() * plantillas.length)];
    prompt = "Completa: " + plantilla.replace("{emoji}", palabra.emoji);
  }

  const opciones = mezclar([palabra[lang], distractores[0][lang], distractores[1][lang]]);

  return { palabra, prompt, opciones, respuesta: palabra[lang] };
}

function muestrear(arr, n) {
  const copia = [...arr];
  const salida = [];
  for (let i = 0; i < n && copia.length; i++) {
    const idx = Math.floor(Math.random() * copia.length);
    salida.push(copia.splice(idx, 1)[0]);
  }
  return salida;
}

function mezclar(arr) {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ---------------------------------------------------------------------------
// 1. PERCIBIR: registrar la respuesta del chico
// ---------------------------------------------------------------------------
function registrarRespuesta(correcto) {
  const id = preguntaActual.palabra.en;
  if (!estado.palabras[id]) estado.palabras[id] = { box: 1, wrong: 0 };
  const d = estado.palabras[id];

  if (correcto) {
    estado.score += 10 * estado.nivel;
    estado.streakOk += 1;
    estado.streakBad = 0;
    d.box = Math.min(5, d.box + 1);
  } else {
    estado.streakBad += 1;
    estado.streakOk = 0;
    d.wrong += 1;
    d.box = 1;
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const pantallaInicio = document.getElementById("pantallaInicio");
const pantallaJuego = document.getElementById("pantallaJuego");
const progresoInicio = document.getElementById("progresoInicio");
const btnJugarEn = document.getElementById("btnJugarEn");
const btnJugarIt = document.getElementById("btnJugarIt");
const btnReiniciar = document.getElementById("btnReiniciar");
const btnVolver = document.getElementById("btnVolver");
const btnSonido = document.getElementById("btnSonido");

const elNivel = document.getElementById("nivel");
const elScore = document.getElementById("score");
const elNivelBadge = document.getElementById("nivelBadge");
const elEmoji = document.getElementById("emoji");
const elPrompt = document.getElementById("prompt");
const elOpciones = document.getElementById("opciones");
const elFeedback = document.getElementById("feedback");
const elMascotaTexto = document.getElementById("mascotaTexto");
const elLevelUpToast = document.getElementById("levelUpToast");
const elLevelDownToast = document.getElementById("levelDownToast");

let bloqueado = false;

function mostrarInicio() {
  pantallaJuego.classList.remove("activa");
  pantallaInicio.classList.add("activa");
  const en = cargarEstado("en");
  const it = cargarEstado("it");
  progresoInicio.innerHTML = `
    <div class="progreso-item">🇬🇧 English &mdash; Nivel ${en.nivel} · ${en.score} pts</div>
    <div class="progreso-item">🇮🇹 Italiano &mdash; Nivel ${it.nivel} · ${it.score} pts</div>
  `;
}

function empezarJuego(idioma) {
  lang = idioma;
  estado = cargarEstado(lang);
  pantallaInicio.classList.remove("activa");
  pantallaJuego.classList.add("activa");
  siguientePregunta();
}

function siguientePregunta() {
  const { priorizarRepaso } = decidirPolitica();
  guardarEstado();
  preguntaActual = generarPregunta(priorizarRepaso);
  pintarPregunta();
}

function pintarPregunta() {
  elNivel.textContent = estado.nivel;
  elScore.textContent = estado.score;
  elEmoji.textContent = preguntaActual.palabra.emoji;
  elPrompt.textContent = preguntaActual.prompt;
  elFeedback.textContent = "";
  elMascotaTexto.textContent = LANG_FLAG[lang] + " " + "¡Vamos que podés!";

  elOpciones.innerHTML = "";
  preguntaActual.opciones.forEach((opcion) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opcion;
    btn.onclick = () => elegirOpcion(opcion, btn);
    elOpciones.appendChild(btn);
  });

  bloqueado = false;
}

function elegirOpcion(opcion, btnElegido) {
  if (bloqueado) return;
  bloqueado = true;

  const correcto = opcion === preguntaActual.respuesta;
  registrarRespuesta(correcto);

  document.querySelectorAll(".option-btn").forEach((b) => {
    if (b.textContent === preguntaActual.respuesta) b.classList.add("correct");
    else if (b === btnElegido) b.classList.add("incorrect");
  });

  const frases = correcto ? FEEDBACK_OK[lang] : FEEDBACK_MAL[lang];
  const frase = frases[Math.floor(Math.random() * frases.length)];
  elFeedback.textContent = correcto ? frase : `${frase} (era: "${preguntaActual.respuesta}")`;
  elMascotaTexto.textContent = frase;

  hablar(preguntaActual.respuesta);

  const nivelAntesDeGuardar = estado.nivel;
  guardarEstado();

  setTimeout(() => {
    const { priorizarRepaso, subioNivel, bajoNivel } = decidirPolitica();
    guardarEstado();
    mostrarAvisoNivel(subioNivel, bajoNivel);
    preguntaActual = generarPregunta(priorizarRepaso);
    pintarPregunta();
  }, 1600);
}

function mostrarAvisoNivel(subio, bajo) {
  if (!subio && !bajo) return;
  const toast = subio ? elLevelUpToast : elLevelDownToast;
  toast.classList.add("show");
  elNivelBadge.classList.add("nivel-pulso");
  setTimeout(() => {
    toast.classList.remove("show");
    elNivelBadge.classList.remove("nivel-pulso");
  }, 1500);
}

let sonidoActivo = true;
function hablar(texto) {
  if (!sonidoActivo || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = LANG_BCP47[lang];
  u.rate = 0.9;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

btnSonido.onclick = () => {
  sonidoActivo = !sonidoActivo;
  btnSonido.textContent = sonidoActivo ? "🔊" : "🔇";
  if (!sonidoActivo) speechSynthesis.cancel();
};

btnJugarEn.onclick = () => empezarJuego("en");
btnJugarIt.onclick = () => empezarJuego("it");
btnVolver.onclick = mostrarInicio;
btnReiniciar.onclick = () => {
  if (confirm("¿Borrar todo el progreso guardado (inglés e italiano)?")) {
    localStorage.removeItem(storageKey("en"));
    localStorage.removeItem(storageKey("it"));
    mostrarInicio();
  }
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

mostrarInicio();
