// 1. SEGURIDAD: Usamos la variable de entorno de Vite
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const boton = document.getElementById('btnSubirFoto');
const foto = document.getElementById('fotoSubida');
const img = document.getElementById('resultadoImagen');
const resultado = document.getElementById('resultado');
const contenidoMapa = document.getElementById('mapa');
foto.value = "";
let tipoMaterial = "";
let categoriasMateriales = [];
//Ahora los materiales separados por comas
let categoriasPermitidas = "";
let recicladoraMateriales = [];
let recicladorasActivas = [];
let recicladorasValidasPorMaterial = [];
let map;
let urlMateriales = '/api/recicladora/materiales?idRecicladora=';
let urlHorarios = '/api/recicladora/horarios?idRecicladora=';

boton.addEventListener('click', () => {
    foto.click();
});

cargarMateriales();

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

async function cargarRecicladoras() {
    try {
        const resultados = await fetch('/api/recicladora/activas', { method: 'GET' })
            .then(r => r.json());
        recicladorasActivas = resultados;
    } catch (error) {
        console.log(error);
    }
}

async function cargarMateriales() {
    try {
        const resultado = await fetch('/api/material/getall')
            .then(r => r.json());
        categoriasMateriales = resultado;
        categoriasPermitidas = categoriasMateriales //Separa los materiales con comas
            .map(material => material.nombreMaterial)
            .join(", ");

    } catch (error) {
        console.error("Error:", error);
    }
}


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
                //Obligamos a devolver en formato JSON
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Eres un experto en reciclaje. Analiza la imagen del residuo y clasifícalo usando ÚNICAMENTE una de las siguientes categorías: ${categoriasPermitidas}. Responde SOLO en formato JSON válido así:
                                        {
                                        "tipo": "Nombre exacto de la categoría"
                                        }

                                        Si no puedes identificar el residuo responde:

                                        {
                                        "tipo": "No valido"
                                        }
                                        `
                            },
                            { type: "image_url", image_url: { url: imgBase64 } }
                        ]
                    }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();
        //Por si el api falla
        if (!response.ok) {
            throw new Error(data.error?.message || "Error en la API");
        }
        //Extraer el Json del modelo
        let contenido = data.choices[0].message.content;
        //Convertir texto a objeto
        const objeto = JSON.parse(contenido);
        tipoMaterial = objeto.tipo
        if (tipoMaterial === "No valido") {
            resultado.innerHTML = `
                <div class="alert alert-warning">
                    No se pudo identificar el material 
                </div>
                `;
            return;
        }
        await cargarRecicladoras();
        resultado.innerHTML = `<div class="alert alert-success">Detectado: <strong>${tipoMaterial}</strong>. Buscando centros...</div>`;
        await validarMaterialEnRecicladora();


    } catch (error) {
        console.error(error);
        resultado.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}


async function validarMaterialEnRecicladora() {
    recicladorasValidasPorMaterial = [];
    console.log("Entrado a validar el material con exito");
    for (let recicladora of recicladorasActivas) {
        const response = await fetch(urlMateriales + recicladora.idRecicladora)
            .then(r => r.json());
        response.forEach(material => {
            if (tipoMaterial == material.nombreMaterial) {
                recicladorasValidasPorMaterial.push(recicladora);
            }
        })
    }
    if (recicladorasValidasPorMaterial.length) {
        console.log("Tiene datos");
        ImplementarMapa();
    }
}

async function ImplementarMapa() {
    if (map) {
        map.remove();
    }
    let contenido = `<div id="container" class="container" data-aos="fade-up">
                <div class="text-center mb-4">
                    <h2 class="fw-bold">Recicladoras que aceptan ${tipoMaterial}</h2>
                    <p class="lead">Encuentra los puntos más cercanos a tu ubicación.</p>
                </div>
                <div class="row justify-content-center">
                    <div class="col-12 col-md-10">
                        <div class=" shadow-sm">
                            <div class="card-body p-0">
                                <div class="text-center mb-3">
                                    <button class="btn btn-success" onclick="obtenerUbicacion()">
                                        Usar mi ubicación
                                    </button>
                                </div>
                                <div id="map"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    contenidoMapa.innerHTML = contenido;
    map = L.map('map', {
        center: [21.125877, -101.673257],
        zoom: 12,
    });

    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy OpenStreetMap contributors',
        maxzoom: 13,
        minZoom: 8,
    }).addTo(map);

    const iconoRecicladoras = L.icon({
        iconUrl: "../img/recicladoras.png",
        iconSize: [60, 60],
        iconAnchor: [30, 30]
    });

    document.getElementById('container').scrollIntoView({ behavior: 'smooth' });


    for (let recicladora of recicladorasValidasPorMaterial) {
        const horas = await fetch(urlHorarios + recicladora.idRecicladora).then(r => r.json());
        let popupContent = `<b>${recicladora.nombreRecicladora}</b><br>Acepta ${tipoMaterial}<br><small>`;
        horas.forEach(h => popupContent += `${h.diaSemana}: ${h.horaApertura}-${h.horaCierre}<br>`);
        L.marker(
            [recicladora.latitud, recicladora.longitud],
            { icon: iconoRecicladoras }
        )
            .bindPopup(
                popupContent + "</small>"   
            ).addTo(map);
    }

}

const iconoUsuario = L.icon({
    iconUrl: "/public/img/MiUbicacion.png",
    iconSize: [40, 40],     // tamaño del círculo
    iconAnchor: [20, 20]    // centro exacto del icono
})
let marker;

//Eso la hace GLOBAL, y el boton onclick si puede verla
window.obtenerUbicacion = function () {

    // Funcion para actualizar ubicación
    map.on('locationfound', function (e) {
        // Si no existe el marcador lo pone
        if (!marker) {
            marker = L.marker(e.latlng, { icon: iconoUsuario }).addTo(map);
            // Si existe solo lo mueve en tiempo real
        } else {
            marker.setLatLng(e.latlng);
        }
    });

    // Detectar ubicacion en tiempo real
    map.locate({
        setView: true,   // Centra automáticamente el mapa
        maxZoom: 14,
        watch: true, // hace que sea en tiempo real
        enableHighAccuracy: true
    });
}