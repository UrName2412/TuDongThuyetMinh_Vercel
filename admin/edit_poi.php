<?php
require_once "auth.php";
require_login();
header('Content-Type: text/html; charset=UTF-8');

require_once "../config/database.php";

$activePage = 'list';

$message = "";
$type = "";

if(!isset($_GET['id'])){
header("Location: list_poi.php");
exit;
}

$id = $_GET['id'];

$classification = 'major';
$minor_category = '';
$description = '';
$image_url = '';
$image_id = null;

/* UPDATE */

if(isset($_POST['name'])){

$name = trim($_POST['name']);
$description = trim($_POST['description'] ?? '');
$lat = trim($_POST['lat']);
$lng = trim($_POST['lng']);
$radius = trim($_POST['radius']);
$classification = $_POST['classification'] ?? 'major';
$minor_category = $_POST['minor_category'] ?? '';

if ($description === '') {
    $message = "Mô tả là bắt buộc.";
    $type = "delete";
}
elseif(!is_numeric($radius)){
    $message = "Radius phải là số!";
    $type = "delete";
}
elseif($lat == "" || $lng == ""){
    $message = "Vui lòng chọn vị trí trên bản đồ!";
    $type = "delete";
}
elseif($classification === 'minor' && empty($minor_category)){
    $message = "Vui lòng chọn minor category cho POI loại minor.";
    $type = "delete";
}
elseif($classification === 'minor' && empty($minor_category)){
$message = "Vui lòng chọn minor category cho POI loại minor.";
$type = "delete";
}
else{
    $imageTmp = '';
    $imageExtension = '';
    $existingImage = null;

    $imageStmt = db_query($conn, "SELECT id, image_url FROM Image WHERE poi_id = ? LIMIT 1", [$id]);
    $existingImage = db_fetch_array($imageStmt, SQLSRV_FETCH_ASSOC);

    if (isset($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        if ($_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            $message = "Lỗi upload hình ảnh.";
            $type = "delete";
        } else {
            $allowedTypes = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/gif' => 'gif',
            ];
            $mimeType = false;
            if (function_exists('getimagesize')) {
                $imageInfo = getimagesize($_FILES['image']['tmp_name']);
                if ($imageInfo !== false) {
                    $mimeType = $imageInfo['mime'] ?? false;
                }
            }
            if ($mimeType === false) {
                $extension = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
                if (in_array($extension, ['jpg', 'jpeg'], true)) {
                    $mimeType = 'image/jpeg';
                } elseif ($extension === 'png') {
                    $mimeType = 'image/png';
                } elseif ($extension === 'gif') {
                    $mimeType = 'image/gif';
                } else {
                    $mimeType = false;
                }
            }

            if (!isset($allowedTypes[$mimeType])) {
                $message = "Chỉ cho phép hình ảnh JPG, PNG hoặc GIF.";
                $type = "delete";
            } else {
                $imageTmp = $_FILES['image']['tmp_name'];
                $imageExtension = $allowedTypes[$mimeType];
            }
        }
    }

    if ($message === '') {
        $sql = "UPDATE poi
SET name=?, description=?, latitude=?, longitude=?, radius=?, classification=?, minor_category=?
WHERE id=?";

        $params = [$name, $description, $lat, $lng, $radius, $classification, $classification === 'minor' ? $minor_category : null, $id];
        db_query($conn,$sql,$params);

        if ($imageTmp !== '') {
            $uploadDir = __DIR__ . '/../uploads/poi_images/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $fileName = uniqid('poi_', true) . '.' . $imageExtension;
            $targetPath = $uploadDir . $fileName;

            if (move_uploaded_file($imageTmp, $targetPath)) {
                $imageUrl = 'uploads/poi_images/' . $fileName;
                if (!empty($existingImage['id'])) {
                    db_query($conn, "UPDATE Image SET image_url = ? WHERE id = ?", [$imageUrl, $existingImage['id']]);
                } else {
                    db_query($conn, "INSERT INTO Image(poi_id, image_url) VALUES(?,?)", [$id, $imageUrl]);
                }
            } else {
                $message = "Không thể lưu hình ảnh.";
                $type = "delete";
            }
        }
    }

    if ($message === '') {
        header("Location: list_poi.php?updated=1");
        exit;
    }
}

}

