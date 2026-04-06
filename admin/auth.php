<?php

if(session_status() === PHP_SESSION_NONE) {
    session_start();
}

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

function is_logged_in(): bool {
    return !empty($_SESSION['admin_user']);
}

function require_login(): void {
    if (!is_logged_in()) {
        header('Location: login.php');
        exit;
    }
}

function login(string $username, string $password): bool {
    if ($username === ADMIN_USER && $password === ADMIN_PASS) {
        $_SESSION['admin_user'] = $username;
        return true;
    }
    return false;
}

function logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
}
