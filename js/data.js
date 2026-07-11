// js/data.js
let mockData = {
    noodles: [],
    toppings: [],
    streetFoods: [],
    bingsu: [],
    drinks: [],
    snacks: [],
    gallery: [
        'images/store1.png',
        'images/store2.png',
        'images/store3.png',
        'images/logo.jpg'
    ],
    faqs: [
        { q: "Where exactly are you located in La Union?", a: "We are located right in the heart of Bangar, near the main plaza. Look for the glowing neon bowl!" },
        { q: "How the cook-it-yourself process works?", a: "Pick your ramen from the wall, select your toppings, checkout, and then head to our automated induction cookers. It boils perfect water every time!" },
        { q: "Is Bingsu available today?", a: "Yes! Our shaved ice machine is running all day. Mango and Injeolmi are available." }
    ]
};

// Try fetching from XAMPP database API
async function fetchDatabaseMenu() {
    try {
        const response = await fetch('api/get_menu.php');
        if (response.ok) {
            const dbData = await response.json();
            if (!dbData.error) {
                mockData = dbData;
                console.log('Loaded data from MySQL Database via XAMPP!');
            }
        }
    } catch (e) {
        console.log('Running without DB backend, using local fallback data.');
    }
    
    // Dispatch event so UI knows data is ready
    document.dispatchEvent(new Event('dataReady'));
}

// Start fetch immediately
fetchDatabaseMenu();
