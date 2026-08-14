const el = {
  nivel: document.getElementById("nivel"),
  nivelBadge: document.getElementById("nivelBadge"),
  score: document.getElementById("score"),
  fuente: document.getElementById("fuente"),
  emoji: document.getElementById("emoji"),
  prompt: document.getElementById("prompt"),
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  levelUpToast: document.getElementById("levelUpToast"),
  levelDownToast: document.getElementById("levelDownToast"),
};

function mostrarAvisoNivel(subio, bajo) {
  if (!subio && !bajo) return;
  const toast = subio ? el.levelUpToast : el.levelDownToast;
  toast.classList.add("show");
  el.nivelBadge.classList.add("nivel-pulso");
  setTimeout(() => {
    toast.classList.remove("show");
    el.nivelBadge.classList.remove("nivel-pulso");
  }, 1500);
}

let bloqueado = false;

function pintarPregunta(data) {
  el.nivel.textContent = data.level;
  el.score.textContent = data.score;
  el.fuente.textContent = data.question.fuente === "claude" ? "IA en vivo" : "Modo local";
  el.emoji.textContent = data.question.emoji || "🎮";
  el.prompt.textContent = data.question.prompt;
  el.feedback.textContent = "";

  el.options.innerHTML = "";
  data.question.options.forEach((opcion, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opcion;
    btn.onclick = () => elegirOpcion(idx, btn);
    el.options.appendChild(btn);
  });

  bloqueado = false;
}

async function iniciar() {
  const resp = await fetch("/api/start", { method: "POST" });
  const data = await resp.json();
  pintarPregunta(data);
}

async function elegirOpcion(idx, btnElegido) {
  if (bloqueado) return;
  bloqueado = true;

  const resp = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosen_index: idx }),
  });
  const data = await resp.json();

  btnElegido.classList.add(data.correct ? "correct" : "incorrect");
  el.feedback.textContent = data.correct
    ? data.feedback
    : `${data.feedback} (era: "${data.correct_text}")`;

  mostrarAvisoNivel(data.level_up, data.level_down);

  setTimeout(() => pintarPregunta(data), 1600);
}

iniciar();
