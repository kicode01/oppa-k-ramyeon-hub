<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

// Check session for Admin Role
$action = $_GET['action'] ?? '';

if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Admin access required.']);
    exit;
}

$uploadedImage = null;
if (isset($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK) {
    $uploadDir = '../images/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $fileName = basename($_FILES['image_file']['name']);
    $fileName = preg_replace("/[^a-zA-Z0-9.\-_]/", "", $fileName);
    $targetName = time() . '_' . $fileName;
    $targetPath = $uploadDir . $targetName;
    
    if (move_uploaded_file($_FILES['image_file']['tmp_name'], $targetPath)) {
        $uploadedImage = 'images/' . $targetName;
    }
}

if ($action === 'get_all') {
    try {
        $stmt = $pdo->query("SELECT * FROM menu_items ORDER BY category, id");
        $items = $stmt->fetchAll();
        
        $stmtT = $pdo->query("SELECT * FROM toppings");
        $toppings = $stmtT->fetchAll();
        foreach ($toppings as $t) {
            $t['category'] = 'toppings';
            $t['description'] = '';
            $items[] = $t;
        }
        
        $stmt2 = $pdo->query("SELECT * FROM reservations ORDER BY res_date DESC, res_time DESC");
        $reservations = $stmt2->fetchAll();

        $stmt3 = $pdo->query("SELECT * FROM messages ORDER BY created_at DESC");
        $messages = $stmt3->fetchAll();

        $stmt4 = $pdo->query("SELECT * FROM users ORDER BY created_at DESC");
        $users = $stmt4->fetchAll();

        $stmt5 = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
        $receipts = $stmt5->fetchAll();

        $output = json_encode([
            'success' => true, 
            'items' => $items, 
            'reservations' => $reservations, 
            'messages' => $messages,
            'users' => $users,
            'receipts' => $receipts
        ], JSON_INVALID_UTF8_SUBSTITUTE);

        if ($output === false) {
            echo json_encode(['success' => false, 'error' => 'JSON Encoding Error: ' . json_last_error_msg()]);
        } else {
            echo $output;
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Database Query Error: ' . $e->getMessage()]);
    }
} 
elseif ($action === 'add_item') {
    $id = $_POST['id'] ?? ($_POST['new_id'] ?? '');
    $category = $_POST['category'] ?? '';
    $name = $_POST['name'] ?? '';
    $price = $_POST['price'] ?? 0;
    $image = $uploadedImage ?? ($_POST['image'] ?? '');
    $desc = $_POST['description'] ?? '';
    $points = !empty($_POST['points']) ? (int)$_POST['points'] : null;

    try {
        if ($category === 'toppings') {
            $stmt = $pdo->prepare("INSERT INTO toppings (id, name, price, image, points) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$id, $name, $price, $image, $points]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO menu_items (id, category, name, price, image, description, points) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$id, $category, $name, $price, $image, $desc, $points]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
} 
elseif ($action === 'delete_item') {
    $id = $_POST['id'] ?? '';
    try {
        // Delete from both tables; only one will match the ID
        $stmt1 = $pdo->prepare("DELETE FROM menu_items WHERE id = ?");
        $stmt1->execute([$id]);
        $stmt2 = $pdo->prepare("DELETE FROM toppings WHERE id = ?");
        $stmt2->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
elseif ($action === 'edit_item') {
    $id = $_POST['id'] ?? '';
    $new_id = $_POST['new_id'] ?? $id;
    if (empty($new_id)) $new_id = $id;

    $category = $_POST['category'] ?? '';
    $name = $_POST['name'] ?? '';
    $price = $_POST['price'] ?? 0;
    $image = $uploadedImage ?? ($_POST['image'] ?? '');
    $desc = $_POST['description'] ?? '';
    $points = !empty($_POST['points']) ? (int)$_POST['points'] : null;

    try {
        if ($category === 'toppings') {
            // Delete old id
            $pdo->prepare("DELETE FROM menu_items WHERE id = ?")->execute([$id]);
            if ($id !== $new_id) {
                $pdo->prepare("DELETE FROM toppings WHERE id = ?")->execute([$id]);
            }
            
            $stmt = $pdo->prepare("INSERT INTO toppings (id, name, price, image, points) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, price=?, image=?, points=?");
            $stmt->execute([$new_id, $name, $price, $image, $points, $name, $price, $image, $points]);
        } else {
            // Delete old id
            $pdo->prepare("DELETE FROM toppings WHERE id = ?")->execute([$id]);
            if ($id !== $new_id) {
                $pdo->prepare("DELETE FROM menu_items WHERE id = ?")->execute([$id]);
            }

            $stmt = $pdo->prepare("INSERT INTO menu_items (id, category, name, price, image, description, points) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE category=?, name=?, price=?, image=?, description=?, points=?");
            $stmt->execute([$new_id, $category, $name, $price, $image, $desc, $points, $category, $name, $price, $image, $desc, $points]);
        }
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
elseif ($action === 'update_reservation') {
    $id = $_POST['id'] ?? '';
    $status = $_POST['status'] ?? '';
    
    try {
        $stmt = $pdo->prepare("UPDATE reservations SET status=? WHERE id=?");
        $stmt->execute([$status, $id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
elseif ($action === 'edit_user') {
    $id = $_POST['id'] ?? '';
    $first_name = $_POST['first_name'] ?? '';
    $last_name = $_POST['last_name'] ?? '';
    $email = $_POST['email'] ?? '';
    $role = $_POST['role'] ?? 'customer';
    $points = !empty($_POST['passport_points']) ? (int)$_POST['passport_points'] : 0;
    $bowls = !empty($_POST['bowls_redeemed']) ? (int)$_POST['bowls_redeemed'] : 0;
    $is_verified = isset($_POST['is_verified']) ? (int)$_POST['is_verified'] : 0;

    try {
        $stmt = $pdo->prepare("UPDATE users SET first_name=?, last_name=?, email=?, role=?, passport_points=?, bowls_redeemed=?, is_verified=? WHERE id=?");
        $stmt->execute([$first_name, $last_name, $email, $role, $points, $bowls, $is_verified, $id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
elseif ($action === 'delete_user') {
    $id = $_POST['id'] ?? '';
    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE id=?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
elseif ($action === 'add_admin') {
    $first = $_POST['first_name'] ?? '';
    $last = $_POST['last_name'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($first) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'All fields are required.']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Email is already registered.']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt2 = $pdo->prepare("INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified) VALUES (?, ?, 'admin', ?, ?, 1)");
        $stmt2->execute([$email, $hash, $first, $last]);

        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
else {
    echo json_encode(['success' => false, 'error' => 'Unknown action.']);
}
?>
