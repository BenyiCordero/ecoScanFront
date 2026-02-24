// scanner.js - Versión Adaptada (Sin conflictos)

(function () { // Encapsulamos en una función anónima para no chocar variables
    const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

    // Elementos del DOM
    const videoElement = document.getElementById("video");
    const canvasElement = document.getElementById("canvas");
    const captureButton = document.getElementById("btnCapturar");
    const resultContainer = document.getElementById("resultado");
    const fotoPreview = document.getElementById("foto");

    // Referencia al contenedor del mapa del INDEX
    const contenedorMapaIndex = document.getElementById('mapa');

    // Variables internas del scanner
    let tipoMaterial = "";
    let categoriasPermitidas = "";
    let categoriasMateriales = [];
    let recicladorasActivas = [];

    let scannerMap = null; // Usamos un nombre único para nuestro mapa

    const urlMateriales = '/api/recicladora/materiales?idRecicladora=';
    const urlHorarios = '/api/recicladora/horarios?idRecicladora=';

    // 1. Cargar materiales al inicio
    async function inicializarScanner() {
        try {
            const res = await fetch('/api/material/getall');
            const data = await res.json();
            categoriasPermitidas = data.map(m => m.nombreMaterial).join(", ");
            startCamera();
        } catch (e) { console.error("Error inicial:", e); }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false
            });
            videoElement.srcObject = stream;
            videoElement.setAttribute("playsinline", true);
            await videoElement.play();
        } catch (err) { console.error("Cámara no lista:", err); }
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

    // 2. Lógica de captura
    if (captureButton) {
        captureButton.addEventListener("click", async () => {
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                canvasElement.getContext("2d").drawImage(videoElement, 0, 0);
                const base64 = canvasElement.toDataURL("image/jpeg");

                if (fotoPreview) {
                    fotoPreview.src = base64;
                    fotoPreview.classList.remove("d-none");
                }
                analizarImagen(base64);
            }
        });
    }

    async function analizarImagen(base64) {
        resultContainer.innerHTML = '<div class="alert alert-info shadow-sm">Identificando material... ♻️</div>';
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    response_format: { type: "json_object" },
                    messages: [{
                        role: "user",
                        content: [
                            { type: "text", text: `Clasifica el residuo en una de estas categorías: ${categoriasPermitidas}. Responde JSON: {"tipo": "Exactamente el nombre"}. Si no es claro: {"tipo": "No valido"}` },
                            { type: "image_url", image_url: { url: base64 } }
                        ]
                    }]
                })
            });

            const data = await response.json();
            const resIA = JSON.parse(data.choices[0].message.content);
            tipoMaterial = resIA.tipo;

            if (tipoMaterial === "No valido") {
                resultContainer.innerHTML = `<div class="alert alert-warning">No pudimos identificar el material. intenta de nuevo.</div>`;
                return;
            }

            resultContainer.innerHTML = `<div class="alert alert-success">Detectado: <strong>${tipoMaterial}</strong>. Buscando centros...</div>`;
            await buscarCentrosCompatibles();

        } catch (error) {
            resultContainer.innerHTML = `<div class="alert alert-danger">Error de conexión.</div>`;
            console.log(error);
        }
    }

    // 3. Lógica del Mapa (Adaptada para no chocar)
    async function buscarCentrosCompatibles() {
        const resActivas = await fetch('/api/recicladora/activas').then(r => r.json());
        let validas = [];

        for (let r of resActivas) {
            const materiales = await fetch(urlMateriales + r.idRecicladora).then(res => res.json());
            if (materiales.some(m => m.nombreMaterial === tipoMaterial)) {
                validas.push(r);
            }
        }

        renderizarMapaScanner(validas);
    }

    async function renderizarMapaScanner(centros) {
        // SEGURIDAD: Si el mapa de tu compañero (u otro anterior) existe, lo eliminamos
        // Leaflet guarda la instancia en el contenedor. Si hay una, la limpiamos.
        if (scannerMap) {
            scannerMap.remove();
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
        contenedorMapaIndex.innerHTML = contenido;
        // Scroll suave hasta el mapa para que el usuario vea el resultado
        document.getElementById('container').scrollIntoView({ behavior: 'smooth' });

        scannerMap = L.map('map').setView([21.125877, -101.673257], 12);
        window.map = scannerMap; // Sincronizamos con la global por si el botón "Mi ubicación" la usa

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(scannerMap);

        const icon = L.icon({
            iconUrl: "/public/img/recicladoras.png", // Ruta corregida según tu index
            iconSize: [50, 50],
            iconAnchor: [25, 25]
        });

        for (let c of centros) {
            const horas = await fetch(urlHorarios + c.idRecicladora).then(r => r.json());
            let popupContent = `<b>${c.nombreRecicladora}</b><br>Acepta ${tipoMaterial}<br><small>`;
            horas.forEach(h => popupContent += `${h.diaSemana}: ${h.horaApertura}-${h.horaCierre}<br>`);

            L.marker([c.latitud, c.longitud], { icon: icon })
                .bindPopup(popupContent + "</small>")
                .addTo(scannerMap);
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
    inicializarScanner();
    cargarMateriales();
})();