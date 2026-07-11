<?php
require_once 'db_connect.php';

try {
    // 1. Create orders table if it doesn't exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        receipt_code VARCHAR(50) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        points_earned INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Add user_id to reservations if it doesn't exist
    // MySQL doesn't have IF NOT EXISTS for ADD COLUMN natively, so we catch the exception if it already exists
    try {
        $pdo->exec("ALTER TABLE reservations ADD COLUMN user_id INT DEFAULT NULL");
        echo "Successfully added user_id to reservations.<br>";
    } catch (Exception $e) {
        // Ignore duplicate column error
        echo "Note: user_id might already exist in reservations.<br>";
    }

    echo "<h3>Database successfully updated for Passport Activity tracking!</h3>";
    echo "<p>You can now safely delete this file (db_fix.php).</p>";

} catch (Exception $e) {
    echo "<h3>Error updating database:</h3><pre>" . $e->getMessage() . "</pre>";
}
