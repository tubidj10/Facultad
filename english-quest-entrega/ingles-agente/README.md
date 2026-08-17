# Idiomas Quest 🦉 — agente tutor de idiomas para chicos (PWA para Android)

Proyecto de la materia "Creación de agentes de IA". Juego para que mi hijo
de 9 años practique vocabulario de **inglés e italiano** desde su celular
Android, con un agente que decide qué preguntarle y con qué dificultad
según cómo va jugando.

Esta es la **segunda entrega** de este proyecto. La primera versión (un
tutor de inglés solamente, con backend Flask + API de Claude) vive en el
historial de este mismo repositorio — commits `version1` y `entrega` —
y en esta entrega la reemplacé por esta versión nueva, en la misma
carpeta. Cambié dos cosas a propósito, explicadas abajo: el idioma (ahora
el nene elige entre inglés e italiano) y la plataforma (ahora es una app
que se instala en el teléfono del chico, sin depender de una computadora
con un servidor corriendo).

## Por qué una PWA y no una app "nativa" ni el backend anterior

El requisito nuevo era "algo que ande en el celular Android de mi hijo".
Evalué tres caminos:

- **Repetir el backend Flask** (como la versión anterior): funciona, pero
  el celular del nene tendría que apuntar a un servidor corriendo en algún
  lado (mi notebook, o un hosting) — no es viable para que juegue solo,
  offline, cuando quiera.
- **App nativa Android / Flutter**: requiere compilar un `.apk`, firmarlo e
  instalarlo, con un entorno de desarrollo (Android Studio o Flutter SDK)
  que no tenía disponible para esta entrega.
- **PWA (Progressive Web App)**: una página web que Chrome en Android deja
  "Agregar a la pantalla de inicio" como si fuera una app instalada (ícono
  propio, pantalla completa, sin barra del navegador), funciona sin
  conexión gracias a un *service worker*, y no necesita compilar nada.

Elegí la PWA: es la opción que de verdad iba a terminar instalada y
funcionando en el teléfono del chico dentro del tiempo de la entrega.

## Por qué lógica adaptativa simple y no un LLM esta vez

La versión anterior sí usaba la API de Claude para generar preguntas.
Para esta app decidí **no** llamar a ningún modelo de lenguaje en tiempo
real, por tres motivos concretos:

1. **Privacidad de un menor**: no quería que las respuestas de mi hijo
   viajaran a un servicio externo.
2. **Debe andar sin conexión**: un celular de un chico de 9 años no
   siempre tiene wifi (viaje, patio, sin datos). Una PWA 100% local
   funciona siempre; una que dependa de una API se rompe sin internet.
3. **El agente no necesita "creatividad" para esta tarea**: el valor del
   agente acá no está en redactar texto nuevo, está en **decidir qué
   palabra mostrar y cuándo subir la dificultad** — eso se resuelve bien
   con una política simple y auditable, sin necesidad de un modelo de
   lenguaje.

Esto no descarta la IA generativa: quedó documentado como trabajo futuro
(ver más abajo) enchufar un motor tipo el de la versión anterior para que
el propio agente redacte oraciones nuevas.

## Diseño del agente (PEAS)

| | |
|---|---|
| **Performance measure** (qué se busca) | Que el chico practique palabras nuevas sin frustrarse: mantenerlo en una dificultad donde acierta la mayoría de las veces, pero sigue viendo vocabulario nuevo. |
| **Environment** (entorno) | El chico y sus respuestas (correcta/incorrecta) a cada pregunta que el agente le presenta. |
| **Actuators** (cómo actúa) | Elige la próxima palabra, arma la pregunta y las opciones, sube/baja el nivel, muestra el emoji y feedback de la mascota, y pronuncia la palabra en voz alta (`SpeechSynthesis`). |
| **Sensors** (qué percibe) | Si la respuesta fue correcta o no, qué palabra era, y el historial guardado por palabra (cuántas veces se erró, en qué "caja" de repaso está). |

