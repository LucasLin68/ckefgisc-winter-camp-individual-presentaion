window.onload = function() {
    const gameContainer = document.querySelector('.input-area');
    const userInputBox = document.querySelector('input[name="user_input"]');
    const sendBtn = document.querySelector('button[type="submit"]');

    if (gameContainer && userInputBox) {
        gameContainer.addEventListener('submit', async function(e) {
            e.preventDefault(); // 先攔截，無論如何都不直接送出

            const currentGuess = userInputBox.value.trim().toUpperCase();
            
            // --- 關鍵修補：長度不對也要處理 ---
            if (currentGuess.length !== 5) {
                userInputBox.value = "請輸入 5 個字母！";
                userInputBox.style.color = "orange"; // 用橘色區分長度錯誤
                
                // 不要鎖死按鈕，讓使用者可以重試
                setTimeout(() => {
                    userInputBox.value = "";
                    userInputBox.style.color = "";
                    userInputBox.focus();
                }, 800);
                return; // 結束，不執行後面的 fetch
            }

            // 進入驗證階段，這時才鎖按鈕
            sendBtn.disabled = true;
            sendBtn.innerText = "驗證中...";

            try {
                const checkStatus = await fetch(`/check_valid/${currentGuess}`);
                const validation = await checkStatus.json();

                if (validation.valid) {
                    gameContainer.submit(); // 成功才送出
                } else {
                    // 驗證失敗：顯示無效單字
                    userInputBox.value = "無效單字！";
                    userInputBox.style.color = "red";
                    
                    // 恢復按鈕，不然會卡死
                    sendBtn.disabled = false;
                    sendBtn.innerText = "發送";

                    setTimeout(() => {
                        userInputBox.value = "";
                        userInputBox.style.color = "";
                        userInputBox.focus();
                    }, 800);
                }
            } catch (err) {
                console.error("驗證系統異常:", err);
                gameContainer.submit(); // 出事就放行
            }
        });
    }

    // 1. 自動捲動到底部
    const chatBox = document.querySelector('.chat-box');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 2. 讓輸入框自動取得焦點
    const inputField = document.querySelector('input[name="user_input"]');
    if (inputField) {
        inputField.focus();
    }

    // 3. 防止重複提交並給予視覺回饋
    const form = document.querySelector('form');
    if (form) {
        form.onsubmit = function() {
            const btn = form.querySelector('button');
            btn.disabled = true;
            btn.innerText = "比對中...";
        };
    }
// 檢查是否有撒花觸發器
    if (document.getElementById('confetti-trigger')) {
        createConfetti();
    }
};

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.innerText = "🌸"; // 二次元風格可以用櫻花
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-20px';
        confetti.style.fontSize = Math.random() * 20 + 10 + 'px';
        confetti.style.zIndex = '999';
        confetti.style.pointerEvents = 'none';
        
        // 加入簡單的掉落動畫
        const animation = confetti.animate([
            { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
            { transform: `translateY(100vh) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: Math.random() * 3000 + 2000,
            easing: 'linear'
        });

        document.body.appendChild(confetti);
        animation.onfinish = () => confetti.remove();
    }
};