// Snake Game
document.addEventListener('DOMContentLoaded', function() {
    // Game elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const foodCountElement = document.getElementById('foodCount');
    const lengthElement = document.getElementById('length');
    const speedElement = document.getElementById('speed');
    const highScoreElement = document.getElementById('highScore');
    const gamesPlayedElement = document.getElementById('gamesPlayed');
    const totalFoodElement = document.getElementById('totalFood');
    const bestLengthElement = document.getElementById('bestLength');
    const finalScoreElement = document.getElementById('finalScore');

    // UI elements
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const restartBtn = document.getElementById('restartBtn');
    const startScreenBtn = document.getElementById('startScreenBtn');
    const speedSlider = document.getElementById('speedSlider');
    const gameOverScreen = document.getElementById('gameOver');
    const startScreen = document.getElementById('startScreen');

    // Game variables
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let gameInterval;
    let gameSpeed = 5;
    let score = 0;
    let foodEaten = 0;
    let gameRunning = false;
    let gamePaused = false;

    // Stats
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    let gamesPlayed = localStorage.getItem('snakeGamesPlayed') || 0;
    let totalFood = localStorage.getItem('snakeTotalFood') || 0;
    let bestLength = localStorage.getItem('snakeBestLength') || 3;

    // Initialize stats display
    highScoreElement.textContent = highScore;
    gamesPlayedElement.textContent = gamesPlayed;
    totalFoodElement.textContent = totalFood;
    bestLengthElement.textContent = bestLength;

    // Grid settings
    const gridSize = 20;
    const gridWidth = canvas.width / gridSize;
    const gridHeight = canvas.height / gridSize;

    // Colors
    const colors = {
        snakeHead: '#00adb5',
        snakeBody: '#3498db',
        food: '#e74c3c',
        background: '#1a1a2e',
        grid: '#2a2a3e'
    };

    // Initialize game
    function initGame() {
        // Reset snake
        snake = [
            {x: 5, y: 10},
            {x: 4, y: 10},
            {x: 3, y: 10}
        ];

        // Reset direction
        direction = 'right';
        nextDirection = 'right';

        // Generate first food
        generateFood();

        // Reset score
        score = 0;
        foodEaten = 0;

        // Update UI
        updateScore();

        // Hide game over screen
        gameOverScreen.style.display = 'none';

        // Draw initial state
        draw();
    }

    // Generate food at random position
    function generateFood() {
        let foodOnSnake;
        do {
            foodOnSnake = false;
            food = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight)
            };

            // Check if food is on snake
            for (let segment of snake) {
                if (segment.x === food.x && segment.y === food.y) {
                    foodOnSnake = true;
                    break;
                }
            }
        } while (foodOnSnake);
    }

    // Draw grid background
    function drawGrid() {
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;

        // Vertical lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    // Draw snake
    function drawSnake() {
        // Draw snake body
        for (let i = 1; i < snake.length; i++) {
            const segment = snake[i];
            ctx.fillStyle = colors.snakeBody;
            ctx.fillRect(
                segment.x * gridSize,
                segment.y * gridSize,
                gridSize - 1,
                gridSize - 1
            );

            // Add inner highlight for body segments
            ctx.fillStyle = '#2980b9';
            ctx.fillRect(
                segment.x * gridSize + 4,
                segment.y * gridSize + 4,
                gridSize - 9,
                gridSize - 9
            );
        }

        // Draw snake head
        const head = snake[0];
        ctx.fillStyle = colors.snakeHead;
        ctx.fillRect(
            head.x * gridSize,
            head.y * gridSize,
            gridSize - 1,
            gridSize - 1
        );

        // Add eyes to snake head
        ctx.fillStyle = 'white';
        const eyeSize = 4;
        const eyeOffset = 5;

        // Eye positions based on direction
        let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

        switch(direction) {
            case 'right':
                leftEyeX = head.x * gridSize + gridSize - eyeOffset;
                leftEyeY = head.y * gridSize + eyeOffset;
                rightEyeX = head.x * gridSize + gridSize - eyeOffset;
                rightEyeY = head.y * gridSize + gridSize - eyeOffset - eyeSize;
                break;
            case 'left':
                leftEyeX = head.x * gridSize + eyeOffset;
                leftEyeY = head.y * gridSize + eyeOffset;
                rightEyeX = head.x * gridSize + eyeOffset;
                rightEyeY = head.y * gridSize + gridSize - eyeOffset - eyeSize;
                break;
            case 'up':
                leftEyeX = head.x * gridSize + eyeOffset;
                leftEyeY = head.y * gridSize + eyeOffset;
                rightEyeX = head.x * gridSize + gridSize - eyeOffset - eyeSize;
                rightEyeY = head.y * gridSize + eyeOffset;
                break;
            case 'down':
                leftEyeX = head.x * gridSize + eyeOffset;
                leftEyeY = head.y * gridSize + gridSize - eyeOffset;
                rightEyeX = head.x * gridSize + gridSize - eyeOffset - eyeSize;
                rightEyeY = head.y * gridSize + gridSize - eyeOffset;
                break;
        }

        ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
        ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
    }

    // Draw food
    function drawFood() {
        // Draw food with gradient effect
        const centerX = food.x * gridSize + gridSize / 2;
        const centerY = food.y * gridSize + gridSize / 2;
        const radius = gridSize / 2 - 2;

        // Outer circle
        ctx.fillStyle = colors.food;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(centerX - 2, centerY - 2, radius / 2, 0, Math.PI * 2);
        ctx.fill();

        // Stem
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(centerX - 2, centerY - radius - 4, 4, 8);

        // Leaf
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(centerX + 5, centerY - radius - 2, 6, 3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw everything
    function draw() {
        drawGrid();
        drawSnake();
        drawFood();
    }

    // Update game state
    function update() {
        // Update direction
        direction = nextDirection;

        // Calculate new head position
        const head = {...snake[0]};

        switch(direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }

        // Check wall collision
        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
            gameOver();
            return;
        }

        // Check self collision
        for (let segment of snake) {
            if (head.x === segment.x && head.y === segment.y) {
                gameOver();
                return;
            }
        }

        // Add new head
        snake.unshift(head);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
            // Increase score
            score += 10 * gameSpeed;
            foodEaten++;
            totalFood++;

            // Update stats
            updateScore();
            updateStats();

            // Generate new food
            generateFood();

            // Update local storage
            localStorage.setItem('snakeTotalFood', totalFood);
        } else {
            // Remove tail if no food eaten
            snake.pop();
        }

        // Draw updated game
        draw();
    }

    // Update score display
    function updateScore() {
        scoreElement.textContent = score;
        foodCountElement.textContent = foodEaten;
        lengthElement.textContent = snake.length;
        speedElement.textContent = gameSpeed;
    }

    // Update stats
    function updateStats() {
        // Update high score if needed
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }

        // Update best length if needed
        if (snake.length > bestLength) {
            bestLength = snake.length;
            bestLengthElement.textContent = bestLength;
            localStorage.setItem('snakeBestLength', bestLength);
        }
    }

    // Game over
    function gameOver() {
        gameRunning = false;
        clearInterval(gameInterval);

        // Update games played
        gamesPlayed++;
        gamesPlayedElement.textContent = gamesPlayed;
        localStorage.setItem('snakeGamesPlayed', gamesPlayed);

        // Update final score
        finalScoreElement.textContent = score;

        // Show game over screen
        gameOverScreen.style.display = 'flex';
    }

    // Start game
    function startGame() {
        if (gameRunning) return;

        initGame();
        gameRunning = true;
        gamePaused = false;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';

        // Update button text
        startBtn.innerHTML = '<i class="fas fa-play"></i> Game Running';
        startBtn.disabled = true;
        pauseBtn.disabled = false;

        // Start game loop
        gameInterval = setInterval(update, 1000 / (gameSpeed * 2));
    }

    // Pause/resume game
    function togglePause() {
        if (!gameRunning) return;

        gamePaused = !gamePaused;

        if (gamePaused) {
            clearInterval(gameInterval);
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        } else {
            gameInterval = setInterval(update, 1000 / (gameSpeed * 2));
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }
    }

    // Reset game
    function resetGame() {
        clearInterval(gameInterval);
        gameRunning = false;
        gamePaused = false;

        // Reset button states
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Game';
        startBtn.disabled = false;
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        pauseBtn.disabled = true;

        // Show start screen
        startScreen.style.display = 'flex';
        gameOverScreen.style.display = 'none';

        // Reinitialize game
        initGame();
    }

    // Event listeners for buttons
    startBtn.addEventListener('click', startGame);
    startScreenBtn.addEventListener('click', startGame);

    pauseBtn.addEventListener('click', togglePause);

    resetBtn.addEventListener('click', resetGame);

    restartBtn.addEventListener('click', function() {
        resetGame();
        startGame();
    });

    // Speed slider
    speedSlider.addEventListener('input', function() {
        gameSpeed = parseInt(this.value);
        speedElement.textContent = gameSpeed;

        // Update game speed if running
        if (gameRunning && !gamePaused) {
            clearInterval(gameInterval);
            gameInterval = setInterval(update, 1000 / (gameSpeed * 2));
        }
    });

    // Keyboard controls
    document.addEventListener('keydown', function(event) {
        switch(event.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                if (direction !== 'down') nextDirection = 'up';
                break;
            case 'arrowdown':
            case 's':
                if (direction !== 'up') nextDirection = 'down';
                break;
            case 'arrowleft':
            case 'a':
                if (direction !== 'right') nextDirection = 'left';
                break;
            case 'arrowright':
            case 'd':
                if (direction !== 'left') nextDirection = 'right';
                break;
            case ' ':
            case 'p':
                if (gameRunning) {
                    togglePause();
                } else if (startScreen.style.display === 'flex') {
                    startGame();
                }
                event.preventDefault();
                break;
            case 'r':
                resetGame();
                break;
            case 'escape':
                if (gameRunning && !gamePaused) {
                    togglePause();
                }
                break;
        }
    });

    // Prevent arrow keys from scrolling the page
    window.addEventListener('keydown', function(e) {
        if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key)) {
            e.preventDefault();
        }
    }, false);

    // Initialize the game on load
    initGame();

    // Add some visual effects for the food when game starts
    setTimeout(() => {
        startScreen.style.display = 'flex';
    }, 500);

    // Easter egg: change snake color with double click
    canvas.addEventListener('dblclick', function() {
        const colorValues = ['#00adb5', '#9b59b6', '#e74c3c', '#2ecc71', '#f39c12'];
        const randomColor = colorValues[Math.floor(Math.random() * colorValues.length)];
        colors.snakeHead = randomColor;
        colors.snakeBody = adjustColor(randomColor, 40);
        draw();

        function adjustColor(color, amount) {
            const hex = color.replace('#', '');
            const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
            const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
            const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
            return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
    });

    // Add a fun effect when hovering over features
    const features = document.querySelectorAll('.feature');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 20px rgba(0, 173, 181, 0.3)';
        });

        feature.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        });
    });

    // Console welcome message
    console.log('%c🐍 Snake Game Loaded! %c\nUse arrow keys or WASD to play!',
        'color: #00adb5; font-size: 16px; font-weight: bold;',
        'color: #ccc; font-size: 12px;');
});