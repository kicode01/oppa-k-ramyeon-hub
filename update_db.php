<?php
require 'api/db_connect.php';

try {
    // Check if column exists first
    $stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'bowls_redeemed'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE users ADD COLUMN bowls_redeemed INT DEFAULT 0");
        echo "<h2 style='color: green;'>Success! The database has been updated. You can now track redeemed bowls.</h2>";
    } else {
        echo "<h2 style='color: blue;'>The database is already updated! No changes needed.</h2>";
    }
} catch (Exception $e) {
    echo "<h2 style='color: red;'>Error: " . $e->getMessage() . "</h2>";
}
echo "<p>You should now delete this file from your server.</p>";
?>
