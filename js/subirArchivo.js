
// 1. SEGURIDAD: Usamos la variable de entorno de Vite
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const boton = document.getElementById('btnSubirFoto');
const foto = document.getElementById('fotoSubida');
const img = document.getElementById('resultadoImagen');
const resultado = document.getElementById('resultado');
foto.value = "";

boton.addEventListener('click', () => {
    foto.click();
});

foto.addEventListener('change', (e) => {
    if (e.target.files[0]) { //Evita errores si el usuario cancela
        const reader = new FileReader();
        reader.onload = function (e) {
            const imgBase64 = e.target.result;
            img.src = imgBase64;

            analizarImagenOpenIA(imgBase64);
        }
        reader.readAsDataURL(e.target.files[0]); //Convierte el fila a data URL (data 64)
    }
});

async function analizarImagenOpenIA(imgBase64) { //funcion para comunicarse con Open AI
    resultado.innerHTML = '<div class="alert alert-info">Analizando residuo... ♻️</div>';
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
                            { type: "image_url", image_url: { url: imgBase64 } }
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

        resultado.innerHTML = `<div class="alert alert-success">${data.choices[0].message.content}</div>`;

    } catch (error) {
        console.error(error);
        resultado.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}