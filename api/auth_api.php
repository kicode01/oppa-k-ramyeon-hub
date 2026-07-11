<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['first_name'] = $user['first_name'];
            
            echo json_encode([
                'success' => true, 
                'role' => $user['role'],
                'first_name' => $user['first_name']
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid email or password.']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($action === 'register') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    $firstName = $_POST['first_name'] ?? '';
    $lastName = $_POST['last_name'] ?? '';

    if (empty($email) || empty($password) || empty($firstName)) {
        echo json_encode(['success' => false, 'error' => 'Please fill in all required fields.']);
        exit;
    }

    try {
        // Check if email exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Email is already registered.']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $role = 'customer'; // Default role for self-registration

        // BYPASS EMAIL VERIFICATION: Set is_verified = 1 automatically
        $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified) VALUES (?, ?, ?, ?, ?, 1)");
        $stmt->execute([$email, $hash, $role, $firstName, $lastName]);
        
        $userId = $pdo->lastInsertId();

        // Auto log-in the user
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['role'] = $role;
        $_SESSION['first_name'] = $firstName;

        echo json_encode([
            'success' => true,
            'role' => $role,
            'first_name' => $firstName
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($action === 'resend_code') {
    $email = $_POST['email'] ?? '';

    if (empty($email)) {
        echo json_encode(['success' => false, 'error' => 'Email is required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, first_name, is_verified, verification_code FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            if ($user['is_verified'] == 1) {
                echo json_encode(['success' => false, 'error' => 'Account is already verified.']);
                exit;
            }

            $code = sprintf("%06d", mt_rand(1, 999999));
            $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            $update = $pdo->prepare("UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?");
            $update->execute([$code, $expires, $user['id']]);

            $subject = "Your Oppa K-Ramyeon Hub Verification Code";
            $firstName = $user['first_name'];
            $message = "Annyeong $firstName! Welcome to Oppa K-Ramyeon Hub.\r\n\r\nYour new 6-digit verification code is: $code\r\n\r\nEnter this code on the verification page to activate your account.";
            $headers = "From: noreply@oppahub.com\r\n";
            @mail($email, $subject, $message, $headers);

            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Account not found.']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($action === 'verify') {
    $email = $_POST['email'] ?? '';
    $code = $_POST['code'] ?? '';

    if (empty($email) || empty($code)) {
        echo json_encode(['success' => false, 'error' => 'Email and code are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, role, first_name, verification_code, verification_expires FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && $user['verification_code'] === $code) {
            if (strtotime($user['verification_expires']) > time()) {
                $update = $pdo->prepare("UPDATE users SET is_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?");
                $update->execute([$user['id']]);
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['first_name'] = $user['first_name'];

                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Verification code has expired. Please request a new one.']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid verification code.']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($action === 'forgot_password') {
    $email = $_POST['email'] ?? '';

    if (empty($email)) {
        echo json_encode(['success' => false, 'error' => 'Email is required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, first_name FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            $code = sprintf("%06d", mt_rand(1, 999999));
            $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            
            $update = $pdo->prepare("UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?");
            $update->execute([$code, $expires, $user['id']]);

            $subject = "Password Reset Request - Oppa K-Ramyeon Hub";
            $firstName = $user['first_name'];
            $message = "Annyeong $firstName!\r\n\r\nWe received a request to reset your password.\r\nYour 6-digit password reset code is: $code\r\n\r\nThis code will expire in 15 minutes.\r\nIf you did not request this, please ignore this email.";
            $headers = "From: noreply@oppahub.com\r\n";
            @mail($email, $subject, $message, $headers);
        }

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($action === 'reset_password') {
    $email = $_POST['email'] ?? '';
    $code = $_POST['code'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';

    if (empty($email) || empty($code) || empty($newPassword)) {
        echo json_encode(['success' => false, 'error' => 'All fields are required.']);
        exit;
    }

    if (strlen($newPassword) < 6) {
        echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id, reset_code, reset_expires FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && $user['reset_code'] === $code) {
            if (strtotime($user['reset_expires']) > time()) {
                $hash = password_hash($newPassword, PASSWORD_DEFAULT);
                $update = $pdo->prepare("UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?");
                $update->execute([$hash, $user['id']]);

                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Reset code has expired. Please request a new one.']);
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid reset code.']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} elseif ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
} elseif ($action === 'check_session') {
    if (isset($_SESSION['user_id'])) {
        try {
            $stmt = $pdo->prepare("SELECT first_name, last_name, role, passport_points, bowls_redeemed FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            
            if ($user) {
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                session_destroy();
                echo json_encode(['success' => false]);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Unknown action.']);
}
