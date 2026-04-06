<?php
require_once "auth.php";
require_login();

require_once "../config/database.php";

$activePage = 'map';

$sql = "SELECT p.*, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM poi p";
$stmt = db_query($conn,$sql);

$pois = [];

while($row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC)){
    $pois[] = $row;
}
?>

<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>Bản đồ POI</title>

<link rel="stylesheet" href="../assets/style.css">

<link rel="stylesheet"
href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

</head>

<body>

<div class="admin">

<?php include "_sidebar.php"; ?>

<div class="content">

<div class="main-content">

<div id="map" style="height:600px;"></div>

</div>

</div>

</div>

<script>

var map = L.map('map').setView([10.762622,106.660172],14);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var pois = <?= json_encode($pois) ?>;

pois.forEach(function(p){

var marker = L.marker([p.latitude,p.longitude]).addTo(map);

let popupContent = "<strong>" + p.name + "</strong>";
if (p.image_url) {
    popupContent += "<br><img src='../" + p.image_url + "' alt='" + p.name + "' style='max-width:160px; max-height:100px; display:block; margin-top:6px;'>";
}
marker.bindPopup(popupContent);

L.circle([p.latitude,p.longitude],{
radius:p.radius,
color:'red',
fillOpacity:0.2
}).addTo(map);

});

</script>

</body>
</html>