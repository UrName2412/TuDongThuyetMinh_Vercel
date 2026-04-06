<?php
require_once "auth.php";
require_login();

require_once "../config/database.php";

$activePage = 'dashboard';

$sql = "SELECT COUNT(*) as total FROM poi";
$stmt = db_query($conn,$sql);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);
$total = $row['total'] ?? 0;

$sql = "SELECT name FROM poi ORDER BY id DESC LIMIT 1";
$stmt = db_query($conn,$sql);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);
$latest = $row['name'] ?? "N/A";

$sql = "SELECT radius FROM poi ORDER BY radius DESC LIMIT 1";
$stmt = db_query($conn,$sql);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);
$maxRadius = $row['radius'] ?? 0;

$sql = "SELECT COUNT(*) as total FROM Tour";
$stmt = db_query($conn,$sql);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);
$tourTotal = $row['total'] ?? 0;

$sql = "SELECT name FROM Tour ORDER BY id DESC LIMIT 1";
$stmt = db_query($conn,$sql);
$row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC);
$latestTour = $row['name'] ?? "N/A";

$sql = "SELECT p.*, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM poi p ORDER BY p.id DESC LIMIT 5";
$list = db_query($conn,$sql);

$sql = "SELECT * FROM Tour ORDER BY id DESC LIMIT 5";
$tourList = db_query($conn,$sql);
?>

<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>Dashboard</title>

<link rel="stylesheet" href="../assets/style.css">

</head>

<body>

<div class="admin">

<!-- SIDEBAR -->

<?php include "_sidebar.php"; ?>


<!-- CONTENT -->

<div class="content">

<div class="main-content">

<div class="dashboard">

<div class="card blue">
<h3>Tổng POI</h3>
<p><?= $total ?></p>
</div>

<div class="card green">
<h3>POI mới nhất</h3>
<p><?= $latest ?></p>
</div>

<div class="card orange">
<h3>Radius lớn nhất</h3>
<p><?= $maxRadius ?> m</p>
</div>

</div>


<div class="table-container">

<h2>5 POI mới thêm</h2>

<table>

<tr>
<th>ID</th>
<th>Tên quầy</th>
<th>Mô tả</th>
<th>Ảnh</th>
<th>Vĩ độ</th>
<th>Kinh độ</th>
<th>Bán kính</th>
</tr>

<?php
while($row = db_fetch_array($list,SQLSRV_FETCH_ASSOC)){
?>

<tr>

<td><?= $row['id'] ?></td>
<td><?= $row['name'] ?></td>
<td><?= htmlspecialchars($row['description'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td>
    <?php if (!empty($row['image_url'])): ?>
        <a class="image-link" href="../<?= htmlspecialchars($row['image_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" target="_blank" rel="noopener noreferrer" title="Xem ảnh đầy đủ">
            <img class="poi-thumbnail" src="../<?= htmlspecialchars($row['image_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" alt="Ảnh POI">
        </a>
    <?php else: ?>
        -
    <?php endif; ?>
</td>
<td><?= $row['latitude'] ?></td>
<td><?= $row['longitude'] ?></td>
<td><?= $row['radius'] ?> m</td>

</tr>

<?php } ?>

</table>

</div>

<div class="table-container" style="margin-top: 30px;">

<h2>5 Tour mới thêm</h2>

<div class="dashboard">
    <div class="card blue">
        <h3>Tổng Tour</h3>
        <p><?= $tourTotal ?></p>
    </div>
    <div class="card green">
        <h3>Tour mới nhất</h3>
        <p><?= htmlspecialchars($latestTour, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p>
    </div>
</div>

<table>
<tr>
<th>ID</th>
<th>Tên Tour</th>
<th>Mô tả</th>
</tr>
<?php
while($tour = db_fetch_array($tourList,SQLSRV_FETCH_ASSOC)){
?>
<tr>
<td><?= $tour['id'] ?></td>
<td><?= htmlspecialchars($tour['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td><?= htmlspecialchars($tour['description'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
</tr>
<?php } ?>
</table>

</div>

</div>

</div>

</div>

</body>
</html>