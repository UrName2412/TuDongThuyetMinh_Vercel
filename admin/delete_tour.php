<?php
require_once "auth.php";
require_login();
require_once "tour_service.php";

if (!isset($_GET['id'])) {
    header('Location: manage_tour.php');
    exit;
}

$id = intval($_GET['id']);
deleteTour($id);
header('Location: manage_tour.php?deleted=1');
exit;
