<?php
require_once 'db_connect.php';

try {
    $stmt = $pdo->prepare("UPDATE menu_items SET image = 'https://images.unsplash.com/photo-1548943487-a2e4e43b4859?q=80&w=600&auto=format&fit=crop' WHERE id = 's2'");
    $stmt->execute();
    echo "Successfully updated Odeng image in database!\n";
} catch (\Exception $e) {
    echo "Error updating database: " . $e->getMessage() . "\n";
}
?>
