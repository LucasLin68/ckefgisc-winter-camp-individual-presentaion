from flask import Flask, render_template, request, session, redirect, url_for
import random
import os
import re
import google.genai as genai
from google.genai import types
from dotenv import load_dotenv
import enchant

# 載入環境變數
load_dotenv()

# 初始化 Flask
app = Flask(__name__)

# 設定 Secret Key 才能使用 session 功能
app.secret_key = os.getenv("FLASK_SECRET")
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_ID = "gemini-2.5-flash"

# 建立英文（美國）字典實體
english_dict = enchant.Dict("en_US")

WORDS = [
    "APPLE", "BEACH", "BRAVO", "CLOUD", "CRANE", "DRINK", "EARTH", "FLAME", "FRUIT", "GHOST",
    "GRAPE", "HOUSE", "IMAGE", "JUICE", "LIGHT", "LEMON", "MAGIC", "MUSIC", "NIGHT", "OCEAN",
    "PARTY", "PIANO", "PILOT", "PLANE", "QUIET", "RIVER", "ROBOT", "SHARK", "SHEEP", "SHIRT",
    "SNAKE", "SPACE", "SPOON", "STORM", "TABLE", "TIGER", "TOUCH", "TRAIN", "TRUCK", "VOICE",
    "WATCH", "WATER", "WHALE", "WORLD", "WRITE", "YACHT", "ZEBRA", "SWORD", "FAIRY", "GUILD",
    "QUEST", "POWER", "BLOOD", "SMILE", "HEART", "DREAM", "STORY", "BRICK", "CHASE", "DANCE",
    "FIELD", "GLASS", "GREEN", "HAPPY", "KNIFE", "LUCKY", "MOUSE", "NOBLE", "MANGO", "PEACE",
    "QUEEN", "RADIO", "SLEEP", "STONE", "THINK", "UNDER", "VIVID", "WHEEL", "YOUNG", "BREAD",
    "CANDY", "DREAM", "FIGHT", "GLOVE", "HORSE", "JOKER", "LEVEL", "MELON", "NURSE", "ORDER",
    "PHONE", "QUART", "RELAX", "SKILL", "TOWER", "UNION", "VALUE", "WITCH", "XENON", "YOUTH",
    "CURSE", "BLESS", "FATAL", "ARISE", "ELECT", "PLATE", "PLACE", "AZURE", "INTEL", "DOUGH",
    "MICRO", "EAGLE", "ULTRA", "HYPER", "SUPER", "BEAST", "VENOM", "MAGMA", "FLAKE", "SQUAD",
    "LOCAL", "PRANK", "UMBRA", "FLASK", "HYENA", "MELEE", "SIGHT", "DINER", "BRAKE", "BRACE",
    "DRAKE", "HYDRA", "RAPID", "DRAMA", "DEMON", "ANGEL", "ARENA", "PLAZA", "BLADE", "PRIDE"
]

SYSTEM_PROMPT = """
你現在正在主持一個猜字遊戲。
你的任務是：
1. 每次只提供一個「5個字母」的英文單字作為遊戲謎底。
2. 這個單字必須是真實存在的英文單字(例如: APPLE, LIGHT, ANIME)。
3. 只能輸出單字本身（大寫），不要有任何解釋或標點。
"""

def get_word():
    """優先嘗試從 Gemini 獲取單字，失敗或格式不符則從 WORDS 隨機挑選"""
    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=1.0,
            ),
            contents="請給我下一個遊戲的單字。"
        )
        word = response.text.strip().upper()
        # 使用正規表達式確保剛好是 5 個英文字母
        if re.fullmatch(r'[A-Z]{5}', word):
            return word
    except Exception as e:
        print(f"Gemini 出題失敗: {e}")
    
    # 備援方案：從 WORDS 挑選
    return random.choice(WORDS)

def check_word(guess, target):
    """
    Wordle 核心邏輯：比對猜測字與目標字的差異
    傳回值範例：['correct', 'absent', 'present', 'absent', 'absent']
    """
    result = [None] * 5
    target_list = list(target)
    guess_list = list(guess)

    # 第一輪：先找「綠色」(位置正確)
    for i in range(5):
        if guess_list[i] == target_list[i]:
            result[i] = "correct"
            target_list[i] = None # 標記已被使用
            guess_list[i] = None

    # 第二輪：再找「黃色」(位置錯誤)
    for i in range(5):
        if guess_list[i] is not None: # 跳過已經變綠色的字母
            if guess_list[i] in target_list:
                result[i] = "present"
                # 找到第一個匹配的字母並移除，避免重複計算黃色
                target_list[target_list.index(guess_list[i])] = None
            else:
                result[i] = "absent"
                
    return result

@app.route("/", methods=["GET", "POST"])
def index():
    if "target" not in session:
        session["target"] = get_word() # 使用複合出題函式
        session["history"] = []
        session["status"] = "playing"

    if request.method == "POST" and session["status"] == "playing":
        user_input = request.form.get("user_input", "").upper().strip()
        
        if len(user_input) == 5 and user_input.isalpha():
            res = check_word(user_input, session["target"])
            session["history"].append({"word": user_input, "result": res})
            
            if user_input == session["target"]:
                session["status"] = "won"
            elif len(session["history"]) >= 6:
                session["status"] = "lost"
                
            session.modified = True

    return render_template("index.html", 
                           history=session["history"], 
                           status=session["status"], 
                           target=session.get("target"))

@app.route("/check_valid/<word>")
def check_valid(word):
    # 檢查是否為 5 個字母且拼寫正確
    # english_dict.check(word) 會回傳 True 或 False
    is_real_word = len(word) == 5 and english_dict.check(word)
    return {"valid": is_real_word}

@app.route("/reset")
def reset():
    # 清除所有遊戲紀錄
    session.pop("target", None)
    session.pop("history", None)
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(debug=True, port=5000)
