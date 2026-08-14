"""
Agente tutor de ingles para chicos - backend Flask.

Idea central (logica agentica):
  1. PERCIBIR:  el estado del alumno (nivel, racha de aciertos/errores, palabras
     que ya vio, palabras en las que le cuesta mas -> "weak_topics").
  2. DECIDIR:   una politica simple ajusta el nivel de dificultad y decide si
     toca repasar algo debil o avanzar con contenido nuevo (funcion
     `decidir_politica`).
  3. ACTUAR:    un generador de contenido arma la proxima pregunta y el feedback.
     Ese generador tiene dos "motores" intercambiables:
       - ClaudeGenerator: le pide a la API de Claude que genere la pregunta,
         siguiendo la politica decidida en el paso anterior.
       - LocalGenerator: arma la pregunta combinando un banco de vocabulario
         con plantillas, sin depender de ninguna API externa.
     El motor se elige solo, segun si hay una ANTHROPIC_API_KEY configurada.
     Si Claude falla por cualquier motivo (sin key, sin internet, error de
     parseo, rate limit), el agente cae al motor local en forma automatica,
     para que el juego nunca se rompa por un problema de la API.

El estado del juego vive en la sesion de Flask (cookie), no en una base de
datos: alcanza para un uso domestico de un solo chico jugando en su propio
navegador, y evita tener que levantar infraestructura para un proyecto de
"una tarde".
"""

import os
import json
import random

from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET", "dev-secret-cambiar-en-produccion")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
USE_CLAUDE = bool(ANTHROPIC_API_KEY)

_claude_client = None
if USE_CLAUDE:
    try:
        import anthropic
        _claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    except Exception as exc:  # falta el paquete, key invalida al construir, etc.
        app.logger.warning("No se pudo inicializar el cliente de Claude: %s", exc)
        USE_CLAUDE = False


# ---------------------------------------------------------------------------
# Banco de vocabulario local (siempre disponible, es el respaldo del agente)
# ---------------------------------------------------------------------------
# Cada tupla es (ingles, espanol, emoji). Nivel 8-10 anios, ya conoce algo.
VOCAB = {
    "animales": [
        ("dog", "perro", "🐶"), ("cat", "gato", "🐱"), ("bird", "pajaro", "🐦"),
        ("fish", "pez", "🐟"), ("horse", "caballo", "🐴"), ("rabbit", "conejo", "🐰"),
        ("elephant", "elefante", "🐘"), ("lion", "leon", "🦁"),
    ],
    "colores": [
        ("red", "rojo", "🔴"), ("blue", "azul", "🔵"), ("green", "verde", "🟢"),
        ("yellow", "amarillo", "🟡"), ("purple", "violeta", "🟣"), ("orange", "naranja", "🟠"),
        ("black", "negro", "⚫"), ("white", "blanco", "⚪"),
    ],
    "comida": [
        ("apple", "manzana", "🍎"), ("bread", "pan", "🍞"), ("milk", "leche", "🥛"),
        ("banana", "banana", "🍌"), ("pizza", "pizza", "🍕"), ("cheese", "queso", "🧀"),
        ("egg", "huevo", "🥚"), ("water", "agua", "💧"),
    ],
    "numeros": [
        ("one", "uno", "1️⃣"), ("two", "dos", "2️⃣"), ("three", "tres", "3️⃣"),
        ("four", "cuatro", "4️⃣"), ("five", "cinco", "5️⃣"), ("six", "seis", "6️⃣"),
        ("seven", "siete", "7️⃣"), ("eight", "ocho", "8️⃣"),
    ],
    "familia": [
        ("mother", "madre", "👩"), ("father", "padre", "👨"), ("sister", "hermana", "👧"),
        ("brother", "hermano", "👦"), ("grandmother", "abuela", "👵"), ("grandfather", "abuelo", "👴"),
    ],
    "escuela": [
        ("book", "libro", "📖"), ("pencil", "lapiz", "✏️"), ("chair", "silla", "🪑"),
        ("table", "mesa", "🪟"), ("backpack", "mochila", "🎒"), ("teacher", "maestro/a", "🧑‍🏫"),
    ],
    "clima": [
        ("sun", "sol", "☀️"), ("rain", "lluvia", "🌧️"), ("wind", "viento", "💨"),
        ("snow", "nieve", "❄️"), ("cloud", "nube", "☁️"),
    ],
    "emociones": [
        ("happy", "feliz", "😄"), ("sad", "triste", "😢"), ("tired", "cansado", "😴"),
        ("angry", "enojado", "😠"), ("scared", "asustado", "😨"),
    ],
}

