<?php
require_once "auth.php";
require_login();
header('Content-Type: text/html; charset=UTF-8');

require_once "../config/database.php";

$activePage = 'add';

$message = "";
$type = "";

// Initialize variables
$name = "";
$lat = "";
$lng = "";
$radius = "";
$description = "";

if(isset($_POST['name'])){

$name = $_POST['name'];
$lat = $_POST['lat'];
$lng = $_POST['lng'];
$radius = $_POST['radius'];
$description = $_POST['description'];

if(!is_numeric($radius)){
$message = "Radius phải là số!";
$type = "delete";
}
elseif($lat == "" || $lng == ""){
$message = "Vui lòng chọn vị trí trên bản đồ!";
$type = "delete";
}
else{

$sql = "INSERT INTO poi(name,latitude,longitude,radius,description)
VALUES(?,?,?,?,?)";

$params = [$name,$lat,$lng,$radius,$description];

$result = db_query($conn,$sql,$params);

$poi_id = mysqli_stmt_insert_id($result);

if(isset($_FILES['image']) && $_FILES['image']['error'] == 0){
    $image_name = $_FILES['image']['name'];
    $image_tmp = $_FILES['image']['tmp_name'];
    $image_ext = pathinfo($image_name, PATHINFO_EXTENSION);
    $new_image_name = uniqid() . '.' . $image_ext;
    $upload_path = '../uploads/poi_images/' . $new_image_name;
    $image_url = 'uploads/poi_images/' . $new_image_name;
    
    if(move_uploaded_file($image_tmp, $upload_path)){
        $sql_image = "INSERT INTO Image(poi_id, image_url) VALUES(?, ?)";
        $params_image = [$poi_id, $image_url];
        db_query($conn, $sql_image, $params_image);
    }
}

header("Location: add_poi.php?added=1");
exit;

}

}

if(isset($_GET['added'])){
$message = "Thêm POI thành công";
$type = "add";
}
?>

<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>Thêm POI</title>

<link rel="stylesheet" href="../assets/style.css">

<link rel="stylesheet"
href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

</head>

<body>

<?php if($message!=""){ ?>

<div id="toast" class="toast <?= $type ?>">
<?= $message ?>
</div>

<?php } ?>

<div class="admin">

<!-- SIDEBAR -->

<?php include "_sidebar.php"; ?>


<!-- CONTENT -->

<div class="content">


<div class="main-content main-center">

<div class="container">

<h2>Thêm POI</h2>

<form method="post" enctype="multipart/form-data" onsubmit="return checkLocation()">

<label>Tên quầy</label>
<input name="name" value="<?= htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required>

<label>Mô tả</label>
<textarea name="description" rows="4" required><?= htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></textarea>

<label>Ảnh</label>
<input type="file" name="image" accept="image/*">

<label>Latitude</label>
<input id="lat" name="lat" value="<?= htmlspecialchars($lat, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" readonly required>

<label>Longitude</label>
<input id="lng" name="lng" value="<?= htmlspecialchars($lng, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" readonly required>

<label>Radius (m)</label>
<input type="number" name="radius" min="1" value="<?= htmlspecialchars($radius, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required>

<br><br>

<div id="map"></div>

<button type="submit">Thêm POI</button>

</form>

</div>

</div>

</div>

</div>

<script>

var map = L.map('map').setView([10.762622,106.660172],15);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var marker;

map.on('click',function(e){

var lat = e.latlng.lat;
var lng = e.latlng.lng;

document.getElementById("lat").value = lat;
document.getElementById("lng").value = lng;

if(marker){
map.removeLayer(marker);
}

marker = L.marker([lat,lng]).addTo(map);

});

function checkLocation(){

var lat = document.getElementById("lat").value;
var lng = document.getElementById("lng").value;

if(lat=="" || lng==""){
alert("Vui lòng click vào bản đồ để chọn vị trí");
return false;
}

return true;

}


let toast = document.getElementById("toast");

if(toast){

setTimeout(()=>{
    toast.style.opacity = "0";
},2000);

setTimeout(()=>{
    toast.remove();
},2500);

// Click to close
toast.addEventListener("click", function() {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
});

}

if(window.location.search){
window.history.replaceState({},document.title,"add_poi.php");
}

</script>

</body>
</html>