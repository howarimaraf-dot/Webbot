let tg = window.Telegram.WebApp;
tg.expand();

let userData = {
    user_id: null,
    username: '',
    balance: 0.00,
    is_admin: false
};

let gameState = {
    selectedBet: null,
    selectedNumber: null,
    withdrawMethod: null,
    currentRoom: null,
    isMyTurn: false,
    currentRound: 1,
    player1Score: 0,
    player2Score: 0,
    player1Rolls: [],
    player2Rolls: []
};

tg.ready();

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userData.user_id = tg.initDataUnsafe.user.id;
        loadUserData();
    } else {
        userData.user_id = 123456789;
        userData.username = 'USER_DEMO';
        userData.balance = 10.00;
        updateUI();
    }
}

function loadUserData() {
    tg.sendData(JSON.stringify({
        action: 'get_user_data',
        user_id: userData.user_id
    }));

    window.addEventListener('message', function(event) {
        if (event.data && event.data.user_data) {
            userData = {...userData, ...event.data.user_data};
            updateUI();
        }
    });

    setTimeout(() => {
        if (!userData.username) {
            userData.username = 'USER_' + Math.random().toString(36).substr(2, 8).toUpperCase();
            userData.balance = 0.00;
            updateUI();
        }
    }, 1000);
}

