<?php
require_once 'db_connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not logged in.']);
    exit;
}

$user_id = $_SESSION['user_id'];

try {
    $stmt_orders = $pdo->prepare("SELECT receipt_code, total_price, points_earned, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 5");
    $stmt_orders->execute([$user_id]);
    $orders = $stmt_orders->fetchAll();

    $stmt_res = $pdo->prepare("SELECT name, party_size, res_date, res_time, status FROM reservations WHERE user_id = ? ORDER BY res_date DESC, res_time DESC LIMIT 5");
    $stmt_res->execute([$user_id]);
    $reservations = $stmt_res->fetchAll();

    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'reservations' => $reservations
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
