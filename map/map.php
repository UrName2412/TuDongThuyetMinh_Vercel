<div id="map" style="height:500px"></div>

<script>

var map = L.map('map').setView([10.7623,106.6823],15);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

fetch("../api/poi.php")
.then(res=>res.json())
.then(data=>{

data.forEach(poi=>{

L.marker([poi.latitude,poi.longitude])
.addTo(map)
.bindPopup(poi.name);

});

});

</script>