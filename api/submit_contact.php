<?php
// api/submit_contact.php
require_once 'db_connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (isset($data['type']) && isset($data['name']) && isset($data['content'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO messages (type, name, content) VALUES (?, ?, ?)");
            $stmt->execute([$data['type'], $data['name'], $data['content']]);
            
            echo json_encode(['success' => true, 'message' => 'Message successfully saved to database.']);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Missing fields.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
}
?>