Es un **agente basado en utilidad con una política de aprendizaje simple**
(no usa una red neuronal ni RL de verdad, pero sí ajusta su comportamiento
futuro en base a la experiencia acumulada del jugador — es la parte
"aprende" del agente).

### El loop percibir → decidir → actuar (en `app.js`)

1. **Percibir** (`registrarRespuesta`): por cada respuesta actualiza el
   estado guardado: nivel, racha de aciertos/errores, y por cada palabra
   su **caja Leitner** (1 a 5: sube un escalón si la acertó, vuelve a la
   caja 1 si la erró) y un contador de errores.
2. **Decidir** (`decidirPolitica`): política explícita e igual de simple
   que la de la versión anterior — 3 aciertos seguidos suben de nivel
   (hasta el nivel 5), 2 errores seguidos bajan de nivel y fuerzan que la
   próxima pregunta sea de repaso de la palabra más débil en vez de
   presentar contenido nuevo.
3. **Actuar** (`elegirPalabra` + `generarPregunta`): a diferencia de la
   versión anterior (que sorteaba la categoría al azar entre las no
   vistas), acá agregué un **sorteo pesado por caja Leitner**: las
   palabras en caja 1 (recién falladas, o nunca vistas) tienen mucho más
   chance de aparecer que las de caja 5 (ya dominadas), en vez de un
   sorteo parejo. Esto es una mejora real sobre la versión anterior: hace
   que el repaso espaciado sea automático y gradual, no solo un "si erraste
   2 veces seguidas, repasá ya".

