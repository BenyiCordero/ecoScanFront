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
            img.src = e.target.result;
        }
        reader.readAsDataURL(e.target.files[0]); //Convierte el fila a data URL (data 64)
    }
});