/* LOAD DATA */

$sql = "SELECT * FROM poi WHERE id=?";
$params = [$id];

$stmt = db_query($conn,$sql,$params);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);

if (!isset($_POST['name'])) {
    $name = $row['name'];
    $description = $row['description'] ?? '';
    $lat = $row['latitude'];
    $lng = $row['longitude'];
    $radius = $row['radius'];
    $classification = $row['classification'] ?? 'major';
    $minor_category = $row['minor_category'] ?? '';
}
?>

<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>Sửa POI</title>

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

<div class="topbar">
</div>

<div class="main-content main-center">

<div class="container">

<h2>Sửa POI</h2>

<form method="post" enctype="multipart/form-data" onsubmit="return checkLocation()">

<label>Tên quầy</label>
<input name="name" value="<?= htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" required>

<label>Mô tả</label>
<textarea name="description" required><?= htmlspecialchars($description, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></textarea>

<label>Ảnh hiện tại</label>
<?php if (!empty($row['image_url'])): ?>
    <img src="../<?= htmlspecialchars($row['image_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" alt="Ảnh POI" style="max-width:180px; max-height:120px; display:block; margin-bottom:10px; object-fit:cover;">
<?php else: ?>
    <p>Chưa có ảnh.</p>
<?php endif; ?>

<label>Thay đổi ảnh</label>
<input type="file" name="image" accept="image/*">

<label>Vĩ độ</label>
<input id="lat" name="lat" value="<?= htmlspecialchars($lat, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" readonly required>

<label>Kinh độ</label>
<input id="lng" name="lng" value="<?= htmlspecialchars($lng, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" readonly required>

<label>Loại POI</label>
<select name="classification" id="classification" required onchange="toggleMinorCategory()">
  <option value="major" <?= $classification === 'major' ? 'selected' : '' ?>>Chính</option>
  <option value="minor" <?= $classification === 'minor' ? 'selected' : '' ?>>Phụ</option>
</select>

<label>Danh mục phụ</label>
<select name="minor_category" id="minor_category">
  <option value="">-- Chọn --</option>
  <option value="WC" <?= $minor_category === 'WC' ? 'selected' : '' ?>>WC</option>
  <option value="Bán vé" <?= $minor_category === 'Bán vé' ? 'selected' : '' ?>>Bán vé</option>
  <option value="Gửi xe" <?= $minor_category === 'Gửi xe' ? 'selected' : '' ?>>Gửi xe</option>
  <option value="Bến thuyền" <?= $minor_category === 'Bến thuyền' ? 'selected' : '' ?>>Bến thuyền</option>
</select>

<label>Radius (m)</label>
<input type="number"
name="radius"
value="<?= htmlspecialchars($radius, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>"
min="1"
oninput="this.value=this.value.replace(/[^0-9]/g,'')"
required>

<br><br>

<div id="map"></div>

<button type="submit">Cập nhật</button>

</form>

</div>

</div>

</div>

</div>

<script>

var lat = <?= $row['latitude'] ?>;
var lng = <?= $row['longitude'] ?>;

var map = L.map('map').setView([lat,lng],16);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var marker = L.marker([lat,lng]).addTo(map);

map.on('click',function(e){

var newLat = e.latlng.lat;
var newLng = e.latlng.lng;

document.getElementById("lat").value = newLat;
document.getElementById("lng").value = newLng;

marker.setLatLng([newLat,newLng]);

});

function toggleMinorCategory(){
  var classification = document.getElementById('classification').value;
  var minorSelect = document.getElementById('minor_category');
  minorSelect.disabled = classification !== 'minor';
}

toggleMinorCategory();

function checkLocation(){

var lat = document.getElementById("lat").value;
var lng = document.getElementById("lng").value;

if(lat=="" || lng==""){
alert("Vui lòng chọn vị trí trên bản đồ");
return false;
}

return true;

}


let toast = document.getElementById("toast");

if(toast){

setTimeout(()=>{
toast.style.opacity="0";
},1500);

setTimeout(()=>{
toast.remove();
},3000);

}

</script>

</body>
</html>