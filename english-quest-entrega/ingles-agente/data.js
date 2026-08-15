// Banco de vocabulario. Cada palabra: { es, en, it, emoji }.
// Estas son las categorias/temas que el agente usa para armar preguntas.
const VOCAB = {
  animales: [
    { es: "perro", en: "dog", it: "cane", emoji: "🐶" },
    { es: "gato", en: "cat", it: "gatto", emoji: "🐱" },
    { es: "pajaro", en: "bird", it: "uccello", emoji: "🐦" },
    { es: "pez", en: "fish", it: "pesce", emoji: "🐟" },
    { es: "caballo", en: "horse", it: "cavallo", emoji: "🐴" },
    { es: "conejo", en: "rabbit", it: "coniglio", emoji: "🐰" },
    { es: "elefante", en: "elephant", it: "elefante", emoji: "🐘" },
    { es: "leon", en: "lion", it: "leone", emoji: "🦁" },
  ],
  colores: [
    { es: "rojo", en: "red", it: "rosso", emoji: "🔴" },
    { es: "azul", en: "blue", it: "blu", emoji: "🔵" },
    { es: "verde", en: "green", it: "verde", emoji: "🟢" },
    { es: "amarillo", en: "yellow", it: "giallo", emoji: "🟡" },
    { es: "violeta", en: "purple", it: "viola", emoji: "🟣" },
    { es: "naranja", en: "orange", it: "arancione", emoji: "🟠" },
    { es: "negro", en: "black", it: "nero", emoji: "⚫" },
    { es: "blanco", en: "white", it: "bianco", emoji: "⚪" },
  ],
  comida: [
    { es: "manzana", en: "apple", it: "mela", emoji: "🍎" },
    { es: "pan", en: "bread", it: "pane", emoji: "🍞" },
    { es: "leche", en: "milk", it: "latte", emoji: "🥛" },
    { es: "banana", en: "banana", it: "banana", emoji: "🍌" },
    { es: "pizza", en: "pizza", it: "pizza", emoji: "🍕" },
    { es: "queso", en: "cheese", it: "formaggio", emoji: "🧀" },
    { es: "huevo", en: "egg", it: "uovo", emoji: "🥚" },
    { es: "agua", en: "water", it: "acqua", emoji: "💧" },
  ],
  numeros: [
    { es: "uno", en: "one", it: "uno", emoji: "1️⃣" },
    { es: "dos", en: "two", it: "due", emoji: "2️⃣" },
    { es: "tres", en: "three", it: "tre", emoji: "3️⃣" },
    { es: "cuatro", en: "four", it: "quattro", emoji: "4️⃣" },
    { es: "cinco", en: "five", it: "cinque", emoji: "5️⃣" },
    { es: "seis", en: "six", it: "sei", emoji: "6️⃣" },
    { es: "siete", en: "seven", it: "sette", emoji: "7️⃣" },
    { es: "ocho", en: "eight", it: "otto", emoji: "8️⃣" },
  ],
  familia: [
    { es: "madre", en: "mother", it: "madre", emoji: "👩" },
    { es: "padre", en: "father", it: "padre", emoji: "👨" },
    { es: "hermana", en: "sister", it: "sorella", emoji: "👧" },
    { es: "hermano", en: "brother", it: "fratello", emoji: "👦" },
    { es: "abuela", en: "grandmother", it: "nonna", emoji: "👵" },
    { es: "abuelo", en: "grandfather", it: "nonno", emoji: "👴" },
  ],
  escuela: [
    { es: "libro", en: "book", it: "libro", emoji: "📖" },
    { es: "lapiz", en: "pencil", it: "matita", emoji: "✏️" },
    { es: "silla", en: "chair", it: "sedia", emoji: "🪑" },
    { es: "mesa", en: "table", it: "tavolo", emoji: "🪟" },
    { es: "mochila", en: "backpack", it: "zaino", emoji: "🎒" },
    { es: "maestro/a", en: "teacher", it: "maestro", emoji: "🧑‍🏫" },
  ],
  clima: [
    { es: "sol", en: "sun", it: "sole", emoji: "☀️" },
    { es: "lluvia", en: "rain", it: "pioggia", emoji: "🌧️" },
    { es: "viento", en: "wind", it: "vento", emoji: "💨" },
    { es: "nieve", en: "snow", it: "neve", emoji: "❄️" },
    { es: "nube", en: "cloud", it: "nuvola", emoji: "☁️" },
  ],
  emociones: [
    { es: "feliz", en: "happy", it: "felice", emoji: "😄" },
    { es: "triste", en: "sad", it: "triste", emoji: "😢" },
    { es: "cansado", en: "tired", it: "stanco", emoji: "😴" },
    { es: "enojado", en: "angry", it: "arrabbiato", emoji: "😠" },
    { es: "asustado", en: "scared", it: "spaventato", emoji: "😨" },
  ],
};

// Plantillas de oracion simple, para nivel 3 en adelante.
const PLANTILLAS = {
  en: [
    "The {emoji} is a ___.",
    "I have a ___ {emoji}.",
    "Look at the ___ {emoji}!",
    "My favorite is the ___ {emoji}.",
  ],
  it: [
    "Il {emoji} e' un ___.",
    "Ho un/una ___ {emoji}.",
    "Guarda il ___ {emoji}!",
    "Il mio preferito e' il ___ {emoji}.",
  ],
};

const FEEDBACK_OK = {
  en: ["Muy bien! Great job! 🎉", "Correcto! You're learning fast! ⭐", "Excelente! Perfect answer! 🥳", "Genial! You got it! 🚀"],
  it: ["Muy bien! Bravissimo! 🎉", "Correcto! Stai imparando veloce! ⭐", "Excelente! Risposta perfetta! 🥳", "Genial! Ce l'hai fatta! 🚀"],
};
const FEEDBACK_MAL = {
  en: ["Casi! Let's try again. 💪", "Todavia no, pero vas bien. Keep going! 🙂", "Cada error te acerca. Try again! 🌟"],
  it: ["Quasi! Riproviamo. 💪", "Ancora no, ma vai bene. Continua! 🙂", "Ogni errore ti avvicina. Riprova! 🌟"],
};
