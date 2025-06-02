const backgroundTractor = document.getElementById('background-tractor');
const targetImage = document.getElementById('target-image');
const scoreDisplay = document.getElementById('score');
const messageDisplay = document.getElementById('message-display');
const gameContainer = document.getElementById('game-container');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const endScreen = document.getElementById('end-screen');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

let score = 0;
let timeoutId;
let isGameActive = false;

// --- Ustawienia Poziomu Trudności ---
let currentTimeLimit = 2000; // Początkowy limit czasu w milisekundach (2 sekundy)
const INITIAL_TIME_LIMIT = 2000; // Początkowy limit czasu (dla resetu)
const DECREMENT_PER_CLICK = 50; // O ile milisekund zmniejsza się czas za każde poprawne kliknięcie
const CLICKS_FOR_DIFFICULTY_INCREASE = 5; // Co ile kliknięć następuje obniżenie czasu
const MIN_TIME_LIMIT = 500; // Minimalny limit czasu (0.5 sekundy)

// Funkcja do resetowania gry i pokazania ekranu startowego
function resetGame() {
    score = 0;
    scoreDisplay.textContent = score;
    targetImage.classList.add('hidden');
    messageDisplay.style.display = 'none';
    clearTimeout(timeoutId);
    isGameActive = false;
    endScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    currentTimeLimit = INITIAL_TIME_LIMIT; // Resetuj limit czasu do początkowej wartości
}

// Funkcja wyświetlająca komunikaty (tylko te, które nie zasłaniają gry, np. przyszłe wskazówki)
function showMessage(message, duration = 1500) {
    messageDisplay.textContent = message;
    messageDisplay.style.display = 'block';
    messageDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    messageDisplay.style.borderColor = 'lime';
    messageDisplay.style.color = 'white';
    setTimeout(() => {
        messageDisplay.style.display = 'none';
    }, duration);
}

// Funkcja do losowego pozycjonowania obrazka
function moveTargetImage() {
    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;

    const targetWidth = targetImage.offsetWidth;
    const targetHeight = targetImage.offsetHeight;

    const maxX = containerWidth - targetWidth;
    const maxY = containerHeight - targetHeight;

    const randomX = Math.random() * maxX;
    const randomY = Math.random() * maxY;

    targetImage.style.left = `${randomX}px`;
    targetImage.style.top = `${randomY}px`;
}

// Rozpoczyna rundę - Ozzy się pojawia
function startRound() {
    if (!isGameActive) return;

    targetImage.classList.remove('hidden');
    moveTargetImage();

    clearTimeout(timeoutId);

    // Ustaw timeout dla tej rundy z BIEŻĄCYM limitem czasu
    timeoutId = setTimeout(() => {
        if (isGameActive) {
            endGame('Ozzy zjadł całe gówno! Przegrałeś!');
        }
    }, currentTimeLimit); // Użyj dynamicznego currentTimeLimit
}

// Funkcja odpowiedzialna za zakończenie gry i wyświetlenie ekranu końcowego
function endGame(message) {
    isGameActive = false;
    clearTimeout(timeoutId);
    targetImage.classList.add('hidden');
    messageDisplay.style.display = 'none'; // Upewnij się, że komunikat w grze jest ukryty

    document.getElementById('end-message').textContent = message;
    finalScoreDisplay.textContent = score;

    endScreen.classList.remove('hidden');
}

// ---- Obsługa zdarzeń ----

// Funkcja rozpoczynająca całą grę po kliknięciu przycisku Start
startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    isGameActive = true;
    score = 0;
    scoreDisplay.textContent = score;
    currentTimeLimit = INITIAL_TIME_LIMIT; // Upewnij się, że czas jest resetowany na początku nowej gry
    startRound();
});

// Obsługa kliknięcia przycisku Restart na ekranie końcowym
restartButton.addEventListener('click', () => {
    resetGame();
    // Po resecie użytkownik musi kliknąć "Rozpocznij Bitwę!" ponownie
});

// Obsługa kliknięcia na docelowy obrazek (Ozzy'ego)
targetImage.addEventListener('click', (event) => {
    if (isGameActive && !targetImage.classList.contains('hidden')) {
        event.stopPropagation();
        score++;
        scoreDisplay.textContent = score;
        clearTimeout(timeoutId);
        targetImage.classList.add('hidden');

        // --- Logika Poziomu Trudności ---
        if (score > 0 && score % CLICKS_FOR_DIFFICULTY_INCREASE === 0) {
            currentTimeLimit = Math.max(MIN_TIME_LIMIT, currentTimeLimit - DECREMENT_PER_CLICK);
            // USUNIĘTO: showMessage(`Ozzy przyspiesza! Czas: ${currentTimeLimit / 1000}s`, 2000);
            // Komunikat o przyspieszaniu nie będzie już wyświetlany
        }

        // Krótka przerwa przed rozpoczęciem nowej rundy
        setTimeout(() => {
            if (isGameActive) {
                startRound();
            }
        }, 300);
    }
});

// Dodaj obsługę zmiany rozmiaru okna, aby obrazek zawsze był w widocznym obszarze
window.addEventListener('resize', () => {
    if (isGameActive && !targetImage.classList.contains('hidden')) {
        moveTargetImage();
    }
});

// Inicjalizacja: pokaż ekran startowy na początku i zresetuj stan gry
resetGame();