let recicladorasActivas = [];
url = 'https://administracion.smarttech.icu/api/recicladora/horarios?idRecicladora=';

const iconoRecicladoras = L.icon({
    iconUrl: "/img/recicladoras.png",
    iconSize: [60, 60],
    iconAnchor: [30, 30]
});

var map = L.map('map', {
    center: [21.125877, -101.673257],
    zoom: 11.5,
});

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy OpenStreetMap contributors',
    maxzoom: 13,
    minZoom: 8,
}).addTo(map);

var info = L.control();

info.onAdd = function(map){
    this._div = L.DomUtil.create('div','info');
    this._div.innerHTML = "<h6>Centros de Reciclaje Activos</h6>";
    return this._div;
};

info.addTo(map);

async function cargarRecicladoras() {
    try {

        const resultados = await fetch('https://administracion.smarttech.icu/api/recicladora/activas')
            .then(r => r.json());
        recicladorasActivas = resultados;
        mostrarRecicladoras();

    } catch (error) {
        console.log(error);
    }
}

async function mostrarRecicladoras() {
    for (let recicladora of recicladorasActivas) {
        const response = await fetch(url + recicladora.idRecicladora)
            .then(r => r.json());
        let textoHorarios = "";
        response.forEach(horarios => {
            textoHorarios += horarios.diaSemana + " : " + horarios.horaApertura + " - " + horarios.horaCierre + "<br>";
        });
        L.marker(
            [recicladora.latitud, recicladora.longitud],
            { icon: iconoRecicladoras }
        )
        .bindPopup(
            "<b>" + recicladora.nombreRecicladora + "</b><br>" +
            "Horarios:<br>" + textoHorarios
        ).addTo(map);
    }

}

cargarRecicladoras();

function obtenerUbicacion() {
    const iconoUsuario = L.icon({
        iconUrl: "img/MiUbicacion.png",
        iconSize: [40, 40],     // tamaño del círculo
        iconAnchor: [20, 20]    // centro exacto del icono
    })
    let marker;
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
        watch: true, // hace que sea en tiempo real
        enableHighAccuracy: true
    });
}