El estado (nivel, puntaje, y la caja/errores de cada palabra) se guarda en
`localStorage`, separado por idioma. Esto resuelve una limitación que
había quedado pendiente en la versión anterior ("no hay persistencia
entre sesiones"): acá el progreso vive en el propio teléfono del chico y
sobrevive a cerrar la app.

## Vocabulario y niveles

8 categorías (animales, colores, comida, números, familia, escuela, clima,
emociones), ~50 palabras en total, con traducción a inglés e italiano
(`data.js`). Nivel 1-2: pregunta directa ("¿Cómo se dice 'perro' en
italiano?"). Nivel 3 en adelante: oración corta para completar, igual que
en la versión anterior.

## Cómo instalarlo en un celular Android

1. Subir esta carpeta a un hosting estático (GitHub Pages, Netlify,
   Vercel, o simplemente `python3 -m http.server` en la misma red wifi que
   el celular).
2. Abrir la URL en **Chrome** desde el celular.
3. Tocar el menú (⋮) → **"Agregar a pantalla de inicio"** / **"Instalar
   app"**.
4. Queda un ícono propio ("Idiomas Quest") que abre la app en pantalla
   completa, sin necesidad de conexión a internet después de la primera
   carga (el *service worker* en `sw.js` cachea todos los archivos).

Para probarlo en una computadora mientras se desarrolla: `python3 -m
http.server 8000` parado en esta carpeta, y abrir `http://localhost:8000`.

## Pruebas realizadas

- Chequeo de sintaxis de los tres archivos JS (`node --check`) y del
  `manifest.webmanifest` (JSON válido).
- Prueba funcional de punta a punta en navegador (Chromium): pantalla de
  inicio, selección de idioma, secuencia de preguntas y respuestas en
  ambos idiomas, suba/baja de nivel según racha, persistencia del
  progreso en `localStorage` al volver a la pantalla de inicio, y que el
  botón de reiniciar progreso borra el estado guardado.
- Revisión manual de que las opciones de respuesta y el texto pronunciado
  correspondan al idioma elegido (no se mezclan palabras de inglés en el
  modo italiano ni viceversa).
- La prueba automática encontró un problema real de usabilidad (los
  botones de "volver" y "sonido" eran de 40px, chicos para el dedo de un
  nene de 9 años) y se corrigió antes de esta entrega (ahora 52px).

## Cómo se construyó esta entrega (proceso real, con Claude como agente)

1. Partiendo de la entrega anterior (tutor de inglés con Flask + API de
   Claude), la consigna nueva era que corriera en el celular Android de mi
   hijo y que fuera bilingüe. Evalué las opciones con Claude (backend vs.
   app nativa vs. PWA) y elegimos PWA + lógica local, por las razones
   explicadas más arriba.
2. Claude construyó el proyecto completo (`app.js`, `data.js`,
   `index.html`, `styles.css`, `sw.js`, manifest, ícono) y lo probó de
   punta a punta en un navegador Chromium headless con viewport de
   celular, con Playwright: pantalla de inicio, juego completo en los dos
   idiomas, persistencia en `localStorage`, 0 errores de consola. La
   prueba encontró el problema de los botones chicos mencionado arriba, y
   se corrigió antes de entregar.
3. Al intentar subir el commit a GitHub automáticamente, la sesión de
   Claude se topó con dos bloqueos de permisos distintos (no de red):
   `git push` devolvió 403 por política de la organización, y la
   herramienta de la API de GitHub devolvió `403 Resource not accessible
   by integration` al intentar crear la rama. Revisamos juntos los
   permisos en GitHub (`Installed GitHub Apps` / `Authorized OAuth Apps`
   de mi cuenta) y no había ningún selector de permisos por repositorio
   para cambiar del lado de GitHub — la cuenta usa una autorización tipo
   OAuth sin ese control expuesto.
4. Para no perder la entrega esperando a resolver el permiso, Claude armó
   un `.zip` del proyecto y lo mandó por el chat; lo descargué y lo subí
   yo mismo a mano con GitHub Desktop.
5. Al subirlo, sin querer reemplacé directamente la carpeta de la entrega
   anterior (`english-quest-entrega/ingles-agente/`) en vez de crear una
   carpeta nueva al lado. Decidimos dejarlo así (es una evolución directa
   del mismo proyecto, no uno paralelo) y ajustar este README para que no
   quedara hablando de "el proyecto anterior" como si fuera otra carpeta
   viva — la versión vieja sigue disponible en el historial de git
   (commits `version1` y `entrega`) si hace falta consultarla.

## Qué falta / reflexión

- **No hay una integración de IA generativa en esta versión** — a
  diferencia de la versión anterior, acá el agente decide con una política
  fija y auditable, sin llamar a un LLM. Es una decisión de diseño (ver
  arriba), no una limitación técnica: la arquitectura separa igual
  "decidir" (`decidirPolitica`, `elegirPalabra`) de "generar contenido"
  (`generarPregunta`), así que en el futuro se podría reemplazar
  `generarPregunta` por una llamada a un modelo de lenguaje (como se hizo
  en la versión anterior, ver commits `version1`/`entrega`) sin tocar la
  política de nivel/repaso.
- **El pronunciado por voz depende de las voces instaladas en el
  celular** — `SpeechSynthesis` usa las voces del sistema Android; en
  algunos equipos la voz en italiano puede sonar peor que la de inglés, o
  no estar instalada (Android ofrece descargarla desde Ajustes > Idiomas
  > Texto a voz).
- **Vocabulario fijo, no generado** — son ~50 palabras curadas a mano. Para
  un uso más largo en el tiempo, ampliaría el banco o (de nuevo)
  conectaría un LLM para generar variaciones de oraciones nuevas sobre las
  mismas palabras.
- **Sin cuenta de usuario ni sincronización entre dispositivos** — el
  progreso vive en el `localStorage` de ese celular puntual; si se borra
  la caché del navegador o se cambia de teléfono, se pierde. Para un uso
  real más allá de esta tarea, se podría exportar/importar el progreso a
  un archivo o sincronizarlo con una cuenta.

## Entrega

Construido íntegramente con Claude como agente (yo describí lo que
quería para mi hijo e iteré sobre lo que Claude proponía), según la
consigna de la materia.
