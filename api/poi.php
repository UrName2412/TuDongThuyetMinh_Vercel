<?php
require_once "../config/database.php";

$sql = "SELECT p.*, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM poi p";
$stmt = db_query($conn,$sql);

$data = [];

while($row = db_fetch_array($stmt,SQLSRV_FETCH_ASSOC)){
    $data[] = $row;
}

echo json_encode($data, JSON_UNESCAPED_UNICODE);