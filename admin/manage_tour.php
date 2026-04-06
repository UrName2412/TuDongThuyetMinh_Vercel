<?php
require_once "auth.php";
require_login();
header('Content-Type: text/html; charset=UTF-8');
require_once "tour_service.php";

$activePage = 'tour';
$message = '';
$type = '';

if (isset($_GET['deleted'])) {
    $message = 'Tour đã được xóa.';
    $type = 'delete';
}

if (isset($_GET['added'])) {
    $message = 'Tour đã được tạo thành công.';
    $type = 'add';
}

if (isset($_GET['updated'])) {
    $message = 'Tour đã được cập nhật.';
    $type = 'update';
}

$tours = getTours();
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Quản lý Tours</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<?php if ($message): ?>
<div id="toast" class="toast <?= $type ?>">
    <?= htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>
</div>
<?php endif; ?>
<div class="admin">
<?php include "_sidebar.php"; ?>
<div class="content">
<div class="main-content">
<div class="table-container">
<h2>Quản lý Tour</h2>
<a class="btn add" href="add_tour.php">Tạo Tour mới</a>

<?php if (empty($tours)): ?>
<p>Chưa có tour nào. Hãy tạo tour để bắt đầu.</p>
<?php else: ?>
<table>
<tr>
<th>ID</th>
<th>Tên Tour</th>
<th>Mô tả</th>
<th>Hành động</th>
</tr>
<?php foreach ($tours as $tour): ?>
<tr>
<td><?= $tour['id'] ?></td>
<td><?= htmlspecialchars($tour['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td><?= htmlspecialchars($tour['description'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></td>
<td>
<a class="btn edit" href="edit_tour.php?id=<?= $tour['id'] ?>">Sửa</a>
<a class="btn delete" href="delete_tour.php?id=<?= $tour['id'] ?>" onclick="return confirm('Xóa tour này?')">Xóa</a>
</td>
</tr>
<?php endforeach; ?>
</table>
<?php endif; ?>
</div>
</div>
</div>
</div>
</body>
</html>
