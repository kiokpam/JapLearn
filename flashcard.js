// State management
let sentencesN34 = [];
let sentencesN12 = [];
let sentencesCorpus = [];
let sentencesKaiwa = [];
let allSentences = [];
let currentIndex = -1;
let currentLanguage = 'vn'; // 'vn' or 'jp'
let history = [];
let favorites = new Set();
let viewedIndices = new Set();
let enabledLevels = {
    n34: true,
    n12: true,
    corpus: true,
    kaiwa: true
};

// Parse kaiwa sentences (Vietnamese only, will be translated on display)
function parseKaiwaSentences(text) {
    const lines = text.split('\n');
    let tempSentences = [];
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Format: "1. Vietnamese text"
        if (line.match(/^\d+\./)) {
            const vn = line.replace(/^\d+\.\s*/, '').trim();
            if (vn) {
                tempSentences.push({ vn: vn, jp: '' }); // JP will be empty for now
            }
        }
    }
    
    return tempSentences;
}

// Parse sentence pairs from text
function parseSentences(text) {
    const lines = text.split('\n');
    let tempSentences = [];
    let currentPair = {};
    
    for (let line of lines) {
        line = line.trim();
        if (!line) {
            if (currentPair.vn && currentPair.jp) {
                tempSentences.push(currentPair);
                currentPair = {};
            }
            continue;
        }
        
        // Handle format with number: "1. VI: ..." on one line, "   JP: ..." on next line
        if (line.match(/^\d+\.\s*VI:/)) {
            // Extract VI part
            currentPair.vn = line.replace(/^\d+\.\s*VI:\s*/, '').trim();
        }
        // Handle standalone JP line (may or may not have leading spaces)
        else if (line.match(/^\s*JP:/)) {
            currentPair.jp = line.replace(/^\s*JP:\s*/, '').trim();
            if (currentPair.vn) {
                tempSentences.push(currentPair);
                currentPair = {};
            }
        }
        // Handle separate line format: "VN: ..." and "JP: ..."
        else if (line.startsWith('VN:')) {
            currentPair.vn = line.substring(3).trim();
        } else if (line.startsWith('JP:')) {
            currentPair.jp = line.substring(3).trim();
            if (currentPair.vn) {
                tempSentences.push(currentPair);
                currentPair = {};
            }
        }
    }
    
    // Add last pair if exists
    if (currentPair.vn && currentPair.jp) {
        tempSentences.push(currentPair);
    }
    
    return tempSentences;
}

// Load all data files
async function loadCorpus() {
    try {
        // Load N3-N4 level
        try {
            const responseN34 = await fetch('1000_cap_cau_Viet_Nhat_N3_N4.txt');
            const textN34 = await responseN34.text();
            sentencesN34 = parseSentences(textN34);
            console.log(`Loaded ${sentencesN34.length} N3-N4 sentence pairs`);
        } catch (e) {
            console.warn('N3-N4 file not found');
        }
        
        // Load N1-N2 level
        try {
            const responseN12 = await fetch('1000_cap_cau_Viet_Nhat_N2_N1.txt');
            const textN12 = await responseN12.text();
            sentencesN12 = parseSentences(textN12);
            console.log(`Loaded ${sentencesN12.length} N1-N2 sentence pairs`);
        } catch (e) {
            console.warn('N1-N2 file not found');
        }
        
        // Load corpus
        try {
            const responseCorpus = await fetch('corpus.txt');
            const textCorpus = await responseCorpus.text();
            sentencesCorpus = parseSentences(textCorpus);
            console.log(`Loaded ${sentencesCorpus.length} Corpus sentence pairs`);
        } catch (e) {
            console.warn('Corpus file not found');
        }
        
        // Load kaiwa
        try {
            const responseKaiwa = await fetch('1000_cau_giao_tiep_kho_da_dang.txt');
            const textKaiwa = await responseKaiwa.text();
            sentencesKaiwa = parseKaiwaSentences(textKaiwa);
            console.log(`Loaded ${sentencesKaiwa.length} Kaiwa sentences`);
        } catch (e) {
            console.warn('Kaiwa file not found');
        }
        
        // Combine all enabled sentences
        updateSentencePool();
        
        // Update stats
        updateStats();
        
        // Load saved data from localStorage
        loadFromLocalStorage();
        
        if (allSentences.length === 0) {
            document.getElementById('question').textContent = 
                'Lỗi: Không thể tải file. Vui lòng đảm bảo các file nằm cùng thư mục với HTML.';
        }
        
    } catch (error) {
        console.error('Error loading files:', error);
        document.getElementById('question').textContent = 
            'Lỗi: Không thể tải file. Vui lòng đảm bảo các file nằm cùng thư mục với HTML.';
    }
}

