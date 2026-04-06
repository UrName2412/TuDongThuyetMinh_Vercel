<?php
session_start();

if(!isset($_SESSION['admin_user'])){

    header("Location: admin/login.php");
    exit;

}

header("Location: admin/dashboard.php");
exit;