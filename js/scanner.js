const API_KEY = "";

const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const captureButton = document.querySelector("button");
const resultContainer = document.getElementById("resultado");


// Inicializa el stream de video de la cámara.

async function initializeCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        videoElement.srcObject = stream;
    } catch (error) {
        console.error("Camera access denied:", error);
        alert("Error: No se pudo acceder a la cámara.");
    }
}

/**
 //Envía la imagen a la API de OpenAI para su análisis.
 * @param {string} base64Image - Imagen en formato base64.
 */
async function analyzeImage(base64Image) {
    const endpoint = "https://api.openai.com/v1/chat/completions";

    const payload = {
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Clasifica el residuo mostrado en la imagen." },
                    { type: "image_url", image_url: { url: base64Image } }
                ]
            }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "waste_classification",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        tipo: { type: "string" },
                        reciclable: { type: "boolean" },
                        contenedor: { 
                            type: "string", 
                            enum: ["Azul", "Amarillo", "Verde", "Marrón", "Gris"] 
                        }
                    },
                    required: ["tipo", "reciclable", "contenedor"],
                    additionalProperties: false
                }
            }
        },
        max_tokens: 300
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const result = JSON.parse(content);

        displayResult(result);

    } catch (error) {
        console.error("Analysis failed:", error);
        if (resultContainer) {
            resultContainer.textContent = "Error al procesar la imagen.";
        }
    }
}

/**
 * Renderiza el resultado en el DOM.
 * @param {Object} data - Objeto con los datos de clasificación.
 */
function displayResult(data) {
    if (!resultContainer) return;

    resultContainer.innerHTML = `
        <div class="result-card">
            <p><strong>Tipo:</strong> ${data.tipo}</p>
            <p><strong>Reciclable:</strong> ${data.reciclable ? "Sí" : "No"}</p>
            <p><strong>Contenedor:</strong> ${data.contenedor}</p>
        </div>
    `;
}

// Event Listeners
captureButton.addEventListener("click", () => {
    if (!videoElement.videoWidth) {
        console.warn("Video stream not ready.");
        return;
    }

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    const context = canvasElement.getContext("2d");
    context.drawImage(videoElement, 0, 0);

    const imageBase64 = canvasElement.toDataURL("image/jpeg");
    
    if (resultContainer) {
        resultContainer.textContent = "Procesando...";
    }

    analyzeImage(imageBase64);
});

// Inicialización
initializeCamera();