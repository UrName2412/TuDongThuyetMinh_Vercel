<?php
// Sidebar partial for admin pages.
// Usage: set $activePage to one of: dashboard, list, add, map
$activePage = $activePage ?? '';
?>

<div class="sidebar">

<a href="list_poi.php">
<h2>🍜 FoodGuide</h2>
</a>

<a class="<?= $activePage === 'dashboard' ? 'active' : '' ?>" href="dashboard.php">Dashboard</a>
<a class="<?= $activePage === 'list' ? 'active' : '' ?>" href="list_poi.php">Danh sách POI</a>
<a class="<?= $activePage === 'map' ? 'active' : '' ?>" href="map_poi.php">Map POI</a>
<a class="<?= $activePage === 'tour' ? 'active' : '' ?>" href="manage_tour.php">Quản lý Tours</a>

<hr style="margin: 1rem 0; border-color: rgba(255,255,255,0.2);">

<a href="logout.php">Đăng xuất</a>

</div>
