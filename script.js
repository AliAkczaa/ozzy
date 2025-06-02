// === Firebase Configuration (Musisz Zastąpić Własnymi Kluczami!) ===
// Przejdź do Firebase Console -> Twój Projekt -> Ustawienia projektu (zębatka) -> Dodaj aplikację (ikona </> dla web)
// Skopiuj obiekt firebaseConfig i wklej go tutaj:
const firebaseConfig = {
  apiKey: "AIzaSyASSmHw3LVUu7lSql0QwGmmBcFkaNeMups",
  authDomain: "ozzy-14c19.firebaseapp.com",
  projectId: "ozzy-14c19",
  storageBucket: "ozzy-14c19.firebasestorage.app",
  messagingSenderId: "668337469201",
  appId: "1:668337469201:web:cd9d84d45c93d9b6e3feb0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===================================================================

const backgroundTractor = document.getElementById('background-tractor');
const targetImage = document.getElementById('target-image');
const scoreDisplay = document.getElementById('score');
const messageDisplay = document.getElementById('message-display');
const gameContainer = document.getElementById('game-container');

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const nicknameInput = document.getElementById('nickname-input');
const showLeaderboardButton = document.getElementById('show-leaderboard-button');

let playerNickname = "Gracz"; // Domyślny nick, jeśli nic nie wpisze

const endScreen = document.getElementById('end-screen');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const showLeaderboardAfterGameButton = document.getElementById('show-leaderboard-after-game-button');

const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardList = document.getElementById('leaderboard-list');
const backToStartButton = document.getElementById('back-to-start-button');

let score = 0;
let timeoutId;
let isGameActive = false;

// --- Ustawienia Poziomu Trudności Czasu ---
let currentTimeLimit = 2000;
const INITIAL_TIME_LIMIT = 2000;
const DECREMENT_PER_CLICK = 50;
const MIN_TIME_LIMIT = 500;

// --- Ustawienia Poziomu Trudności Ruchu ---
let moveIntervalId; // Id interwału dla ruchu obrazka
let currentSpeed = 2; // Początkowa prędkość ruchu (piksele na klatkę)
const INITIAL_SPEED = 2;
const SPEED_INCREMENT = 0.5; // O ile zwiększa się prędkość za każdy próg
const MAX_SPEED = 10; // Maksymalna prędkość, aby nie było za szybko

let dx, dy; // Kierunki ruchu (delta x, delta y)

const CLICKS_FOR_DIFFICULTY_INCREASE = 5; // Co tyle kliknięć zwiększa się trudność (zarówno czas, jak i prędkość)


// --- Funkcje Leaderboarda ---
// Zapisz wynik do Firebase
async function saveScoreToLeaderboard(nickname, score) {
    if (score > 0) { // Zapisz tylko, jeśli wynik jest większy od zera
        try {
            await db.collection("leaderboard").add({
                nickname: nickname,
                score: score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Dodaj znacznik czasu
            });
            console.log("Wynik zapisany pomyślnie!");
        } catch (e) {
            console.error("Błąd podczas zapisywania wyniku: ", e);
        }
    }
}

// Pobierz i wyświetl top 10 wyników
async function fetchAndDisplayLeaderboard() {
    leaderboardList.innerHTML = ''; // Wyczyść listę przed załadowaniem
    try {
        const snapshot = await db.collection("leaderboard")
                                 .orderBy("score", "desc") // Sortuj malejąco po wyniku
                                 .orderBy("timestamp", "asc") // Dodaj sekundarne sortowanie po czasie dla rozstrzygnięcia remisu
                                 .limit(10) // Ogranicz do 10 wyników
                                 .get();

        if (snapshot.empty) {
            leaderboardList.innerHTML = '<li>Brak wyników w rankingu. Bądź pierwszy!</li>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            li.textContent = `${data.nickname || 'Anonim'}: ${data.score} kg`;
            leaderboardList.appendChild(li);
        });
    } catch (e) {
        console.error("Błąd podczas pobierania rankingu: ", e);
        leaderboardList.innerHTML = '<li>Wystąpił błąd podczas ładowania rankingu.</li>';
    }
}

