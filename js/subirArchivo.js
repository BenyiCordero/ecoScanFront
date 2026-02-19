const boton = document.getElementById('btnSubirFoto');
const foto = document.getElementById('fotoSubida');
const img = document.getElementById('resultadoImagen');

boton.addEventListener('click', () => {
    foto.click();
});

foto.addEventListener('change', (e) => {
    if(e.target.files[0]){ //Evita errores si el usuario cancela
        const reader = new FileReader();
        reader.onload = function(e){
            const imgBase64 = e.target.result;
            img.src = imgBase64;
            
            analizarImagenOpenIA(imgBase64);
        }
        reader.readAsDataURL(e.target.files[0]); //Convierte el fila a data URL (data 64)
    }
});

async function analizarImagenOpenIA(imgBase64) { //funcion para comunicarse con Open AI
    const respuesa = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',  
        headers: { 'Content-Type': 'application/json',
                'Authorization': 'Bearer '
            },
        body: JSON.stringify({
            model: "gpt-4o", //Modelo con capacidad de vision
            messages: [
                {

                }
            ]
        })
    });
}