// Update sentence pool based on selected levels
function updateSentencePool() {
    allSentences = [];
    
    if (enabledLevels.n34) {
        allSentences = allSentences.concat(sentencesN34.map(s => ({...s, level: 'N3-N4'})));
        console.log(`Added ${sentencesN34.length} N3-N4 sentences`);
    }
    if (enabledLevels.n12) {
        allSentences = allSentences.concat(sentencesN12.map(s => ({...s, level: 'N1-N2'})));
        console.log(`Added ${sentencesN12.length} N1-N2 sentences`);
    }
    if (enabledLevels.corpus) {
        allSentences = allSentences.concat(sentencesCorpus.map(s => ({...s, level: 'Corpus'})));
        console.log(`Added ${sentencesCorpus.length} Corpus sentences`);
    }
    if (enabledLevels.kaiwa) {
        allSentences = allSentences.concat(sentencesKaiwa.map(s => ({...s, level: 'Kaiwa'})));
        console.log(`Added ${sentencesKaiwa.length} Kaiwa sentences`);
    }
    
    console.log(`Total sentences in pool: ${allSentences.length}`);
    updateStats();
}

// Update level selection
function updateLevel() {
    enabledLevels.n34 = document.getElementById('levelN34').checked;
    enabledLevels.n12 = document.getElementById('levelN12').checked;
    enabledLevels.corpus = document.getElementById('levelCorpus').checked;
    enabledLevels.kaiwa = document.getElementById('levelKaiwa').checked;
    
    // At least one level must be selected
    if (!enabledLevels.n34 && !enabledLevels.n12 && !enabledLevels.corpus && !enabledLevels.kaiwa) {
        alert('Phải chọn ít nhất 1 mức độ!');
        enabledLevels.corpus = true;
        document.getElementById('levelCorpus').checked = true;
    }
    
    updateSentencePool();
}

