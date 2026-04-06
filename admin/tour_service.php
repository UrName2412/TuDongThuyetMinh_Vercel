<?php
require_once "../config/database.php";

function getTours() {
    global $conn;
    $sql = "SELECT * FROM Tour ORDER BY id DESC";
    $stmt = db_query($conn, $sql);
    $tours = [];
    while ($row = db_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $tours[] = $row;
    }
    return $tours;
}

function getTour($id) {
    global $conn;
    $sql = "SELECT * FROM Tour WHERE id=?";
    $params = [$id];
    $stmt = db_query($conn, $sql, $params);
    return db_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
}

function getTourPoiIds($tourId) {
    global $conn;
    $sql = "SELECT poi_id FROM TourPoi WHERE tour_id=? ORDER BY `order` ASC";
    $params = [$tourId];
    $stmt = db_query($conn, $sql, $params);
    $ids = [];
    while ($row = db_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $ids[] = $row['poi_id'];
    }
    return $ids;
}

function getPoiList() {
    global $conn;
    $sql = "SELECT p.id, p.name, p.latitude, p.longitude, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM POI p ORDER BY p.name";
    $stmt = db_query($conn, $sql);
    $items = [];
    while ($row = db_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $items[] = $row;
    }
    return $items;
}

function createTour($name, $description, $poiIds) {
    if (count($poiIds) < 2) {
        return false;
    }

    global $conn;
    $sql = "INSERT INTO Tour(name, description) VALUES(?,?)";
    $params = [$name, $description];
    db_query($conn, $sql, $params);
    $idStmt = db_query($conn, "SELECT LAST_INSERT_ID() AS id");
    $row = db_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
    $tourId = $row['id'];
    $order = 1;
    foreach ($poiIds as $poiId) {
        db_query($conn, "INSERT INTO TourPoi(tour_id, poi_id, `order`) VALUES(?,?,?)", [$tourId, $poiId, $order]);
        $order++;
    }
    return $tourId;
}

function updateTour($id, $name, $description, $poiIds) {
    if (count($poiIds) < 2) {
        return false;
    }

    global $conn;
    db_query($conn, "UPDATE Tour SET name=?, description=? WHERE id=?", [$name, $description, $id]);
    db_query($conn, "DELETE FROM TourPoi WHERE tour_id=?", [$id]);
    $order = 1;
    foreach ($poiIds as $poiId) {
        db_query($conn, "INSERT INTO TourPoi(tour_id, poi_id, `order`) VALUES(?,?,?)", [$id, $poiId, $order]);
        $order++;
    }
    return true;
}

function deleteTour($id) {
    global $conn;
    db_query($conn, "DELETE FROM TourPoi WHERE tour_id=?", [$id]);
    db_query($conn, "DELETE FROM Tour WHERE id=?", [$id]);
}

function getPoisByIds($ids) {
    global $conn;
    if (empty($ids)) {
        return [];
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    $sql = "SELECT p.id, p.name, p.latitude, p.longitude, (SELECT image_url FROM Image WHERE poi_id = p.id LIMIT 1) AS image_url FROM POI p WHERE p.id IN ($in)";
    $stmt = db_query($conn, $sql, $ids);
    $items = [];
    while ($row = db_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $items[$row['id']] = $row;
    }
    return $items;
}
