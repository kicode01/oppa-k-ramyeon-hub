<?php
// api/seed.php
require_once 'db_connect.php';

try {
    // Modify ENUM just in case
    $pdo->query("ALTER TABLE menu_items MODIFY category ENUM('noodles', 'streetFoods', 'bingsu', 'drinks', 'snacks') NOT NULL");

    // Clear old data
    $pdo->query("TRUNCATE TABLE menu_items");
    $pdo->query("TRUNCATE TABLE toppings");

    // Get SQL from database.sql and execute
    $sql = file_get_contents('../database.sql');
    
    // Quick and dirty way to execute multiple queries from a file
    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    echo "Database successfully seeded with Korean Mart data!";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
