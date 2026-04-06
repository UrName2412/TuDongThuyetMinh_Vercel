<?php

ini_set('default_charset', 'UTF-8');

$host = "localhost";
$username = "root";
$password = "";
$database = "FoodGuide";

$conn = mysqli_connect($host, $username, $password, $database);

if (!$conn) {
    die('MySQL connect error: ' . mysqli_connect_error());
}

mysqli_set_charset($conn, 'utf8mb4');

if (!defined('SQLSRV_FETCH_ASSOC')) {
    define('SQLSRV_FETCH_ASSOC', MYSQLI_ASSOC);
}

if (!function_exists('db_query')) {
    function db_query($conn, $sql, $params = []) {
        if (!empty($params)) {
            $stmt = mysqli_prepare($conn, $sql);
            if (!$stmt) {
                die('MySQL prepare error: ' . mysqli_error($conn) . ' SQL: ' . $sql);
            }

            $types = '';
            foreach ($params as $param) {
                if (is_int($param)) {
                    $types .= 'i';
                } elseif (is_float($param)) {
                    $types .= 'd';
                } else {
                    $types .= 's';
                }
            }

            $bindValues = [];
            $bindValues[] = $types;
            foreach ($params as $key => $param) {
                $bindValues[] = &$params[$key];
            }

            call_user_func_array([$stmt, 'bind_param'], $bindValues);
            mysqli_stmt_execute($stmt);
            $result = mysqli_stmt_get_result($stmt);
            return $result ?: $stmt;
        }

        return mysqli_query($conn, $sql);
    }
}

if (!function_exists('db_fetch_array')) {
    function db_fetch_array($stmt, $fetchType = SQLSRV_FETCH_ASSOC) {
        if ($stmt instanceof mysqli_stmt) {
            $result = mysqli_stmt_get_result($stmt);
            if (!$result) {
                return false;
            }
            return $fetchType === SQLSRV_FETCH_ASSOC ? mysqli_fetch_assoc($result) : mysqli_fetch_array($result, $fetchType);
        }

        if ($fetchType === SQLSRV_FETCH_ASSOC) {
            return mysqli_fetch_assoc($stmt);
        }

        return mysqli_fetch_array($stmt, $fetchType);
    }
}

if (!function_exists('db_errors')) {
    function db_errors() {
        $errors = mysqli_error_list($GLOBALS['conn']);
        return $errors ?: [];
    }
}
?>