// --- Funkcje Gry ---
// Funkcja do resetowania gry i pokazania ekranu startowego
function resetGame() {
    score = 0;
    scoreDisplay.textContent = score;
    targetImage.classList.add('hidden');
    messageDisplay.style.display = 'none';
    clearTimeout(timeoutId);
    clearInterval(moveIntervalId); // Upewnij się, że interwał ruchu jest wyczyszczony
    currentSpeed = INITIAL_SPEED; // ZRESETUJ PRĘDKOŚĆ RUCHU

    isGameActive = false;
    endScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');
    startScreen.classList.remove('hidden'); // Pokaż ekran startowy
    currentTimeLimit = INITIAL_TIME_LIMIT; // Resetuj limit czasu
    nicknameInput.value = playerNickname; // Ustaw ostatnio używany nick w polu
}

// Funkcja wyświetlająca komunikaty (w grze)
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

    // Upewnij się, że obrazek docelowy pozostaje w granicach kontenera
    const randomX = Math.max(0, Math.min(Math.random() * maxX, maxX));
    const randomY = Math.max(0, Math.min(Math.random() * maxY, maxY));

    targetImage.style.left = `${randomX}px`;
    targetImage.style.top = `${randomY}px`;
}

// Funkcja animująca ruch obrazka i odbijanie się od krawędzi
function animateTargetImage() {
    if (!isGameActive || targetImage.classList.contains('hidden')) {
        clearInterval(moveIntervalId); // Zatrzymaj animację, jeśli gra nieaktywna lub obrazek ukryty
        return;
    }

    let x = targetImage.offsetLeft;
    let y = targetImage.offsetTop;

    const targetWidth = targetImage.offsetWidth;
    const targetHeight = targetImage.offsetHeight;

    const containerWidth = gameContainer.offsetWidth;
    const containerHeight = gameContainer.offsetHeight;

    // Oblicz nową pozycję
    x += dx;
    y += dy;

    // Logika odbijania się od krawędzi
    if (x + targetWidth > containerWidth || x < 0) {
        dx = -dx; // Odwróć kierunek X
        // Dostosuj pozycję, aby nie wychodził poza ekran, zapobiegając "przyklejaniu"
        if (x < 0) x = 0;
        if (x + targetWidth > containerWidth) x = containerWidth - targetWidth;
    }

    if (y + targetHeight > containerHeight || y < 0) {
        dy = -dy; // Odwróć kierunek Y
        // Dostosuj pozycję, aby nie wychodził poza ekran, zapobiegając "przyklejaniu"
        if (y < 0) y = 0;
        if (y + targetHeight > containerHeight) y = containerHeight - targetHeight;
    }

    // Ustaw nową pozycję
    targetImage.style.left = `${x}px`;
    targetImage.style.top = `${y}px`;
}


// Rozpoczyna rundę - Ozzy się pojawia
function startRound() {
    if (!isGameActive) return;

    targetImage.classList.remove('hidden');
    moveTargetImage(); // Ustawia początkową pozycję

    // Wygeneruj losowy kierunek początkowy (na podstawie aktualnej prędkości)
    dx = (Math.random() < 0.5 ? 1 : -1) * currentSpeed; // Losowo w prawo lub w lewo
    dy = (Math.random() < 0.5 ? 1 : -1) * currentSpeed; // Losowo w górę lub w dół

    // Uruchom interwał ruchu
    clearInterval(moveIntervalId); // Upewnij się, że poprzedni interwał jest zatrzymany
    moveIntervalId = setInterval(animateTargetImage, 20); // Aktualizuj pozycję co 20 ms

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
        if (isGameActive) {
            endGame('Ozzy zjadł całe gówno! Przegrałeś!');
        }
    }, currentTimeLimit);
}

