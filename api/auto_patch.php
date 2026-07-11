<?php
require_once 'db_connect.php';

echo "<h2>Database Auto-Patcher</h2>";

try {
    // 1. Add bowls_redeemed to users if missing
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN bowls_redeemed INT DEFAULT 0");
        echo "<p>✅ Added 'bowls_redeemed' column to users table.</p>";
    } catch (Exception $e) {
        echo "<p>ℹ️ 'bowls_redeemed' already exists or couldn't be added.</p>";
    }

    // 2. Add is_verified to users if missing
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0");
        echo "<p>✅ Added 'is_verified' column to users table.</p>";
    } catch (Exception $e) {
        echo "<p>ℹ️ 'is_verified' already exists or couldn't be added.</p>";
    }

    // 3. Add user_id to reservations if missing
    try {
        $pdo->exec("ALTER TABLE reservations ADD COLUMN user_id INT NULL AFTER id");
        echo "<p>✅ Added 'user_id' column to reservations table.</p>";
    } catch (Exception $e) {
        echo "<p>ℹ️ 'user_id' already exists in reservations.</p>";
    }

    // 4. Add created_at to reservations if missing
    try {
        $pdo->exec("ALTER TABLE reservations ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        echo "<p>✅ Added 'created_at' column to reservations table.</p>";
    } catch (Exception $e) {
        echo "<p>ℹ️ 'created_at' already exists in reservations.</p>";
    }

    echo "<h3 style='color:green;'>🎉 Database patching complete! Your live database is now perfectly up to date!</h3>";

} catch (Exception $e) {
    echo "<h3 style='color:red;'>Error updating database:</h3><pre>" . $e->getMessage() . "</pre>";
}
?>
