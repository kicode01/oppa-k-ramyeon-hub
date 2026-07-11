<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

$action = $_REQUEST['action'] ?? '';

try {
    if ($action === 'get') {
        $stmt = $pdo->query("SELECT * FROM gallery ORDER BY sort_order ASC");
        echo json_encode(['success' => true, 'gallery' => $stmt->fetchAll()]);
    } 
    elseif ($action === 'delete') {
        if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        $id = $_POST['id'] ?? 0;
        
        $stmt = $pdo->prepare("SELECT image_url FROM gallery WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        
        if ($row) {
            $file_path = '../' . $row['image_url'];
            if (file_exists($file_path)) {
                @unlink($file_path);
            }
            
            $stmt = $pdo->prepare("DELETE FROM gallery WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Image not found']);
        }
    }
    elseif ($action === 'reorder') {
        if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;
        $order = json_decode($_POST['order'] ?? '[]');
        if (is_array($order)) {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE gallery SET sort_order = ? WHERE id = ?");
            foreach ($order as $index => $id) {
                $stmt->execute([$index + 1, $id]);
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid order data']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