// Funkcja odpowiedzialna za zakończenie gry i wyświetlenie ekranu końcowego
function endGame(message) {
    isGameActive = false;
    clearTimeout(timeoutId);
    clearInterval(moveIntervalId); // ZATZYMAJ ANIMACJĘ PO PRZEGRANEJ

    targetImage.classList.add('hidden');
    messageDisplay.style.display = 'none';

    document.getElementById('end-message').textContent = message;
    finalScoreDisplay.textContent = score;

    // Zapisz wynik do leaderboarda PO PRZEGRANEJ, jeśli nick jest wpisany
    if (playerNickname.trim() !== "") {
        saveScoreToLeaderboard(playerNickname, score);
    }

    endScreen.classList.remove('hidden'); // Pokaż ekran końcowy
}

// ---- Obsługa zdarzeń ----
// Funkcja rozpoczynająca całą grę po kliknięciu przycisku Start
startButton.addEventListener('click', () => {
    const nick = nicknameInput.value.trim();
    if (nick === "") {
        showMessage("Musisz wpisać swój nick!", 2000);
        return; // Nie rozpoczynaj gry bez nicku
    }
    playerNickname = nick; // Zapisz nick gracza
    
    startScreen.classList.add('hidden');
    isGameActive = true;
    score = 0;
    scoreDisplay.textContent = score;
    currentTimeLimit = INITIAL_TIME_LIMIT;
    currentSpeed = INITIAL_SPEED; // Resetuj prędkość na start gry
    startRound();
});

// Obsługa kliknięcia przycisku Restart na ekranie końcowym
restartButton.addEventListener('click', () => {
    resetGame(); // Resetuje do stanu startowego, w tym pokazanie ekranu startowego
});

// Obsługa kliknięcia na docelowy obrazek (Ozzy'ego)
targetImage.addEventListener('click', (event) => {
    if (isGameActive && !targetImage.classList.contains('hidden')) {
        event.stopPropagation();
        score++;
        scoreDisplay.textContent = score;
        clearTimeout(timeoutId);
        clearInterval(moveIntervalId); // ZATZYMAJ ANIMACJĘ PO KLIKNIĘCIU

        targetImage.classList.add('hidden');

        // Logika Poziomu Trudności (dla czasu i dla prędkości)
        if (score > 0 && score % CLICKS_FOR_DIFFICULTY_INCREASE === 0) {
            currentTimeLimit = Math.max(MIN_TIME_LIMIT, currentTimeLimit - DECREMENT_PER_CLICK);
            currentSpeed = Math.min(MAX_SPEED, currentSpeed + SPEED_INCREMENT); // Zwiększ prędkość
            console.log(`Zwiększenie trudności! Nowy limit czasu: ${currentTimeLimit}ms, Nowa prędkość: ${currentSpeed}`);
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
        moveTargetImage(); // Przemieść obrazek, jeśli okno zmieniło rozmiar
    }
});

// Obsługa kliknięcia na tło (traktor) - nie robi nic
backgroundTractor.addEventListener('click', () => {
    // Brak akcji, chyba że chcesz dodać karę za kliknięcie na tło w trakcie gry.
});

// Obsługa przycisku "Ranking" na ekranie startowym
showLeaderboardButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
    fetchAndDisplayLeaderboard(); // Załaduj i wyświetl ranking
});

// Obsługa przycisku "Zobacz Ranking" na ekranie końcowym
showLeaderboardAfterGameButton.addEventListener('click', () => {
    endScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
    fetchAndDisplayLeaderboard(); // Załaduj i wyświetl ranking
});

// Przycisk "Wróć do menu" na ekranie leaderboarda
backToStartButton.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
    resetGame(); // Pokaże ekran startowy
});

// Inicjalizacja: Pokaż ekran startowy na początku
document.addEventListener('DOMContentLoaded', () => {
    resetGame(); // Ta funkcja już pokazuje ekran startowy
});