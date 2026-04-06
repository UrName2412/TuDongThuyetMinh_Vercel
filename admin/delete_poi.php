<?php
require_once "auth.php";
require_login();

require_once "../config/database.php";

if(isset($_GET['id'])){

$id = $_GET['id'];

// Check if POI is used in any tour
$checkSql = "SELECT COUNT(*) as count FROM TourPoi WHERE poi_id = ?";
$checkParams = [$id];
$checkStmt = db_query($conn, $checkSql, $checkParams);
$checkRow = db_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC);
$count = $checkRow['count'];

if($count > 0){
    // Cannot delete, redirect with error
    header("Location: list_poi.php?cannot_delete=1");
    exit;
}

$sql = "DELETE FROM poi WHERE id = ?";
$params = [$id];

db_query($conn,$sql,$params);

header("Location: list_poi.php?deleted=1");
exit;

}

header("Location: list_poi.php");
exit;
?>