# Plantillas de oracion simple para niveles altos (3 en adelante).
PLANTILLAS = [
    "The {img} is {word}.",
    "I have a {word} {img}.",
    "Look at the {word} {img}!",
    "My favorite is the {word} {img}.",
]

NIVEL_MAX = 5
FEEDBACK_OK = [
    "Muy bien! Great job! 🎉",
    "Correcto! You are learning fast! ⭐",
    "Excelente! Perfect answer! 🥳",
    "Genial! You got it! 🚀",
]
FEEDBACK_MAL = [
    "Casi! Let's try again. 💪",
    "No era esa, pero vas bien. Keep going! 🙂",
    "Todavia no, pero cada error te acerca. Try again! 🌟",
]


def estado_inicial():
    return {
        "nivel": 1,
        "racha_ok": 0,
        "racha_mal": 0,
        "score": 0,
        "vistas": [],       # palabras en ingles ya preguntadas (evita repetir)
        "debiles": {},      # palabra -> cantidad de veces que la erro
        "pregunta_actual": None,  # se guarda server-side para validar la respuesta
    }


def decidir_politica(estado):
    """El 'cerebro' del agente: ajusta nivel y decide si toca repasar.

    Reglas simples pero explicitas (facil de auditar y explicar):
      - 3 aciertos seguidos -> sube de nivel (hasta el maximo) y resetea racha.
      - 2 errores seguidos  -> baja de nivel (hasta 1) y prioriza repasar
        una palabra debil en vez de presentar vocabulario nuevo.
    """
    priorizar_repaso = False
    if estado["racha_ok"] >= 3:
        estado["nivel"] = min(NIVEL_MAX, estado["nivel"] + 1)
        estado["racha_ok"] = 0
    if estado["racha_mal"] >= 2:
        estado["nivel"] = max(1, estado["nivel"] - 1)
        estado["racha_mal"] = 0
        priorizar_repaso = True
    return estado["nivel"], priorizar_repaso


def _elegir_palabra(nivel, priorizar_repaso, debiles, vistas):
    categoria = random.choice(list(VOCAB.keys()))
    candidatos = VOCAB[categoria]

    if priorizar_repaso and debiles:
        palabra_debil = max(debiles, key=debiles.get)
        for cat, items in VOCAB.items():
            for item in items:
                if item[0] == palabra_debil:
                    return cat, item

    no_vistas = [w for w in candidatos if w[0] not in vistas]
    return categoria, random.choice(no_vistas or candidatos)


def generar_pregunta_local(nivel, priorizar_repaso, debiles, vistas):
    categoria, (ingles, espanol, emoji) = _elegir_palabra(nivel, priorizar_repaso, debiles, vistas)

    # Distractores: 2 palabras mas de la misma categoria (o de otra si no alcanza).
    pool = [w for w in VOCAB[categoria] if w[0] != ingles]
    if len(pool) < 2:
        otras = [w for cat in VOCAB.values() for w in cat if w[0] != ingles]
        pool = otras
    distractores = random.sample(pool, 2)

    if nivel <= 2:
        prompt_txt = f"{emoji}  ¿Como se dice '{espanol}' en ingles?"
        opciones = [ingles, distractores[0][0], distractores[1][0]]
    else:
        plantilla = random.choice(PLANTILLAS)
        prompt_txt = "Completa: " + plantilla.replace("{word}", "___").replace("{img}", espanol)
        opciones = [ingles, distractores[0][0], distractores[1][0]]

    random.shuffle(opciones)
    correcto_idx = opciones.index(ingles)

    return {
        "topic": categoria,
        "prompt": prompt_txt,
        "options": opciones,
        "correct_index": correcto_idx,
        "emoji": emoji,
        "palabra_en": ingles,
        "fuente": "local",
    }


