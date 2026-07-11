<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

$cart_data = json_decode($_POST['cart'] ?? '[]', true);
$total_points = 0;

if (!is_array($cart_data) || count($cart_data) === 0) {
    echo json_encode(['success' => false, 'error' => 'Cart is empty.']);
    exit;
}

// Calculate points from cart
foreach ($cart_data as $item) {
    $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
    if (isset($item['points']) && $item['points'] !== null) {
        $total_points += (int)$item['points'] * $qty;
    } else {
        $price = isset($item['price']) ? (float)$item['price'] : 0;
        $total_points += floor($price / 10) * $qty;
    }
}

// Generate receipt code
$receipt_code = 'OPPA-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 6));

if (isset($_SESSION['user_id'])) {
    $user_id = $_SESSION['user_id'];
    try {
        $stmt = $pdo->prepare("UPDATE users SET passport_points = passport_points + ? WHERE id = ?");
        $stmt->execute([$total_points, $user_id]);
        
        $total_price = 0;
        foreach ($cart_data as $item) {
            $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
            $total_price += (isset($item['price']) ? (float)$item['price'] : 0) * $qty;
        }
        $cart_json = json_encode($cart_data);
        
        $stmt2 = $pdo->prepare("INSERT INTO orders (user_id, receipt_code, total_price, points_earned, cart_data) VALUES (?, ?, ?, ?, ?)");
        $stmt2->execute([$user_id, $receipt_code, $total_price, $total_points, $cart_json]);
        
        echo json_encode([
            'success' => true,
            'receipt' => $receipt_code,
            'points_awarded' => $total_points,
            'is_guest' => false
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    // Guest checkout
    try {
        $total_price = 0;
        foreach ($cart_data as $item) {
            $qty = isset($item['quantity']) ? (int)$item['quantity'] : 1;
            $total_price += (isset($item['price']) ? (float)$item['price'] : 0) * $qty;
        }
        $cart_json = json_encode($cart_data);
        
        $stmt2 = $pdo->prepare("INSERT INTO orders (user_id, receipt_code, total_price, points_earned, cart_data) VALUES (NULL, ?, ?, ?, ?)");
        $stmt2->execute([$receipt_code, $total_price, $total_points, $cart_json]);

        echo json_encode([
            'success' => true,
            'receipt' => $receipt_code,
            'points_missed' => $total_points,
            'is_guest' => true
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
}
