# English Quest 🚀 — agente tutor de inglés para chicos

Proyecto de la materia "Creación de agentes de IA". Un juego web chico
(single page, backend en Flask) para que mi hijo de 8-10 años practique
vocabulario de inglés, con un agente que decide qué preguntarle y con qué
dificultad según cómo va jugando.

## Qué hace el agente y por qué

El agente sigue el loop clásico **percibir → decidir → actuar**, separado en
capas bien distintas dentro de `app.py`:

1. **Percibir**: cada respuesta del chico (correcta/incorrecta, qué palabra,
   qué tema) actualiza un estado de sesión: nivel actual, racha de aciertos,
   racha de errores, palabras ya vistas y un contador de "palabras débiles"
   (las que más erró).
2. **Decidir** (`decidir_politica`): una política simple pero explícita —
   3 aciertos seguidos suben de nivel, 2 errores seguidos bajan de nivel y
   fuerzan que la próxima pregunta repase la palabra más débil en vez de
   presentar vocabulario nuevo. Esto es lo que hace que el juego se sienta
   "adaptativo" y no una lista fija de preguntas.
3. **Actuar** (`generar_pregunta`): un generador de contenido arma la
   próxima pregunta siguiendo la decisión del paso anterior. Tiene **dos
   motores intercambiables**:
   - `generar_pregunta_claude`: le pide a la API de Claude (modelo
     `claude-3-5-haiku`) que genere la pregunta en JSON, pasándole el nivel,
     si toca repasar, las palabras débiles y las ya vistas.
   - `generar_pregunta_local`: arma la misma pregunta combinando un banco de
     vocabulario propio (animales, colores, comida, números, familia,
     escuela, clima, emociones) con plantillas de oración simples.

   El motor se elige solo según si hay una `ANTHROPIC_API_KEY` configurada.
   Si Claude falla por lo que sea (sin key, sin internet, error al parsear
   el JSON, rate limit), el agente cae automáticamente al motor local — el
   juego nunca se rompe por un problema de la API externa.

La separación importa: la **decisión** (qué enseñar y por qué) es
independiente de la **generación de contenido** (quién redacta la
pregunta). Es la misma idea que separar política de herramienta en un
agente más complejo: la política no cambia si mañana reemplazo Claude por
otro modelo, o si un día no tengo conexión a internet.

## Cómo se construyó (proceso real, con Claude como agente)

Esto es exactamente cómo fue la iteración, sin maquillar:

1. Le pedí ideas a Claude para un proyecto de "una tarde". Me tiró tres
   opciones ligadas a mi trabajo (auditoría de manifests de Kubernetes,
   FinOps sobre Terraform, generador de runbooks), pero elegí construir algo
   distinto: un juego para que mi hijo practique inglés — uno de los
   ejemplos válidos de la consigna ("el juego para estudiar").
2. Claude preguntó edad y nivel del chico (8-10 años, ya sabe algo) y si
   quería un juego con contenido fijo o con IA generando preguntas en vivo.
   Elegí la opción con IA real, para que el proyecto usara de verdad una
   API de modelo de lenguaje y no fuera solo un quiz estático.
3. Intenté sacar una API key de Anthropic desde la consola, pero mi cuenta
   es la empresarial de BYMA y no me dejó generarla ahí. Le conté esto a
   Claude.
4. En vez de bloquear el proyecto por eso, Claude propuso una arquitectura
   con **dos motores intercambiables** (Claude / banco local), para que el
   juego funcione igual sin key y quede listo para usar la API real apenas
   consiga una key personal. Esto terminó siendo una mejora real de diseño
   (resiliencia ante fallas de un servicio externo), no un parche.
5. Para subir el repo a GitHub, generé un token personal y se lo pasé a
   Claude para que lo subiera él. Probó tres caminos distintos: `gh auth
   login` con el token, crear el repo por la API REST de GitHub, y por
   último un `git push` directo ya con el repo vacío creado a mano. Los tres
   fallaron con el mismo motivo de fondo: el entorno donde corre Claude
   tiene un proxy de git/GitHub que solo deja pasar operaciones sobre repos
   "autorizados de antemano para la sesión" (pensado para otra integración,
   Claude Code + GitHub Actions), y bloquea cualquier repo nuevo aunque el
   token sea válido — el mensaje del proxy fue literal: *"access denied by
   the git proxy: ... is not in this session's authorized repository set"*.
   Terminamos resolviendo esto subiendo el proyecto manualmente por la
   interfaz web de GitHub (crear repo vacío + arrastrar los archivos), en
   vez de la subida automática que había pedido originalmente.