def generar_pregunta_claude(nivel, priorizar_repaso, debiles, vistas):
    system = (
        "Sos un agente tutor de ingles para un chico de 8 a 10 anios que ya conoce "
        "algo de vocabulario basico. Generá UNA pregunta de opcion multiple para "
        "practicar ingles, adaptada al nivel indicado.\n"
        "Reglas:\n"
        "- Nivel 1-2: vocabulario simple (una palabra suelta), 3 opciones.\n"
        "- Nivel 3-4: oracion corta con un espacio en blanco, 3 opciones.\n"
        "- Nivel 5: mini pregunta en ingles con 3 opciones de respuesta.\n"
        "- Si 'priorizar_repaso' es true, reforza alguna palabra de 'debiles'.\n"
        "- No repitas palabras de 'vistas' si podes evitarlo.\n"
        "- Usa temas variados: animales, colores, comida, numeros, familia, "
        "escuela, clima, emociones.\n"
        "- Tono calido, simple y alentador, apropiado para un nino.\n"
        "Devolve SOLO un JSON valido, sin texto adicional ni markdown, con esta forma:\n"
        '{"topic": "...", "prompt": "...", "options": ["...", "...", "..."], '
        '"correct_index": 0, "emoji": "...", "palabra_en": "..."}'
    )
    user = json.dumps({
        "nivel": nivel,
        "priorizar_repaso": priorizar_repaso,
        "debiles": debiles,
        "vistas": vistas[-15:],
    }, ensure_ascii=False)

    resp = _claude_client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=300,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    texto = resp.content[0].text.strip()
    if texto.startswith("```"):
        texto = texto.strip("`").split("\n", 1)[-1]
    data = json.loads(texto)

    requeridas = {"topic", "prompt", "options", "correct_index", "emoji", "palabra_en"}
    if not requeridas.issubset(data.keys()):
        raise ValueError("Respuesta de Claude incompleta")
    if len(data["options"]) != 3:
        raise ValueError("Claude no devolvio 3 opciones")

    data["fuente"] = "claude"
    return data


def generar_pregunta(nivel, priorizar_repaso, debiles, vistas):
    if USE_CLAUDE:
        try:
            return generar_pregunta_claude(nivel, priorizar_repaso, debiles, vistas)
        except Exception as exc:
            app.logger.warning("Fallo Claude, uso banco local: %s", exc)
    return generar_pregunta_local(nivel, priorizar_repaso, debiles, vistas)


@app.route("/")
def index():
    return render_template("index.html", usando_ia=USE_CLAUDE)


@app.route("/api/start", methods=["POST"])
def api_start():
    estado = estado_inicial()
    nivel, priorizar_repaso = decidir_politica(estado)
    pregunta = generar_pregunta(nivel, priorizar_repaso, estado["debiles"], estado["vistas"])
    estado["pregunta_actual"] = pregunta
    session["estado"] = estado
    return jsonify(_vista_publica(estado))


@app.route("/api/answer", methods=["POST"])
def api_answer():
    estado = session.get("estado")
    if not estado or not estado.get("pregunta_actual"):
        return jsonify({"error": "no hay partida activa, llama a /api/start"}), 400

    elegido = request.json.get("chosen_index")
    pregunta = estado["pregunta_actual"]
    correcto = (elegido == pregunta["correct_index"])
    palabra = pregunta.get("palabra_en", "")

    if correcto:
        estado["score"] += 10 * estado["nivel"]
        estado["racha_ok"] += 1
        estado["racha_mal"] = 0
    else:
        estado["racha_mal"] += 1
        estado["racha_ok"] = 0
        estado["debiles"][palabra] = estado["debiles"].get(palabra, 0) + 1

    if palabra and palabra not in estado["vistas"]:
        estado["vistas"].append(palabra)

    nivel_anterior = estado["nivel"]
    nivel, priorizar_repaso = decidir_politica(estado)
    subio_nivel = nivel > nivel_anterior
    bajo_nivel = nivel < nivel_anterior

    siguiente = generar_pregunta(nivel, priorizar_repaso, estado["debiles"], estado["vistas"])
    estado["pregunta_actual"] = siguiente
    session["estado"] = estado

    feedback = random.choice(FEEDBACK_OK if correcto else FEEDBACK_MAL)
    respuesta_correcta_texto = pregunta["options"][pregunta["correct_index"]]

    return jsonify({
        "correct": correcto,
        "correct_text": respuesta_correcta_texto,
        "feedback": feedback,
        "level_up": subio_nivel,
        "level_down": bajo_nivel,
        **_vista_publica(estado),
    })


def _vista_publica(estado):
    """Lo que se manda al frontend: nunca incluye correct_index de la pregunta actual."""
    p = estado["pregunta_actual"]
    return {
        "level": estado["nivel"],
        "score": estado["score"],
        "question": {
            "topic": p["topic"],
            "prompt": p["prompt"],
            "options": p["options"],
            "emoji": p["emoji"],
            "fuente": p["fuente"],
        },
    }


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
