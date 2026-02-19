// scanner.js

// 1. SEGURIDAD: Usamos la variable de entorno de Vite
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Elementos del DOM
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const captureButton = document.getElementById("btnCapturar");
const resultContainer = document.getElementById("resultado");
const fotoPreview = document.getElementById("foto");

// 2. CÁMARA ROBUSTA (La lógica del código que sí funcionaba)
async function startCamera() {
    try {
        console.log("Iniciando cámara...");

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment", // Intenta usar la trasera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        videoElement.srcObject = stream;

        // CRUCIAL: Esto faltaba en el primer código. 
        // Sin 'playsinline', iOS bloquea el video en pantalla completa o no lo muestra.
        videoElement.setAttribute("playsinline", true);

        // Aseguramos que arranque la reproducción
        await videoElement.play();
        console.log("Cámara lista.");

    } catch (err) {
        console.error("Error cámara:", err);
        // Mensaje de error útil
        if (location.hostname !== 'localhost' && location.protocol !== 'https:') {
            alert("⚠️ Error de seguridad: La cámara solo funciona en HTTPS o localhost.");
        } else {
            alert("No se pudo iniciar la cámara: " + err.message);
        }
    }
}

// Lógica del botón
if (captureButton) {
    captureButton.addEventListener("click", async () => {
        // Validación de API KEY
        if (!API_KEY) {
            alert("Error: No se encontró la API KEY en las variables de entorno (.env).");
            return;
        }

        // Verificar que el video tenga datos antes de capturar
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {

            // Dibujar en canvas
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            const ctx = canvasElement.getContext("2d");
            ctx.drawImage(videoElement, 0, 0);

            // Convertir a base64 y mostrar preview
            const base64 = canvasElement.toDataURL("image/jpeg");
            if (fotoPreview) {
                fotoPreview.src = base64;
                fotoPreview.classList.remove("d-none");
            }

            // Llamar a OpenAI
            resultContainer.innerHTML = '<div class="alert alert-info">Analizando residuo... ♻️</div>';

            try {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: "Eres un experto en reciclaje. Clasifica este residuo. Responde SOLO con este formato: Tipo: [tipo], Contenedor: [color], ¿Reciclable?: [Sí/No]." },
                                    { type: "image_url", image_url: { url: base64 } }
                                ]
                            }
                        ],
                        max_tokens: 150
                    })
                });

                const data = await response.json();

                if (data.error) {
                    throw new Error(data.error.message);
                }

                resultContainer.innerHTML = `<div class="alert alert-success">${data.choices[0].message.content}</div>`;

            } catch (error) {
                console.error(error);
                resultContainer.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            }
        } else {
            alert("La cámara aún no está lista. Espera un segundo.");
        }
    });
}

// Arrancar
startCamera();