6. Antes de entregar, Claude corrió pruebas locales: levantó el server
   Flask, probó `/api/start` y `/api/answer` por HTTP, y corrió un script
   chico que verifica en aislamiento la política de nivel (sube con 3
   aciertos, baja y prioriza repaso con 2 errores) y el generador local
   (siempre devuelve 3 opciones válidas y prioriza la palabra más débil
   cuando corresponde).
7. Insistí varias veces en que Claude subiera el repo automáticamente por
   otros medios (un token nuevo, controlar mi navegador Chrome). Cada
   intento chocó con un límite distinto y verificable (mismo proxy de
   GitHub, y la herramienta de control de Chrome resultó ser para Mac, no
   para mi Windows). Terminé instalando GitHub Desktop y publicando el
   repo yo mismo con mi sesión ya logueada — la parte de "un solo click por
   entrega futura" sí quedó resuelta para la próxima vez.
8. Al correr el proyecto en mi notebook de trabajo, `pip install` falló
   porque mi entorno corporativo redirige todo el tráfico a un proxy/mirror
   interno (`pfcajavip.cajval...`) que no estaba disponible en ese momento.
   Se resolvió con `--proxy ""` para ese comando puntual, sin tocar ninguna
   configuración persistente de la notebook (a propósito: preferí no tocar
   nada de red en un equipo corporativo).
9. Le pedí a Claude dos mejoras más: un aviso visual al subir de nivel, y
   conectar la IA real. Lo primero se agregó y se probó con un test
   automático (fuerza una racha de aciertos y verifica que el flag
   `level_up` se dispare en el nivel correcto). Lo segundo quedó
   definitivamente pendiente: probé sacar una key personal de Anthropic
   además de la empresarial, y tampoco pude — dos intentos, dos bloqueos
   distintos, cero keys disponibles al momento de entregar.

## Cómo correrlo

```bash
pip install -r requirements.txt
cp .env.example .env
# opcional: completar ANTHROPIC_API_KEY en .env si ya tenés una key personal
python3 app.py
```

Abrir `http://localhost:5000` en el navegador. Sin key configurada, el
juego funciona igual en modo local (se ve un badge "Modo local" en vez de
"IA en vivo").

## Qué falta / reflexión

- **No pude probar el motor de Claude con una key real** — lo intenté por
  dos vías y las dos quedaron bloqueadas: mi cuenta de Anthropic es la
  empresarial de BYMA y no permite generar keys personales desde la
  consola, e intentar resolverlo con una cuenta personal tampoco funcionó.
  El código del motor `generar_pregunta_claude` está escrito y probado en
  su lógica de parseo (prompt, parseo del JSON, validación de campos,
  fallback automático si algo falla), pero la llamada real a la API en
  producción queda pendiente de validar el día que consiga una key. El
  juego que se entrega funciona en modo local, con la política de nivel y
  repaso 100% probada (ver sección de pruebas más abajo).
- **La subida a GitHub no fue automática como planeaba** — asumí que un
  agente con acceso a shell podía simplemente crear y pushear un repo con
  un token mío, y no es así: el entorno donde corre el agente tiene la red
  restringida por diseño (una medida de seguridad razonable, no un bug). Es
  algo que no tenía en la cabeza antes de este proyecto: que "el agente
  tiene una terminal" no implica "el agente tiene salida de red abierta a
  cualquier servicio".
- **El feedback del agente es local (frases fijas), no generado por IA** —
  decidí no usar una llamada a Claude para el feedback de cada respuesta,
  para no duplicar llamadas a la API por cada interacción (costo/latencia)
  cuando el valor agregado de IA ahí es bajo. La generación de contenido
  "creativo" (la pregunta en sí) es donde más aporta un modelo de lenguaje.
- **No hay persistencia entre sesiones** — el progreso vive en la cookie de
  sesión del navegador. Si mi hijo juega desde otro dispositivo o borra
  cookies, arranca de cero. Para un uso real más allá de esta tarea,
  agregaría una base de datos chica (SQLite alcanza) para guardar el
  progreso por usuario.
- **Aprendizaje principal**: separar "decidir" de "actuar" en el diseño del
  agente resultó mucho más valioso de lo que esperaba — no fue solo prolijo,
  fue lo que me permitió seguir construyendo (y probando) el proyecto
  incluso cuando la pieza de IA externa no estaba disponible.

## Entrega

Construido íntegramente con Claude como agente (yo no escribí código,
solo describí lo que quería e iteré sobre lo que Claude proponía, según la
consigna de la materia).
