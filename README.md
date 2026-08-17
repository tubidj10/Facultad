# Idiomas Quest — agente tutor de idiomas para chicos (PWA para Android)

## Qué construí

Una PWA (app web instalable como ícono en el celular Android, sin necesitar
servidor ni conexión) para que mi hijo de 9 años practique vocabulario de
inglés e italiano jugando. El chico elige el idioma, y un agente decide qué
palabra preguntarle y con qué dificultad según cómo va jugando: sube y baja
de nivel según sus aciertos y errores, y prioriza repasar las palabras que
más le cuestan. Es la segunda entrega de este proyecto para la materia (la
primera, que sigue en el historial de este mismo repositorio, era un tutor
de solo inglés con backend Flask + API de Claude).

## Cómo se lo pedí

1. *(Pedido inicial, resumido — el texto exacto de este primer pedido no
   quedó disponible en el historial de esta sesión de chat, que fue larga y
   se resumió automáticamente; lo cuento fiel a lo que pasó, no textual):*
   pedí una app para que mi hijo practique idiomas desde su celular Android,
   elegí que fuera bilingüe (inglés e italiano, a elección del chico) y que
   el agente usara una lógica adaptativa simple en vez de un LLM en tiempo
   real (a diferencia de la entrega anterior de la materia).
2. "no veo esto es ningun directorio de mi pc. indicame como verlo."
3. "dame el paso a paso para darte permisos."
4. "reintenta. si no podes dame de nuevo paso a paso lo que hay que revisar..."
5. (mandé capturas de pantalla de GitHub) "fijate si es algo de aca.. porque
   no veo lo de permisos.."
6. "bueno ya subi a mano la version nueva. ahora lo que tengo que hacer es
   proceder a la entrega de la tarea de la facultad."
7. "si necesito un documento que explique todo el procedimiento paso a
   paso., que hicimos hasta lograr desarrollar esta aplicacion. Agreguemos
   los pasos de github, y repositorios utilizados."
8. (pegué la consigna completa de la tarea de la materia)
9. (pegué el contenido de la página "Formato de entrega" con la plantilla
   de este README)

## Qué funciona

- Chequeo de sintaxis de todo el código (`node --check`) y validación del
  `manifest.webmanifest` como JSON válido.
- Prueba de punta a punta en navegador (Chromium, con Playwright, viewport
  de celular): pantalla de inicio, selección de idioma, juego completo en
  inglés y en italiano, subida y bajada de nivel según la racha de
  aciertos/errores, persistencia del progreso en `localStorage`, botón de
  reiniciar progreso. 0 errores de consola en toda la prueba.
- Se puede instalar en Android como app: abrir la URL en Chrome, menú (⋮) →
  "Agregar a pantalla de inicio". Queda un ícono propio, funciona sin
  conexión después de la primera carga.
- El agente pronuncia la palabra correcta en voz alta (`SpeechSynthesis`)
  después de cada respuesta.

## Qué falta o qué falló

- **No pude pushear el commit a GitHub yo mismo (el agente).** `git push`
  devolvió error 403, y las herramientas de la API de GitHub devolvieron
  `403 Resource not accessible by integration` al intentar crear la rama.
  Confirmé que no era un problema de red (no aparecía nada en el log del
  proxy de la sesión hacia GitHub) — el rechazo venía de GitHub mismo, por
  permisos de la integración. Revisamos juntos la configuración de la
  cuenta de GitHub (`Installed GitHub Apps` y `Authorized OAuth Apps`) y no
  había ningún selector de permisos por repositorio para ajustar del lado
  de GitHub. Se resolvió generando un `.zip` del proyecto y subiéndolo a
  mano con GitHub Desktop.
- Al subir a mano, sin querer reemplacé la carpeta de la entrega anterior de
  la materia en vez de crear una carpeta nueva al lado — quedó documentado
  así en el historial de commits (la versión vieja sigue en los commits
  `version1` y `entrega`).
- No hay integración de IA generativa en esta versión: el agente decide con
  una política fija (rachas + sistema tipo Leitner), no con un LLM. Es una
  decisión de diseño (privacidad de un menor, que funcione sin conexión),
  no algo que haya fallado.
- El pronunciado por voz depende de las voces instaladas en el celular; en
  algunos equipos la voz en italiano puede sonar peor que la de inglés.
- El vocabulario es fijo (~50 palabras curadas a mano) y no hay
  sincronización del progreso entre dispositivos.

## Qué aprendí

*(Borrador — te lo dejo armado, pero convendría que lo revises y lo
completes con tus propias palabras antes de entregar, ya que esta sección
tiene que ser tu reflexión honesta.)*

Aprendí que un agente de IA puede construir y probar un proyecto de punta a
punta solo, pero que su capacidad de actuar sobre servicios externos (como
GitHub) depende de permisos que a veces no están bajo mi control ni el del
agente — y que ahí conviene tener un plan B en vez de trabarse esperando
que se resuelva. También entendí mejor qué es la "lógica agéntica" en la
práctica: separar percibir (leer el estado del jugador), decidir (una
política simple y auditable) y actuar (elegir el contenido y mostrarlo) —
esa separación es justamente lo que permitiría, más adelante, cambiar una
sola pieza (por ejemplo, agregar un LLM para generar contenido) sin romper
el resto. Por último, documentar el proceso mientras pasaba (en vez de
después) me obligó a entender de verdad cada decisión, no solo a quedarme
con lo que funcionó.
