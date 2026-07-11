<?php
// api/get_menu.php
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // Fetch Menu Items
    $stmt = $pdo->query("SELECT * FROM menu_items");
    $menuItems = $stmt->fetchAll();

    // Fetch Toppings
    $stmt = $pdo->query("SELECT * FROM toppings");
    $toppingsRaw = $stmt->fetchAll();
    $toppings = [];
    foreach ($toppingsRaw as $t) {
        $t['price'] = (float)$t['price'];
        $t['points'] = isset($t['points']) ? (int)$t['points'] : floor($t['price'] / 10);
        $toppings[] = $t;
    }

    // Organize data like the original mockData
    $data = [
        'noodles' => [],
        'streetFoods' => [],
        'bingsu' => [],
        'drinks' => [],
        'snacks' => [],
        'toppings' => $toppings,
        'gallery' => [
            'images/store1.png',
            'images/store2.png',
            'images/store3.png',
            'images/logo.jpg'
        ],
        'faqs' => [
            ["q" => "Where exactly are you located in La Union?", "a" => "We are located right in the heart of Bangar, near the main plaza. Look for the glowing neon bowl!"],
            ["q" => "How the cook-it-yourself process works?", "a" => "Pick your ramen from the wall, select your toppings, checkout, and then head to our automated induction cookers. It boils perfect water every time!"],
            ["q" => "Is Bingsu available today?", "a" => "Yes! Our shaved ice machine is running all day. Mango and Injeolmi are available."]
        ]
    ];

    foreach ($menuItems as $item) {
        $item['price'] = (float)$item['price'];
        // Hybrid points logic
        $item['points'] = isset($item['points']) ? (int)$item['points'] : floor($item['price'] / 10);
        // Convert tags string to array
        $item['tags'] = empty($item['tags']) ? [] : explode(',', $item['tags']);
        
        if ($item['category'] === 'noodles') {
            $data['noodles'][] = $item;
        } elseif ($item['category'] === 'streetFoods') {
            $data['streetFoods'][] = $item;
        } elseif ($item['category'] === 'bingsu') {
            $data['bingsu'][] = $item;
        } elseif ($item['category'] === 'drinks') {
            $data['drinks'][] = $item;
        } elseif ($item['category'] === 'snacks') {
            $data['snacks'][] = $item;
        }
    }

    echo json_encode($data);

} catch (\Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>
