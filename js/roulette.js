// js/roulette.js
let isRandomizing = false;

function spinRoulette() {
    if (isRandomizing) return;
    
    const box = document.getElementById('randomizer-box');
    const resultDiv = document.getElementById('roulette-result');
    
    if (!box || !resultDiv || typeof mockData === 'undefined') return;

    if (!mockData.noodles || mockData.noodles.length === 0 || !mockData.toppings || mockData.toppings.length === 0) {
        resultDiv.innerHTML = '<span style="color: var(--danger);">The kitchen is currently out of stock. Please check back later!</span>';
        return;
    }

    isRandomizing = true;
    resultDiv.textContent = 'Randomizing...';
    
    let iterations = 0;
    const maxIterations = 20; // 20 flashes
    const intervalTime = 100; // ms per flash
    
    const flashInterval = setInterval(() => {
        const tempNoodle = mockData.noodles[Math.floor(Math.random() * mockData.noodles.length)];
        const tempTopping = mockData.toppings[Math.floor(Math.random() * mockData.toppings.length)];
        box.innerHTML = `
            <div class="randomizer-item">
                <img src="${tempNoodle.image || 'images/placeholder.svg'}" class="randomizer-img" onerror="this.src='images/placeholder.svg'">
                <div class="randomizer-title">${tempNoodle.name}</div>
            </div>
            <div class="randomizer-plus">+</div>
            <div class="randomizer-item">
                <img src="${tempTopping.image || 'images/placeholder.svg'}" class="randomizer-img" onerror="this.src='images/placeholder.svg'">
                <div class="randomizer-title">${tempTopping.name}</div>
            </div>
        `;
        iterations++;
        
        if (iterations >= maxIterations) {
            clearInterval(flashInterval);
            finishRandomizer(box, resultDiv);
        }
    }, intervalTime);
}

function finishRandomizer(box, resultDiv) {
    const randomNoodle = mockData.noodles[Math.floor(Math.random() * mockData.noodles.length)];
    const randomTopping = mockData.toppings[Math.floor(Math.random() * mockData.toppings.length)];
    
    box.innerHTML = `
        <div class="randomizer-item">
            <img src="${randomNoodle.image || 'images/placeholder.svg'}" class="randomizer-img" onerror="this.src='images/placeholder.svg'">
            <div class="randomizer-title">${randomNoodle.name}</div>
        </div>
        <div class="randomizer-plus">+</div>
        <div class="randomizer-item">
            <img src="${randomTopping.image || 'images/placeholder.svg'}" class="randomizer-img" onerror="this.src='images/placeholder.svg'">
            <div class="randomizer-title">${randomTopping.name}</div>
        </div>
    `;
    
    resultDiv.innerHTML = `You got: <strong>${randomNoodle.name}</strong> + <strong>${randomTopping.name}</strong>!`;
    isRandomizing = false;
    
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-outline';
    confirmBtn.style.marginTop = '10px';
    confirmBtn.textContent = 'Add combo to Cart';
    confirmBtn.onclick = () => {
        const comboPrice = parseFloat(randomNoodle.price) + parseFloat(randomTopping.price);
        addToCart({ ...randomNoodle, price: comboPrice, name: `${randomNoodle.name} w/ ${randomTopping.name}` }, 'combo');
        confirmBtn.textContent = 'Added!';
        confirmBtn.disabled = true;
    };
    resultDiv.appendChild(document.createElement('br'));
    resultDiv.appendChild(confirmBtn);
}