// Load saved data from localStorage
function loadFromLocalStorage() {
    try {
        const savedHistory = localStorage.getItem('flashcard_history');
        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }
        
        const savedFavorites = localStorage.getItem('flashcard_favorites');
        if (savedFavorites) {
            favorites = new Set(JSON.parse(savedFavorites));
        }
        
        const savedViewed = localStorage.getItem('flashcard_viewed');
        if (savedViewed) {
            viewedIndices = new Set(JSON.parse(savedViewed));
        }
        
        updateStats();
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// Save to localStorage
function saveToLocalStorage() {
    try {
        localStorage.setItem('flashcard_history', JSON.stringify(history.slice(-50)));
        localStorage.setItem('flashcard_favorites', JSON.stringify([...favorites]));
        localStorage.setItem('flashcard_viewed', JSON.stringify([...viewedIndices]));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

// Update statistics
function updateStats() {
    const totalAvailable = sentencesN34.length + sentencesN12.length + sentencesCorpus.length + sentencesKaiwa.length;
    document.getElementById('totalCount').textContent = allSentences.length;
    document.getElementById('availableCount').textContent = totalAvailable;
    document.getElementById('viewedCount').textContent = viewedIndices.size;
    document.getElementById('favoriteCount').textContent = favorites.size;
}

// Show new random card
function showNewCard() {
    if (allSentences.length === 0) {
        alert('Chưa tải được dữ liệu. Vui lòng kiểm tra các file.');
        return;
    }
    
    // Get random index
    currentIndex = Math.floor(Math.random() * allSentences.length);
    
    // Add to history
    history.push(currentIndex);
    if (history.length > 50) {
        history.shift(); // Keep only last 50
    }
    
    // Add to viewed set
    viewedIndices.add(currentIndex);
    
    // Save to localStorage
    saveToLocalStorage();
    
    // Display card
    displayCard();
}

// Display current card
function displayCard() {
    const sentence = allSentences[currentIndex];
    const questionEl = document.getElementById('question');
    const answerEl = document.getElementById('answer');
    const starBtn = document.getElementById('starBtn');
    const languageBadge = document.getElementById('languageBadge');
    
    // Hide answer initially
    answerEl.classList.remove('show');
    
    // Set content based on language
    if (currentLanguage === 'vn') {
        questionEl.textContent = sentence.vn;
        answerEl.textContent = sentence.jp;
        languageBadge.textContent = `VN → JP (${sentence.level})`;
    } else {
        questionEl.textContent = sentence.jp;
        answerEl.textContent = sentence.vn;
        languageBadge.textContent = `JP → VN (${sentence.level})`;
    }
    
    // Update star button
    if (favorites.has(currentIndex)) {
        starBtn.classList.add('starred');
        starBtn.textContent = '★';
    } else {
        starBtn.classList.remove('starred');
        starBtn.textContent = '☆';
    }
    
    updateStats();
}

// Toggle answer visibility
function toggleAnswer() {
    const answerEl = document.getElementById('answer');
    answerEl.classList.toggle('show');
}

// Toggle star/favorite
function toggleStar(event) {
    event.stopPropagation(); // Prevent card click
    
    if (currentIndex === -1) return;
    
    if (favorites.has(currentIndex)) {
        favorites.delete(currentIndex);
    } else {
        favorites.add(currentIndex);
    }
    
    saveToLocalStorage();
    displayCard();
}

// Update language preference
function updateLanguage() {
    const selected = document.querySelector('input[name="language"]:checked').value;
    currentLanguage = selected;
    
    if (currentIndex !== -1) {
        displayCard();
    }
}

// Show history panel
function showHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-message">Chưa có lịch sử xem</div>';
    } else {
        // Reverse to show newest first
        const reversedHistory = [...history].reverse();
        
        reversedHistory.forEach((index, position) => {
            const sentence = allSentences[index];
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const starSpan = document.createElement('span');
            starSpan.className = 'item-star';
            starSpan.textContent = favorites.has(index) ? '★' : '☆';
            starSpan.style.color = favorites.has(index) ? '#f6ad55' : '#cbd5e0';
            starSpan.onclick = (e) => {
                e.stopPropagation();
                if (favorites.has(index)) {
                    favorites.delete(index);
                } else {
                    favorites.add(index);
                }
                saveToLocalStorage();
                showHistory(); // Refresh
                updateStats();
            };
            
            const textDiv = document.createElement('div');
            textDiv.className = 'item-text';
            textDiv.textContent = sentence.vn;
            
            const translationDiv = document.createElement('div');
            translationDiv.className = 'item-translation';
            translationDiv.textContent = sentence.jp;
            
            item.appendChild(starSpan);
            item.appendChild(textDiv);
            item.appendChild(translationDiv);
            
            item.onclick = () => {
                currentIndex = index;
                closePanel();
                displayCard();
            };
            
            historyList.appendChild(item);
        });
    }
    
    document.getElementById('historyPanel').style.display = 'block';
}

// Show favorites panel
function showFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    
    if (favorites.size === 0) {
        favoritesList.innerHTML = '<div class="empty-message">Chưa có câu yêu thích. Nhấn ⭐ để lưu câu!</div>';
    } else {
        const favArray = [...favorites];
        
        favArray.forEach(index => {
            const sentence = allSentences[index];
            const item = document.createElement('div');
            item.className = 'favorite-item';
            
            const starSpan = document.createElement('span');
            starSpan.className = 'item-star';
            starSpan.textContent = '★';
            starSpan.style.color = '#f6ad55';
            starSpan.onclick = (e) => {
                e.stopPropagation();
                favorites.delete(index);
                saveToLocalStorage();
                showFavorites(); // Refresh
                updateStats();
            };
            
            const textDiv = document.createElement('div');
            textDiv.className = 'item-text';
            textDiv.textContent = sentence.vn;
            
            const translationDiv = document.createElement('div');
            translationDiv.className = 'item-translation';
            translationDiv.textContent = sentence.jp;
            
            item.appendChild(starSpan);
            item.appendChild(textDiv);
            item.appendChild(translationDiv);
            
            item.onclick = () => {
                currentIndex = index;
                closePanel();
                displayCard();
            };
            
            favoritesList.appendChild(item);
        });
    }
    
    document.getElementById('favoritesPanel').style.display = 'block';
}

// Close panel
function closePanel() {
    document.getElementById('historyPanel').style.display = 'none';
    document.getElementById('favoritesPanel').style.display = 'none';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            toggleAnswer();
            break;
        case 'n':
        case 'N':
        case 'ArrowRight':
            e.preventDefault();
            showNewCard();
            break;
        case 's':
        case 'S':
            e.preventDefault();
            if (currentIndex !== -1) {
                toggleStar(e);
            }
            break;
        case 'h':
        case 'H':
            e.preventDefault();
            showHistory();
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            showFavorites();
            break;
        case 'Escape':
            closePanel();
            break;
    }
});

// Touch gestures for mobile
let touchStartX = 0;
let touchEndX = 0;

document.querySelector('.flashcard').addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.querySelector('.flashcard').addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
}, false);

function handleGesture() {
    if (touchEndX < touchStartX - 50) {
        // Swipe left - next card
        showNewCard();
    }
    if (touchEndX > touchStartX + 50) {
        // Swipe right - previous (from history)
        if (history.length > 1) {
            currentIndex = history[history.length - 2];
            displayCard();
        }
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    loadCorpus();
});
