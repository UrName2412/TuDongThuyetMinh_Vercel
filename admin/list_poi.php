<?php
require_once "auth.php";
require_login();

header('Content-Type: text/html; charset=UTF-8');

require_once "../config/database.php";

$activePage = 'list';

$message="";
$type="";

if(isset($_GET['deleted'])){
$message="Xóa POI thành công";
$type="delete";
}

if(isset($_GET['updated'])){
$message="Cập nhật POI thành công";
$type="update";
}

if(isset($_GET['added'])){
$message="Thêm POI thành công";
$type="add";
}

if(isset($_GET['cannot_delete'])){
$message="Không thể xóa POI vì nó đang được sử dụng trong tour";
$type="error";
}

/* SEARCH */

$search = $_GET['search'] ?? "";

/* PAGINATION */

$page = $_GET['page'] ?? 1;
$limit = 5;
$offset = ($page-1)*$limit;


if($search!=""){

$countSql = "SELECT COUNT(*) as total FROM poi WHERE name LIKE ?";
$params = ["%$search%"];

}else{

$countSql = "SELECT COUNT(*) as total FROM poi";
$params=[];

}

$stmt = db_query($conn,$countSql,$params);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);

$total = $row['total'];
$totalPage = ceil($total/$limit);


/* DATA QUERY */

if($search!=""){

$sql="SELECT p.*, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM poi p
WHERE p.name LIKE ?
ORDER BY p.id DESC
LIMIT ?,?";

$params = ["%$search%",$offset,$limit];

}else{

$sql="SELECT p.*, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM poi p
ORDER BY p.id DESC
LIMIT ?,?";

$params = [$offset,$limit];

}

$stmt = db_query($conn,$sql,$params);
?>

<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>Danh sách POI</title>

<link rel="stylesheet" href="../assets/style.css">

<link rel="stylesheet"
href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>

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


<div class="content">

<div class="main-content">

<div class="table-container">

<div class="top-actions">
    <h2>Danh sách POI</h2>
    <a class="btn add" href="add_poi.php">Thêm POI</a>
</div>

<!-- SEARCH -->

<div class="search-box">

<form method="GET">

<input
type="text"
name="search"
placeholder="Tìm POI..."
value="<?= $search ?>">

<button type="submit">Tìm</button>

<a href="list_poi.php" class="btn reset">Reset</a>

</form>

</div>


<!-- TABLE -->

<?php if ($total == 0): ?>
  <p>Chưa có POI nào. Hãy thêm POI.</p>
<?php else: ?>
<table>

<tr>
<th>ID</th>
<th>Tên quầy</th>
<th>Ảnh</th>
<th>Mô tả</th>
<th>Vĩ độ</th>
<th>Kinh độ</th>
<th>Bán kính</th>
<th>Loại</th>
<th>Danh mục phụ</th>
<th>Hành động</th>
</tr>

<?php
while($row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC)){
?>

<tr onclick="showMap(
<?= $row['latitude'] ?>,
<?= $row['longitude'] ?>,
'<?= $row['name'] ?>',
<?= $row['radius'] ?>
)">

<td><?= $row['id'] ?></td>
<td><?= $row['name'] ?></td>
<td>
    <?php if (!empty($row['image_url'])): ?>
        <a class="image-link" href="../<?= htmlspecialchars($row['image_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" target="_blank" rel="noopener noreferrer" title="Xem ảnh đầy đủ">
            <img class="poi-thumbnail" src="../<?= htmlspecialchars($row['image_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" alt="Ảnh POI">
        </a>
    <?php else: ?>
        -
    <?php endif; ?>
</td>
<td><?= htmlspecialchars($row['description'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td><?= $row['latitude'] ?></td>
<td><?= $row['longitude'] ?></td>
<td><?= $row['radius'] ?> m</td>
<td><?= htmlspecialchars(($row['classification'] ?? 'major') === 'minor' ? 'Phụ' : 'Chính', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td><?= htmlspecialchars($row['minor_category'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>

<td>

<a class="btn edit" href="edit_poi.php?id=<?= $row['id'] ?>">Sửa</a>

<a class="btn delete"
href="delete_poi.php?id=<?= $row['id'] ?>"
onclick="return confirm('Xác nhận xóa POI này?')">
Xóa
</a>

</td>

</tr>

<?php } ?>

</table>
<?php endif; ?>


<!-- PAGINATION -->

<div class="pagination">

<?php for($i=1;$i<=$totalPage;$i++){ ?>

<a
href="?page=<?= $i ?>&search=<?= $search ?>"
class="<?= $i==$page ? 'active-page':'' ?>"
>
<?= $i ?>
</a>

<?php } ?>

</div>


<div id="map"></div>

</div>

</div>

</div>

</div>

<script>

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