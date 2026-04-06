<?php
require_once "auth.php";
require_login();

require_once "../config/database.php";

$sql = "SELECT p.*, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM poi p";
$stmt = db_query($conn,$sql);
?>

<h2>Danh sách quầy</h2>

<table border="1">
<tr>
<th>ID</th>
<th>Tên</th>
<th>Ảnh</th>
<th>Mô tả</th>
<th>Vĩ độ</th>
<th>Kinh độ</th>
<th>Bán kính</th>
</tr>

<?php
while($row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC)){
?>
<tr>
<td><?= $row['id'] ?></td>
<td><?= $row['name'] ?></td>
<td>
    <?php if (!empty($row['image_url'])): ?>
        <img src="../<?= htmlspecialchars($row['image_url'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" alt="Ảnh POI" style="max-width:100px; max-height:70px; object-fit:cover;">
    <?php else: ?>
        -
    <?php endif; ?>
</td>
<td><?= htmlspecialchars($row['description'] ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td><?= $row['latitude'] ?></td>
<td><?= $row['longitude'] ?></td>
<td><?= $row['radius'] ?></td>
</tr>
<?php } ?>
</table>