<?php
require_once "auth.php";


if (is_logged_in()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = 'Vui lòng nhập tên đăng nhập và mật khẩu.';
    } elseif (login($username, $password)) {
        header('Location: dashboard.php');
        exit;
    } else {
        $error = 'Tên đăng nhập hoặc mật khẩu không đúng.';
    }
}
?>

<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>Đăng nhập</title>

<link rel="stylesheet" href="../assets/style.css">

</head>

<body>

<div class="login-page">

<div class="login-box">

<h2>Đăng nhập</h2>

<?php if ($error): ?>
    <div id="toast" class="toast delete"><?= $error ?></div>
    <script>
        const toast = document.getElementById('toast');
        if (toast) {
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }
    </script>
<?php endif; ?>

<form method="post">

<label>Tên đăng nhập</label>
<input type="text" name="username" required autofocus>

<label>Mật khẩu</label>
<input type="password" name="password" required>

<button type="submit">Đăng nhập</button>

</form>

</div>

</div>

</body>
</html>
