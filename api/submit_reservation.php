<?php
// api/submit_reservation.php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get JSON POST body
    $data = json_decode(file_get_contents('php://input'), true);

    if (isset($data['name']) && isset($data['party_size']) && isset($data['res_date']) && isset($data['res_time'])) {
        try {
            $user_id = $_SESSION['user_id'] ?? null;
            $stmt = $pdo->prepare("INSERT INTO reservations (name, party_size, res_date, res_time, user_id, status) VALUES (?, ?, ?, ?, ?, 'pending')");
            $stmt->execute([$data['name'], $data['party_size'], $data['res_date'], $data['res_time'], $user_id]);
            
            echo json_encode(['success' => true, 'message' => 'Reservation successfully saved to database.']);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Missing fields.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
}