function updateUI() {
    document.getElementById('username').textContent = userData.username;
    document.getElementById('balance').textContent = userData.balance.toFixed(2) + ' $';
    document.getElementById('profile-username').textContent = userData.username;
    document.getElementById('profile-balance').textContent = userData.balance.toFixed(2) + ' $';
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showMainMenu() {
    showScreen('main-menu');
}

function showProfile() {
    showScreen('profile-screen');
}

function showChangeUsername() {
    showScreen('change-username-screen');
}

function showDeposit() {
    showScreen('deposit-screen');
}

function showWithdraw() {
    showScreen('withdraw-screen');
}

function showGames() {
    showScreen('games-screen');
}

function showNotifications() {
    showScreen('notifications-screen');
    loadNotifications();
}

function show1v1Game() {
    showScreen('game-1v1-screen');
    document.getElementById('game-arena').classList.add('hidden');
}

function showMultiPlayerGame() {
    showScreen('multi-player-screen');
}

function changeUsername() {
    const newUsername = document.getElementById('new-username').value.trim();
    
    if (!newUsername) {
        showToast('الرجاء إدخال اسم المستخدم', 'error');
        return;
    }

    if (newUsername.length > 15) {
        showToast('الاسم يجب أن يكون أقل من 15 حرف', 'error');
        return;
    }

    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
    if (emojiRegex.test(newUsername)) {
        showToast('لا يسمح بالإيموجي في الاسم', 'error');
        return;
    }

    showLoading();
    
    tg.sendData(JSON.stringify({
        action: 'change_username',
        user_id: userData.user_id,
        new_username: newUsername
    }));

    setTimeout(() => {
        hideLoading();
        userData.username = newUsername;
        updateUI();
        showToast('تم تغيير الاسم بنجاح', 'success');
        document.getElementById('new-username').value = '';
        showMainMenu();
    }, 1000);
}

function openBot() {
    tg.close();
}

function selectWithdrawMethod(method) {
    gameState.withdrawMethod = method;
    document.getElementById('withdraw-form').classList.remove('hidden');
}

function submitWithdraw() {
    const account = document.getElementById('withdraw-account').value.trim();
    const amount = parseFloat(document.getElementById('withdraw-amount').value);

    if (!account) {
        showToast('الرجاء إدخال معرف الحساب', 'error');
        return;
    }

    if (!amount || amount < 1.00) {
        showToast('الحد الأدنى للسحب 1.00 $', 'error');
        return;
    }

    if (amount > userData.balance) {
        showToast('رصيدك غير كافي', 'error');
        return;
    }

    showLoading();

    tg.sendData(JSON.stringify({
        action: 'withdraw',
        user_id: userData.user_id,
        method: gameState.withdrawMethod,
        account: account,
        amount: amount
    }));

    setTimeout(() => {
        hideLoading();
        userData.balance -= amount;
        updateUI();
        showToast('تم إنشاء طلب السحب بنجاح', 'success');
        document.getElementById('withdraw-account').value = '';
        document.getElementById('withdraw-amount').value = '';
        document.getElementById('withdraw-form').classList.add('hidden');
        showMainMenu();
    }, 1500);
}

function selectBet(amount) {
    if (amount > userData.balance) {
        showToast('رصيدك غير كافي', 'error');
        return;
    }

    gameState.selectedBet = amount;
    
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');

    setTimeout(() => {
        startSearching1v1();
    }, 300);
}

function startSearching1v1() {
    userData.balance -= gameState.selectedBet;
    updateUI();

    document.getElementById('game-arena').classList.remove('hidden');
    document.getElementById('game-status').textContent = 'جاري البحث عن منافس...';
    
    resetGameState();
    
    tg.sendData(JSON.stringify({
        action: 'join_1v1',
        user_id: userData.user_id,
        bet_amount: gameState.selectedBet
    }));

    setTimeout(() => {
        opponentFound();
    }, 2000);
}

function resetGameState() {
    gameState.currentRound = 1;
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    gameState.player1Rolls = [];
    gameState.player2Rolls = [];
    document.getElementById('player1-score').textContent = '0';
    document.getElementById('player2-score').textContent = '0';
    document.getElementById('current-round').textContent = '1';
    document.getElementById('game-result').classList.add('hidden');
}

function opponentFound() {
    document.getElementById('game-status').textContent = 'تم العثور على منافس! جاري بدء اللعبة...';
    
    setTimeout(() => {
        document.getElementById('game-status').textContent = 'الجولة ' + gameState.currentRound + ' من 3';
        startPlayerTurn(true);
    }, 1500);
}

function startPlayerTurn(isMyTurn) {
    gameState.isMyTurn = isMyTurn;
    
    if (isMyTurn) {
        document.getElementById('roll-btn').classList.remove('hidden');
        document.getElementById('waiting-msg').classList.add('hidden');
        document.getElementById('game-status').textContent = 'دورك! اضغط لرمي النرد';
    } else {
        document.getElementById('roll-btn').classList.add('hidden');
        document.getElementById('waiting-msg').classList.remove('hidden');
        document.getElementById('game-status').textContent = 'انتظر دور الخصم...';
        
        setTimeout(() => {
            opponentRoll();
        }, 2000);
    }
}

function rollDice() {
    if (!gameState.isMyTurn) return;

    document.getElementById('roll-btn').classList.add('hidden');
    document.getElementById('game-status').textContent = 'جاري رمي النرد...';

    const diceContainer = document.getElementById('player1-dice');
    diceContainer.classList.add('rolling');

    setTimeout(() => {
        const result = Math.floor(Math.random() * 6) + 1;
        gameState.player1Rolls.push(result);
        gameState.player1Score += result;

        diceContainer.classList.remove('rolling');
        diceContainer.querySelector('.dice-face').textContent = result;
        document.getElementById('player1-score').textContent = gameState.player1Score;

        tg.sendData(JSON.stringify({
            action: 'player_roll',
            room_id: gameState.currentRoom,
            result: result,
            round: gameState.currentRound
        }));

        setTimeout(() => {
            startPlayerTurn(false);
        }, 1500);
    }, 1000);
}

function opponentRoll() {
    const diceContainer = document.getElementById('player2-dice');
    diceContainer.classList.add('rolling');

    setTimeout(() => {
        const result = Math.floor(Math.random() * 6) + 1;
        gameState.player2Rolls.push(result);
        gameState.player2Score += result;

        diceContainer.classList.remove('rolling');
        diceContainer.querySelector('.dice-face').textContent = result;
        document.getElementById('player2-score').textContent = gameState.player2Score;

        if (gameState.currentRound < 3) {
            gameState.currentRound++;
            document.getElementById('current-round').textContent = gameState.currentRound;
            setTimeout(() => {
                document.getElementById('game-status').textContent = 'الجولة ' + gameState.currentRound + ' من 3';
                startPlayerTurn(true);
            }, 1500);
        } else {
            setTimeout(() => {
                endGame();
            }, 1500);
        }
    }, 1000);
}

function endGame() {
    const player1Total = gameState.player1Score;
    const player2Total = gameState.player2Score;

    let resultTitle = '';
    let resultDetails = '';
    let prize = 0;

    if (player1Total > player2Total) {
        prize = calculateReward(gameState.selectedBet);
        userData.balance += prize;
        
        resultTitle = '🏆 مبروك! لقد فزت! 🎉';
        document.querySelector('.result-title').className = 'result-title win';
        resultDetails = `النتيجة النهائية:\nأنت: ${player1Total} | الخصم: ${player2Total}\n\nالمكافأة: ${prize.toFixed(2)} $`;
    } else if (player2Total > player1Total) {
        resultTitle = '😢 للأسف، لقد خسرت';
        document.querySelector('.result-title').className = 'result-title lose';
        resultDetails = `النتيجة النهائية:\nأنت: ${player1Total} | الخصم: ${player2Total}\n\nحاول مرة أخرى!`;
    } else {
        userData.balance += gameState.selectedBet;
        resultTitle = '🤝 تعادل!';
        document.querySelector('.result-title').className = 'result-title tie';
        resultDetails = `النتيجة النهائية:\nأنت: ${player1Total} | الخصم: ${player2Total}\n\nتم إرجاع رصيدك`;
    }

    updateUI();

    document.getElementById('result-title').textContent = resultTitle;
    document.getElementById('result-details').textContent = resultDetails;
    document.getElementById('game-result').classList.remove('hidden');
    document.getElementById('game-status').classList.add('hidden');
    document.getElementById('roll-btn').classList.add('hidden');
    document.getElementById('waiting-msg').classList.add('hidden');

    tg.sendData(JSON.stringify({
        action: 'game_ended',
        room_id: gameState.currentRoom,
        winner: player1Total > player2Total ? 'player1' : (player2Total > player1Total ? 'player2' : 'tie')
    }));
}

function calculateReward(betAmount) {
    const rewards = {
        0.50: 0.80,
        1.00: 1.80,
        2.00: 3.50,
        5.00: 9.00
    };
    return rewards[betAmount] || betAmount * 2;
}

function selectNumber(num) {
    gameState.selectedNumber = num;
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

function selectMultiBet(amount) {
    if (amount > userData.balance) {
        showToast('رصيدك غير كافي', 'error');
        return;
    }
    gameState.selectedBet = amount;
    document.querySelectorAll('#multi-player-screen .bet-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

function joinMultiGame() {
    if (!gameState.selectedNumber) {
        showToast('الرجاء اختيار رقم', 'error');
        return;
    }
    
    if (!gameState.selectedBet) {
        showToast('الرجاء اختيار قيمة الرهان', 'error');
        return;
    }

    showLoading();

    tg.sendData(JSON.stringify({
        action: 'join_multi',
        user_id: userData.user_id,
        chosen_number: gameState.selectedNumber,
        bet_amount: gameState.selectedBet
    }));

    setTimeout(() => {
        hideLoading();
        userData.balance -= gameState.selectedBet;
        updateUI();
        showToast('تم الانضمام للعبة بنجاح', 'success');
        showGames();
    }, 1500);
}

function loadNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    
    tg.sendData(JSON.stringify({
        action: 'get_notifications',
        user_id: userData.user_id
    }));

    setTimeout(() => {
        notificationsList.innerHTML = '<p class="no-data">لا توجد إشعارات</p>';
    }, 500);
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

tg.MainButton.text = 'القائمة الرئيسية';
tg.MainButton.onClick(showMainMenu);
tg.MainButton.show();
