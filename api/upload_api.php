<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

// Verify admin
if (!isset($_SESSION['user_id']) || !isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

if (isset($_POST['action']) && $_POST['action'] === 'delete_hero') {
    $file_path = '../images/hero-bg.jpg';
    if (file_exists($file_path)) {
        @unlink($file_path);
    }
    echo json_encode(['success' => true, 'message' => 'Hero background deleted.']);
    exit;
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded or upload error.']);
    exit;
}

$target = $_POST['target'] ?? '';
$allowed_targets = ['hero-bg', 'gallery'];

if (!in_array($target, $allowed_targets)) {
    echo json_encode(['success' => false, 'error' => 'Invalid target.']);
    exit;
}

$fileTmpPath = $_FILES['image']['tmp_name'];
$mimeType = mime_content_type($fileTmpPath);

$allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!in_array($mimeType, $allowedMimeTypes)) {
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only JPG, PNG, and WEBP are allowed.']);
    exit;
}

if ($target === 'gallery') {
    require_once 'db_connect.php';
    $filename = 'gallery_' . uniqid() . '.jpg';
    $dest_path = "../images/" . $filename;
    
    if (move_uploaded_file($fileTmpPath, $dest_path)) {
        try {
            $stmt = $pdo->query("SELECT MAX(sort_order) as max_sort FROM gallery");
            $max_sort = $stmt->fetchColumn() ?: 0;
            $new_sort = $max_sort + 1;
            
            $stmt = $pdo->prepare("INSERT INTO gallery (image_url, sort_order) VALUES (?, ?)");
            $stmt->execute(['images/' . $filename, $new_sort]);
            
            echo json_encode(['success' => true, 'message' => 'Gallery image added successfully.']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file.']);
    }
} else {
    // Hero bg
    $dest_path = "../images/" . $target . ".jpg";
    if (move_uploaded_file($fileTmpPath, $dest_path)) {
        echo json_encode(['success' => true, 'message' => 'Image updated successfully.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file.']);
    }
}
?>
