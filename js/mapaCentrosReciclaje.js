var map = L.map('map', {
    center: [21.125877, -101.673257],
    zoom: 13,
});

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy OpenStreetMap contributors',
    maxzoom: 13,
    minZoom: 8,
}).addTo(map);
