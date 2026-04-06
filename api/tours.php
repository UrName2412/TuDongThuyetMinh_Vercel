<?php
require_once "../config/database.php";
require_once "../admin/auth.php";
session_start();

header('Content-Type: application/json; charset=utf-8');

function send($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_logged_in()) {
    send(['error' => 'Unauthorized'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $sql = "SELECT * FROM Tour ORDER BY id DESC";
    $stmt = db_query($conn, $sql);
    $tours = [];
    while ($row = db_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $tours[] = $row;
    }
    send($tours);
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST') {
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $poiIds = $input['poi_ids'] ?? [];

    if ($name === '' || !is_array($poiIds) || count($poiIds) < 2) {
        send(['error' => 'Tour name and at least 2 POIs are required'], 400);
    }

    $sql = "INSERT INTO Tour(name, description) VALUES(?,?)";
    db_query($conn, $sql, [$name, $description]);
    $idStmt = db_query($conn, "SELECT LAST_INSERT_ID() AS id");
    $row = db_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
    $tourId = $row['id'];
    $order = 1;
    foreach ($poiIds as $poiId) {
        db_query($conn, "INSERT INTO TourPoi(tour_id, poi_id, `order`) VALUES(?,?,?)", [$tourId, $poiId, $order]);
        $order++;
    }
    send(['id' => $tourId], 201);
} 

if ($method === 'PUT' || $method === 'PATCH') {
    if (empty($_GET['id'])) {
        send(['error' => 'Tour id missing'], 400);
    }
    $id = intval($_GET['id']);
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $poiIds = $input['poi_ids'] ?? [];

    if ($name === '' || !is_array($poiIds) || count($poiIds) < 2) {
        send(['error' => 'Tour name and at least 2 POIs are required'], 400);
    }
    db_query($conn, "UPDATE Tour SET name=?, description=? WHERE id=?", [$name, $description, $id]);
    db_query($conn, "DELETE FROM TourPoi WHERE tour_id=?", [$id]);
    $order = 1;
    foreach ($poiIds as $poiId) {
        db_query($conn, "INSERT INTO TourPoi(tour_id, poi_id, `order`) VALUES(?,?,?)", [$id, $poiId, $order]);
        $order++;
    }
    send(['ok' => true]);
} 

if ($method === 'DELETE') {
    if (empty($_GET['id'])) {
        send(['error' => 'Tour id missing'], 400);
    }
    $id = intval($_GET['id']);
    db_query($conn, "DELETE FROM TourPoi WHERE tour_id=?", [$id]);
    db_query($conn, "DELETE FROM Tour WHERE id=?", [$id]);
    send(['ok' => true]);
}

send(['error' => 'Method not allowed'], 405);
